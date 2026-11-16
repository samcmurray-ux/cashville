// Ca$hville data layer — ported from data.js. Fetches raw rows from Supabase
// and reshapes them into the BD view that components consume.

import { sb } from "./supabase";
import type {
  BD,
  Fine,
  FineKind,
  Settings,
  SideBet,
  Vote,
  VoteKind,
  MovementRow,
  PickRow,
  Player,
  TripRow,
  ViewMovement,
  ViewPick,
  ViewWeek,
  WeekRow,
} from "./types";

const PLAYER_ORDER = ["sam", "jamie", "james", "jack", "hebo", "conor", "rob"];
// Who fronts the stake and places the bet, in turn (from the group chat):
// JT, Conor, Heb, JC, Jamie, Rob, Sam.
const ROTATION_ORDER = ["james", "conor", "hebo", "jack", "jamie", "rob", "sam"];

type Raw = {
  players: Player[];
  weeks: WeekRow[];
  picks: PickRow[];
  movements: MovementRow[];
  trip: TripRow | null;
  // v2 tables — null when supabase/migration-v2.sql hasn't been run yet.
  settings: Record<string, unknown> | null;
  fines: Record<string, any>[] | null;
  votes: Record<string, any>[] | null;
  sideBets: Record<string, any>[] | null;
  topups: Record<string, any>[];
};

export const DEFAULT_SETTINGS: Settings = {
  lateFine: 10,
  lossFine: 35,
  streak4Fine: 50,
  topup2: 15,
  topup3: 25,
  overdueFine: 10,
  sideBetTaxPct: 20,
  rulesText: "",
  finesFromWeek: 0,
};

export const DEFAULT_STAKE = 70;

export async function fetchAll(): Promise<Raw> {
  const client = sb();
  const [players, weeks, picks, movements, trips, settings, fines, votes, sideBets, topups] = await Promise.all([
    client.from("players").select("*").order("name"),
    client.from("weeks").select("*").order("week_number"),
    client.from("picks").select("*"),
    client.from("movements").select("*").order("week_number"),
    client.from("trip_config").select("*").limit(1),
    client.from("app_settings").select("*").limit(1),
    client.from("fines").select("*").order("created_at"),
    client.from("votes").select("*"),
    client.from("side_bets").select("*").order("created_at"),
    client.from("topups").select("*"),
  ]);
  return {
    players: (players.data ?? []) as Player[],
    weeks: (weeks.data ?? []) as WeekRow[],
    picks: (picks.data ?? []) as PickRow[],
    movements: (movements.data ?? []) as MovementRow[],
    trip: ((trips.data ?? [])[0] ?? null) as TripRow | null,
    settings: settings.error ? null : ((settings.data ?? [])[0] ?? {}),
    fines: fines.error ? null : (fines.data ?? []),
    votes: votes.error ? null : (votes.data ?? []),
    sideBets: sideBets.error ? null : (sideBets.data ?? []),
    topups: topups.data ?? [],
  };
}

