// Computed stats for the Stats screen. Pure functions over the BD view —
// no Supabase calls. Ported from data.js buildView() in the prototype.

import type { BD, Player, ViewWeek } from "./types";

export type PlayerStats = {
  player: Player;
  wins: number;
  losses: number;
  pushes: number;
  played: number;
  hitRate: number; // 0..1
  avgOdds: number;        // mean of all picks' odds
  avgWinOdds: number;     // mean of WINNING picks' odds only
  biggestOdds: number;
  soloKills: number; // weeks where this lad was the only loser
  soloKillCost: number; // gross payout the group missed across his solo kills
  heroPicks: number; // weeks where the acca won and this lad's pick contributed
  longestWin: number;
  longestLose: number;
  punishmentPaid: number;
};

export function computePlayerStats(bd: BD): PlayerStats[] {
  const settled = bd.weeks.filter((w) => w.filled);
  return bd.players.map((player) => {
    const all = settled
      .map((w) => w.picks.find((p) => p.playerId === player.id))
      .filter((p): p is NonNullable<typeof p> => !!p && p.filled);
    const won = all.filter((p) => p.result === "Won");
    const lost = all.filter((p) => p.result === "Lost");
    const push = all.filter((p) => p.result === "Push");
    const odds = all.filter((p) => p.odds).map((p) => p.odds!);
    const avg = odds.length ? odds.reduce((a, b) => a + b, 0) / odds.length : 0;
    const biggest = odds.length ? Math.max(...odds) : 0;
    // Avg odds across WINNING picks only — measures "how juicy are the
    // bets this lad actually lands?" A high number = they win big when
    // they win; low = they only land short-price bankers.
    const wonOdds = won.filter((p) => p.odds).map((p) => p.odds!);
    const avgWin = wonOdds.length
      ? wonOdds.reduce((a, b) => a + b, 0) / wonOdds.length
      : 0;

    // Solo kills — weeks where exactly one pick lost and it was his. The
    // cost is the gross payout the group would have banked that week
    // (stake × combined odds). combinedOdds already includes his losing
    // leg's odds, since buildView multiplies every non-push pick — so for a
    // solo-kill week it's precisely "what we'd have won if his leg landed."
    const soloKillWeeks = settled.filter((w) => {
      const losers = w.picks.filter((p) => p.result === "Lost");
      return losers.length === 1 && losers[0].playerId === player.id;
    });
    const soloKills = soloKillWeeks.length;
    const soloKillCost = soloKillWeeks.reduce(
      (acc, w) => acc + (w.stake || 70) * w.combinedOdds,
      0,
    );

    const heroPicks = settled.filter(
      (w) =>
        w.accaWon &&
        w.picks.find((p) => p.playerId === player.id && p.result === "Won"),
    ).length;

    // Streaks — walk in week order; Push breaks both streaks (treated as neutral).
    const ordered = [...settled]
      .sort((a, b) => a.week - b.week)
      .map((w) => w.picks.find((x) => x.playerId === player.id)?.result ?? "");
    let lw = 0, cw = 0, ll = 0, cl = 0;
    for (const r of ordered) {
      if (r === "Won") {
        cw++;
        cl = 0;
        lw = Math.max(lw, cw);
      } else if (r === "Lost") {
        cl++;
        cw = 0;
        ll = Math.max(ll, cl);
      } else {
        cw = 0;
        cl = 0;
      }
    }

    const punishmentPaid = all.reduce((acc, p) => acc + (+p.punishment || 0), 0);

    return {
      player,
      wins: won.length,
      losses: lost.length,
      pushes: push.length,
      played: all.length,
      hitRate: won.length / Math.max(1, all.length),
      avgOdds: +avg.toFixed(2),
      avgWinOdds: +avgWin.toFixed(2),
      biggestOdds: +biggest.toFixed(2),
      soloKills,
      soloKillCost: Math.round(soloKillCost),
      heroPicks,
      longestWin: lw,
      longestLose: ll,
      punishmentPaid,
    };
  });
}

