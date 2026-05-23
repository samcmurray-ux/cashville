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

    const soloKills = settled.filter((w) => {
      const losers = w.picks.filter((p) => p.result === "Lost");
      return losers.length === 1 && losers[0].playerId === player.id;
    }).length;

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