export function buildView(raw: Raw): BD {
  const players = [...raw.players].sort(
    (a, b) => PLAYER_ORDER.indexOf(a.id) - PLAYER_ORDER.indexOf(b.id),
  );

  // Group picks by week.
  const picksByWeek: Record<number, PickRow[]> = {};
  for (const p of raw.picks) {
    (picksByWeek[p.week_number] ||= []).push(p);
  }

  const topupsFor = (weekNum: number) =>
    raw.topups
      .filter((t) => t.week_number === weekNum)
      .map((t) => ({ playerId: t.player_id as string, amount: +t.amount }));

  const weeks: ViewWeek[] = raw.weeks.map((w) => {
    const wkPicks = picksByWeek[w.week_number] ?? [];
    const picks: ViewPick[] = players.map((player) => {
      const dbPick = wkPicks.find((p) => p.player_id === player.id);
      if (dbPick) {
        return {
          playerId: player.id,
          sport: dbPick.sport ?? "",
          sel: dbPick.selection ?? "",
          odds: dbPick.odds != null ? +dbPick.odds : null,
          result: ((dbPick.result as ViewPick["result"]) ?? "") as ViewPick["result"],
          filled: !!dbPick.filled,
          punishment: +(dbPick.punishment ?? 0) || 0,
          notes: dbPick.notes ?? "",
          _dbId: dbPick.id,
        };
      }
      return {
        playerId: player.id,
        sport: "",
        sel: "",
        odds: null,
        result: "",
        filled: false,
        punishment: 0,
        notes: "",
      };
    });
    // Combined odds: multiply each filled pick that has odds. We include
    // unsettled-but-filled picks too so the current week's combined updates
    // live as the players enter their picks. (The prototype only counts Won|Lost,
    // which makes the live slip stuck at 1.00.) Push doesn't affect combined.
    let combined = 1;
    for (const p of picks) {
      if (!p.odds) continue;
      if (p.result === "Push") continue;
      if (p.result === "Won" || p.result === "Lost" || (p.filled && !p.result)) {
        combined *= p.odds;
      }
    }
    const wonCount = picks.filter((p) => p.result === "Won").length;
    const lostCount = picks.filter((p) => p.result === "Lost").length;
    const pushCount = picks.filter((p) => p.result === "Push").length;
    const filled = picks.some((p) => p.filled);
    return {
      week: w.week_number,
      date: w.week_date,
      picks,
      // Always use the locally-computed combined odds — `picks.odds` is the
      // source of truth. The DB's `combined_odds` column is just a cache that
      // setPickResult / settleWeek refresh at settle-time, and it defaults
      // to 1 on a fresh week-insert (which would otherwise hide the live
      // total until someone settled).
      combinedOdds: +combined.toFixed(2),
      stake:
        (w.stake_per_acca ?? DEFAULT_STAKE) +
        topupsFor(w.week_number).reduce((a, t) => a + t.amount, 0),
      topups: topupsFor(w.week_number),
      payout: +(w.payout ?? 0),
      accaWon: !!w.acca_won,
      filled,
      wonCount,
      lostCount,
      pushCount,
      placerId: w.placer_id ?? null,
      placerExplicit: !!w.placer_id,
    };
  });

  // Current week = first week that's either (a) empty waiting for picks, or
  // (b) has picks but isn't fully settled. A week with 7 filled picks but
  // no results yet is THE live slip — that's what the players work on between
  // kickoff and full-time. Only weeks where every filled pick has a result
  // count as "done" and roll past.
  let currentWeekNum: number | null = null;
  for (const w of weeks) {
    const anyFilled = w.picks.some((p) => p.filled);
    const everyFilledSettled = w.picks
      .filter((p) => p.filled)
      .every((p) => p.result === "Won" || p.result === "Lost" || p.result === "Push");
    const isDone = anyFilled && everyFilledSettled;
    if (!isDone) {
      currentWeekNum = w.week;
      break;
    }
  }
  if (currentWeekNum == null && weeks.length) {
    // Everything's settled — synthesize the next week.
    currentWeekNum = weeks[weeks.length - 1].week + 1;
  }
  let currentWeek = weeks.find((w) => w.week === currentWeekNum);
  if (!currentWeek) {
    const lastDate = weeks.length ? new Date(weeks[weeks.length - 1].date) : new Date();
    lastDate.setDate(lastDate.getDate() + 7);
    currentWeek = {
      week: currentWeekNum!,
      date: lastDate.toISOString().slice(0, 10),
      picks: players.map((p) => ({
        playerId: p.id,
        sport: "",
        sel: "",
        odds: null,
        result: "",
        filled: false,
        punishment: 0,
        notes: "",
      })),
      combinedOdds: 0,
      stake:
        DEFAULT_STAKE + topupsFor(currentWeekNum!).reduce((a, t) => a + t.amount, 0),
      topups: topupsFor(currentWeekNum!),
      payout: 0,
      accaWon: false,
      filled: false,
      wonCount: 0,
      lostCount: 0,
      pushCount: 0,
      placerId: null,
      placerExplicit: false,
    };
    weeks.push(currentWeek);
  }

  // Whose turn it is to place the bet. The rotation walks the player order
  // one step per week; setting a week by hand re-anchors it from there.
  const rota = ROTATION_ORDER.filter((id) => players.some((p) => p.id === id));
  if (rota.length) {
    const ordered = [...weeks].sort((a, b) => a.week - b.week);
    let anchorWeek = ordered[0]?.week ?? 1;
    let anchorIdx = 0;
    for (const w of ordered) {
      const explicitIdx = w.placerExplicit ? rota.indexOf(w.placerId!) : -1;
      if (explicitIdx >= 0) {
        anchorWeek = w.week;
        anchorIdx = explicitIdx;
      } else {
        const n = rota.length;
        w.placerId = rota[(((anchorIdx + w.week - anchorWeek) % n) + n) % n];
        w.placerExplicit = false;
      }
    }
  }

  const movements: ViewMovement[] = raw.movements
    .map((m) => ({
      id: m.id,
      week: m.week_number,
      type: m.type,
      amount: +m.amount,
      notes: m.notes ?? "",
    }))
    .sort((a, b) => (a.week ?? 0) - (b.week ?? 0));

  const fundFromMovements = movements.reduce((a, m) => a + (+m.amount || 0), 0);

  return {
    players,
    weeks,
    currentWeek: currentWeek!,
    currentWeekNum: currentWeekNum!,
    movements,
    trip: {
      name: "Ca$hville",
      target: raw.trip?.target ?? 10000,
      current: fundFromMovements,
      tripDate: raw.trip?.trip_date ?? "October 2026",
      breakdown: raw.trip?.breakdown ?? [],
    },
    playedCount: weeks.filter((w) => w.filled).length,
    settings: {
      lateFine: num(raw.settings?.late_fine, DEFAULT_SETTINGS.lateFine),
      lossFine: num(raw.settings?.loss_fine, DEFAULT_SETTINGS.lossFine),
      streak4Fine: num(raw.settings?.streak4_fine, DEFAULT_SETTINGS.streak4Fine),
      topup2: num(raw.settings?.topup_2, DEFAULT_SETTINGS.topup2),
      topup3: num(raw.settings?.topup_3, DEFAULT_SETTINGS.topup3),
      overdueFine: num(raw.settings?.overdue_fine, DEFAULT_SETTINGS.overdueFine),
      sideBetTaxPct: num(raw.settings?.side_bet_tax_pct, DEFAULT_SETTINGS.sideBetTaxPct),
      rulesText: (raw.settings?.rules_text as string) ?? "",
      finesFromWeek: num(raw.settings?.fines_from_week, 0),
    },
    fines: (raw.fines ?? []).map(
      (f): Fine => ({
        id: f.id,
        week: f.week_number,
        playerId: f.player_id,
        kind: f.kind,
        amount: +f.amount,
        reason: f.reason ?? "",
        paid: !!f.paid,
        paidAt: f.paid_at ?? null,
        movementId: f.movement_id ?? null,
        parentId: f.parent_fine_id ?? null,
        createdAt: f.created_at,
      }),
    ),
    votes: (raw.votes ?? []).map(
      (v): Vote => ({
        id: v.id,
        week: v.week_number,
        voterId: v.voter_id,
        targetId: v.target_id,
        kind: v.kind,
      }),
    ),
    sideBets: (raw.sideBets ?? []).map(
      (b): SideBet => ({
        id: b.id,
        week: b.week_number,
        creatorId: b.creator_id,
        opponentId: b.opponent_id,
        subjectId: b.subject_id,
        creatorBacks: b.creator_backs,
        amount: +b.amount,
        status: b.status,
        paid: !!b.paid,
        movementId: b.movement_id ?? null,
        createdAt: b.created_at,
      }),
    ),
    v2Ready: !!raw.settings && !!raw.fines && !!raw.votes && !!raw.sideBets,
  };
}

