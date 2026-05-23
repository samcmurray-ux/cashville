"use client";

// One row of the Slip — mobile-tuned port of SlipRow in app-1.jsx.
// On mobile we drop the 6-column desktop grid and stack pick text under name.

import type { ViewPick, Player } from "@/lib/types";
import { Avatar, Chip, ResultBadge, SPORT_COLORS } from "./primitives";

type Result = "Won" | "Lost" | "Push";

export function SlipRow({
  pick,
  player,
  idx,
  isMe,
  isCurrent,
  onAdd,
  onSetResult,
}: {
  pick: ViewPick;
  player: Player;
  idx: number;
  isMe: boolean;
  isCurrent: boolean;
  onAdd?: () => void;
  // Per-pick settle. Called when the lad taps W/L/P inline. Pass `null` to
  // clear back to unsettled. Parent handles the actual DB write + reload
  // via setPickResult in lib/bd.ts (which also auto-rolls up the week if
  // this is the 7th settle).
  onSetResult?: (result: Result | null) => void;
}) {
  const filled = pick.filled;
  const settled =
    pick.result === "Won" || pick.result === "Lost" || pick.result === "Push";
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
        <div className="mt-1.5 flex items-center gap-1 justify-end flex-wrap">
          {/* Unfilled rows — show + Add. Current-week + your row gets the
              big burgundy CTA; all other rows get the subtler outline. */}
          {!filled && onAdd && (
            <button
              onClick={onAdd}
              className="font-stamp uppercase"
              style={{
                background: isMe && isCurrent ? "var(--c-burgundy)" : "transparent",
                color: isMe && isCurrent ? "var(--c-paper)" : "var(--c-burgundy)",
                border: isMe && isCurrent ? "none" : "1.5px solid var(--c-burgundy)",
                padding: isMe && isCurrent ? "6px 10px" : "4px 8px",
                borderRadius: 2,
                fontSize: isMe && isCurrent ? 12 : 11,
                letterSpacing: "0.12em",
              }}
            >
              + Add
            </button>
          )}

          {/* Filled + settled — show the result chip + edit pencil. Tapping
              the chip re-opens the inline W/L/P selector so you can correct
              a fat-finger. */}
          {filled && settled && (
            <>
              <ResultBadge result={pick.result} small />
              {onSetResult && (
                <button
                  onClick={() => onSetResult(null)}
                  aria-label="Clear result"
                  title="Clear — re-pick W/L/P"
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    color: "var(--c-dim)",
                    border: "1px solid var(--c-rule)",
                    padding: "2px 5px",
                    borderRadius: 2,
                    lineHeight: 1,
                  }}
                >
                  ↻
                </button>
              )}
              {onAdd && (
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
            </>
          )}

          {/* Filled but unsettled — inline W/L/P selector. This is the per-pick
              settle ask. After the 7th pick settles, lib/bd.ts auto-rolls up
              the week + logs the win movement. */}
          {filled && !settled && (
            <>
              {onSetResult && (
                <div
                  className="flex items-center"
                  style={{
                    border: "1px solid var(--c-rule-strong)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  {(["Won", "Lost", "Push"] as Result[]).map((opt, i) => {
                    const color =
                      opt === "Won"
                        ? "var(--c-forest)"
                        : opt === "Lost"
                          ? "var(--c-burgundy)"
                          : "var(--c-push)";
                    return (
                      <button
                        key={opt}
                        onClick={() => onSetResult(opt)}
                        aria-label={`Mark ${opt}`}
                        className="font-stamp uppercase"
                        style={{
                          background: "transparent",
                          color,
                          border: "none",
                          borderLeft: i === 0 ? "none" : "1px solid var(--c-rule)",
                          padding: "5px 8px",
                          fontSize: 12,
                          letterSpacing: "0.12em",
                          lineHeight: 1,
                          minWidth: 26,
                        }}
                      >
                        {opt[0]}
                      </button>
                    );
                  })}
                </div>
              )}
              {onAdd && (
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
