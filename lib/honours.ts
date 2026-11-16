// The banter layer over the BD view: trophies, the last-weekend recap, and
// the fines / vibes / side-bet tables. Pure functions, no Supabase calls.

import { sideBetOutcome } from "./bd";
import { computePlayerStats, type PlayerStats } from "./stats";
import type { BD, Player, ViewWeek } from "./types";

// Form trophies are judged on this many of the most recent settled weeks,
// so they change hands instead of being decided by week 10.
export const FORM_WINDOW = 6;

const isSettled = (w: ViewWeek) => {
  const filled = w.picks.filter((p) => p.filled);
  return filled.length > 0 && filled.every((p) => p.result);
};

export function settledWeeks(bd: BD): ViewWeek[] {
  return bd.weeks.filter(isSettled).sort((a, b) => a.week - b.week);
}

// The BD as it stood once `cutoff` was the latest week.
function asOf(bd: BD, cutoff: number): BD {
  return {
    ...bd,
    weeks: bd.weeks.filter((w) => w.week <= cutoff),
    votes: bd.votes.filter((v) => v.week <= cutoff),
    fines: bd.fines.filter((f) => f.week == null || f.week <= cutoff),
    sideBets: bd.sideBets.filter((b) => b.week <= cutoff),
  };
}

// ─── Trophies ────────────────────────────────────────────────────────────

export type Award = {
  key: string;
  title: string;
  winner: Player;
  value: string;
  slag: string;
  color: string;
  basis: string; // "last 6 weeks" / "all season"
  allTime?: Player; // season-long holder, when it's someone else
  takenFrom?: Player; // who held it a week ago, when it changed hands
};

const SLAG: Record<string, string[]> = {
  banker: [
    "Boring. Effective. Boring.",
    "Statistically the only one trying.",
    "Picks short prices and acts like a hero.",
    "Carrying six passengers and knows it.",
  ],
  donkey: [
    "The bookies' favourite customer.",
    "Has never met an odds-against shot he didn't love.",
    "If you fired darts at a coupon you'd do better.",
    "Consistently, impressively wrong.",
  ],
  soloKill: [
    "One job. Truly, one job.",
    "Singlehandedly torched the slip.",
    "Cost the players a small house deposit.",
    "Personally responsible. Should be paying back.",
  ],
  reliable: [
    "Never lets the players down.",
    "Steady hands when it counts.",
    "The one you'd actually trust with the slip.",
  ],
  coward: [
    "Wouldn't back the sun to rise at evens.",
    "1.20 shots and a clear conscience.",
    "Risk-averse to the point of medical concern.",
  ],
  dreamer: [
    "4/1 shots are not 'value', they're a personality disorder.",
    "Believes in vibes, not value.",
    "Thinks every week is the week.",
  ],
  pony: [
    "Knows one sport. Barely.",
    "Variety is for other people.",
    "Has not looked at another market since 2019.",
  ],
  tourist: [
    "Darts, GAA, golf, horses. No idea about any of them.",
    "Will bet on anything with a scoreboard.",
    "A man of many sports and no expertise.",
  ],
  starMan: [
    "The people's champion. Insufferable about it.",
    "Picks bets the group actually likes. Suspicious.",
  ],
  stinker: [
    "Voted worst in show. Repeatedly.",
    "The group has spoken, and it wasn't kind.",
  ],
  publicEnemy: [
    "Nobody believes in him. Fair enough.",
    "The pick everyone wants to see lose.",
  ],
  mystic: [
    "Knows who's going to bottle it before they do.",
    "Should be picking everyone's bets, frankly.",
  ],
  jinx: [
    "Back him and it loses. Doubt him and it wins.",
    "His thumbs-up is a death sentence.",
  ],
  sinBin: [
    "Single-handedly funding the trip.",
    "Nashville says thank you.",
  ],
  lateMerchant: [
    "Friday 6pm is more of a suggestion.",
    "Operates on his own time zone.",
  ],
  shark: [
    "Makes more off the lads than off the bookies.",
    "Circling. Always circling.",
  ],
  mug: [
    "A fool and his tenner are soon parted.",
    "Keeps taking the bet. Keeps paying up.",
  ],
};

type RawAward = Omit<Award, "slag" | "allTime" | "takenFrom" | "winner"> & { winnerId: string };

