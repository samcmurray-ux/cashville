"use client";

// Stats — the banter screen, top-to-bottom:
//   Pecking Order  · who's hitting and who isn't
//   Honours List   · trophies judged on recent form, with rotating banter
//   Blame Game     · solo kills + € cost per player (two mini charts)
//   Fines League · Vibes Table · Side Bet Ledger

import { useMemo } from "react";
import { useBD } from "@/lib/useBD";
import { Avatar, Card, Chip, Eyebrow, Headline, Scribble, SPORT_COLORS } from "@/components/primitives";
import { fmtMoney } from "@/lib/bd";
import type { BD, Player } from "@/lib/types";
import {
  computePlayerStats,
} from "@/lib/stats";
import {
  FORM_WINDOW,
  computeAwards,
  computeFinesLeague,
  computeSideBetLedger,
  computeVibes,
} from "@/lib/honours";

export default function StatsPage() {
  const { bd } = useBD();

  // All sections derive from the same `stats` array — memo so we don't
  // recompute on every interaction.
  const { stats, awards, sortedByHit, byKills, byCost } = useMemo(() => {
    if (!bd) {
      return {
        stats: [],
        awards: [] as ReturnType<typeof computeAwards>,
        sortedByHit: [],
        byKills: [],
        byCost: [],
      };
    }
    const s = computePlayerStats(bd);
    return {
      stats: s,
      awards: computeAwards(bd),
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
          <Headline size={32}>{awards.length} trophies, {awards.length} convictions</Headline>
          <Scribble color="var(--c-dim)" size={18} rotate={-1.5} style={{ marginTop: 4 }}>
            form trophies go on the last {FORM_WINDOW} weeks ↓
          </Scribble>
        </div>
        <div className="grid grid-cols-2">
          {awards.map((a, i) => (
            <div
              key={a.key}
              className="p-3"
              style={{
                borderTop: i >= 2 ? "1px solid var(--c-rule)" : "none",
                borderRight: i % 2 === 0 ? "1px solid var(--c-rule)" : "none",
                background: a.takenFrom ? "rgba(200,146,22,0.10)" : undefined,
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {a.takenFrom && (
                  <span className="cv-handover-old" style={{ display: "inline-flex", marginRight: -14 }}>
                    <Avatar player={a.takenFrom} size={28} />
                  </span>
                )}
                <span className={a.takenFrom ? "cv-handover-new" : undefined} style={{ display: "inline-flex" }}>
                  <Avatar player={a.winner} size={28} />
                </span>
                <div
                  className="font-stamp uppercase min-w-0 flex-1"
                  style={{ fontSize: 10, letterSpacing: "0.16em", color: a.color }}
                >
                  {a.title}
                </div>
                {a.takenFrom && (
                  <span
                    className="font-stamp uppercase shrink-0"
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.12em",
                      padding: "1px 5px",
                      borderRadius: 2,
                      background: "var(--c-mustard)",
                      color: "var(--c-on-mustard)",
                    }}
                  >
                    New
                  </span>
                )}
              </div>
              <div
                className="font-display"
                style={{ fontSize: 18, color: "var(--c-ink)", lineHeight: 1.1 }}
              >
                {a.winner.name}
              </div>
              <div
                className="font-mono uppercase"
                style={{
                  fontSize: 10,
                  color: a.color,
                  letterSpacing: "0.12em",
                  marginTop: 2,
                  fontWeight: 600,
                }}
              >
                {a.value}
              </div>
              <p
                className="font-body italic"
                style={{ fontSize: 12, color: "var(--c-ink-soft)", marginTop: 6, lineHeight: 1.3 }}
              >
                "{a.slag}"
              </p>
              <div
                className="font-mono uppercase"
                style={{ fontSize: 8.5, letterSpacing: "0.1em", color: "var(--c-faint)", marginTop: 6, lineHeight: 1.5 }}
              >
                {a.takenFrom ? `taken from ${a.takenFrom.name} · ` : ""}
                {a.basis}
                {a.allTime ? ` · all season: ${a.allTime.name}` : ""}
              </div>
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

      <FinesLeague bd={bd} />
      <VibesTable bd={bd} />
      <SideBetLedgerCard bd={bd} />
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

// Shared shell for the three small league tables below.
function TableCard({
  accent,
  eyebrow,
  title,
  note,
  empty,
  children,
}: {
  accent: string;
  eyebrow: string;
  title: string;
  note?: string;
  empty?: string | null;
  children: React.ReactNode;
}) {
  return (
    <Card accent={accent}>
      <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--c-rule)" }}>
        <Eyebrow color={accent}>{eyebrow}</Eyebrow>
        <Headline size={32}>{title}</Headline>
        {note && (
          <Scribble color="var(--c-dim)" size={18} rotate={-1.5} style={{ marginTop: 4 }}>
            {note}
          </Scribble>
        )}
      </div>
      {empty ? (
        <div className="p-5 text-center">
          <Scribble color="var(--c-dim)" size={18} rotate={-1}>
            {empty}
          </Scribble>
        </div>
      ) : (
        children
      )}
    </Card>
  );
}

function TableRow({
  player,
  first,
  sub,
  value,
  valueColor,
}: {
  player: Player;
  first: boolean;
  sub: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      className="px-4 py-2.5 flex items-center gap-3"
      style={{ borderTop: first ? "none" : "1px solid var(--c-rule)" }}
    >
      <Avatar player={player} size={28} />
      <div className="min-w-0 flex-1">
        <div className="font-display" style={{ fontSize: 16, color: "var(--c-ink)", lineHeight: 1.1 }}>
          {player.name}
        </div>
        <div className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--c-dim)", marginTop: 2 }}>
          {sub}
        </div>
      </div>
      <div className="font-display shrink-0" style={{ fontSize: 20, lineHeight: 1, color: valueColor ?? "var(--c-ink)" }}>
        {value}
      </div>
    </div>
  );
}

function FinesLeague({ bd }: { bd: BD }) {
  const rows = computeFinesLeague(bd);
  const total = rows.reduce((a, r) => a + r.total, 0);
  return (
    <TableCard
      accent="var(--c-burgundy)"
      eyebrow="Fines League"
      title="Who's funding the trip"
      note={total > 0 ? `${fmtMoney(total)} in fines so far ↓` : undefined}
      empty={total === 0 ? "no fines yet — give it a week" : null}
    >
      {rows.map((r, i) => (
        <TableRow
          key={r.player.id}
          player={r.player}
          first={i === 0}
          sub={
            r.count === 0
              ? "clean record"
              : `${r.count} fine${r.count === 1 ? "" : "s"}${r.late ? ` · ${r.late} late` : ""}${r.owed > 0 ? ` · owes ${fmtMoney(r.owed)}` : " · all paid"}`
          }
          value={fmtMoney(r.total)}
          valueColor={r.owed > 0 ? "var(--c-burgundy)" : r.total > 0 ? "var(--c-ink)" : "var(--c-faint)"}
        />
      ))}
    </TableCard>
  );
}

function VibesTable({ bd }: { bd: BD }) {
  const rows = computeVibes(bd).sort((a, b) => b.backed - b.doubted - (a.backed - a.doubted));
  const any = rows.some((r) => r.backed + r.doubted + r.calls > 0);
  return (
    <TableCard
      accent="var(--c-denim)"
      eyebrow="Vibes Table"
      title="Who the group believes in"
      note={any ? "👍 minus 👎 on their picks ↓" : undefined}
      empty={any ? null : "no vibes votes yet — get voting on the slip"}
    >
      {rows.map((r, i) => {
        const net = r.backed - r.doubted;
        return (
          <TableRow
            key={r.player.id}
            player={r.player}
            first={i === 0}
            sub={`👍 ${r.backed} · 👎 ${r.doubted} · ${r.calls ? `calls ${r.right}/${r.calls} right` : "no calls judged yet"}`}
            value={net > 0 ? `+${net}` : String(net)}
            valueColor={net > 0 ? "var(--c-forest)" : net < 0 ? "var(--c-burgundy)" : "var(--c-faint)"}
          />
        );
      })}
    </TableCard>
  );
}

function SideBetLedgerCard({ bd }: { bd: BD }) {
  const { rows, owed, live } = computeSideBetLedger(bd);
  const any = rows.some((r) => r.bets > 0);
  return (
    <TableCard
      accent="var(--c-forest)"
      eyebrow="Side Bet Ledger"
      title="Who's fleecing who"
      note={live > 0 ? `${live} bet${live === 1 ? "" : "s"} still live ↓` : undefined}
      empty={any ? null : live > 0 ? "bets are on — waiting for results" : "no side bets settled yet — offer one on the slip"}
    >
      {owed.length > 0 && (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--c-rule)", background: "var(--c-bg2)" }}>
          <div className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.16em", color: "var(--c-burgundy)", fontWeight: 600 }}>
            Still to square up
          </div>
          {owed.map((o, i) => (
            <div key={i} className="font-body" style={{ fontSize: 14, color: "var(--c-ink)", marginTop: 3 }}>
              {o.from.name} owes {o.to.name} {fmtMoney(o.amount)}
              {o.tax > 0 ? ` + ${fmtMoney(o.tax)} to the pot` : ""}{" "}
              <span className="font-mono" style={{ fontSize: 10, color: "var(--c-dim)" }}>
                W{o.week}
              </span>
            </div>
          ))}
        </div>
      )}
      {rows
        .filter((r) => r.bets > 0)
        .map((r, i) => (
          <TableRow
            key={r.player.id}
            player={r.player}
            first={i === 0}
            sub={`won ${r.won} · lost ${r.lost}`}
            value={fmtMoney(r.net, { alwaysSign: true })}
            valueColor={r.net > 0 ? "var(--c-forest)" : r.net < 0 ? "var(--c-burgundy)" : "var(--c-faint)"}
          />
        ))}
    </TableCard>
  );
}
