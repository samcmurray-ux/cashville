"use client";

// Stats — the banter screen. Six sections, top-to-bottom:
//   Pecking Order  · who's hitting and who isn't
//   Honours Wall   · auto-computed awards w/ slag copy
//   Damage Report  · per-player W/L/P stacked bars
//   Blame Game     · solo kills + € cost per player (two mini charts)
//   Heat Strip     · rows = players, cols = weeks, colored W/L/P cells
//   Pick Mix       · per-player sport breakdown donut

import { useMemo } from "react";
import { useBD } from "@/lib/useBD";
import { Avatar, Card, Chip, Eyebrow, Headline, Scribble, SPORT_COLORS } from "@/components/primitives";
import { fmtMoney } from "@/lib/bd";
import type { Player } from "@/lib/types";
import {
  computeAwards,
  computeHeatStrip,
  computePickMix,
  computePlayerStats,
  heatColor,
} from "@/lib/stats";

export default function StatsPage() {
  const { bd } = useBD();

  // All sections derive from the same `stats` array — memo so we don't
  // recompute on every interaction.
  const { stats, awards, sortedByHit, byKills, byCost } = useMemo(() => {
    if (!bd) {
      return {
        stats: [],
        awards: [],
        sortedByHit: [],
        byKills: [],
        byCost: [],
      };
    }
    const s = computePlayerStats(bd);
    return {
      stats: s,
      awards: computeAwards(bd, s),
      sortedByHit: [...s].sort((a, b) => b.hitRate - a.hitRate),
      // Blame Game — each chart ranks by its own metric (a kill on a 20.0
      // week costs more than two kills on 4.0 weeks, so the orders differ).
      byKills: [...s].sort((a, b) => b.soloKills - a.soloKills || b.soloKillCost - a.soloKillCost),
      byCost: [...s].sort((a, b) => b.soloKillCost - a.soloKillCost),
    };
  }, [bd]);

  if (!bd) return null;

  const topHit = sortedByHit[0]?.hitRate ?? 0;
  const bottomHit = sortedByHit[sortedByHit.length - 1]?.hitRate ?? 0;
  const maxKills = Math.max(1, ...byKills.map((s) => s.soloKills));
  const maxCost = Math.max(1, ...byCost.map((s) => s.soloKillCost));
  const totalKills = byKills.reduce((a, s) => a + s.soloKills, 0);
  const totalCost = byCost.reduce((a, s) => a + s.soloKillCost, 0);

  return (
    <div className="px-4 py-4 space-y-4">
      {/* ─── Pecking Order ────────────────────────────────────── */}
      <Card accent="var(--c-denim)">
        <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--c-rule)" }}>
          <Eyebrow color="var(--c-denim)">Pecking Order</Eyebrow>
          <Headline size={32}>The standings</Headline>
          <Scribble color="var(--c-dim)" size={18} rotate={-1.5} style={{ marginTop: 4 }}>
            by hit rate, all weeks ↓
          </Scribble>
        </div>
        <div>
          {sortedByHit.map((r, i) => (
            <div
              key={r.player.id}
              className="px-4 py-3 flex items-center gap-3"
              style={{ borderTop: i === 0 ? "none" : "1px solid var(--c-rule)" }}
            >
              <div
                className="font-mono shrink-0"
                style={{
                  fontSize: 14,
                  color: i === 0 ? "var(--c-mustard)" : "var(--c-faint)",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  width: 22,
                }}
              >
                {i + 1}
              </div>
              <Avatar player={r.player} size={36} />
              <div className="min-w-0 flex-1">
                <div
                  className="font-display"
                  style={{ fontSize: 18, color: "var(--c-ink)", lineHeight: 1.1 }}
                >
                  {r.player.name}
                </div>
                <div className="flex gap-1 mt-1 items-center">
                  <Chip color="var(--c-forest)" small>{r.wins}W</Chip>
                  <Chip color="var(--c-burgundy)" small>{r.losses}L</Chip>
                  {r.pushes > 0 && <Chip color="var(--c-push)" small>{r.pushes}P</Chip>}
                  {/* Avg odds across winning picks — "how juicy are your
                      wins?". Hidden if the player has no wins yet (would be 0.00). */}
                  {r.avgWinOdds > 0 && (
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        color: "var(--c-dim)",
                        letterSpacing: "0.06em",
                      }}
                      title="Average odds of winning picks only"
                    >
                      win avg @{r.avgWinOdds.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className="font-display"
                  style={{
                    fontSize: 24,
                    color:
                      r.hitRate === topHit
                        ? "var(--c-forest)"
                        : r.hitRate === bottomHit
                          ? "var(--c-burgundy)"
                          : "var(--c-ink)",
                    lineHeight: 1,
                  }}
                >
                  {Math.round(r.hitRate * 100)}%
                </div>
                <div
                  className="font-mono uppercase"
                  style={{
                    fontSize: 9,
                    color: "var(--c-faint)",
                    letterSpacing: "0.15em",
                    marginTop: 2,
                  }}
                >
                  hit rate
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ─── Honours Wall ─────────────────────────────────────── */}
      <Card accent="var(--c-mustard)">
        <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--c-rule)" }}>
          <Eyebrow color="var(--c-mustard)">Honours List</Eyebrow>
          {/* Count derives from the awards array so it never goes stale when
              we add or remove an award. */}
          <Headline size={32}>{awards.length} trophies, {awards.length} convictions</Headline>
        </div>
        <div className="grid grid-cols-2">
          {awards.map((a, i) => (
            <div
              key={a.key}
              className="p-3"
              style={{
                borderTop: i >= 2 ? "1px solid var(--c-rule)" : "none",
                borderRight: i % 2 === 0 ? "1px solid var(--c-rule)" : "none",
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Avatar player={a.winner.player} size={28} />
                <div
                  className="font-stamp uppercase"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    color: a.color,
                  }}
                >
                  {a.title}
                </div>
              </div>
              <div
                className="font-display"
                style={{ fontSize: 18, color: "var(--c-ink)", lineHeight: 1.1 }}
              >
                {a.winner.player.name}
              </div>
              <div
                className="font-mono uppercase"
                style={{
                  fontSize: 10,
                  color: a.color,
                  letterSpacing: "0.16em",
                  marginTop: 2,
                  fontWeight: 600,
                }}
              >
                {a.value}
              </div>
              <p
                className="font-body italic"
                style={{
                  fontSize: 12,
                  color: "var(--c-ink-soft)",
                  marginTop: 6,
                  lineHeight: 1.3,
                }}
              >
                "{a.slag}"
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* ─── Blame Game ──────────────────────────────────────── */}
      <Card accent="var(--c-burgundy)">
        <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--c-rule)" }}>
          <Eyebrow color="var(--c-burgundy)">The Blame Game</Eyebrow>
          <Headline size={32}>Who torched the slip</Headline>
          <Scribble color="var(--c-dim)" size={18} rotate={-1.5} style={{ marginTop: 4 }}>
            solo kills only — when you alone killed it ↓
          </Scribble>
        </div>

        {totalKills === 0 ? (
          <div className="px-5 py-6 text-center">
            <Scribble color="var(--c-forest)" size={20} rotate={-1}>
              nobody's solo-killed it yet — saints, the lot of ye
            </Scribble>
          </div>
        ) : (
          <>
            {/* Chart 1 — solo kill counts */}
            <div className="px-5 pt-4 pb-2">
              <div
                className="font-mono uppercase mb-2 flex justify-between"
                style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--c-dim)" }}
              >
                <span>Solo kills</span>
                <span>{totalKills} total</span>
              </div>
              {byKills.map((s) => (
                <BlameBar
                  key={s.player.id}
                  player={s.player}
                  value={s.soloKills}
                  max={maxKills}
                  display={String(s.soloKills)}
                  color="var(--c-burgundy)"
                  dim={s.soloKills === 0}
                />
              ))}
            </div>

            <div style={{ borderTop: "1px solid var(--c-rule)" }} />

            {/* Chart 2 — gross € the group missed because of those kills */}
            <div className="px-5 pt-4 pb-4">
              <div
                className="font-mono uppercase mb-2 flex justify-between"
                style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--c-dim)" }}
              >
                <span>Damage done (€)</span>
                <span>{fmtMoney(totalCost)} lost</span>
              </div>
              {byCost.map((s) => (
                <BlameBar
                  key={s.player.id}
                  player={s.player}
                  value={s.soloKillCost}
                  max={maxCost}
                  display={fmtMoney(s.soloKillCost)}
                  color="var(--c-brick)"
                  dim={s.soloKillCost === 0}
                />
              ))}
              <p
                className="font-mono mt-2"
                style={{ fontSize: 9, color: "var(--c-faint)", letterSpacing: "0.1em" }}
              >
                € = the gross payout the group would've banked those weeks
              </p>
            </div>
          </>
        )}
      </Card>

    </div>
  );
}

// One ranked bar in the Blame Game charts. Bar length is value/max; the player
// with the most kills (or biggest € cost) fills the whole track. Zero-value
// players render dimmed with an empty track so the innocent are visible too.
function BlameBar({
  player,
  value,
  max,
  display,
  color,
  dim,
}: {
  player: Player;
  value: number;
  max: number;
  display: string;
  color: string;
  dim?: boolean;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 py-1" style={{ opacity: dim ? 0.45 : 1 }}>
      <Avatar player={player} size={22} />
      <span
        className="font-mono"
        style={{ fontSize: 11, width: 42, color: "var(--c-ink)", letterSpacing: "0.02em" }}
      >
        {player.name.slice(0, 5)}
      </span>
      <div
        className="flex-1 overflow-hidden"
        style={{ height: 14, background: "var(--c-rule)", borderRadius: 2 }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
      <span
        className="font-display text-right"
        style={{ fontSize: 14, width: 58, color: "var(--c-ink)", lineHeight: 1 }}
      >
        {display}
      </span>
    </div>
  );
}