// ─── Awards (Honours Wall) ──────────────────────────────────────────────
// Six auto-computed awards. Each has banter copy that rotates so the same
// joke doesn't show every refresh.

export type Award = {
  key: string;
  title: string;
  winner: PlayerStats;
  value: string;
  slag: string;
  color: string;
};

const SLAG: Record<string, string[]> = {
  banker: [
    "Boring. Effective. Boring.",
    "Statistically the only one trying.",
    "Picks short prices and acts like a hero.",
  ],
  donkey: [
    "The bookies' favourite customer.",
    "Picks cards and corners like a man with no shame.",
    "Has never met an odds-against shot he didn't love.",
  ],
  soloKill: [
    "One job. Truly, one job.",
    "Singlehandedly torched the slip.",
    "Cost the lads a small house deposit.",
    "Personally responsible. Should be paying back.",
  ],
  biggestPunter: [
    "4/1 shots are not 'value', they're a personality disorder.",
    "If you fired darts at a coupon you'd do better.",
    "Believes in vibes, not value.",
  ],
  cardCounter: [
    "Has watched more refereeing than football this season.",
    "Truly believes corners are a sport.",
    "Rio Ferdinand banged the table over this one.",
  ],
  bayernBoy: [
    "Bayern over 2.5 goals every. single. week.",
    "Wakes up at 7am for the Bundesliga.",
    "His Christmas tree is in Bayern colours.",
  ],
  reliable: [
    "Never lets the lads down.",
    "Steady hands when it counts.",
    "The one you'd actually trust with the slip.",
  ],
  comeback: [
    "Down one week, hero the next.",
    "Bounces back like a bad penny.",
    "You can't keep a good man down. Or this fella.",
  ],
};

function pickSlag(key: string): string {
  const arr = SLAG[key] || [];
  if (!arr.length) return "";
  // Deterministic per session — keep it stable across re-renders.
  return arr[0];
}

function isCardish(sel: string): boolean {
  const t = sel.toLowerCase();
  return (
    t.includes("yellow card") ||
    t.includes(" cards") ||
    (t.includes("over ") && t.includes("card")) ||
    t.includes("corner")
  );
}