function rawAwards(bd: BD, cutoff: number): { awards: RawAward[]; allTime: Record<string, string> } {
  const upto = asOf(bd, cutoff);
  const settled = settledWeeks(upto);
  const recentWeeks = settled.slice(-FORM_WINDOW);
  const recent = computePlayerStats({ ...upto, weeks: recentWeeks }).filter((s) => s.played > 0);
  const season = computePlayerStats({ ...upto, weeks: settled }).filter((s) => s.played > 0);
  const out: RawAward[] = [];
  const allTime: Record<string, string> = {};
  if (!recent.length) return { awards: out, allTime };

  const window = `last ${recentWeeks.length} weeks`;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const first = (rows: PlayerStats[], cmp: (a: PlayerStats, b: PlayerStats) => number) =>
    [...rows].sort(cmp)[0];

  // Form trophies: same test on the recent window and on the whole season.
  const form: {
    key: string;
    title: string;
    color: string;
    cmp: (a: PlayerStats, b: PlayerStats) => number;
    value: (s: PlayerStats) => string;
    qualifies?: (s: PlayerStats) => boolean;
  }[] = [
    {
      key: "banker",
      title: "The Banker",
      color: "var(--c-forest)",
      cmp: (a, b) => b.hitRate - a.hitRate || b.avgWinOdds - a.avgWinOdds,
      value: (s) => `${pct(s.hitRate)} hit · ${s.wins}/${s.played}`,
    },
    {
      key: "donkey",
      title: "The Donkey",
      color: "var(--c-burgundy)",
      cmp: (a, b) => a.hitRate - b.hitRate || b.losses - a.losses,
      value: (s) => `${pct(s.hitRate)} hit · ${s.wins}/${s.played}`,
    },
    {
      key: "soloKill",
      title: "Most Solo Kills",
      color: "var(--c-burgundy)",
      cmp: (a, b) => b.soloKills - a.soloKills || b.soloKillCost - a.soloKillCost,
      value: (s) => `${s.soloKills} week${s.soloKills === 1 ? "" : "s"}`,
      qualifies: (s) => s.soloKills > 0,
    },
    {
      key: "reliable",
      title: "Mr Reliable",
      color: "var(--c-forest)",
      cmp: (a, b) => b.longestWin - a.longestWin || b.hitRate - a.hitRate,
      value: (s) => `${s.longestWin}-win streak`,
      qualifies: (s) => s.longestWin >= 2,
    },
    {
      key: "coward",
      title: "The Coward",
      color: "var(--c-denim)",
      cmp: (a, b) => a.avgOdds - b.avgOdds,
      value: (s) => `avg odds ${s.avgOdds.toFixed(2)}`,
    },
    {
      key: "dreamer",
      title: "The Dreamer",
      color: "var(--c-mustard)",
      cmp: (a, b) => b.avgOdds - a.avgOdds,
      value: (s) => `avg odds ${s.avgOdds.toFixed(2)}`,
    },
  ];
  for (const f of form) {
    const w = first(recent, f.cmp);
    if (f.qualifies && !f.qualifies(w)) continue;
    out.push({ key: f.key, title: f.title, winnerId: w.player.id, value: f.value(w), color: f.color, basis: window });
    const all = first(season, f.cmp);
    if (!f.qualifies || f.qualifies(all)) allTime[f.key] = all.player.id;
  }

  // Sport habits — judged on the whole season (six picks is too few).
  const habits = bd.players
    .map((player) => {
      const sports: Record<string, number> = {};
      let total = 0;
      for (const w of settled) {
        const p = w.picks.find((x) => x.playerId === player.id);
        if (p?.filled && p.sport) {
          sports[p.sport] = (sports[p.sport] || 0) + 1;
          total++;
        }
      }
      const top = Object.entries(sports).sort((a, b) => b[1] - a[1])[0];
      return { id: player.id, total, kinds: Object.keys(sports).length, top, share: top ? top[1] / total : 0 };
    })
    .filter((h) => h.total >= 5);
  if (habits.length) {
    const pony = [...habits].sort((a, b) => b.share - a.share)[0];
    out.push({
      key: "pony",
      title: "One-Trick Pony",
      winnerId: pony.id,
      value: `${pct(pony.share)} ${pony.top![0]}`,
      color: "var(--c-brick)",
      basis: "all season",
    });
    const tourist = [...habits].sort((a, b) => b.kinds - a.kinds || a.share - b.share)[0];
    if (tourist.kinds > 1) {
      out.push({
        key: "tourist",
        title: "The Tourist",
        winnerId: tourist.id,
        value: `${tourist.kinds} different sports`,
        color: "var(--c-denim)",
        basis: "all season",
      });
    }
  }

  // Votes, fines and side bets — only handed out once there's data.
  const tally = <T,>(items: T[], key: (t: T) => string, weight: (t: T) => number = () => 1) => {
    const t: Record<string, number> = {};
    for (const it of items) t[key(it)] = (t[key(it)] || 0) + weight(it);
    return Object.entries(t).sort((a, b) => b[1] - a[1]);
  };
  const push = (key: string, title: string, color: string, row: [string, number] | undefined, value: (n: number) => string) => {
    if (row && row[1] > 0) out.push({ key, title, winnerId: row[0], value: value(row[1]), color, basis: "all season" });
  };
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  push("starMan", "Star Man", "var(--c-mustard)", tally(upto.votes.filter((v) => v.kind === "star"), (v) => v.targetId)[0], (n) => plural(n, "⭐ vote"));
  push("stinker", "The Stinker", "var(--c-brick)", tally(upto.votes.filter((v) => v.kind === "poo"), (v) => v.targetId)[0], (n) => plural(n, "💩 vote"));
  push("publicEnemy", "Public Enemy", "var(--c-burgundy)", tally(upto.votes.filter((v) => v.kind === "lose"), (v) => v.targetId)[0], (n) => plural(n, "👎 vote"));

  const callers = computeVibes(upto)
    .filter((v) => v.calls >= 3)
    .sort((a, b) => b.right / b.calls - a.right / a.calls || b.calls - a.calls);
  if (callers.length) {
    const best = callers[0];
    out.push({ key: "mystic", title: "Mystic Meg", winnerId: best.player.id, value: `${best.right}/${best.calls} calls right`, color: "var(--c-denim)", basis: "all season" });
    const worst = callers[callers.length - 1];
    if (worst.player.id !== best.player.id) {
      out.push({ key: "jinx", title: "The Jinx", winnerId: worst.player.id, value: `${worst.right}/${worst.calls} calls right`, color: "var(--c-burgundy)", basis: "all season" });
    }
  }

  push("sinBin", "Sin Bin King", "var(--c-burgundy)", tally(upto.fines, (f) => f.playerId, (f) => f.amount)[0], (n) => `€${Math.round(n)} in fines`);
  push("lateMerchant", "Late Merchant", "var(--c-mustard)", tally(upto.fines.filter((f) => f.kind === "late"), (f) => f.playerId)[0], (n) => plural(n, "late pick"));

  const ledger = computeSideBetLedger(upto).rows.filter((r) => r.bets > 0);
  if (ledger.length) {
    const shark = [...ledger].sort((a, b) => b.net - a.net)[0];
    if (shark.net > 0) out.push({ key: "shark", title: "Side Bet Shark", winnerId: shark.player.id, value: `+€${Math.round(shark.net)} on side bets`, color: "var(--c-forest)", basis: "all season" });
    const mug = [...ledger].sort((a, b) => a.net - b.net)[0];
    if (mug.net < 0) out.push({ key: "mug", title: "The Mug", winnerId: mug.player.id, value: `−€${Math.round(-mug.net)} on side bets`, color: "var(--c-burgundy)", basis: "all season" });
  }

  return { awards: out, allTime };
}

