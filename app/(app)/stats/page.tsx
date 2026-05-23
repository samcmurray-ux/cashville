"use client";

// Stats — the banter screen. Five sections, top-to-bottom:
//   Pecking Order  · who's hitting and who isn't
//   Honours Wall   · 6 auto-computed awards w/ slag copy
//   Damage Report  · per-lad W/L/P stacked bars
//   Heat Strip     · rows = lads, cols = weeks, colored W/L/P cells
//   Pick Mix       · per-lad sport breakdown donut

import { useMemo } from "react";
import { useBD } from "@/lib/useBD";
import { Avatar, Card, Chip, Eyebrow, Headline, Scribble, SPORT_COLORS } from "@/components/primitives";
import { Donut } from "@/components/donut";
import {
  computeAwards,
  computeHeatStrip,
  computePickMix,
  computePlayerStats,
  heatColor,
} from "@/lib/stats";

export default function StatsPage() {
  const { bd } = useBD();

  // All five sections derive from the same `stats` array — memo so we don't
  // recompute on every interaction.
  const { stats, awards, heat, mix, sortedByHit } = useMemo(() => {
    if (!bd) {
      return { stats: [], awards: [], heat: [], mix: [], sortedByHit: [] };
    }
    const s = computePlayerStats(bd);
    return {
      stats: s,
      awards: computeAwards(bd, s),
      heat: computeHeatStrip(bd),
      mix: computePickMix(bd),
      sortedByHit: [...s].sort((a, b) => b.hitRate - a.hitRate),
    };
  }, [bd]);

  if (!bd) return null;

  const topHit = sortedByHit[0]?.hitRate ?? 0;
  const bottomHit = sortedByHit[sortedByHit.length - 1]?.hitRate ?? 0;

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
                <div className="flex gap-1 mt-1">
                  <Chip color="var(--c-forest)" small>{r.wins}W</Chip>
                  <Chip color="var(--c-burgundy)" small>{r.losses}L</Chip>
                  {r.pushes > 0 && <Chip color="var(--c-push)" small>{r.pushes}P</Chip>}
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
          <Headline size={32}>Six trophies, six convictions</Headline>
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

      {/* ─── Damage Report ────────────────────────────────────── */}
      <Card accent="var(--c-burgundy)">
        <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--c-rule)" }}>
          <Eyebrow color="var(--c-burgundy)">Damage Report</Eyebrow>
          <Headline size={32}>W / L / P split</Headline>
          <Scribble color="var(--c-dim)" size={18} rotate={-1.5} style={{ marginTop: 4 }}>
            stacked all season, green = good ↓
          </Scribble>
        </div>
        <div>
          {stats.map((s, i) => {
            const total = Math.max(1, s.played);
            const wPct = (s.wins / total) * 100;
            const lPct = (s.losses / total) * 100;
            const pPct = (s.pushes / total) * 100;
            return (
              <div
                key={s.player.id}
                className="px-4 py-3"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--c-rule)" }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Avatar player={s.player} size={26} />
                  <div
                    className="font-display flex-1"
                    style={{ fontSize: 15, color: "var(--c-ink)", lineHeight: 1.1 }}
                  >
                    {s.player.name}
                  </div>
                  <div
                    className="font-mono"
                    style={{ fontSize: 11, color: "var(--c-dim)" }}
                  >
                    {s.played} picks
                  </div>
                </div>
                <div
                  className="flex w-full overflow-hidden"
                  style={{
                    height: 16,
                    border: "1px solid var(--c-ink)",
                    borderRadius: 2,
                  }}
                  aria-label={`${s.wins} won, ${s.losses} lost, ${s.pushes} push`}
                >
                  {wPct > 0 && (
                    <div
                      style={{ width: `${wPct}%`, background: "var(--c-forest)" }}
                      title={`${s.wins} won`}
                    />
                  )}
                  {lPct > 0 && (
                    <div
                      style={{ width: `${lPct}%`, background: "var(--c-burgundy)" }}
                      title={`${s.losses} lost`}
                    />
                  )}
                  {pPct > 0 && (
                    <div
                      style={{ width: `${pPct}%`, background: "var(--c-push)" }}
                      title={`${s.pushes} push`}
                    />
                  )}
                </div>
                {/* Tiny tagline under the bar — streak + biggest odds */}
                <div
                  className="font-mono uppercase mt-1.5 flex gap-3"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    color: "var(--c-dim)",
                  }}
                >
                  <span>longest W: {s.longestWin}</span>
                  <span>longest L: {s.longestLose}</span>
                  <span>biggest: {s.biggestOdds.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ─── Heat Strip ──────────────────────────────────────── */}
      <Card accent="var(--c-forest)">
        <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--c-rule)" }}>
          <Eyebrow color="var(--c-forest)">Heat Strip</Eyebrow>
          <Headline size={32}>The streak map</Headline>
          <div className="flex gap-3 mt-2 flex-wrap">
            <Legend label="W" color="var(--c-forest)" />
            <Legend label="L" color="var(--c-burgundy)" />
            <Legend label="P" color="var(--c-push)" />
          </div>
        </div>
        <div className="px-4 py-3 overflow-x-auto">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `60px repeat(${heat[0]?.cells.length ?? 0}, 14px)`,
              gap: 3,
              alignItems: "center",
            }}
          >
            {heat.map((row) => (
              <Row key={row.player.id} player={row.player} cells={row.cells} />
            ))}
          </div>
        </div>
      </Card>

      {/* ─── Pick Mix ─────────────────────────────────────────── */}
      <Card accent="var(--c-denim)">
        <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--c-rule)" }}>
          <Eyebrow color="var(--c-denim)">Pick Mix</Eyebrow>
          <Headline size={32}>What each lad bets on</Headline>
        </div>
        <div className="px-4 py-3 grid grid-cols-2 gap-3">
          {mix.map((m) => {
            const top = m.slices[0];
            return (
              <div
                key={m.player.id}
                className="flex items-center gap-3 p-2"
                style={{
                  border: "1px solid var(--c-rule)",
                  borderRadius: 2,
                }}
              >
                <Donut slices={m.slices} size={52} thickness={10} />
                <div className="min-w-0 flex-1">
                  <div
                    className="font-display truncate"
                    style={{ fontSize: 14, color: "var(--c-ink)", lineHeight: 1.1 }}
                  >
                    {m.player.name}
                  </div>
                  <div
                    className="font-mono"
                    style={{ fontSize: 10, color: "var(--c-dim)", marginTop: 2 }}
                  >
                    {top
                      ? `${top.sport} ${Math.round(top.pct * 100)}%`
                      : "no picks"}
                  </div>
                  <div className="flex gap-0.5 mt-1.5 flex-wrap">
                    {m.slices.slice(0, 4).map((s) => (
                      <span
                        key={s.sport}
                        className="font-mono"
                        title={`${s.sport}: ${s.count}`}
                        style={{
                          fontSize: 8,
                          padding: "1px 4px",
                          background:
                            SPORT_COLORS[s.sport] || "var(--c-dim)",
                          color: "var(--c-paper)",
                          letterSpacing: "0.06em",
                          borderRadius: 1,
                        }}
                      >
                        {s.sport.slice(0, 3).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span
        className="inline-block"
        style={{
          width: 10,
          height: 10,
          background: color,
          borderRadius: 1,
        }}
      />
      <span
        className="font-mono uppercase"
        style={{
          fontSize: 9,
          letterSpacing: "0.18em",
          color: "var(--c-dim)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function Row({
  player,
  cells,
}: {
  player: import("@/lib/types").Player;
  cells: import("@/lib/stats").HeatCell[];
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Avatar player={player} size={20} />
        <span
          className="font-mono"
          style={{
            fontSize: 11,
            color: "var(--c-ink)",
            letterSpacing: "0.04em",
          }}
        >
          {player.name.slice(0, 4)}
        </span>
      </div>
      {cells.map((c) => (
        <div
          key={c.week}
          title={`Wk ${c.week}: ${c.result || "—"}`}
          style={{
            width: 14,
            height: 14,
            background: heatColor(c.result),
            border:
              c.result === ""
                ? "1px dashed var(--c-rule-strong)"
                : "none",
          }}
        />
      ))}
    </>
  );
}
