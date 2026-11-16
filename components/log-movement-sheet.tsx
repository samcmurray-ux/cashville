"use client";

// Log Movement bottom sheet — any €in or €out the players agreed in the chat.
// Types match the migration check constraint: win | forfeit | bonus | adjust.

import { useEffect, useState } from "react";
import { Sheet } from "./sheet";
import { addMovement, removeMovement, updateMovement } from "@/lib/bd";
import type { MovementRow, ViewMovement } from "@/lib/types";
import { fireMoment } from "./moments";

const TYPES: { value: MovementRow["type"]; label: string; sub: string }[] = [
  { value: "win", label: "Acca win", sub: "the slip landed" },
  { value: "forfeit", label: "Forfeit", sub: "loser tax" },
  { value: "bonus", label: "Bonus bet", sub: "group all-in" },
  { value: "adjust", label: "Adjust", sub: "fix the ledger" },
];

export function LogMovementSheet({
  open,
  onClose,
  defaultWeek,
  existing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  defaultWeek: number | null;
  // When set, the sheet edits this entry instead of adding a new one.
  existing?: ViewMovement | null;
  onSaved?: () => void;
}) {
  const [type, setType] = useState<MovementRow["type"]>("forfeit");
  const [amount, setAmount] = useState<string>("");
  const [weekStr, setWeekStr] = useState<string>(defaultWeek != null ? String(defaultWeek) : "");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setType(existing?.type ?? "forfeit");
    setAmount(existing ? String(existing.amount) : "");
    setWeekStr(
      existing ? (existing.week != null ? String(existing.week) : "") : defaultWeek != null ? String(defaultWeek) : "",
    );
    setNotes(existing?.notes ?? "");
  }, [open, existing, defaultWeek]);

  const submit = async () => {
    setError(null);
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt === 0) return setError("Amount required (positive or negative)");
    const wk = weekStr.trim() ? parseInt(weekStr, 10) : null;
    setSaving(true);
    try {
      if (existing) await updateMovement(existing.id, { week: wk, type, amount: amt, notes });
      else {
        await addMovement({ week: wk, type, amount: amt, notes });
        if (amt > 0 && (type === "win" || type === "bonus")) fireMoment("win");
      }
      onSaved?.();
      onClose();
      // Reset for next open
      setAmount("");
      setNotes("");
    } catch (e) {
      setError((e as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={existing ? "Edit entry" : "Log a movement"}>
      <div className="space-y-4">
        <div>
          <Label>Type</Label>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {TYPES.map((t) => {
              const active = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className="text-left p-3"
                  style={{
                    border: `1.5px solid ${active ? "var(--c-burgundy)" : "var(--c-rule-strong)"}`,
                    background: active ? "var(--c-bg2)" : "transparent",
                    borderRadius: 2,
                  }}
                >
                  <div
                    className="font-stamp uppercase"
                    style={{
                      fontSize: 14,
                      letterSpacing: "0.14em",
                      color: active ? "var(--c-burgundy)" : "var(--c-ink)",
                    }}
                  >
                    {t.label}
                  </div>
                  <div
                    className="font-mono uppercase"
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.12em",
                      color: "var(--c-dim)",
                      marginTop: 2,
                    }}
                  >
                    {t.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label>Amount (€)</Label>
          <input
            type="number"
            inputMode="decimal"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="35"
            className="w-full mt-2 px-3 py-3 font-display bg-bg2"
            style={{
              border: "1.5px solid var(--c-rule-strong)",
              borderRadius: 2,
              color: "var(--c-forest)",
              fontSize: 26,
            }}
          />
          <p
            className="font-mono mt-1.5"
            style={{ fontSize: 10, color: "var(--c-dim)", letterSpacing: "0.1em" }}
          >
            negative to deduct
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Week (optional)</Label>
            <input
              type="number"
              inputMode="numeric"
              value={weekStr}
              onChange={(e) => setWeekStr(e.target.value)}
              placeholder={defaultWeek != null ? String(defaultWeek) : "27"}
              className="w-full mt-2 px-3 py-2 font-mono bg-bg2"
              style={{
                border: "1.5px solid var(--c-rule)",
                borderRadius: 2,
                color: "var(--c-ink)",
                fontSize: 16,
              }}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="rob's tax"
              className="w-full mt-2 px-3 py-2 font-body bg-bg2"
              style={{
                border: "1.5px solid var(--c-rule)",
                borderRadius: 2,
                color: "var(--c-ink-soft)",
                fontSize: 14,
              }}
            />
          </div>
        </div>

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

        <div className="flex gap-2 pt-2">
          {existing && (
            <button
              onClick={async () => {
                if (!confirm("Delete this entry from the pot?")) return;
                await removeMovement(existing.id);
                onSaved?.();
                onClose();
              }}
              disabled={saving}
              aria-label="Delete entry"
              className="font-stamp uppercase"
              style={{
                fontSize: 14,
                padding: "0 14px",
                border: "1.5px solid var(--c-burgundy)",
                color: "var(--c-burgundy)",
                background: "transparent",
                borderRadius: 2,
              }}
            >
              ✕
            </button>
          )}
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
            disabled={saving}
            className="flex-[2] font-stamp uppercase py-3"
            style={{
              fontSize: 16,
              letterSpacing: "0.16em",
              background: "var(--c-forest)",
              color: "var(--c-paper)",
              border: "none",
              borderRadius: 2,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : existing ? "Save changes" : "Log it"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono uppercase"
      style={{
        fontSize: 10,
        letterSpacing: "0.24em",
        color: "var(--c-dim)",
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}