export function computeAwards(bd: BD, stats: PlayerStats[]): Award[] {
  const byHit = [...stats].sort((a, b) => b.hitRate - a.hitRate);
  const byKills = [...stats].sort((a, b) => b.soloKills - a.soloKills);
  const byAvg = [...stats].sort((a, b) => b.avgOdds - a.avgOdds);

  // Count card-ish picks per lad
  const cardCounts = bd.players.map((player) => ({
    player,
    count: bd.weeks
      .flatMap((w) => w.picks)
      .filter(
        (p) => p.playerId === player.id && p.filled && isCardish(p.sel),
      ).length,
  }));
  const cardKing = [...cardCounts].sort((a, b) => b.count - a.count)[0];

  // Count Bayern picks per lad
  const bayernCounts = bd.players.map((player) => ({
    player,
    count: bd.weeks
      .flatMap((w) => w.picks)
      .filter(
        (p) =>
          p.playerId === player.id &&
          p.filled &&
          p.sel.toLowerCase().includes("bayern"),
      ).length,
  }));
  const bayernKing = [...bayernCounts].sort((a, b) => b.count - a.count)[0];

  const cardWinner = stats.find((s) => s.player.id === cardKing.player.id)!;
  const bayernWinner = stats.find((s) => s.player.id === bayernKing.player.id)!;

  // Mr Reliable — longest winning streak (already on PlayerStats).
  const byStreak = [...stats].sort((a, b) => b.longestWin - a.longestWin);

  // Comeback King — most times a loss was followed straight by a win, walking
  // each lad's win/loss sequence (pushes/skips dropped, so a L→(skip)→W still
  // counts as a bounce-back).
  const ordered = [...bd.weeks].filter((w) => w.filled).sort((a, b) => a.week - b.week);
  const comebacks = bd.players
    .map((player) => {
      const seq = ordered
        .map((w) => w.picks.find((p) => p.playerId === player.id)?.result)
        .filter((r): r is "Won" | "Lost" => r === "Won" || r === "Lost");
      let count = 0;
      for (let i = 1; i < seq.length; i++) {
        if (seq[i] === "Won" && seq[i - 1] === "Lost") count++;
      }
      return { player, count };
    })
    .sort((a, b) => b.count - a.count);
  const comebackKing = comebacks[0];
  const comebackWinner = stats.find((s) => s.player.id === comebackKing.player.id)!;

  return [
    {
      key: "banker",
      title: "The Banker",
      winner: byHit[0],
      value: `${Math.round(byHit[0].hitRate * 100)}% hit`,
      slag: pickSlag("banker"),
      color: "var(--c-forest)",
    },
    {
      key: "donkey",
      title: "The Donkey",
      winner: byHit[byHit.length - 1],
      value: `${Math.round(byHit[byHit.length - 1].hitRate * 100)}% hit`,
      slag: pickSlag("donkey"),
      color: "var(--c-burgundy)",
    },
    {
      key: "soloKill",
      title: "Most Solo Kills",
      winner: byKills[0],
      value: `${byKills[0].soloKills} weeks`,
      slag: pickSlag("soloKill"),
      color: "var(--c-burgundy)",
    },
    {
      key: "biggestPunter",
      title: "Biggest Punter",
      winner: byAvg[0],
      value: `avg ${byAvg[0].avgOdds.toFixed(2)}`,
      slag: pickSlag("biggestPunter"),
      color: "var(--c-mustard)",
    },
    {
      key: "cardCounter",
      title: "Card Counter",
      winner: cardWinner,
      value: `${cardKing.count} card bets`,
      slag: pickSlag("cardCounter"),
      color: "var(--c-denim)",
    },
    {
      key: "bayernBoy",
      title: "Bayern Boy",
      winner: bayernWinner,
      value: `${bayernKing.count} Bayern bets`,
      slag: pickSlag("bayernBoy"),
      color: "var(--c-brick)",
    },
    {
      key: "reliable",
      title: "Mr Reliable",
      winner: byStreak[0],
      value: `${byStreak[0].longestWin}-win streak`,
      slag: pickSlag("reliable"),
      color: "var(--c-forest)",
    },
    {
      key: "comeback",
      title: "Comeback King",
      winner: comebackWinner,
      value: `${comebackKing.count} comebacks`,
      slag: pickSlag("comeback"),
      color: "var(--c-denim)",
    },
  ];
}

// ─── Heat Strip data — rows = players, cols = weeks ─────────────────────
// Cell colors: green Won, burgundy Lost, mustard Push, transparent unfilled.

export type HeatCell = {
  week: number;
  result: "Won" | "Lost" | "Push" | "";
};

export function computeHeatStrip(bd: BD): Array<{ player: Player; cells: HeatCell[] }> {
  const weeks = [...bd.weeks]
    .filter((w) => w.filled)
    .sort((a, b) => a.week - b.week);
  return bd.players.map((player) => ({
    player,
    cells: weeks.map((w) => {
      const p = w.picks.find((x) => x.playerId === player.id);
      return {
        week: w.week,
        result: (p?.result as HeatCell["result"]) || "",
      };
    }),
  }));
}

// ─── Pick Mix — sport breakdown per lad ─────────────────────────────────
export function computePickMix(bd: BD): Array<{
  player: Player;
  total: number;
  slices: Array<{ sport: string; count: number; pct: number }>;
}> {
  return bd.players.map((player) => {
    const picks = bd.weeks
      .flatMap((w) => w.picks)
      .filter((p) => p.playerId === player.id && p.filled && p.sport);
    const counts: Record<string, number> = {};
    for (const p of picks) {
      counts[p.sport] = (counts[p.sport] || 0) + 1;
    }
    const total = picks.length;
    const slices = Object.entries(counts)
      .map(([sport, count]) => ({
        sport,
        count,
        pct: total ? count / total : 0,
      }))
      .sort((a, b) => b.count - a.count);
    return { player, total, slices };
  });
}

