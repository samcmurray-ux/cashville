"use client";

// Home — "this week" at a glance: the pick deadline, who's in, whose turn
// it is, what's owed, and how last weekend went. Everything links through
// to the screen where you act on it.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBD } from "@/lib/useBD";
import { useMe } from "@/lib/useMe";
import { Avatar, Card, Eyebrow, Headline, Scribble } from "@/components/primitives";
import { LastWeekend } from "@/components/last-weekend";
import { PushCard } from "@/components/push-card";
import { fmtMoney, sideBetOutcome } from "@/lib/bd";

// Picks are due at 6pm on the Friday before the weekend (week.date is the
// Saturday).
function deadlineFor(weekDate: string): Date {
  const d = new Date(weekDate + "T18:00:00");
  d.setDate(d.getDate() - 1);
  return d;
}

function countdown(to: Date, now: Date): string {
  const mins = Math.floor((to.getTime() - now.getTime()) / 60000);
  if (mins <= 0) return "";
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function HomePage() {
  const { bd } = useBD();
  const { me, meId } = useMe();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  if (!bd) return null;

  const week = bd.currentWeek;
  const deadline = deadlineFor(week.date);
  const left = countdown(deadline, now);
  // Last hour before the deadline: the countdown goes red and pulses.
  const panic = !!left && deadline.getTime() - now.getTime() < 60 * 60 * 1000;
  const inCount = week.picks.filter((p) => p.filled).length;
  const myPick = meId ? week.picks.find((p) => p.playerId === meId) : null;
  const placer = bd.players.find((p) => p.id === week.placerId);
  const topups = week.topups.reduce((a, t) => a + t.amount, 0);

  const unpaid = bd.fines.filter((f) => !f.paid);
  const owedTotal = unpaid.reduce((a, f) => a + f.amount, 0);
  const iOwe = unpaid.filter((f) => f.playerId === meId).reduce((a, f) => a + f.amount, 0);

  const bets = bd.sideBets.map((b) => ({ b, o: sideBetOutcome(b, bd.weeks, bd.settings.sideBetTaxPct) }));
  const waitingOnMe = bets.filter((x) => x.o.state === "open" && x.b.opponentId === meId).length;
  const liveBets = bets.filter((x) => x.o.state === "live").length;
  const toSquare = bets.filter((x) => x.o.state === "won" && !x.b.paid).length;

  const pct = Math.min(100, Math.max(0, (bd.trip.current / bd.trip.target) * 100));
  const weekend = new Date(week.date).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="px-4 py-4 space-y-4">
      {/* ─── This week ─────────────────────────────────────────── */}
      <Card accent="var(--c-burgundy)">
        <div className="px-5 pt-5 pb-4">
          <Eyebrow color="var(--c-burgundy)">
            Week {week.week} · {weekend}
          </Eyebrow>
          <div className="flex items-end justify-between gap-3 mt-2">
            <div className="min-w-0">
              <Headline size={34}>{left ? "Picks due Friday 6pm" : "Picks are closed"}</Headline>
              <Scribble color="var(--c-dim)" size={19} rotate={-1.5} style={{ marginTop: 4 }}>
                {me ? `alright, ${me.name.toLowerCase()}` : "pick your name, top right"} ↓
              </Scribble>
            </div>
            {left && (
              <div className="text-right shrink-0">
                <div
                  className={"font-display" + (panic ? " cv-panic" : "")}
                  style={{ fontSize: 34, lineHeight: 1, color: "var(--c-denim)" }}
                >
                  {left}
                </div>
                <div className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.18em", color: "var(--c-faint)", marginTop: 3 }}>
                  {panic ? "hurry up" : "to go"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* My pick — the one thing each player has to do. */}
        {meId && myPick && (
          <Link
            href="/slip"
            className="flex items-center justify-between gap-3 px-5 py-3"
            style={{
              borderTop: "1px solid var(--c-rule)",
              background: myPick.filled ? "var(--c-bg2)" : "var(--c-mustard)",
              color: myPick.filled ? "var(--c-ink)" : "var(--c-on-mustard)",
            }}
          >
            <div className="min-w-0">
              <div className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: "0.18em", fontWeight: 600 }}>
                {myPick.filled ? "Your pick is in" : "You haven't picked yet"}
              </div>
              <div className="font-display truncate" style={{ fontSize: 20, lineHeight: 1.15 }}>
                {myPick.filled ? `${myPick.sel}${myPick.odds ? ` @ ${myPick.odds.toFixed(2)}` : ""}` : "Add my pick"}
              </div>
            </div>
            <span className="font-display shrink-0" style={{ fontSize: 22 }}>
              →
            </span>
          </Link>
        )}

        {/* Who's in. */}
        <div className="px-5 py-3" style={{ borderTop: "1px solid var(--c-rule)" }}>
          <div className="flex items-center justify-between">
            <div className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: "0.18em", color: "var(--c-dim)", fontWeight: 600 }}>
              {inCount} of {week.picks.length} picks in
            </div>
            <div className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--c-dim)" }}>
              combined {week.combinedOdds ? week.combinedOdds.toFixed(2) : "—"}
            </div>
          </div>
          <div className="flex gap-2 mt-2.5 flex-wrap">
            {week.picks.map((p) => {
              const player = bd.players.find((x) => x.id === p.playerId);
              if (!player) return null;
              return (
                <div key={p.playerId} className="flex flex-col items-center" style={{ width: 40, opacity: p.filled ? 1 : 0.4 }}>
                  <Avatar player={player} size={34} />
                  <span
                    className="font-mono uppercase"
                    style={{ fontSize: 8.5, letterSpacing: "0.08em", marginTop: 3, color: p.result === "Lost" || !p.filled ? "var(--c-burgundy)" : p.result === "Push" ? "var(--c-push)" : "var(--c-forest)", fontWeight: 600 }}
                  >
                    {p.result ? p.result : p.filled ? "in" : "waiting"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* The bet. */}
        <div className="grid grid-cols-3" style={{ borderTop: "1px solid var(--c-rule)", background: "var(--c-bg2)" }}>
          <Tile label="Placing it" value={placer ? (placer.id === meId ? "You" : placer.name) : "—"} sub="this week's turn" />
          <Tile label="Stake" value={fmtMoney(week.stake)} sub={topups > 0 ? `incl. €${topups} top-ups` : "€10 a head"} divider />
          <Tile
            label="If all land"
            value={week.combinedOdds ? fmtMoney(week.stake * week.combinedOdds) : "—"}
            sub={inCount < week.picks.length ? "so far" : "all in"}
            color="var(--c-forest)"
            divider
          />
        </div>
      </Card>

      {/* ─── Money ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/pot">
          <Card accent="var(--c-mustard)">
            <div className="p-4">
              <Eyebrow color="var(--c-mustard)">The pot</Eyebrow>
              <div className="font-display mt-2" style={{ fontSize: 28, lineHeight: 1, color: "var(--c-forest)" }}>
                {fmtMoney(bd.trip.current)}
              </div>
              <div className="mt-2" style={{ height: 6, background: "var(--c-rule)", borderRadius: 3 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "var(--c-forest)", borderRadius: 3 }} />
              </div>
              <div className="font-mono uppercase mt-1.5" style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--c-dim)" }}>
                {pct.toFixed(0)}% of {fmtMoney(bd.trip.target)}
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/fines">
          <Card accent="var(--c-burgundy)">
            <div className="p-4">
              <Eyebrow color="var(--c-burgundy)">Fines owed</Eyebrow>
              <div
                className="font-display mt-2"
                style={{ fontSize: 28, lineHeight: 1, color: owedTotal > 0 ? "var(--c-burgundy)" : "var(--c-forest)" }}
              >
                {fmtMoney(owedTotal)}
              </div>
              <div className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--c-dim)", marginTop: 14 }}>
                {iOwe > 0 ? `you owe ${fmtMoney(iOwe)}` : meId ? "you're clear" : `${unpaid.length} unpaid`}
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* ─── Side bets nudge ───────────────────────────────────── */}
      {(waitingOnMe > 0 || liveBets > 0 || toSquare > 0) && (
        <Link href="/slip" className="block">
          <Card accent="var(--c-denim)">
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <Eyebrow color="var(--c-denim)">Side bets</Eyebrow>
                <div className="font-body mt-1.5" style={{ fontSize: 14, color: "var(--c-ink)" }}>
                  {[
                    waitingOnMe > 0 ? `${waitingOnMe} waiting on you` : "",
                    liveBets > 0 ? `${liveBets} live` : "",
                    toSquare > 0 ? `${toSquare} to square up` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <span className="font-display" style={{ fontSize: 22, color: "var(--c-denim)" }}>
                →
              </span>
            </div>
          </Card>
        </Link>
      )}

      <PushCard />

      <LastWeekend bd={bd} />
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  color,
  divider,
}: {
  label: string;
  value: string;
  sub: string;
  color?: string;
  divider?: boolean;
}) {
  return (
    <div className="px-3 py-3" style={{ borderLeft: divider ? "1px dashed var(--c-rule)" : "none" }}>
      <div className="font-mono uppercase" style={{ fontSize: 8.5, color: "var(--c-faint)", letterSpacing: "0.18em" }}>
        {label}
      </div>
      <div className="font-display truncate" style={{ fontSize: 21, color: color ?? "var(--c-ink)", lineHeight: 1, marginTop: 2 }}>
        {value}
      </div>
      <div className="font-mono uppercase" style={{ fontSize: 9, color: "var(--c-dim)", letterSpacing: "0.1em", marginTop: 3 }}>
        {sub}
      </div>
    </div>
  );
}
