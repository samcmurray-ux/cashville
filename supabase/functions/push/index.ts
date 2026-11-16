// Ca$hville push sender (Supabase Edge Function).
//
// The app calls this after something worth telling people about, and a
// scheduled job calls it for the Friday pick reminder. It works out who
// should hear about it and sends a Web Push to each of their phones.
//
// The signing keys are generated here on first use and kept in the private
// push_config table, which only this function (service role) can read.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Note = { to: string[]; title: string; body: string; url: string; tag: string };

async function ensureKeys(db: SupabaseClient) {
  const { data } = await db.from("push_config").select("public_key, private_key").eq("id", 1).maybeSingle();
  if (data) return data;
  const k = webpush.generateVAPIDKeys();
  // If two calls race, the first insert wins and both read the same row.
  await db.from("push_config").upsert(
    { id: 1, public_key: k.publicKey, private_key: k.privateKey },
    { onConflict: "id", ignoreDuplicates: true },
  );
  const { data: saved, error } = await db.from("push_config").select("public_key, private_key").eq("id", 1).single();
  if (error) throw error;
  await db.from("app_settings").update({ vapid_public_key: saved.public_key }).eq("id", 1);
  return saved;
}

const euro = (n: number) => "€" + (Number.isInteger(+n) ? +n : (+n).toFixed(2));
const FINE_LABEL: Record<string, string> = { late: "Late pick", loss: "Losing leg", overdue: "Unpaid fine", manual: "Fine" };

async function buildNotes(db: SupabaseClient, e: Record<string, any>): Promise<Note[]> {
  const { data: players } = await db.from("players").select("id, name");
  const all = (players ?? []).map((p) => p.id as string);
  const name = (id: string) => players?.find((p) => p.id === id)?.name ?? "Someone";
  const except = (...ids: (string | undefined)[]) => all.filter((id) => !ids.includes(id));
  const pickOf = async (week: number, playerId: string) =>
    (await db.from("picks").select("selection, odds").eq("week_number", week).eq("player_id", playerId).maybeSingle()).data;

  switch (e.kind) {
    case "test":
      return [{ to: [e.playerId], title: "Notifications are on ✅", body: `You'll hear about picks, results, fines and side bets, ${name(e.playerId)}.`, url: "/home", tag: "test" }];

    case "pick_in": {
      const pick = await pickOf(e.week, e.playerId);
      const { count } = await db.from("picks").select("id", { count: "exact", head: true }).eq("week_number", e.week).eq("filled", true);
      return [{
        to: except(e.actorId),
        title: `${name(e.playerId)}'s pick is in`,
        body: `${pick?.selection ?? "Pick"}${pick?.odds ? ` @ ${(+pick.odds).toFixed(2)}` : ""} · ${count ?? "?"} of ${all.length} in`,
        url: "/slip",
        tag: `pick-${e.week}-${e.playerId}`,
      }];
    }

    case "killed": {
      const pick = await pickOf(e.week, e.playerId);
      return [{
        to: except(e.actorId),
        title: "Slip's dead 💀",
        body: `${name(e.playerId)}'s pick lost${pick?.selection ? ` (${pick.selection})` : ""}. Week ${e.week} is gone.`,
        url: "/slip",
        tag: `result-${e.week}`,
      }];
    }

    case "landed": {
      const { data: wk } = await db.from("weeks").select("payout").eq("week_number", e.week).maybeSingle();
      return [{
        to: except(e.actorId),
        title: "IT LANDED 🎉",
        body: `All seven came in for week ${e.week}${wk?.payout ? ` — ${euro(Math.round(+wk.payout))} into the pot` : ""}.`,
        url: "/home",
        tag: `result-${e.week}`,
      }];
    }

    case "fined": {
      if (e.playerId === e.actorId) return [];
      const { data: fine } = await db
        .from("fines")
        .select("amount, kind, reason")
        .eq("player_id", e.playerId)
        .eq("kind", e.fineKind)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!fine) return [];
      return [{
        to: [e.playerId],
        title: `You've been fined ${euro(fine.amount)}`,
        body: `${FINE_LABEL[fine.kind] ?? "Fine"}${fine.reason ? ` · ${fine.reason}` : ""}. Pay before next weekend or it goes up.`,
        url: "/fines",
        tag: `fine-${e.playerId}-${e.fineKind}-${e.week ?? ""}`,
      }];
    }

    case "side_bet_offer":
    case "side_bet_reply": {
      const { data: b } = await db.from("side_bets").select("*").eq("id", e.betId).maybeSingle();
      if (!b) return [];
      const terms = `${euro(b.amount)} says ${name(b.subject_id)}'s pick ${b.creator_backs === "win" ? "wins" : "loses"}`;
      return e.kind === "side_bet_offer"
        ? [{ to: [b.opponent_id], title: `${name(b.creator_id)} wants a side bet`, body: `${terms}. Accept or decline on the slip.`, url: "/slip", tag: `bet-${b.id}` }]
        : [{ to: [b.creator_id], title: `${name(b.opponent_id)} ${b.status === "accepted" ? "accepted" : "declined"} your side bet`, body: terms, url: "/slip", tag: `bet-${b.id}` }];
    }

    case "vote": {
      if (e.voteKind !== "star" && e.voteKind !== "poo") return [];
      return [{
        to: [e.targetId].filter((id) => id !== e.voterId),
        title: e.voteKind === "star" ? `${name(e.voterId)} gave your pick a ⭐` : `${name(e.voterId)} gave your pick a 💩`,
        body: e.voteKind === "star" ? "Bet of the week material, apparently." : "Stinker of the week, apparently.",
        url: "/slip",
        tag: `vote-${e.week}-${e.voterId}-${e.voteKind}`,
      }];
    }
  }
  return [];
}

