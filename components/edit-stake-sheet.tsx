"use client";

// Edit Stake — change how much goes on the acca for one week. The default
// is €70 (€10 a head), but some weeks the players put more on. Payout,
// "if all 7 land" and "fund jumps to" all scale off this number.

import { useEffect, useState } from "react";
import { Sheet } from "./sheet";
import { setWeekStake } from "@/lib/bd";

const QUICK = [70, 105, 140, 210];

export function EditStakeSheet({
  open,
  onClose,
  weekNum,
  stake,
  topups = [],
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  weekNum: number;
  stake: number;
  // Losing-streak top-ups owed on this week's bet, e.g. Jamie +€15.
  topups?: { name: string; amount: number }[];
  onSaved?: () => void;
}) {
  const [text, setText] = useState(String(stake));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setText(String(stake));
      setError(null);
    }
  }, [open, stake]);

  const value = parseFloat(text.replace(/[€,\s]/g, ""));
  const valid = Number.isFinite(value) && value > 0 && value <= 100000;

  const submit = async () => {
    setError(null);
    if (!valid) return setError("Enter a stake above €0");
    setSaving(true);
    try {
      // The stake column is whole euros.
      await setWeekStake(weekNum, Math.round(value));
      onSaved?.();
      onClose();
    } catch (e) {
      setError((e as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={`Stake · Week ${weekNum}`}>
      <div className="space-y-4">
        <div>
          <div
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: "0.24em",
              color: "var(--c-dim)",
              fontWeight: 600,
            }}
          >
            Acca stake (€)
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            className="w-full mt-2 px-3 py-3 font-display bg-bg2"
            style={{
              border: "1.5px solid var(--c-rule-strong)",
              borderRadius: 2,
              color: "var(--c-ink)",
              fontSize: 26,
            }}
            autoFocus
          />
          <p
            className="font-mono mt-1.5"
            style={{ fontSize: 10, color: "var(--c-dim)", letterSpacing: "0.1em" }}
          >
            {valid ? `€${+(value / 7).toFixed(2)} a head across 7 players` : " "}
          </p>
        </div>

        {topups.length > 0 && (
          <button
            type="button"
            onClick={() => setText(String(70 + topups.reduce((a, t) => a + t.amount, 0)))}
            className="w-full text-left p-3"
            style={{ border: "1.5px dashed var(--c-burgundy)", borderRadius: 2 }}
          >
            <span className="font-mono uppercase block" style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--c-burgundy)" }}>
              Losing-streak top-ups due
            </span>
            <span className="font-body block" style={{ fontSize: 14, color: "var(--c-ink)", marginTop: 2 }}>
              {topups.map((t) => `${t.name} +€${t.amount}`).join(" · ")} → tap for €
              {70 + topups.reduce((a, t) => a + t.amount, 0)}
            </span>
          </button>
        )}

        <div className="flex gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => setText(String(q))}
              className="flex-1 font-stamp uppercase py-2"
              style={{
                fontSize: 13,
                letterSpacing: "0.1em",
                border: "1.5px solid var(--c-ink)",
                borderRadius: 2,
                background: value === q ? "var(--c-mustard)" : "transparent",
                color: "var(--c-ink)",
              }}
            >
              €{q}
            </button>
          ))}
        </div>

        {error && (
          <p
            className="font-mono uppercase"
            style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--c-burgundy)" }}
          >
            ⚠ {error}
          </p>
        )}

        <div className="flex gap-2 pt-2">
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
            disabled={saving || !valid}
            className="flex-[2] font-stamp uppercase py-3"
            style={{
              fontSize: 16,
              letterSpacing: "0.16em",
              background: "var(--c-ink)",
              color: "var(--c-paper)",
              border: "none",
              borderRadius: 2,
              opacity: saving || !valid ? 0.5 : 1,
            }}
          >
            {saving ? "Saving…" : "Set stake"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
