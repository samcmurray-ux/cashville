"use client";

// History — vertical list of weeks, newest first. Tap → expanded slip in v1.1.

import { useBD } from "@/lib/useBD";
import { Card, Eyebrow, Headline, Chip, Stamp } from "@/components/primitives";
import { fmtMoney } from "@/lib/bd";

export default function HistoryPage() {
  const { bd } = useBD();
  if (!bd) return null;

  const settled = bd.weeks
    .filter((w) => w.filled && w.week !== bd.currentWeekNum)
    .sort((a, b) => b.week - a.week);

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="px-1">
        <Eyebrow color="var(--c-burgundy)">Look back</Eyebrow>
        <Headline size={32}>The book</Headline>
      </div>
      {settled.map((w) => {
        const summary = w.accaWon
          ? "All seven landed."
          : (() => {
              const losers = w.picks.filter((p) => p.result === "Lost");
              if (losers.length === 1) {
                const playerName =
                  bd.players.find((p) => p.id === losers[0].playerId)?.name ?? "?";
                return `${playerName} torched it · ${losers[0].sel || "—"}`;
              }
              return `${losers.length} missed`;
            })();
        return (
          <Card key={w.week} accent={w.accaWon ? "var(--c-forest)" : "var(--c-rule-strong)"}>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Eyebrow color={w.accaWon ? "var(--c-forest)" : "var(--c-dim)"}>
                    Week {w.week} · {fmtDate(w.date)}
                  </Eyebrow>
                  <div className="flex items-baseline gap-2 mt-1">
                    <Headline size={26} color={w.accaWon ? "var(--c-forest)" : "var(--c-ink)"}>
                      @{w.combinedOdds.toFixed(2)}
                    </Headline>
                    {w.accaWon && <Stamp color="var(--c-forest)" rotate={-4}>Winner</Stamp>}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="font-display"
                    style={{
                      fontSize: 22,
                      color: w.accaWon ? "var(--c-forest)" : "var(--c-faint)",
                      lineHeight: 1,
                    }}
                  >
                    {fmtMoney(w.payout || 0)}
                  </div>
                  <div
                    className="font-mono uppercase"
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.15em",
                      color: "var(--c-faint)",
                      marginTop: 2,
                    }}
                  >
                    {w.accaWon ? "banked" : "missed"}
                  </div>
                </div>
              </div>
              <p
                className="font-body italic mt-2"
                style={{ fontSize: 13, color: "var(--c-ink-soft)" }}
              >
                {summary}
              </p>
              <div className="flex gap-1 mt-2 flex-wrap">
                <Chip color="var(--c-forest)" small>{w.wonCount}W</Chip>
                <Chip color="var(--c-burgundy)" small>{w.lostCount}L</Chip>
                {w.pushCount > 0 && (
                  <Chip color="var(--c-push)" small>
                    {w.pushCount}P
                  </Chip>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IE", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}
