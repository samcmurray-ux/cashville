"use client";

// Records — the deep-cuts tab. Six sections, top-to-bottom:
//   Current Form     · active streak + last-5 strip
//   Near-Misses      · group heartbreak — one leg away X times
//   Cost to the Group · every loss, missed payout split among the losers
//   Sport Specialist · best & cursed sport per lad
//   Hall of Fame     · the winning accas, ranked
//   Season Form      · cumulative hit-rate line chart

import { useMemo, useState } from "react";
import { useBD } from "@/lib/useBD";
import { Avatar, Card, Eyebrow, Headline, Scribble, Stamp } from "@/components/primitives";
import { CumulativeChart } from "@/components/line-chart";
import { WeekDetailSheet } from "@/components/week-detail-sheet";
import { fmtMoney } from "@/lib/bd";
import type { Player } from "@/lib/types";
import {
  computeCumulative,
  computeForm,
  computeGroupCost,
  computeHallOfFame,
  computeNearMisses,
  computeSportSpecialist,
} from "@/lib/stats";

export default function RecordsPage() {
  const { bd } = useBD();
  const [openWeek, setOpenWeek] = useState<number | null>(null);

  const data = useMemo(() => {
    if (!bd) return null;
    return {
      form: computeForm(bd),
      near: computeNearMisses(bd),
      groupCost: computeGroupCost(bd),
      sport: computeSportSpecialist(bd),
      hall: computeHallOfFame(bd),
      cumulative: computeCumulative(bd),
    };
  }, [bd]);

  if (!bd || !data) return null;

  const selectedWeek =
    openWeek != null ? bd.weeks.find((w) => w.week === openWeek) ?? null : null;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* ─── Current Form ────────────────────────────────────── */}
      <Card accent="var(--c-mustard)">
        <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--c-rule)" }}>
          <Eyebrow color="var(--c-mustard)">Current Form</Eyebrow>
          <Headline size={32}>Hot &amp; cold</Headline>
          <Scribble color="var(--c-dim)" size={18} rotate={-1.5} style={{ marginTop: 4 }}>
            who's flying, who's flailing ↓
          </Scribble>
        </div>
        <div>
          {data.form.map((f, i) => {
            const hot = f.streakType === "Won" && f.streakLen >= 2;
            const cold = f.streakType === "Lost" && f.streakLen >= 2;
            return (
              <div
                key={f.player.id}
                className="px-4 py-3 flex items-center gap-3"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--c-rule)" }}
              >
                <Avatar player={f.player} size={32} />
                <div className="min-w-0 flex-1">
                  <div
                    className="font-display flex items-center gap-2"
                    style={{ fontSize: 16, color: "var(--c-ink)", lineHeight: 1.1 }}
                  >
                    {f.player.name}
                    {hot && <span style={{ fontSize: 14 }}>🔥</span>}
                    {cold && <span style={{ fontSize: 14 }}>🧊</span>}
                  </div>
                  <div
                    className="font-mono uppercase"
                    style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--c-dim)", marginTop: 1 }}
                  >
                    {f.streakType
                      ? `${f.streakLen} ${
                          f.streakType === "Won"
                            ? f.streakLen > 1 ? "wins" : "win"
                            : f.streakLen > 1 ? "losses" : "loss"
                        } on the spin`
                      : "no active streak"}
                  </div>
                </div>
                {/* Last-5 strip — oldest left, newest right */}
                <div className="flex gap-1 shrink-0">
                  {f.last5.map((r, j) => (
                    <span
                      key={j}
                      title={r}
                      className="font-stamp"
                      style={{
                        width: 18,
                        height: 18,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        borderRadius: 2,
                        color: "var(--c-paper)",
                        background:
                          r === "Won"
                            ? "var(--c-forest)"
                            : r === "Lost"
                              ? "var(--c-burgundy)"
                              : "var(--c-push)",
                      }}
                    >
                      {r[0]}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ─── Near-Misses ─────────────────────────────────────── */}
      <Card accent="var(--c-burgundy)">
        <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--c-rule)" }}>
          <Eyebrow color="var(--c-burgundy)">So Close</Eyebrow>
          <div className="flex items-baseline gap-3 mt-1 flex-wrap">
            <Headline size={48} color="var(--c-burgundy)">
              {data.near.count}
            </Headline>
            <div>
              <div className="font-display" style={{ fontSize: 22, color: "var(--c-ink)", lineHeight: 1 }}>
                times one leg away
              </div>
              <div
                className="font-mono uppercase"
                style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--c-dim)", marginTop: 2 }}
              >
                {fmtMoney(data.near.totalMissed)} left on the table
              </div>
            </div>
          </div>
        </div>
        <div>
          {data.near.weeks.map((m, i) => (
            <button
              key={m.week}
              onClick={() => setOpenWeek(m.week)}
              className="w-full text-left px-4 py-2.5 flex items-center gap-3"
              style={{ borderTop: i === 0 ? "none" : "1px solid var(--c-rule)" }}
            >
              <div
                className="font-mono shrink-0"
                style={{ fontSize: 11, color: "var(--c-faint)", width: 32 }}
              >
                W{m.week}
              </div>
              {m.culprit && <Avatar player={m.culprit} size={26} />}
              <div className="min-w-0 flex-1">
                <div
                  className="font-body truncate"
                  style={{ fontSize: 13, color: "var(--c-ink-soft)" }}
                >
                  {m.culprit?.name ?? "?"} · {m.culpritPick || "—"}
                </div>
                <div
                  className="font-mono uppercase"
                  style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--c-faint)", marginTop: 1 }}
                >
                  @{m.combinedOdds.toFixed(2)} combined
                </div>
              </div>
              <div
                className="font-display text-right shrink-0"
                style={{ fontSize: 18, color: "var(--c-burgundy)", lineHeight: 1 }}
              >
                {fmtMoney(m.payoutMissed)}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* ─── Cost to the Group ───────────────────────────────── */}
      <Card accent="var(--c-burgundy)">
        <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--c-rule)" }}>
          <Eyebrow color="var(--c-burgundy)">Cost to the Group</Eyebrow>
          <Headline size={32}>Who's bled us dry</Headline>
          <Scribble color="var(--c-dim)" size={18} rotate={-1.5} style={{ marginTop: 4 }}>
            every loss, split among that week's losers ↓
          </Scribble>
          <div
            className="font-mono uppercase mt-2"
            style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--c-dim)" }}
          >
            {fmtMoney(data.groupCost.totalCost)} torched across {data.groupCost.weeksLost} lost weeks
          </div>
        </div>
        <div className="px-5 py-4">
          {data.groupCost.rows.map((r) => (
            <CostBar
              key={r.player.id}
              player={r.player}
              cost={r.cost}
              max={data.groupCost.rows[0]?.cost || 1}
            />
          ))}
          <p
            className="font-mono mt-2"
            style={{ fontSize: 9, color: "var(--c-faint)", letterSpacing: "0.1em" }}
          >
            gross payout missed, split equally between each week's losers
          </p>
        </div>
      </Card>

      {/* ─── Sport Specialist ────────────────────────────────── */}
      <Card accent="var(--c-denim)">
        <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--c-rule)" }}>
          <Eyebrow color="var(--c-denim)">Specialist Subject</Eyebrow>
          <Headline size={32}>Golden &amp; cursed sports</Headline>
          <Scribble color="var(--c-dim)" size={18} rotate={-1.5} style={{ marginTop: 4 }}>
            min 3 picks to qualify ↓
          </Scribble>
        </div>
        <div>
          {data.sport.map((s, i) => (
            <div
              key={s.player.id}
              className="px-4 py-3 flex items-center gap-3"
              style={{ borderTop: i === 0 ? "none" : "1px solid var(--c-rule)" }}
            >
              <Avatar player={s.player} size={32} />
              <div className="min-w-0 flex-1">
                <div
                  className="font-display"
                  style={{ fontSize: 16, color: "var(--c-ink)", lineHeight: 1.1 }}
                >
                  {s.player.name}
                </div>
                {s.best ? (
                  <div className="flex gap-3 mt-1 flex-wrap">
                    <span
                      className="font-mono"
                      style={{ fontSize: 11, color: "var(--c-forest)" }}
                    >
                      🎯 {s.best.sport} {Math.round(s.best.rate * 100)}% ({s.best.won}/{s.best.played})
                    </span>
                    {s.cursed && s.cursed.sport !== s.best.sport && (
                      <span
                        className="font-mono"
                        style={{ fontSize: 11, color: "var(--c-burgundy)" }}
                      >
                        💀 {s.cursed.sport} {Math.round(s.cursed.rate * 100)}% ({s.cursed.won}/{s.cursed.played})
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    className="font-mono uppercase"
                    style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--c-faint)", marginTop: 2 }}
                  >
                    not enough picks in any one sport yet
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ─── Hall of Fame ────────────────────────────────────── */}
      <Card accent="var(--c-mustard)">
        <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--c-rule)" }}>
          <Eyebrow color="var(--c-mustard)">Hall of Fame</Eyebrow>
          <Headline size={32}>The ones that landed</Headline>
          <Scribble color="var(--c-forest)" size={18} rotate={-1.5} style={{ marginTop: 4 }}>
            {data.hall.length} winning accas · tap to relive ↓
          </Scribble>
        </div>
        {data.hall.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <Scribble color="var(--c-burgundy)" size={20} rotate={-1}>
              no winning accas yet — the dream lives on
            </Scribble>
          </div>
        ) : (
          <div>
            {data.hall.map((h, i) => (
              <button
                key={h.week}
                onClick={() => setOpenWeek(h.week)}
                className="w-full text-left px-4 py-3 flex items-center gap-3"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--c-rule)" }}
              >
                <div className="shrink-0 text-center" style={{ width: 30 }}>
                  <div
                    className="font-display"
                    style={{ fontSize: 20, color: "var(--c-mustard)", lineHeight: 1 }}
                  >
                    {i + 1}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <div
                      className="font-display"
                      style={{ fontSize: 22, color: "var(--c-forest)", lineHeight: 1 }}
                    >
                      @{h.combinedOdds.toFixed(2)}
                    </div>
                    <div
                      className="font-mono uppercase"
                      style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--c-dim)" }}
                    >
                      W{h.week}
                    </div>
                  </div>
                  {h.juiciest && (
                    <div
                      className="font-body italic truncate"
                      style={{ fontSize: 12, color: "var(--c-ink-soft)", marginTop: 2 }}
                    >
                      {h.juiciest.player.name}'s {h.juiciest.sel} @{h.juiciest.odds.toFixed(2)}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <Stamp color="var(--c-forest)" rotate={-4}>
                    {fmtMoney(h.payout)}
                  </Stamp>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* ─── Season Form (cumulative line chart) ─────────────── */}
      <Card accent="var(--c-forest)">
        <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--c-rule)" }}>
          <Eyebrow color="var(--c-forest)">Season Form</Eyebrow>
          <Headline size={32}>Hit rate over time</Headline>
        </div>
        <div className="px-4 py-4">
          <CumulativeChart weeks={data.cumulative.weeks} series={data.cumulative.series} />
        </div>
      </Card>

      <WeekDetailSheet
        open={openWeek != null}
        onClose={() => setOpenWeek(null)}
        week={selectedWeek}
        players={bd.players}
      />
    </div>
  );
}

// One ranked bar in Cost to the Group. Bar length = cost/max (worst lad fills
// the track). Zero-cost lads dim with an empty track.
function CostBar({
  player,
  cost,
  max,
}: {
  player: Player;
  cost: number;
  max: number;
}) {
  const pct = max > 0 ? (cost / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 py-1" style={{ opacity: cost === 0 ? 0.45 : 1 }}>
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
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--c-burgundy)" }} />
      </div>
      <span
        className="font-display text-right"
        style={{ fontSize: 14, width: 56, color: "var(--c-ink)", lineHeight: 1 }}
      >
        {fmtMoney(cost)}
      </span>
    </div>
  );
}