export function computeAwards(bd: BD): Award[] {
  const settled = settledWeeks(bd);
  if (!settled.length) return [];
  const latest = settled[settled.length - 1].week;
  const now = rawAwards(bd, latest);
  const before = settled.length > 1 ? rawAwards(bd, settled[settled.length - 2].week).awards : [];
  const player = (id: string | undefined) => bd.players.find((p) => p.id === id);

  return now.awards.flatMap((a) => {
    const winner = player(a.winnerId);
    if (!winner) return [];
    const lines = SLAG[a.key] ?? [""];
    const prev = before.find((b) => b.key === a.key);
    const allTime = now.allTime[a.key];
    return [
      {
        key: a.key,
        title: a.title,
        winner,
        value: a.value,
        color: a.color,
        basis: a.basis,
        // A different line each week, the same for everyone that week.
        slag: lines[latest % lines.length],
        allTime: allTime && allTime !== a.winnerId ? player(allTime) : undefined,
        takenFrom: prev && prev.winnerId !== a.winnerId ? player(prev.winnerId) : undefined,
      },
    ];
  });
}

// ─── Last weekend ────────────────────────────────────────────────────────

export type Recap = {
  week: ViewWeek;
  losers: Player[];
  hero: { player: Player; odds: number; sel: string } | null; // biggest-odds winner
  villain: { player: Player; odds: number; sel: string; solo: boolean } | null;
  star: { player: Player; votes: number } | null;
  poo: { player: Player; votes: number } | null;
  fines: { player: Player; amount: number }[];
  topups: { player: Player; amount: number }[]; // on the following bet
  sideBets: { winner: Player; loser: Player; amount: number }[];
};