// Friday nudge: everyone whose pick isn't in for the week being played.
async function reminderNotes(db: SupabaseClient): Promise<Note[]> {
  const [{ data: players }, { data: latest }] = await Promise.all([
    db.from("players").select("id, name"),
    db.from("weeks").select("week_number").order("week_number", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const all = (players ?? []).map((p) => p.id as string);
  if (!all.length) return [];
  let week = latest?.week_number ?? 1;
  let { data: picks } = await db.from("picks").select("player_id, filled, result").eq("week_number", week);
  const filled = (picks ?? []).filter((p) => p.filled);
  // The latest week is finished — the one being played hasn't been started.
  if (filled.length > 0 && filled.every((p) => p.result)) {
    week += 1;
    picks = [];
  }
  const done = new Set((picks ?? []).filter((p) => p.filled).map((p) => p.player_id));
  const missing = all.filter((id) => !done.has(id));
  if (!missing.length) return [];
  return [{
    to: missing,
    title: "Get your pick in ⏰",
    body: `Week ${week} picks are due by 6pm today. ${all.length - missing.length} of ${all.length} in so far.`,
    url: "/slip",
    tag: `remind-${week}`,
  }];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const keys = await ensureKeys(db);
    if (body.type === "config") return json({ publicKey: keys.public_key });

    const notes =
      body.type === "reminder" ? await reminderNotes(db) : body.type === "event" && body.event ? await buildNotes(db, body.event) : [];
    if (body.dryRun) return json({ notes });

    webpush.setVapidDetails("https://cashville.vercel.app", keys.public_key, keys.private_key);
    let sent = 0;
    let failed = 0;
    for (const n of notes) {
      if (!n.to.length) continue;
      const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("player_id", n.to);
      await Promise.all(
        (subs ?? []).map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title: n.title, body: n.body, url: n.url, tag: n.tag }),
              { TTL: 60 * 60 * 12 },
            );
            sent++;
          } catch (err) {
            failed++;
            // 404/410 = that phone has unsubscribed or reinstalled; forget it.
            const code = (err as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
            else console.error("push failed", code, (err as Error).message);
          }
        }),
      );
    }
    return json({ notes: notes.length, sent, failed });
  } catch (err) {
    console.error(err);
    return json({ error: (err as Error).message }, 500);
  }
});