// Heat color helper.
export function heatColor(result: HeatCell["result"]): string {
  switch (result) {
    case "Won":
      return "var(--c-forest)";
    case "Lost":
      return "var(--c-burgundy)";
    case "Push":
      return "var(--c-push)";
    default:
      return "var(--c-rule)";
  }
}

// ─── Records-tab computations ───────────────────────────────────────────
// All of these are pure derivations over the BD view, same as the rest of
// this file. They power the deep-cuts "Records" tab.

const SINGLE_STAKE = 10; // hypothetical €10 single per pick for ROI

// ROI — "if you'd backed your own picks as €10 singles." The realest punter
// metric: would this lad be up or down betting only himself?
export type RoiRow = {
  player: Player;
  staked: number;
  returned: number;
  profit: number; // returned - staked (can be negative)
  roiPct: number; // profit / staked * 100
  bets: number;
};

export function computeROI(bd: BD): RoiRow[] {
  return bd.players
    .map((player) => {
      const bets = bd.weeks
        .filter((w) => w.filled)
        .map((w) => w.picks.find((p) => p.playerId === player.id))
        .filter(
          (p): p is NonNullable<typeof p> =>
            !!p &&
            p.filled &&
            !!p.odds &&
            (p.result === "Won" || p.result === "Lost"),
        );
      const staked = bets.length * SINGLE_STAKE;
      const returned = bets.reduce(
        (acc, p) => acc + (p.result === "Won" ? SINGLE_STAKE * (p.odds || 0) : 0),
        0,
      );
      const profit = returned - staked;
      return {
        player,
        staked,
        returned: Math.round(returned),
        profit: Math.round(profit),
        roiPct: staked > 0 ? +((profit / staked) * 100).toFixed(0) : 0,
        bets: bets.length,
      };
    })
    .sort((a, b) => b.profit - a.profit);
}

// Current form — most-recent results + the active streak right now.
export type FormRow = {
  player: Player;
  last5: Array<"Won" | "Lost" | "Push">; // oldest→newest of the last 5
  streakType: "Won" | "Lost" | null;
  streakLen: number; // length of the current run of the same result
};

export function computeForm(bd: BD): FormRow[] {
  const ordered = [...bd.weeks].filter((w) => w.filled).sort((a, b) => a.week - b.week);
  return bd.players.map((player) => {
    const results = ordered
      .map((w) => w.picks.find((p) => p.playerId === player.id)?.result)
      .filter(
        (r): r is "Won" | "Lost" | "Push" =>
          r === "Won" || r === "Lost" || r === "Push",
      );
    const last5 = results.slice(-5);

    // Active streak: walk backwards from the newest. Push breaks the streak.
    let streakType: "Won" | "Lost" | null = null;
    let streakLen = 0;
    for (let i = results.length - 1; i >= 0; i--) {
      const r = results[i];
      if (r === "Push") break;
      if (streakType === null) {
        streakType = r;
        streakLen = 1;
      } else if (r === streakType) {
        streakLen++;
      } else {
        break;
      }
    }
    return { player, last5, streakType, streakLen };
  });
}

// Near-misses — group heartbreak. Weeks the acca didn't win but exactly one
// leg failed (= the sole-kill weeks). Plus the total € left on the table.
export type NearMiss = {
  week: number;
  date: string;
  combinedOdds: number;
  payoutMissed: number;
  culprit: Player | null;
  culpritPick: string;
};

