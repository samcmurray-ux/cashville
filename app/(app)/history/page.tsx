"use client";

// History — vertical list of weeks, newest first ("the book"). Tap any card
// to open the full slip for that week in an EDITABLE bottom sheet: change
// any result (W/L/P), edit a pick, add/delete picks. Edits write straight
// to Supabase and realtime-sync to everyone.

import { useState } from "react";
import { useBD } from "@/lib/useBD";
import { Card, Eyebrow, Headline, Chip, Stamp } from "@/components/primitives";
import { WeekDetailSheet } from "@/components/week-detail-sheet";
import { AddPickSheet } from "@/components/add-pick-sheet";
import { fmtMoney, setPickResult } from "@/lib/bd";

export default function HistoryPage() {
  const { bd, reload } = useBD();
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  // When set, the AddPickSheet is open for this player on the open week.
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);

  if (!bd) return null;

  const settled = bd.weeks
    .filter((w) => w.filled && w.week !== bd.currentWeekNum)
    .sort((a, b) => b.week - a.week);

  const selected = openWeek != null ? bd.weeks.find((w) => w.week === openWeek) ?? null : null;
  const editingPick =
    selected && editingPlayer
      ? selected.picks.find((p) => p.playerId === editingPlayer) ?? null
      : null;

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
          <button
            key={w.week}
            onClick={() => setOpenWeek(w.week)}
            className="block w-full text-left"
            aria-label={`Open week ${w.week} detail`}
          >
            <Card accent={w.accaWon ? "var(--c-forest)" : "var(--c-rule-strong)"}>
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
                <div className="flex gap-1 mt-2 flex-wrap items-center">
                  <Chip color="var(--c-forest)" small>{w.wonCount}W</Chip>
                  <Chip color="var(--c-burgundy)" small>{w.lostCount}L</Chip>
                  {w.pushCount > 0 && (
                    <Chip color="var(--c-push)" small>
                      {w.pushCount}P
                    </Chip>
                  )}
                  <span
                    className="font-mono uppercase ml-auto"
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.2em",
                      color: "var(--c-faint)",
                    }}
                  >
                    tap to view &amp; edit →
                  </span>
                </div>
              </div>
            </Card>
          </button>
        );
      })}

      <WeekDetailSheet
        open={openWeek != null}
        onClose={() => setOpenWeek(null)}
        week={selected}
        players={bd.players}
        editable
        onSetResult={async (playerId, result) => {
          if (openWeek == null) return;
          // setPickResult also re-rolls the week (acca_won/payout) + logs the
          // win movement if the 7th result completes a winning acca.
          await setPickResult(openWeek, playerId, result);
          await reload();
        }}
        onEditPick={(playerId) => setEditingPlayer(playerId)}
      />

      {/* Edit-pick sheet, layered over the detail sheet. weekNum = the open
          book week, so edits land on that historical week. */}
      {openWeek != null && editingPlayer && (
        <AddPickSheet
          open={true}
          onClose={() => setEditingPlayer(null)}
          weekNum={openWeek}
          playerId={editingPlayer}
          playerName={bd.players.find((p) => p.id === editingPlayer)?.name}
          existing={editingPick}
          onSaved={() => void reload()}
        />
      )}
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
