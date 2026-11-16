"use client";

// Mobile-tight version of the prototype Header (app-1.jsx).
// Postmark + headline + scribbles + "switch player" affordance.

import { useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import type { Player } from "@/lib/types";
import { Avatar, Headline, Postmark, Scribble } from "./primitives";
import { PlayerPicker } from "./player-picker";
import { ThemePicker } from "./theme-picker";

export function AppHeader({
  players,
  currentWeekNum,
  playedCount,
  compact,
}: {
  players: Player[];
  currentWeekNum: number;
  playedCount: number;
  // Slim one-line bar, used everywhere except the Home screen.
  compact?: boolean;
}) {
  const { me, setMeId } = useMe();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  const pickers = (
    <>
      <PlayerPicker
        players={players}
        open={pickerOpen || !me}
        onClose={() => setPickerOpen(false)}
      />
      <ThemePicker
        open={themePickerOpen}
        onClose={() => setThemePickerOpen(false)}
      />
    </>
  );

  if (compact) {
    return (
      <header
        className="px-4 py-2 flex items-center gap-3"
        style={{ borderBottom: "3px double var(--c-rule-strong)" }}
      >
        <Link href="/home" className="cv-logo-sm font-display" style={{ fontSize: 26, color: "var(--c-ink)", lineHeight: 1 }}>
          Ca<span style={{ color: "var(--c-mustard)", fontStyle: "italic" }}>$</span>hville
        </Link>
        <span
          className="font-mono uppercase flex-1"
          style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--c-burgundy)", fontWeight: 600 }}
        >
          Week {currentWeekNum}
        </span>
        <button
          onClick={() => setThemePickerOpen(true)}
          aria-label="Switch theme"
          className="grid shrink-0"
          style={{
            gridTemplateColumns: "1fr 1fr",
            gap: 1,
            width: 28,
            height: 28,
            padding: 6,
            borderRadius: "50%",
            border: "1.5px solid var(--c-rule-strong)",
            background: "var(--c-paper)",
          }}
        >
          <span style={{ background: "var(--c-burgundy)" }} />
          <span style={{ background: "var(--c-mustard)" }} />
          <span style={{ background: "var(--c-forest)" }} />
          <span style={{ background: "var(--c-denim)" }} />
        </button>
        <button onClick={() => setPickerOpen(true)} aria-label="Switch player" className="shrink-0">
          {me ? (
            <Avatar player={me} size={30} ring="var(--c-mustard)" />
          ) : (
            <span
              className="font-stamp inline-flex items-center justify-center rounded-full border-2 border-dashed"
              style={{ width: 30, height: 30, borderColor: "var(--c-burgundy)", color: "var(--c-burgundy)" }}
            >
              ?
            </span>
          )}
        </button>
        {pickers}
      </header>
    );
  }

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
          <div className="cv-logo">
            <Headline size={44} family="display">
              Ca
              <span style={{ color: "var(--c-mustard)", fontStyle: "italic" }}>$</span>
              hville
            </Headline>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Scribble color="var(--c-burgundy)" size={17} rotate={-1.5}>
              seven gents · one slip ·
            </Scribble>
            <Scribble color="var(--c-forest)" size={17} rotate={1}>
              road to Nashville →
            </Scribble>
          </div>
        </div>
        {/* Theme switcher — small palette icon. Stacks above the avatar
            in the top-right column. */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <button
            onClick={() => setThemePickerOpen(true)}
            aria-label="Switch theme"
            className="flex items-center justify-center"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "1.5px solid var(--c-rule-strong)",
              background: "var(--c-paper)",
              padding: 3,
            }}
          >
            {/* Three-color stack — a little palette dot for each theme */}
            <span
              aria-hidden
              className="grid"
              style={{
                gridTemplateColumns: "1fr 1fr",
                gap: 1,
                width: 14,
                height: 14,
              }}
            >
              <span style={{ background: "var(--c-burgundy)" }} />
              <span style={{ background: "var(--c-mustard)" }} />
              <span style={{ background: "var(--c-forest)" }} />
              <span style={{ background: "var(--c-denim)" }} />
            </span>
          </button>

        {/* Switch-player button — taps open the picker sheet. */}
        <button
          onClick={() => setPickerOpen(true)}
          className="flex flex-col items-center gap-1"
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
      </div>

      {pickers}
    </header>
  );
}