export function computeNearMisses(bd: BD): {
  count: number;
  totalMissed: number;
  weeks: NearMiss[];
} {
  const weeks: NearMiss[] = [];
  for (const w of bd.weeks) {
    if (!w.filled || w.accaWon) continue;
    const losers = w.picks.filter((p) => p.result === "Lost");
    if (losers.length !== 1) continue;
    const culpritPick = losers[0];
    const culprit = bd.players.find((p) => p.id === culpritPick.playerId) ?? null;
    weeks.push({
      week: w.week,
      date: w.date,
      combinedOdds: w.combinedOdds,
      payoutMissed: Math.round((w.stake || 70) * w.combinedOdds),
      culprit,
      culpritPick: culpritPick.sel,
    });
  }
  weeks.sort((a, b) => b.payoutMissed - a.payoutMissed);
  return {
    count: weeks.length,
    totalMissed: weeks.reduce((a, w) => a + w.payoutMissed, 0),
    weeks,
  };
}

// Sport specialist — per-lad hit rate by sport. Surfaces a best ("golden")
// and worst ("cursed") sport, requiring a minimum sample so a 1/1 fluke
// doesn't crown someone.
const MIN_SPORT_SAMPLE = 3;

export type SportRow = {
  player: Player;
  best: { sport: string; rate: number; won: number; played: number } | null;
  cursed: { sport: string; rate: number; won: number; played: number } | null;
};

export function computeSportSpecialist(bd: BD): SportRow[] {
  return bd.players.map((player) => {
    const bySport: Record<string, { won: number; played: number }> = {};
    for (const w of bd.weeks) {
      if (!w.filled) continue;
      const p = w.picks.find((x) => x.playerId === player.id);
      if (!p || !p.filled || !p.sport) continue;
      if (p.result !== "Won" && p.result !== "Lost") continue; // ignore push/unsettled
      const slot = (bySport[p.sport] ||= { won: 0, played: 0 });
      slot.played++;
      if (p.result === "Won") slot.won++;
    }
    const qualified = Object.entries(bySport)
      .filter(([, v]) => v.played >= MIN_SPORT_SAMPLE)
      .map(([sport, v]) => ({
        sport,
        rate: v.won / v.played,
        won: v.won,
        played: v.played,
      }));
    if (!qualified.length) return { player, best: null, cursed: null };
    const sorted = [...qualified].sort((a, b) => b.rate - a.rate);
    return {
      player,
      best: sorted[0],
      cursed: sorted.length > 1 ? sorted[sorted.length - 1] : null,
    };
  });
}

// Hall of Fame — every winning acca, ranked by combined odds. Includes the
// juiciest winning leg of that week for a bit of colour.
export type HallEntry = {
  week: number;
  date: string;
  combinedOdds: number;
  payout: number;
  juiciest: { player: Player; sel: string; odds: number } | null;
};

export function computeHallOfFame(bd: BD): HallEntry[] {
  return bd.weeks
    .filter((w) => w.accaWon)
    .map((w) => {
      const winners = w.picks
        .filter((p) => p.result === "Won" && p.odds)
        .sort((a, b) => (b.odds || 0) - (a.odds || 0));
      const top = winners[0];
      const player = top ? bd.players.find((p) => p.id === top.playerId) ?? null : null;
      return {
        week: w.week,
        date: w.date,
        combinedOdds: w.combinedOdds,
        payout: Math.round(w.payout || (w.stake || 70) * w.combinedOdds),
        juiciest:
          top && player ? { player, sel: top.sel, odds: top.odds || 0 } : null,
      };
    })
    .sort((a, b) => b.combinedOdds - a.combinedOdds);
}

// Cumulative form — running hit rate over the season, one series per lad,
// for the multi-line chart. Hit rate only advances on settled (W/L) picks.
export type CumulativeSeries = {
  player: Player;
  points: Array<{ week: number; rate: number; played: number }>;
};

export function computeCumulative(bd: BD): {
  weeks: number[];
  series: CumulativeSeries[];
} {
  const ordered = [...bd.weeks].filter((w) => w.filled).sort((a, b) => a.week - b.week);
  const weeks = ordered.map((w) => w.week);
  const series = bd.players.map((player) => {
    let won = 0;
    let played = 0;
    const points = ordered.map((w) => {
      const p = w.picks.find((x) => x.playerId === player.id);
      if (p && (p.result === "Won" || p.result === "Lost")) {
        played++;
        if (p.result === "Won") won++;
      }
      return { week: w.week, rate: played > 0 ? won / played : 0, played };
    });
    return { player, points };
  });
  return { weeks, series };
}