function num(v: unknown, fallback: number): number {
  const n = v == null ? NaN : +(v as number);
  return Number.isFinite(n) ? n : fallback;
}

// ─── Formatters ─────────────────────────────────────────────────────────
export function fmtMoney(v: number, opts: { alwaysSign?: boolean } = {}): string {
  const sign = v < 0 ? "−" : opts.alwaysSign && v > 0 ? "+" : "";
  return sign + "€" + Math.abs(Math.round(v)).toLocaleString("en-IE");
}

export function fmtOdds(o: number | null | undefined): string {
  return o ? o.toFixed(2) : "—";
}

// ─── Mutators (write to Supabase) ───────────────────────────────────────
// Reload is the responsibility of the caller / realtime subscription — these
// just write and rely on the postgres_changes channel to push the new state.

// Ensure the week row exists. (Saturday of the current week.)
async function ensureWeekRow(weekNum: number) {
  const client = sb();
  const existing = await client.from("weeks").select("week_number").eq("week_number", weekNum).maybeSingle();
  if (!existing.data) {
    const today = new Date();
    const day = today.getDay();
    const daysToSat = (6 - day + 7) % 7;
    const sat = new Date(today);
    sat.setDate(today.getDate() + daysToSat);
    await client.from("weeks").insert({
      week_number: weekNum,
      week_date: sat.toISOString().slice(0, 10),
    });
  }
}

