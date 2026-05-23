"use client";

// Mobile-tight version of the prototype Header (app-1.jsx).
// Postmark + headline + scribbles + "switch player" affordance.

import { useState } from "react";
import { useMe } from "@/lib/useMe";
import type { Player } from "@/lib/types";
import { Avatar, Headline, Postmark, Scribble } from "./primitives";
import { PlayerPicker } from "./player-picker";

export function AppHeader({
  players,
  currentWeekNum,
  playedCount,
}: {
  players: Player[];
  currentWeekNum: number;
  playedCount: number;
}) {
  const { me, setMeId } = useMe();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <header
      className="px-4 pt-5 pb-3"
      style={{ borderBottom: "3px double var(--c-rule-strong)" }}
    >
      <div className="flex items-start gap-3">
        <Postmark
          text={"W" + currentWeekNum}
          sub="OF THE SEASON"
          color="var(--c-burgundy)"
          size={68}
        />
        <div className="min-w-0 flex-1">
          <div
            className="font-mono uppercase font-semibold"
            style={{
              fontSize: 9,
              letterSpacing: "0.32em",
              color: "var(--c-burgundy)",
            }}
          >
            {playedCount} weeks logged · season 25/26
          </div>
          <Headline size={44} family="display">
            Ca
            <span style={{ color: "var(--c-mustard)", fontStyle: "italic" }}>$</span>
            hville
          </Headline>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Scribble color="var(--c-burgundy)" size={17} rotate={-1.5}>
              seven gents · one slip ·
            </Scribble>
            <Scribble color="var(--c-forest)" size={17} rotate={1}>
              road to Nashville →
            </Scribble>
          </div>
        </div>
        {/* Switch-player button — taps open the picker sheet. */}
        <button
          onClick={() => setPickerOpen(true)}
          className="shrink-0 flex flex-col items-center gap-1"
          aria-label="Switch player"
        >
          {me ? (
            <Avatar player={me} size={36} ring="var(--c-mustard)" />
          ) : (
            <div
              className="w-9 h-9 rounded-full border-2 border-dashed flex items-center justify-center"
              style={{ borderColor: "var(--c-burgundy)" }}
            >
              <span
                className="font-stamp"
                style={{ fontSize: 16, color: "var(--c-burgundy)" }}
              >
                ?
              </span>
            </div>
          )}
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 8,
              letterSpacing: "0.2em",
              color: "var(--c-dim)",
            }}
          >
            {me ? "switch" : "sign in"}
          </span>
        </button>
      </div>

      <PlayerPicker
        players={players}
        open={pickerOpen || !me}
        onClose={() => setPickerOpen(false)}
      />
    </header>
  );
}
