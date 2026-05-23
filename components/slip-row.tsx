"use client";

// One row of the Slip — mobile-tuned port of SlipRow in app-1.jsx.
// On mobile we drop the 6-column desktop grid and stack pick text under name.

import type { ViewPick, Player } from "@/lib/types";
import { Avatar, Chip, ResultBadge, SPORT_COLORS, Stamp } from "./primitives";

export function SlipRow({
  pick,
  player,
  idx,
  isMe,
  isCurrent,
  onAdd,
}: {
  pick: ViewPick;
  player: Player;
  idx: number;
  isMe: boolean;
  isCurrent: boolean;
  onAdd?: () => void;
}) {
  const filled = pick.filled;
  const sportColor = SPORT_COLORS[pick.sport] || "var(--c-denim)";

  return (
    <div
      className={
        "flex items-center gap-3 px-4 py-3 " +
        (idx === 0 ? "" : "border-t ") +
        (filled ? "" : "bg-hatch-burgundy")
      }
      style={{
        borderColor: "var(--c-rule)",
        background: isMe
          ? `linear-gradient(90deg, ${"rgba(200,146,22,0.10)"} 0%, transparent 60%)`
          : undefined,
      }}
    >
      <div
        className="font-mono shrink-0"
        style={{
          fontSize: 11,
          color: "var(--c-faint)",
          fontWeight: 600,
          letterSpacing: "0.05em",
          width: 18,
        }}
      >
        0{idx + 1}
      </div>
      <Avatar player={player} size={36} ring={isMe ? "var(--c-mustard)" : undefined} />
      <div className="min-w-0 flex-1">
        <div
          className="font-display flex items-center gap-2"
          style={{ fontSize: 18, color: "var(--c-ink)", lineHeight: 1.1 }}
        >
          {player.name}
          {isMe && (
            <span
              className="font-stamp uppercase"
              style={{
                fontSize: 9,
                letterSpacing: "0.18em",
                color: "var(--c-mustard)",
                border: "1px solid var(--c-mustard)",
                padding: "1px 5px",
                borderRadius: 2,
              }}
            >
              you
            </span>
          )}
        </div>
        {filled ? (
          <div
            className="font-body truncate"
            style={{ fontSize: 13, color: "var(--c-ink-soft)", marginTop: 2 }}
          >
            {pick.sel}
          </div>
        ) : (
          <div
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              color: "var(--c-burgundy)",
              marginTop: 3,
              fontWeight: 600,
              letterSpacing: "0.16em",
            }}
          >
            ⚠ Awaiting selection
          </div>
        )}
        {filled && pick.sport && (
          <div className="mt-1.5">
            <Chip color={sportColor} small>
              {pick.sport}
            </Chip>
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div
          className="font-display"
          style={{
            fontSize: 22,
            color: filled ? "var(--c-denim)" : "var(--c-faint)",
            lineHeight: 1,
          }}
        >
          {filled && pick.odds ? pick.odds.toFixed(2) : "—"}
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: 9,
            color: "var(--c-faint)",
            letterSpacing: "0.15em",
            marginTop: 2,
          }}
        >
          ODDS
        </div>
        <div className="mt-1.5 flex items-center gap-1 justify-end">
          {/* Anyone can edit any row on any week. The `isMe` highlight stays
              as a visual cue (avatar ring + 'you' chip + gradient) but it
              doesn't restrict interaction anymore — open trust between the
              7 lads. */}

          {/* Past weeks: result badge + edit pencil */}
          {!isCurrent && <ResultBadge result={pick.result} small />}
          {!isCurrent && filled && onAdd && (
            <button
              onClick={onAdd}
              aria-label="Edit pick"
              className="font-mono uppercase"
              style={{
                fontSize: 11,
                color: "var(--c-dim)",
                border: "1px solid var(--c-rule)",
                padding: "3px 6px",
                borderRadius: 2,
                lineHeight: 1,
              }}
            >
              ✎
            </button>
          )}
          {/* Past week with no pick — let anyone backfill it */}
          {!isCurrent && !filled && onAdd && (
            <button
              onClick={onAdd}
              className="font-stamp uppercase"
              style={{
                background: "transparent",
                color: "var(--c-burgundy)",
                border: "1.5px solid var(--c-burgundy)",
                padding: "4px 8px",
                borderRadius: 2,
                fontSize: 11,
                letterSpacing: "0.12em",
              }}
            >
              + Add
            </button>
          )}

          {/* Current week + filled: edit pill + Locked stamp */}
          {isCurrent && filled && (
            <>
              {onAdd && (
                <button
                  onClick={onAdd}
                  className="font-mono uppercase"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    color: "var(--c-dim)",
                    border: "1px solid var(--c-rule)",
                    padding: "3px 6px",
                    borderRadius: 2,
                  }}
                >
                  edit
                </button>
              )}
              <Stamp color="var(--c-forest)" rotate={0}>Locked</Stamp>
            </>
          )}
          {/* Current week + empty: + Add for any row (burgundy if it's your
              row, slightly subtler outline for others). */}
          {isCurrent && !filled && onAdd && (
            <button
              onClick={onAdd}
              className="font-stamp uppercase"
              style={{
                background: isMe ? "var(--c-burgundy)" : "transparent",
                color: isMe ? "var(--c-paper)" : "var(--c-burgundy)",
                border: isMe ? "none" : "1.5px solid var(--c-burgundy)",
                padding: "6px 10px",
                borderRadius: 2,
                fontSize: 12,
                letterSpacing: "0.12em",
              }}
            >
              + Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