// Change the base acca stake for a week (defaults to €70 when never set).
// Automatic streak top-ups are added on top of this.
export async function setWeekStake(weekNum: number, stake: number) {
  await ensureWeekRow(weekNum);
  const { error } = await sb()
    .from("weeks")
    .update({ stake_per_acca: stake })
    .eq("week_number", weekNum);
  if (error) throw error;
}

export async function addPick(
  weekNum: number,
  playerId: string,
  payload: { sport: string; sel: string; odds: number; notes?: string },
  existingDbId?: string,
) {
  const client = sb();
  await ensureWeekRow(weekNum);
  const row = {
    week_number: weekNum,
    player_id: playerId,
    sport: payload.sport,
    selection: payload.sel,
    odds: payload.odds,
    filled: true,
    notes: payload.notes ?? "",
    updated_at: new Date().toISOString(),
  };
  if (existingDbId) {
    await client.from("picks").update(row).eq("id", existingDbId);
  } else {
    await client.from("picks").upsert(row, { onConflict: "week_number,player_id" });
  }
}

export async function clearPick(weekNum: number, playerId: string) {
  await sb().from("picks").delete().eq("week_number", weekNum).eq("player_id", playerId);
}

// Per-pick settle. After each call we check if all 7 picks for the week
// are now settled — if so we roll the week up (acca_won + combined_odds +
// payout) and auto-log a 'win' movement if it landed. Idempotent: re-tapping
// W/L/P just overwrites; the win movement check prevents double-logging.
export async function setPickResult(
  weekNum: number,
  playerId: string,
  result: "Won" | "Lost" | "Push" | null,
) {
  const client = sb();
  await client
    .from("picks")
    .update({ result, updated_at: new Date().toISOString() })
    .eq("week_number", weekNum)
    .eq("player_id", playerId);

  await syncLossFines(weekNum);

  // Re-fetch the week's picks to see if we've just completed it.
  const { data: picks } = await client
    .from("picks")
    .select("result, odds, filled")
    .eq("week_number", weekNum);
  if (!picks) return;

  const filled = picks.filter((p) => p.filled);
  const allSettled =
    filled.length === 7 &&
    filled.every(
      (p) => p.result === "Won" || p.result === "Lost" || p.result === "Push",
    );

  if (!allSettled) {
    // Either someone hasn't picked, or some results still pending. Reset
    // the week's settle state so an in-progress settle doesn't show as
    // banked. Important when the admin un-settles a pick after the fact.
    await client
      .from("weeks")
      .update({ acca_won: false, payout: 0 })
      .eq("week_number", weekNum);
    return;
  }

  // All 7 settled — compute outcome.
  const allWon = filled.every((p) => p.result === "Won");
  let combined = 1;
  for (const p of filled) {
    if (p.odds && (p.result === "Won" || p.result === "Lost")) {
      combined *= +p.odds;
    }
  }
  const combinedOdds = +combined.toFixed(2);
  const { data: weekRow } = await client
    .from("weeks")
    .select("stake_per_acca")
    .eq("week_number", weekNum)
    .maybeSingle();
  const { data: weekTopups } = await client
    .from("topups")
    .select("amount")
    .eq("week_number", weekNum);
  const stake =
    (weekRow?.stake_per_acca ?? DEFAULT_STAKE) +
    (weekTopups ?? []).reduce((a, t) => a + +t.amount, 0);
  const payout = allWon ? Math.round(stake * combinedOdds) : 0;

  await client
    .from("weeks")
    .update({
      acca_won: allWon,
      combined_odds: combinedOdds,
      payout,
    })
    .eq("week_number", weekNum);

  // Auto-log the win movement if the acca landed AND no win movement
  // already exists for this week (re-settling shouldn't double-log).
  if (allWon && payout > 0) {
    const { data: existing } = await client
      .from("movements")
      .select("id")
      .eq("week_number", weekNum)
      .eq("type", "win")
      .limit(1);
    if (!existing || existing.length === 0) {
      await addMovement({
        week: weekNum,
        type: "win",
        amount: payout,
        notes: `Acca landed @${combinedOdds.toFixed(2)}`,
      });
    }
  }
}

