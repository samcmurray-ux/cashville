"use client";

// Add Pick bottom sheet — the single most important interaction in the app.
// Writes to Supabase optimistically; realtime push updates everyone else.

import { useEffect, useMemo, useState } from "react";
import { Sheet } from "./sheet";
import { addPick } from "@/lib/bd";
import type { ViewPick } from "@/lib/types";

const SPORTS = ["Football", "Rugby", "NFL", "Horses", "GAA", "Golf", "NBA", "MMA", "Darts", "Other"] as const;

// ─── Odds parser ───────────────────────────────────────────────────────
// Accepts either decimal ("1.40", "3.5") or fractional ("2/5", "5/2",
// "11/4"). Returns the decimal value the DB stores. The conversion is:
//   decimal = numerator / denominator + 1
// (matches the HANDOFF.md guidance — e.g. 1/4 = 0.25 fractional = 1.25 decimal).
type ParsedOdds =
  | { ok: true; decimal: number; mode: "decimal" | "fractional"; pretty: string }
  | { ok: false; reason: string | null };

function parseOdds(raw: string): ParsedOdds {
  const s = raw.trim();
  if (!s) return { ok: false, reason: null };

  // Fractional: digits, optional decimal, "/", digits.
  const fracMatch = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) {
      return { ok: false, reason: "Bad fraction" };
    }
    const decimal = +(num / den + 1).toFixed(4);
    return { ok: true, decimal, mode: "fractional", pretty: `${stripZero(num)}/${stripZero(den)}` };
  }

  // Decimal: a number, no slash.
  const dec = parseFloat(s);
  if (!Number.isFinite(dec)) return { ok: false, reason: "Not a number" };
  if (dec < 1.01) return { ok: false, reason: "Decimal odds must be ≥ 1.01" };
  return { ok: true, decimal: +dec.toFixed(4), mode: "decimal", pretty: dec.toFixed(2) };
}

function stripZero(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}

