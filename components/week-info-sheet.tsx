"use client";

// Week details — the weekend the bet is for, and whose turn it is to place
// it with the bookie. The placer follows a rotation; choosing someone here
// re-anchors the rotation from this week on.

import { useEffect, useState } from "react";
import { Sheet } from "./sheet";
import { setWeekDate, setWeekPlacer } from "@/lib/bd";
import type { Player, ViewWeek } from "@/lib/types";
import { ErrorLine, Label, PlayerChoice, SheetButtons, inputStyle } from "./ui";

export function WeekInfoSheet({
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
  const [date, setDate] = useState(week.date);
  const [placer, setPlacer] = useState<string | null>(week.placerId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDate(week.date);
      setPlacer(week.placerId);
      setError(null);
    }
  }, [open, week]);

  const submit = async () => {
    setError(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Pick a date");
    setSaving(true);
    try {
      if (date !== week.date) await setWeekDate(week.week, date);
      if (placer !== week.placerId) await setWeekPlacer(week.week, placer);
      onSaved?.();
      onClose();
    } catch (e) {
      setError(
        (e as Error).message?.includes("placer_id")
          ? "Whose-turn needs the database update first"
          : (e as Error).message || "Save failed",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={`Week ${week.week} details`}>
      <div className="space-y-4">
        <div>
          <Label>Weekend of</Label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full mt-2 px-3 py-3 font-mono bg-bg2"
            style={inputStyle}
          />
        </div>
        <div>
          <Label>Whose turn to place the bet</Label>
          <PlayerChoice players={players} value={placer} onChange={setPlacer} />
          <p
            className="font-mono mt-2"
            style={{ fontSize: 10, color: "var(--c-dim)", letterSpacing: "0.08em", lineHeight: 1.5 }}
          >
            {week.placerExplicit
              ? "Set by hand for this week."
              : "Following the rotation."}{" "}
            Changing it moves the rotation on from here.
          </p>
          {week.placerExplicit && (
            <button
              type="button"
              onClick={async () => {
                await setWeekPlacer(week.week, null);
                onSaved?.();
                onClose();
              }}
              className="font-mono uppercase mt-1"
              style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--c-burgundy)", textDecoration: "underline" }}
            >
              Back to the rotation
            </button>
          )}
        </div>
        <ErrorLine error={error} />
        <SheetButtons
          onCancel={onClose}
          onSubmit={submit}
          submitLabel={saving ? "Saving…" : "Save"}
          disabled={saving}
        />
      </div>
    </Sheet>
  );
}
