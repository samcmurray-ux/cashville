"use client";

// Settle Week — admin marks each of the 7 picks W/L/P, sheet computes the
// combined odds (Won + Lost only — Push is excluded per bookmaker convention)
// and the payout (70 × combined). If all 7 land, optionally auto-log the
// win movement so the pot updates instantly.

import { useEffect, useMemo, useState } from "react";
import { Sheet } from "./sheet";
import { settleWeek } from "@/lib/bd";
import type { ViewWeek, Player } from "@/lib/types";
import { Avatar } from "./primitives";

type Result = "Won" | "Lost" | "Push";

export function SettleWeekSheet({
  open,
  onClose,
  week,
  players,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  week: ViewWeek;
  players: Player[];
  onSaved?: () => void;
}) {
  // One result per playerId. Seed from existing results if the week is being re-settled.
  const initial = useMemo<Record<string, Result>>(() => {
    const out: Record<string, Result> = {};
    for (const p of week.picks) {
      if (p.result === "Won" || p.result === "Lost" || p.result === "Push") {
        out[p.playerId] = p.result;
      }
    }
    return out;
  }, [week]);

  const [results, setResults] = useState<Record<string, Result>>(initial);
  const [logWin, setLogWin] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setResults(initial);
      setError(null);
    }
  }, [open, initial]);

  // Compute combined odds + payout live as the admin clicks W/L/P.
  // Same rule as the prototype: only Won and Lost picks multiply in;
  // Push is excluded.
  const { combinedOdds, payout, allPicked, allWon } = useMemo(() => {
    let combined = 1;
    let counted = 0;
    let allP = true;
    let allW = true;
    for (const p of week.picks) {
      const r = results[p.playerId];
      if (!r) allP = false;
      if (r !== "Won") allW = false;
      if (p.odds && (r === "Won" || r === "Lost")) {
        combined *= p.odds;
        counted++;
      }
    }
    const round = +combined.toFixed(2);
    return {
      combinedOdds: counted > 0 ? round : 0,
      payout: counted > 0 ? Math.round(70 * round) : 0,
      allPicked: allP,
      allWon: allW && allP,
    };
  }, [results, week]);

  const submit = async () => {
    setError(null);
    if (!allPicked) return setError("Mark every lad first — W, L or P");
    setSaving(true);
    try {
      await settleWeek({
        weekNum: week.week,
        results: week.picks.map((p) => ({
          playerId: p.playerId,
          result: results[p.playerId] as Result,
        })),
        combinedOdds,
        payout,
        logWinMovement: logWin,
      });
      onSaved?.();
      onClose();
    } catch (e) {
      setError((e as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={`Settle · Week ${week.week}`}>
      <div className="space-y-3">
        {week.picks.map((p) => {
          const player = players.find((x) => x.id === p.playerId);
          if (!player) return null;
          const r = results[p.playerId];
          return (
            <div
              key={p.playerId}
              className="flex items-center gap-3 p-2.5"
              style={{
                border: "1px solid var(--c-rule)",
                borderRadius: 2,
                background:
                  r === "Won"
                    ? "rgba(45, 93, 58, 0.08)"
                    : r === "Lost"
                      ? "rgba(140, 35, 52, 0.08)"
                      : r === "Push"
                        ? "rgba(183, 132, 32, 0.08)"
                        : "transparent",
              }}
            >
              <Avatar player={player} size={32} />
              <div className="min-w-0 flex-1">
                <div
                  className="font-display"
                  style={{ fontSize: 14, color: "var(--c-ink)", lineHeight: 1.1 }}
                >
                  {player.name}{" "}
                  <span
                    className="font-mono"
                    style={{ fontSize: 11, color: "var(--c-denim)" }}
                  >
                    @{p.odds?.toFixed(2) ?? "—"}
                  </span>
                </div>
                <div
                  className="font-body truncate"
                  style={{ fontSize: 12, color: "var(--c-ink-soft)" }}
                >
                  {p.sel || "—"}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {(["Won", "Lost", "Push"] as Result[]).map((opt) => {
                  const active = r === opt;
                  const color =
                    opt === "Won"
                      ? "var(--c-forest)"
                      : opt === "Lost"
                        ? "var(--c-burgundy)"
                        : "var(--c-push)";
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setResults((cur) => ({ ...cur, [p.playerId]: opt }))
                      }
                      className="font-stamp uppercase"
                      style={{
                        fontSize: 11,
                        letterSpacing: "0.12em",
                        padding: "5px 8px",
                        borderRadius: 2,
                        border: `1.5px solid ${color}`,
                        background: active ? color : "transparent",
                        color: active ? "var(--c-paper)" : color,
                        minWidth: 32,
                      }}
                    >
                      {opt[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div
          className="grid grid-cols-2 gap-3 p-3"
          style={{
            background: "var(--c-bg2)",
            border: "1px solid var(--c-rule)",
            borderRadius: 2,
          }}
        >
          <Stat
            label="Combined"
            value={combinedOdds > 0 ? `@${combinedOdds.toFixed(2)}` : "—"}
            color={allWon ? "var(--c-forest)" : "var(--c-denim)"}
          />
          <Stat
            label={allWon ? "Banked" : allPicked ? "Would've paid" : "Payout"}
            value={payout > 0 ? `€${payout.toLocaleString()}` : "—"}
            color={allWon ? "var(--c-forest)" : "var(--c-faint)"}
          />
        </div>

        {allWon && (
          <label className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={logWin}
              onChange={(e) => setLogWin(e.target.checked)}
              className="w-4 h-4"
            />
            <span
              className="font-body"
              style={{ fontSize: 13, color: "var(--c-ink-soft)" }}
            >
              Also log a <strong>€{payout.toLocaleString()} win</strong> movement to the pot
            </span>
          </label>
        )}

        {error && (
          <p
            className="font-mono uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              color: "var(--c-burgundy)",
            }}
          >
            ⚠ {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 font-stamp uppercase py-3"
            style={{
              fontSize: 14,
              letterSpacing: "0.14em",
              border: "1.5px solid var(--c-ink)",
              color: "var(--c-ink)",
              background: "transparent",
              borderRadius: 2,
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !allPicked}
            className="flex-[2] font-stamp uppercase py-3"
            style={{
              fontSize: 16,
              letterSpacing: "0.16em",
              background: allWon ? "var(--c-forest)" : "var(--c-ink)",
              color: "var(--c-paper)",
              border: "none",
              borderRadius: 2,
              opacity: saving || !allPicked ? 0.5 : 1,
            }}
          >
            {saving ? "Settling…" : allWon ? "Bank it" : "Settle"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div
        className="font-mono uppercase"
        style={{
          fontSize: 9,
          letterSpacing: "0.18em",
          color: "var(--c-dim)",
        }}
      >
        {label}
      </div>
      <div className="font-display" style={{ fontSize: 22, color, lineHeight: 1.1, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}