export async function addMovement(payload: {
  week: number | null;
  type: MovementRow["type"];
  amount: number;
  notes?: string;
}): Promise<string> {
  const { data, error } = await sb()
    .from("movements")
    .insert({
      week_number: payload.week,
      type: payload.type,
      amount: payload.amount,
      notes: payload.notes ?? "",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateMovement(
  id: string,
  payload: {
    week: number | null;
    type: MovementRow["type"];
    amount: number;
    notes?: string;
  },
) {
  const { error } = await sb()
    .from("movements")
    .update({
      week_number: payload.week,
      type: payload.type,
      amount: payload.amount,
      notes: payload.notes ?? "",
    })
    .eq("id", id);
  if (error) throw error;
}

export async function removeMovement(id: string) {
  await sb().from("movements").delete().eq("id", id);
}

// ─── Settle Week ────────────────────────────────────────────────────────
// Batch-update all 7 pick results for a week, then update the weeks row
// with acca_won + combined_odds + payout. Optionally log a 'win' movement
// when the acca lands so the pot moves automatically.
export async function settleWeek(args: {
  weekNum: number;
  results: Array<{ playerId: string; result: "Won" | "Lost" | "Push" }>;
  combinedOdds: number;
  payout: number;
  logWinMovement: boolean;
}) {
  const client = sb();
  const now = new Date().toISOString();

  // Update each pick result. Done in parallel — Supabase handles concurrency.
  await Promise.all(
    args.results.map((r) =>
      client
        .from("picks")
        .update({ result: r.result, updated_at: now })
        .eq("week_number", args.weekNum)
        .eq("player_id", r.playerId),
    ),
  );

  await syncLossFines(args.weekNum);

  const accaWon = args.results.every((r) => r.result === "Won");

  await client
    .from("weeks")
    .update({
      acca_won: accaWon,
      combined_odds: args.combinedOdds,
      payout: accaWon ? args.payout : 0,
    })
    .eq("week_number", args.weekNum);

  // Auto-log the win movement so the pot ledger stays in sync.
  if (accaWon && args.logWinMovement && args.payout > 0) {
    await addMovement({
      week: args.weekNum,
      type: "win",
      amount: args.payout,
      notes: `Acca landed @${args.combinedOdds.toFixed(2)}`,
    });
  }
}

// ─── Week details ───────────────────────────────────────────────────────
export async function setWeekDate(weekNum: number, date: string) {
  await ensureWeekRow(weekNum);
  const { error } = await sb().from("weeks").update({ week_date: date }).eq("week_number", weekNum);
  if (error) throw error;
}

// `playerId` null = go back to following the rotation.
export async function setWeekPlacer(weekNum: number, playerId: string | null) {
  await ensureWeekRow(weekNum);
  const { error } = await sb().from("weeks").update({ placer_id: playerId }).eq("week_number", weekNum);
  if (error) throw error;
}

export async function saveSettings(patch: Partial<Settings>) {
  const row: Record<string, unknown> = { id: 1 };
  if (patch.lateFine != null) row.late_fine = patch.lateFine;
  if (patch.lossFine != null) row.loss_fine = patch.lossFine;
  if (patch.streak4Fine != null) row.streak4_fine = patch.streak4Fine;
  if (patch.topup2 != null) row.topup_2 = patch.topup2;
  if (patch.topup3 != null) row.topup_3 = patch.topup3;
  if (patch.overdueFine != null) row.overdue_fine = patch.overdueFine;
  if (patch.sideBetTaxPct != null) row.side_bet_tax_pct = patch.sideBetTaxPct;
  if (patch.rulesText != null) row.rules_text = patch.rulesText;
  const { error } = await sb().from("app_settings").upsert(row);
  if (error) throw error;
}

// ─── Fines ──────────────────────────────────────────────────────────────
export const FINE_LABEL: Record<FineKind, string> = {
  late: "Late pick",
  loss: "Losing leg",
  overdue: "Unpaid fine",
  manual: "Fine",
};

export async function addFine(f: {
  week: number | null;
  playerId: string;
  kind: FineKind;
  amount: number;
  reason?: string;
  parentId?: string;
}) {
  const { error } = await sb().from("fines").insert({
    week_number: f.week,
    player_id: f.playerId,
    kind: f.kind,
    amount: f.amount,
    reason: f.reason ?? "",
    parent_fine_id: f.parentId ?? null,
  });
  if (error) throw error;
}

// Editing a paid fine's amount keeps its Pot entry in step.
export async function updateFine(fine: Fine, patch: { amount: number; reason: string }) {
  const { error } = await sb()
    .from("fines")
    .update({ amount: patch.amount, reason: patch.reason })
    .eq("id", fine.id);
  if (error) throw error;
  if (fine.paid && fine.movementId) {
    await sb().from("movements").update({ amount: patch.amount }).eq("id", fine.movementId);
  }
}

export async function deleteFine(fine: Fine) {
  if (fine.movementId) await removeMovement(fine.movementId);
  const { error } = await sb().from("fines").delete().eq("id", fine.id);
  if (error) throw error;
}

// Paying a fine drops it into the Pot; un-paying takes it back out.
export async function setFinePaid(fine: Fine, paid: boolean, playerName: string) {
  let movementId: string | null = null;
  if (paid) {
    movementId = await addMovement({
      week: fine.week,
      type: "forfeit",
      amount: fine.amount,
      notes: `${playerName} · ${FINE_LABEL[fine.kind].toLowerCase()}${fine.reason ? ` · ${fine.reason}` : ""}`,
    });
  } else if (fine.movementId) {
    await removeMovement(fine.movementId);
  }
  const { error } = await sb()
    .from("fines")
    .update({
      paid,
      paid_at: paid ? new Date().toISOString() : null,
      movement_id: movementId,
    })
    .eq("id", fine.id);
  if (error) throw error;
}

// Tick/untick "late" on a player's pick. Unticking only removes an unpaid fine.
export async function setLateFine(weekNum: number, playerId: string, late: boolean) {
  const client = sb();
  if (late) {
    const { data: st } = await client.from("app_settings").select("late_fine").limit(1);
    const { error } = await client.from("fines").insert({
      week_number: weekNum,
      player_id: playerId,
      kind: "late",
      amount: num(st?.[0]?.late_fine, DEFAULT_SETTINGS.lateFine),
    });
    // 23505 = it already exists, which is what we wanted anyway.
    if (error && error.code !== "23505") throw error;
  } else {
    await client
      .from("fines")
      .delete()
      .eq("week_number", weekNum)
      .eq("player_id", playerId)
      .eq("kind", "late")
      .eq("paid", false);
  }
}

// Losing streaks. Walking back from the newest week: a Lost pick adds one, a
// Won pick ends it, a push or a missed week is skipped.
function streakOf(results: string[]): number {
  let n = 0;
  for (const r of results) {
    if (r === "Lost") n++;
    else if (r === "Won") break;
  }
  return n;
}

// Each player's losing streak going INTO `weekNum` (weeks before it only).
export function lossStreaks(weeks: ViewWeek[], weekNum: number): Record<string, number> {
  const prior = weeks.filter((w) => w.week < weekNum).sort((a, b) => b.week - a.week);
  const results: Record<string, string[]> = {};
  for (const w of prior) {
    for (const p of w.picks) (results[p.playerId] ||= []).push(p.result);
  }
  const out: Record<string, number> = {};
  for (const id of Object.keys(results)) out[id] = streakOf(results[id]);
  return out;
}

// What a streak costs on top of the kitty fine: extra on next week's bet
// after 2 or 3 in a row, and a ban at 4.
export function streakPenalty(streak: number, s: Settings): { topup: number; banned: boolean } {
  if (streak >= 4) return { topup: 0, banned: true };
  if (streak === 3) return { topup: s.topup3, banned: false };
  if (streak === 2) return { topup: s.topup2, banned: false };
  return { topup: 0, banned: false };
}

// Keep losing-leg fines matching the week's results: a Lost pick gets one
// (the bigger one on a 4th loss in a row), and an unpaid one disappears if
// the result is corrected. Quietly does nothing until the v2 tables exist.
async function syncLossFines(weekNum: number) {
  const client = sb();
  const [{ data: st }, { data: picks }, { data: existing, error }] = await Promise.all([
    client.from("app_settings").select("loss_fine, streak4_fine, topup_2, topup_3, fines_from_week").limit(1),
    client.from("picks").select("player_id, result, week_number").lte("week_number", weekNum),
    client.from("fines").select("id, player_id, paid").eq("week_number", weekNum).eq("kind", "loss"),
  ]);
  if (error || !picks) return;
  if (weekNum < num(st?.[0]?.fines_from_week, 0)) return;
  const lost = new Set(
    picks.filter((p) => p.week_number === weekNum && p.result === "Lost").map((p) => p.player_id),
  );
  const streakFor = (id: string) =>
    streakOf(
      picks
        .filter((p) => p.player_id === id)
        .sort((a, b) => b.week_number - a.week_number)
        .map((p) => p.result ?? ""),
    );

  // Top-ups on NEXT week's bet: 2 or 3 losses in a row. Rebuilt from
  // scratch for this week each time, so correcting a result undoes it.
  const topups = [...lost]
    .map((id) => {
      const streak = streakFor(id);
      const amount =
        streak === 2
          ? num(st?.[0]?.topup_2, DEFAULT_SETTINGS.topup2)
          : streak === 3
            ? num(st?.[0]?.topup_3, DEFAULT_SETTINGS.topup3)
            : 0;
      return { week_number: weekNum + 1, source_week: weekNum, player_id: id, amount };
    })
    .filter((t) => t.amount > 0);
  await client.from("topups").delete().eq("source_week", weekNum);
  if (topups.length) await client.from("topups").insert(topups);

  const have = new Set((existing ?? []).map((f) => f.player_id));
  const toAdd = [...lost].filter((id) => !have.has(id));
  const toDrop = (existing ?? []).filter((f) => !lost.has(f.player_id) && !f.paid);
  if (toAdd.length) {
    await client.from("fines").insert(
      toAdd.map((id) => {
        const streak = streakFor(id);
        return {
          week_number: weekNum,
          player_id: id,
          kind: "loss",
          amount:
            streak >= 4
              ? num(st?.[0]?.streak4_fine, DEFAULT_SETTINGS.streak4Fine)
              : num(st?.[0]?.loss_fine, DEFAULT_SETTINGS.lossFine),
          reason: streak >= 2 ? `${streak} in a row` : "",
        };
      }),
    );
  }
  if (toDrop.length) {
    await client.from("fines").delete().in("id", toDrop.map((f) => f.id));
  }
}

// When a fine has to be paid by: before the following week's bet is placed,
// i.e. the Friday 6pm pick deadline after the fine's week (week dates are
// Saturdays, so that's six days on at 18:00).
export function fineDeadline(fine: Fine, weeks: ViewWeek[]): Date {
  const wk = fine.week != null ? weeks.find((w) => w.week === fine.week) : null;
  if (wk) {
    const d = new Date(wk.date + "T18:00:00");
    d.setDate(d.getDate() + 6);
    return d;
  }
  const d = new Date(fine.createdAt);
  d.setDate(d.getDate() + 7);
  return d;
}

// Add the "unpaid fine" surcharge to anything that sailed past its deadline.
// Runs when the app loads; the unique index stops two phones doubling up.
export async function sweepOverdueFines(bd: BD) {
  if (!bd.v2Ready) return;
  const now = new Date();
  const surcharged = new Set(bd.fines.map((f) => f.parentId).filter(Boolean));
  const due = bd.fines.filter((f) => {
    if (f.kind === "overdue" || surcharged.has(f.id)) return false;
    const deadline = fineDeadline(f, bd.weeks);
    return f.paid ? !!f.paidAt && new Date(f.paidAt) > deadline : now > deadline;
  });
  if (!due.length) return;
  await sb()
    .from("fines")
    .upsert(
      due.map((f) => ({
        week_number: f.week,
        player_id: f.playerId,
        kind: "overdue",
        amount: bd.settings.overdueFine,
        reason: `${FINE_LABEL[f.kind].toLowerCase()} not paid in time`,
        parent_fine_id: f.id,
      })),
      { onConflict: "parent_fine_id", ignoreDuplicates: true },
    );
}

// ─── Votes ──────────────────────────────────────────────────────────────
// ⭐ and 💩: one of each per voter per week. Vibes: win OR lose per pick.
// Tapping the vote you already cast removes it.
export async function castVote(
  weekNum: number,
  voterId: string,
  targetId: string,
  kind: VoteKind,
  existing: Vote[],
) {
  const client = sb();
  const mine = existing.filter((v) => v.week === weekNum && v.voterId === voterId);
  const same = mine.find((v) => v.targetId === targetId && v.kind === kind);
  const clash =
    kind === "star" || kind === "poo"
      ? mine.filter((v) => v.kind === kind)
      : mine.filter((v) => v.targetId === targetId && (v.kind === "win" || v.kind === "lose"));
  if (clash.length) {
    const { error } = await client.from("votes").delete().in("id", clash.map((v) => v.id));
    if (error) throw error;
  }
  if (same) return;
  const { error } = await client.from("votes").insert({
    week_number: weekNum,
    voter_id: voterId,
    target_id: targetId,
    kind,
  });
  if (error) throw error;
}

// ─── Side bets ──────────────────────────────────────────────────────────
export async function addSideBet(b: {
  week: number;
  creatorId: string;
  opponentId: string;
  subjectId: string;
  creatorBacks: "win" | "lose";
  amount: number;
}): Promise<string> {
  const { data, error } = await sb()
    .from("side_bets")
    .insert({
    week_number: b.week,
    creator_id: b.creatorId,
    opponent_id: b.opponentId,
    subject_id: b.subjectId,
    creator_backs: b.creatorBacks,
    amount: b.amount,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function respondSideBet(id: string, status: "accepted" | "declined") {
  const { error } = await sb().from("side_bets").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteSideBet(bet: SideBet) {
  if (bet.movementId) await removeMovement(bet.movementId);
  const { error } = await sb().from("side_bets").delete().eq("id", bet.id);
  if (error) throw error;
}

// Where a side bet stands, worked out from the subject's pick result.
export type SideBetOutcome =
  | { state: "open" | "declined" | "live" | "void" }
  | { state: "won"; winnerId: string; loserId: string; tax: number; toWinner: number };

export function sideBetOutcome(bet: SideBet, weeks: ViewWeek[], taxPct: number): SideBetOutcome {
  if (bet.status === "declined") return { state: "declined" };
  const pick = weeks.find((w) => w.week === bet.week)?.picks.find((p) => p.playerId === bet.subjectId);
  const result = pick?.result ?? "";
  if (bet.status === "open") return { state: result ? "void" : "open" };
  if (result === "Push") return { state: "void" };
  if (result !== "Won" && result !== "Lost") return { state: "live" };
  const creatorWon = (result === "Won") === (bet.creatorBacks === "win");
  const tax = Math.round(bet.amount * taxPct) / 100;
  return {
    state: "won",
    winnerId: creatorWon ? bet.creatorId : bet.opponentId,
    loserId: creatorWon ? bet.opponentId : bet.creatorId,
    tax,
    toWinner: bet.amount - tax,
  };
}

// Squaring up: the loser has paid, so the Pot's cut goes into the ledger.
export async function setSideBetPaid(bet: SideBet, paid: boolean, tax: number, note: string) {
  let movementId: string | null = null;
  if (paid && tax > 0) {
    movementId = await addMovement({ week: bet.week, type: "bonus", amount: tax, notes: note });
  } else if (!paid && bet.movementId) {
    await removeMovement(bet.movementId);
  }
  const { error } = await sb().from("side_bets").update({ paid, movement_id: movementId }).eq("id", bet.id);
  if (error) throw error;
}

// ─── Player photos ──────────────────────────────────────────────────────
// Shrink whatever the phone hands us to a 160px centre-cropped square JPEG
// (a few KB) so it can live in the players row and load with everything else.
export async function shrinkPhoto(file: File, size = 160): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file isn't a picture the phone can read"));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    canvas
      .getContext("2d")!
      .drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// `photo` null = back to initials.
export async function setPlayerPhoto(playerId: string, photo: string | null) {
  const { error } = await sb().from("players").update({ photo }).eq("id", playerId);
  if (error) throw error;
}

// ─── Celebration clips ──────────────────────────────────────────────────
// A short video or GIF per player, kept in the public "clips" storage
// folder. It plays when their pick wins, or when they kill the slip.
export const CLIP_MAX_MB = 12;

export async function setPlayerClip(playerId: string, file: File | null) {
  const client = sb();
  let url: string | null = null;
  if (file) {
    if (file.size > CLIP_MAX_MB * 1024 * 1024) {
      throw new Error(`That clip is too big — keep it under ${CLIP_MAX_MB} MB (a few seconds is plenty)`);
    }
    const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${playerId}-${Date.now()}.${ext}`;
    const { error } = await client.storage.from("clips").upload(path, file, { contentType: file.type, upsert: true });
    if (error) throw error;
    url = client.storage.from("clips").getPublicUrl(path).data.publicUrl;
  }
  const { error } = await client.from("players").update({ clip: url }).eq("id", playerId);
  if (error) throw error;
}
