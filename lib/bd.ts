// Ca$hville data layer — ported from data.js. Fetches raw rows from Supabase
// and reshapes them into the BD view that components consume.

import { sb } from "./supabase";
import type {
  BD,
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

type Raw = {
  players: Player[];
  weeks: WeekRow[];
  picks: PickRow[];
  movements: MovementRow[];
  trip: TripRow | null;
};

export async function fetchAll(): Promise<Raw> {
  const client = sb();
  const [players, weeks, picks, movements, trips] = await Promise.all([
    client.from("players").select("*").order("name"),
    client.from("weeks").select("*").order("week_number"),
    client.from("picks").select("*"),
    client.from("movements").select("*").order("week_number"),
    client.from("trip_config").select("*").limit(1),
  ]);
  return {
    players: (players.data ?? []) as Player[],
    weeks: (weeks.data ?? []) as WeekRow[],
    picks: (picks.data ?? []) as PickRow[],
    movements: (movements.data ?? []) as MovementRow[],
    trip: ((trips.data ?? [])[0] ?? null) as TripRow | null,
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
    // live as the lads enter their picks. (The prototype only counts Won|Lost,
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
      combinedOdds: w.combined_odds != null ? +w.combined_odds : +combined.toFixed(2),
      stake: w.stake_per_acca ?? 70,
      payout: +(w.payout ?? 0),
      accaWon: !!w.acca_won,
      filled,
      wonCount,
      lostCount,
      pushCount,
    };
  });

  // Current week = first un-filled week. If everything's filled, synthesize
  // an empty next week so the Slip screen is never blank.
  let currentWeekNum: number | null = null;
  for (const w of weeks) {
    if (!w.filled) {
      currentWeekNum = w.week;
      break;
    }
  }
  if (currentWeekNum == null && weeks.length) {
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
      stake: 70,
      payout: 0,
      accaWon: false,
      filled: false,
      wonCount: 0,
      lostCount: 0,
      pushCount: 0,
    };
    weeks.push(currentWeek);
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
  };
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

export async function addPick(
  weekNum: number,
  playerId: string,
  payload: { sport: string; sel: string; odds: number; notes?: string },
  existingDbId?: string,
) {
  const client = sb();
  // Ensure the week row exists. (Saturday of the current week.)
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

export async function setPickResult(
  weekNum: number,
  playerId: string,
  result: "Won" | "Lost" | "Push" | null,
) {
  await sb()
    .from("picks")
    .update({ result, updated_at: new Date().toISOString() })
    .eq("week_number", weekNum)
    .eq("player_id", playerId);
}

export async function addMovement(payload: {
  week: number | null;
  type: MovementRow["type"];
  amount: number;
  notes?: string;
}) {
  await sb().from("movements").insert({
    week_number: payload.week,
    type: payload.type,
    amount: payload.amount,
    notes: payload.notes ?? "",
  });
}

export async function removeMovement(id: string) {
  await sb().from("movements").delete().eq("id", id);
}