export function AddPickSheet({
  open,
  onClose,
  weekNum,
  playerId,
  existing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  weekNum: number;
  playerId: string;
  existing: ViewPick | null;
  onSaved?: () => void;
}) {
  const [sport, setSport] = useState<string>(existing?.sport || "Football");
  const [selection, setSelection] = useState<string>(existing?.sel || "");
  const [oddsText, setOddsText] = useState<string>(
    existing?.odds ? existing.odds.toFixed(2) : "",
  );
  const [notes, setNotes] = useState<string>(existing?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-prime when the existing pick changes (switching player without re-mount).
  useEffect(() => {
    if (open) {
      setSport(existing?.sport || "Football");
      setSelection(existing?.sel || "");
      setOddsText(existing?.odds ? existing.odds.toFixed(2) : "");
      setNotes(existing?.notes || "");
      setError(null);
    }
  }, [open, existing]);

  // Live odds parse — drives the big decimal preview + validation.
  const parsed = useMemo(() => parseOdds(oddsText), [oddsText]);

  const submit = async () => {
    setError(null);
    if (!selection.trim()) return setError("Selection is required");
    if (!parsed.ok) {
      return setError(parsed.reason || "Odds required — e.g. 1.40 or 2/5");
    }
    if (parsed.decimal < 1.01) {
      return setError("Decimal odds must be ≥ 1.01");
    }
    setSaving(true);
    try {
      await addPick(
        weekNum,
        playerId,
        { sport, sel: selection.trim(), odds: parsed.decimal, notes },
        existing?._dbId,
      );
      onSaved?.();
      onClose();
    } catch (e) {
      setError((e as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const titleAction = existing?.filled ? "Edit pick" : "Add pick";

  return (
    <Sheet open={open} onClose={onClose} title={`${titleAction} · Week ${weekNum}`}>
      <div className="space-y-4">
        {/* Sport selector — chip-style buttons, easier to thumb than a select. */}
        <div>
          <Label>Sport</Label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {SPORTS.map((s) => {
              const active = s === sport;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSport(s)}
                  className="font-stamp uppercase"
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.12em",
                    padding: "6px 10px",
                    borderRadius: 2,
                    border: `1.5px solid ${active ? "var(--c-burgundy)" : "var(--c-rule-strong)"}`,
                    background: active ? "var(--c-burgundy)" : "transparent",
                    color: active ? "var(--c-paper)" : "var(--c-ink)",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label>Selection</Label>
          <input
            type="text"
            value={selection}
            onChange={(e) => setSelection(e.target.value)}
            placeholder="Bayern over 2.5 goals"
            className="w-full mt-2 px-3 py-3 font-body bg-bg2"
            style={{
              border: "1.5px solid var(--c-rule-strong)",
              borderRadius: 2,
              color: "var(--c-ink)",
              fontSize: 16,
            }}
            autoComplete="off"
          />
        </div>

        {/* ─── Odds: accepts decimal OR fractional ─────────────────── */}
        <div>
          <Label>Odds</Label>
          <input
            type="text"
            // inputMode="text" gives the regular keyboard with "/" available
            // on iOS — inputMode="decimal" hides the slash key.
            inputMode="text"
            value={oddsText}
            onChange={(e) => setOddsText(e.target.value)}
            placeholder="1.40 or 2/5"
            className="w-full mt-2 px-3 py-3 font-display bg-bg2"
            style={{
              border: "1.5px solid var(--c-rule-strong)",
              borderRadius: 2,
              color: "var(--c-denim)",
              fontSize: 22,
            }}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <p
              className="font-mono"
              style={{
                fontSize: 10,
                color: "var(--c-dim)",
                letterSpacing: "0.1em",
              }}
            >
              decimal e.g. <strong>1.40</strong> · fractional e.g. <strong>2/5</strong> · €70 stake
            </p>
            {/* Live conversion preview */}
            {parsed.ok && parsed.mode === "fractional" && (
              <p
                className="font-mono"
                style={{
                  fontSize: 11,
                  color: "var(--c-forest)",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}
              >
                = <strong style={{ fontSize: 13 }}>{parsed.decimal.toFixed(2)}</strong> decimal
              </p>
            )}
            {parsed.ok && parsed.mode === "decimal" && (
              <p
                className="font-mono"
                style={{
                  fontSize: 11,
                  color: "var(--c-faint)",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}
              >
                {fractionalHint(parsed.decimal)}
              </p>
            )}
          </div>
        </div>

        <div>
          <Label>Notes <span style={{ opacity: 0.6 }}>(optional)</span></Label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="…"
            className="w-full mt-2 px-3 py-2 font-body bg-bg2"
            style={{
              border: "1.5px solid var(--c-rule)",
              borderRadius: 2,
              color: "var(--c-ink-soft)",
              fontSize: 14,
            }}
          />
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
            disabled={saving || !parsed.ok}
            className="flex-[2] font-stamp uppercase py-3"
            style={{
              fontSize: 16,
              letterSpacing: "0.16em",
              background: "var(--c-ink)",
              color: "var(--c-paper)",
              border: "none",
              borderRadius: 2,
              opacity: saving || !parsed.ok ? 0.5 : 1,
            }}
          >
            {saving ? "Locking…" : existing?.filled ? "Update pick" : "Lock it in"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

// Crude reverse-hint for decimal → fractional, just for the right-side label.
// We don't store this — it's only a "by the way" preview for the lad.
function fractionalHint(decimal: number): string {
  const f = decimal - 1;
  if (f <= 0) return "";
  // Try simple denominators (1, 2, 4, 5) — covers most bookies' price ladder.
  for (const den of [1, 2, 4, 5, 8, 10, 100]) {
    const num = f * den;
    if (Math.abs(num - Math.round(num)) < 0.01) {
      return `≈ ${Math.round(num)}/${den}`;
    }
  }
  return "";
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