export function computeRecap(bd: BD): Recap | null {
  const settled = settledWeeks(bd);
  const week = settled[settled.length - 1];
  if (!week) return null;
  const player = (id: string) => bd.players.find((p) => p.id === id);
  const withPlayer = week.picks.flatMap((p) => {
    const pl = player(p.playerId);
    return pl && p.filled ? [{ ...p, player: pl }] : [];
  });
  const won = withPlayer.filter((p) => p.result === "Won").sort((a, b) => (b.odds ?? 0) - (a.odds ?? 0));
  const lost = withPlayer.filter((p) => p.result === "Lost").sort((a, b) => (a.odds ?? 0) - (b.odds ?? 0));
  const topVote = (kind: "star" | "poo") => {
    const counts: Record<string, number> = {};
    for (const v of bd.votes) if (v.week === week.week && v.kind === kind) counts[v.targetId] = (counts[v.targetId] || 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const pl = top && player(top[0]);
    return pl ? { player: pl, votes: top[1] } : null;
  };
  const sum = (rows: { playerId: string; amount: number }[]) => {
    const by: Record<string, number> = {};
    for (const r of rows) by[r.playerId] = (by[r.playerId] || 0) + r.amount;
    return Object.entries(by).flatMap(([id, amount]) => {
      const pl = player(id);
      return pl ? [{ player: pl, amount }] : [];
    });
  };
  const next = bd.weeks.find((w) => w.week === week.week + 1);

  return {
    week,
    losers: lost.map((p) => p.player),
    hero: won[0] ? { player: won[0].player, odds: won[0].odds ?? 0, sel: won[0].sel } : null,
    // The shortest-priced loser is the one that hurts most.
    villain: lost[0] ? { player: lost[0].player, odds: lost[0].odds ?? 0, sel: lost[0].sel, solo: lost.length === 1 } : null,
    star: topVote("star"),
    poo: topVote("poo"),
    fines: sum(bd.fines.filter((f) => f.week === week.week)),
    topups: sum(next?.topups ?? []),
    sideBets: bd.sideBets
      .filter((b) => b.week === week.week)
      .flatMap((b) => {
        const o = sideBetOutcome(b, bd.weeks, bd.settings.sideBetTaxPct);
        if (o.state !== "won") return [];
        const w = player(o.winnerId);
        const l = player(o.loserId);
        return w && l ? [{ winner: w, loser: l, amount: b.amount }] : [];
      }),
  };
}

// ─── Fines league ────────────────────────────────────────────────────────

export type FinesRow = { player: Player; total: number; paid: number; owed: number; count: number; late: number };

export function computeFinesLeague(bd: BD): FinesRow[] {
  return bd.players
    .map((player) => {
      const mine = bd.fines.filter((f) => f.playerId === player.id);
      const paid = mine.filter((f) => f.paid).reduce((a, f) => a + f.amount, 0);
      const total = mine.reduce((a, f) => a + f.amount, 0);
      return { player, total, paid, owed: total - paid, count: mine.length, late: mine.filter((f) => f.kind === "late").length };
    })
    .sort((a, b) => b.total - a.total);
}

// ─── Vibes table ─────────────────────────────────────────────────────────

export type VibesRow = {
  player: Player;
  backed: number; // 👍 received
  doubted: number; // 👎 received
  calls: number; // own 👍/👎 votes on picks that have a result
  right: number;
};

export function computeVibes(bd: BD): VibesRow[] {
  return bd.players.map((player) => {
    let calls = 0;
    let right = 0;
    for (const v of bd.votes) {
      if (v.voterId !== player.id || (v.kind !== "win" && v.kind !== "lose")) continue;
      const result = bd.weeks.find((w) => w.week === v.week)?.picks.find((p) => p.playerId === v.targetId)?.result;
      if (result !== "Won" && result !== "Lost") continue;
      calls++;
      if ((v.kind === "win") === (result === "Won")) right++;
    }
    return {
      player,
      backed: bd.votes.filter((v) => v.targetId === player.id && v.kind === "win").length,
      doubted: bd.votes.filter((v) => v.targetId === player.id && v.kind === "lose").length,
      calls,
      right,
    };
  });
}

// ─── Side bet ledger ─────────────────────────────────────────────────────

export type SideBetLedger = {
  rows: { player: Player; bets: number; won: number; lost: number; net: number }[];
  owed: { from: Player; to: Player; amount: number; tax: number; week: number }[]; // not squared up yet
  live: number; // accepted, waiting on a result
};

export function computeSideBetLedger(bd: BD): SideBetLedger {
  const rows = bd.players.map((player) => ({ player, bets: 0, won: 0, lost: 0, net: 0 }));
  const row = (id: string) => rows.find((r) => r.player.id === id);
  const owed: SideBetLedger["owed"] = [];
  let live = 0;
  for (const b of bd.sideBets) {
    const o = sideBetOutcome(b, bd.weeks, bd.settings.sideBetTaxPct);
    if (o.state === "live") live++;
    if (o.state !== "won") continue;
    const w = row(o.winnerId);
    const l = row(o.loserId);
    if (!w || !l) continue;
    w.bets++;
    w.won++;
    w.net += o.toWinner;
    l.bets++;
    l.lost++;
    l.net -= b.amount;
    if (!b.paid) owed.push({ from: l.player, to: w.player, amount: o.toWinner, tax: o.tax, week: b.week });
  }
  return { rows: rows.sort((a, b) => b.net - a.net), owed, live };
}