// Cost to the Group — for EVERY lost week (acca didn't land, ≥1 loser), take
// the gross payout the group missed (stake × combined odds) and split it
// EQUALLY among that week's losers. Sum per lad = total damage they're on the
// hook for. Unlike the Blame Game (sole kills only, full amount), this catches
// the lads who quietly lose in every group bloodbath.
export type GroupCostRow = {
  player: Player;
  cost: number; // total € share of missed payouts
  weeksLost: number; // weeks he was among the losers
};

export function computeGroupCost(bd: BD): {
  rows: GroupCostRow[];
  totalCost: number;
  weeksLost: number;
} {
  const tally: Record<string, { cost: number; weeks: number }> = {};
  let totalCost = 0;
  let weeksLostCount = 0;
  for (const w of bd.weeks) {
    if (!w.filled || w.accaWon) continue;
    const losers = w.picks.filter((p) => p.result === "Lost");
    if (losers.length === 0) continue;
    const missed = (w.stake || 70) * w.combinedOdds; // gross
    const share = missed / losers.length; // equal split
    weeksLostCount++;
    totalCost += missed;
    for (const l of losers) {
      const t = (tally[l.playerId] ||= { cost: 0, weeks: 0 });
      t.cost += share;
      t.weeks++;
    }
  }
  const rows = bd.players
    .map((player) => ({
      player,
      cost: Math.round(tally[player.id]?.cost || 0),
      weeksLost: tally[player.id]?.weeks || 0,
    }))
    .sort((a, b) => b.cost - a.cost);
  return { rows, totalCost: Math.round(totalCost), weeksLost: weeksLostCount };
}

// MVP ranking — win rate × average WINNING odds. A single "value index":
// how often you land × how juicy your wins are. Higher = more valuable.
export type MvpRow = {
  player: Player;
  hitRate: number;
  avgWinOdds: number;
  score: number;
};

export function computeMVP(bd: BD): MvpRow[] {
  return computePlayerStats(bd)
    .map((s) => ({
      player: s.player,
      hitRate: s.hitRate,
      avgWinOdds: s.avgWinOdds,
      score: +(s.hitRate * s.avgWinOdds).toFixed(3),
    }))
    .sort((a, b) => b.score - a.score);
}

// Contribution to Winnings — the mirror of Cost to the Group. For each
// WINNING week, split the gross payout (stake × combined odds) across the 7
// winners PROPORTIONAL TO ODDS (your odds ÷ the week's total odds). Sum per
// lad = how much of the pot's winnings each lad actually brought in.
export type ContribRow = {
  player: Player;
  contribution: number;
  weeksWon: number;
};

export function computeContribution(bd: BD): {
  rows: ContribRow[];
  totalWon: number;
  weeksWon: number;
} {
  const tally: Record<string, { amt: number; weeks: number }> = {};
  let totalWon = 0;
  let weeksWonCount = 0;
  for (const w of bd.weeks) {
    if (!w.accaWon) continue;
    const winners = w.picks.filter((p) => p.result === "Won" && p.odds);
    const sumOdds = winners.reduce((a, p) => a + (p.odds || 0), 0);
    if (sumOdds <= 0) continue;
    const payout = (w.stake || 70) * w.combinedOdds; // gross
    totalWon += payout;
    weeksWonCount++;
    for (const p of winners) {
      const share = payout * ((p.odds || 0) / sumOdds);
      const t = (tally[p.playerId] ||= { amt: 0, weeks: 0 });
      t.amt += share;
      t.weeks++;
    }
  }
  const rows = bd.players
    .map((player) => ({
      player,
      contribution: Math.round(tally[player.id]?.amt || 0),
      weeksWon: tally[player.id]?.weeks || 0,
    }))
    .sort((a, b) => b.contribution - a.contribution);
  return { rows, totalWon: Math.round(totalWon), weeksWon: weeksWonCount };
}
