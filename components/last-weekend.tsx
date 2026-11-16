"use client";

// Auto-written recap of the latest settled week: the result, hero and
// villain, vote winners, fines, top-ups and side bets. Shown on Home.

import { useMemo } from "react";
import { Card, Eyebrow, Headline, Scribble } from "./primitives";
import { fmtMoney } from "@/lib/bd";
import { computeRecap } from "@/lib/honours";
import type { BD, Player } from "@/lib/types";

export function LastWeekend({ bd }: { bd: BD }) {
  const r = useMemo(() => computeRecap(bd), [bd]);
  if (!r) return null;
  const w = r.week;
  const names = (ps: Player[]) => ps.map((p) => p.name).join(", ");
  const money = (rows: { player: Player; amount: number }[]) =>
    rows.map((x) => `${x.player.name} ${fmtMoney(x.amount)}`).join(" · ");
  const lines: { icon: string; label: string; text: string; color?: string }[] = [];
  if (r.hero) lines.push({ icon: "🦸", label: "Hero", text: `${r.hero.player.name} · ${r.hero.sel} @ ${r.hero.odds.toFixed(2)}`, color: "var(--c-forest)" });
  if (r.villain) {
    lines.push({
      icon: "🦹",
      label: r.villain.solo ? "Villain · killed it alone" : "Villain",
      text: `${r.villain.player.name} · ${r.villain.sel} @ ${r.villain.odds.toFixed(2)}`,
      color: "var(--c-burgundy)",
    });
  }
  if (r.star) lines.push({ icon: "⭐", label: "Bet of the week", text: `${r.star.player.name} · ${r.star.votes} vote${r.star.votes === 1 ? "" : "s"}` });
  if (r.poo) lines.push({ icon: "💩", label: "Stinker of the week", text: `${r.poo.player.name} · ${r.poo.votes} vote${r.poo.votes === 1 ? "" : "s"}` });
  if (r.fines.length) lines.push({ icon: "🟥", label: "Fines handed out", text: money(r.fines) });
  if (r.topups.length) lines.push({ icon: "🔥", label: "Top-ups on the next bet", text: money(r.topups) });
  for (const b of r.sideBets) lines.push({ icon: "🤝", label: "Side bet", text: `${b.winner.name} took ${fmtMoney(b.amount)} off ${b.loser.name}` });

  return (
    <Card accent={w.accaWon ? "var(--c-forest)" : "var(--c-burgundy)"}>
      <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--c-rule)" }}>
        <Eyebrow color={w.accaWon ? "var(--c-forest)" : "var(--c-burgundy)"}>
          Last weekend · week {w.week}
        </Eyebrow>
        <Headline size={32}>
          {w.accaWon
            ? `It landed — ${fmtMoney(w.payout)}`
            : r.losers.length === 1
              ? `${r.losers[0].name} killed it`
              : `${r.losers.length} legs let us down`}
        </Headline>
        <Scribble color="var(--c-dim)" size={18} rotate={-1.5} style={{ marginTop: 4 }}>
          {w.accaWon
            ? `all in at ${w.combinedOdds.toFixed(2)}`
            : `${names(r.losers)} · would've paid ${fmtMoney(w.stake * w.combinedOdds)}`}
        </Scribble>
      </div>
      {lines.map((l, i) => (
        <div
          key={i}
          className="px-4 py-2.5 flex items-center gap-3"
          style={{ borderTop: i === 0 ? "none" : "1px solid var(--c-rule)" }}
        >
          <span style={{ fontSize: 20, width: 26, textAlign: "center" }}>{l.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.16em", color: l.color ?? "var(--c-dim)", fontWeight: 600 }}>
              {l.label}
            </div>
            <div className="font-body" style={{ fontSize: 14, color: "var(--c-ink)", marginTop: 1 }}>
              {l.text}
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}

