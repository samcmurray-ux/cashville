"use client";

// Week Detail bottom sheet — opened from the History list (editable) and from
// the Records tab's Near-Misses / Hall of Fame (read-only "relive" view).
// In editable mode each row becomes a live SlipRow: tap W/L/P to settle,
// ✎ to edit the pick, + Add to backfill an empty slot.

import { Sheet } from "./sheet";
import {
  Avatar,
  Chip,
  ResultBadge,
  SPORT_COLORS,
  Headline,
  Stamp,
} from "./primitives";
import { SlipRow } from "./slip-row";
import { fmtMoney } from "@/lib/bd";
import type { Player, ViewWeek } from "@/lib/types";

export function WeekDetailSheet({
  open,
  onClose,
  week,
  players,
  editable,
  onSetResult,
  onEditPick,
}: {
  open: boolean;
  onClose: () => void;
  week: ViewWeek | null;
  players: Player[];
  // Editable mode (the History "book" tab). When set, rows become editable.
  editable?: boolean;
  onSetResult?: (playerId: string, result: "Won" | "Lost" | "Push" | null) => void;
  onEditPick?: (playerId: string) => void;
}) {
  if (!week) return null;
  const dateStr = (() => {
    try {
      return new Date(week.date).toLocaleDateString("en-IE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return week.date;
    }
  })();

  return (
    <Sheet open={open} onClose={onClose} title={`Week ${week.week} · ${dateStr}`}>
      {/* Top summary — combined odds + result stamp + payout */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div
            className="font-mono uppercase"
            style={{
              fontSize: 9,
              color: "var(--c-faint)",
              letterSpacing: "0.22em",
            }}
          >
            Combined
          </div>
          <Headline
            size={36}
            color={week.accaWon ? "var(--c-forest)" : "var(--c-denim)"}
          >
            @{week.combinedOdds.toFixed(2)}
          </Headline>
        </div>
        <div className="text-right">
          {week.accaWon ? (
            <Stamp color="var(--c-forest)" rotate={-4} size="lg">
              Banked
            </Stamp>
          ) : (
            <Stamp color="var(--c-burgundy)" rotate={3} size="md">
              Missed
            </Stamp>
          )}
          <div
            className="font-display mt-1"
            style={{
              fontSize: 22,
              color: week.accaWon ? "var(--c-forest)" : "var(--c-faint)",
              lineHeight: 1,
            }}
          >
            {fmtMoney(week.payout || 0)}
          </div>
        </div>
      </div>

      {editable && (
        <div
          className="font-mono uppercase mb-2"
          style={{ fontSize: 9, letterSpacing: "0.16em", color: "var(--c-burgundy)" }}
        >
          ✎ editing · W/L/P to settle · ↻ to re-pick a result · ✎ to edit the bet
        </div>
      )}

      {/* Picks list — read-only "relive" rows, or editable SlipRows when the
          History tab opens it in edit mode. */}
      <div
        style={{
          border: "1px solid var(--c-rule-strong)",
          borderRadius: 2,
        }}
      >
        {week.picks.map((p, i) => {
          const player = players.find((x) => x.id === p.playerId);
          if (!player) return null;

          // Editable path: reuse the live SlipRow (handles W/L/P toggle, edit
          // pencil, clear, + Add) with isCurrent=false so it's "past week" mode.
          if (editable && onSetResult && onEditPick) {
            return (
              <SlipRow
                key={p.playerId}
                pick={p}
                player={player}
                idx={i}
                isMe={false}
                isCurrent={false}
                onAdd={() => onEditPick(p.playerId)}
                onSetResult={(r) => onSetResult(p.playerId, r)}
              />
            );
          }

          const sportColor = SPORT_COLORS[p.sport] || "var(--c-denim)";
          return (
            <div
              key={p.playerId}
              className="flex items-center gap-3 px-3 py-2.5"
              style={{
                borderTop: i === 0 ? "none" : "1px solid var(--c-rule)",
                background:
                  p.result === "Won"
                    ? "rgba(45, 93, 58, 0.06)"
                    : p.result === "Lost"
                      ? "rgba(140, 35, 52, 0.06)"
                      : "transparent",
              }}
            >
              <Avatar player={player} size={28} />
              <div className="min-w-0 flex-1">
                <div
                  className="font-display"
                  style={{
                    fontSize: 14,
                    color: "var(--c-ink)",
                    lineHeight: 1.1,
                  }}
                >
                  {player.name}
                </div>
                <div
                  className="font-body truncate"
                  style={{
                    fontSize: 12,
                    color: "var(--c-ink-soft)",
                    marginTop: 1,
                  }}
                >
                  {p.sel || "—"}
                </div>
                {p.sport && (
                  <div className="mt-1">
                    <Chip color={sportColor} small>
                      {p.sport}
                    </Chip>
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div
                  className="font-display"
                  style={{
                    fontSize: 16,
                    color:
                      p.result === "Won"
                        ? "var(--c-forest)"
                        : "var(--c-ink)",
                    lineHeight: 1,
                  }}
                >
                  {p.odds ? p.odds.toFixed(2) : "—"}
                </div>
                <div className="mt-1">
                  <ResultBadge result={p.result} small />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-3">
        <div
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "var(--c-dim)",
          }}
        >
          {week.wonCount}W · {week.lostCount}L
          {week.pushCount > 0 && ` · ${week.pushCount}P`}
        </div>
        <button
          onClick={onClose}
          className="font-stamp uppercase"
          style={{
            fontSize: 12,
            letterSpacing: "0.16em",
            color: "var(--c-ink)",
            background: "transparent",
            border: "1.5px solid var(--c-ink)",
            padding: "6px 14px",
            borderRadius: 2,
          }}
        >
          Close
        </button>
      </div>
    </Sheet>
  );
}
