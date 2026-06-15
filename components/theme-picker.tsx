"use client";

// Theme picker bottom sheet — 3 swatches, tap to switch live.
// The selected theme highlights with a burgundy border + 'current' tag.

import { Sheet } from "./sheet";
import { THEMES, useTheme, type ThemeId } from "@/lib/useTheme";

export function ThemePicker({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { themeId, setThemeId } = useTheme();
  return (
    <Sheet open={open} onClose={onClose} title="Pick a look">
      <div className="space-y-2">
        {THEMES.map((t) => {
          const active = themeId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setThemeId(t.id as ThemeId);
                // Tiny pause so the player sees the swap before the sheet closes.
                setTimeout(onClose, 220);
              }}
              className="flex items-center gap-3 p-3 w-full text-left"
              style={{
                border: `2px solid ${active ? "var(--c-burgundy)" : "var(--c-rule-strong)"}`,
                background: active ? "var(--c-bg2)" : "transparent",
                borderRadius: 2,
              }}
            >
              {/* Swatch — four mini squares showing the theme's palette */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(2, 18px)",
                  gridTemplateRows: "repeat(2, 18px)",
                  gap: 1,
                  border: "1.5px solid var(--c-ink)",
                  padding: 1,
                  background: "var(--c-ink)",
                  flexShrink: 0,
                }}
              >
                {t.swatch.map((c, i) => (
                  <div key={i} style={{ background: c }} />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="font-display"
                  style={{ fontSize: 20, color: "var(--c-ink)", lineHeight: 1.05 }}
                >
                  {t.label}
                </div>
                <div
                  className="font-body italic"
                  style={{ fontSize: 13, color: "var(--c-ink-soft)", marginTop: 1 }}
                >
                  {t.blurb}
                </div>
              </div>
              {active && (
                <span
                  className="font-stamp uppercase"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    color: "var(--c-burgundy)",
                    border: "1.5px solid var(--c-burgundy)",
                    padding: "3px 7px",
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                >
                  Current
                </span>
              )}
            </button>
          );
        })}
        <p
          className="font-mono mt-2"
          style={{
            fontSize: 10,
            color: "var(--c-dim)",
            letterSpacing: "0.1em",
            textAlign: "center",
          }}
        >
          your phone's dark-mode preference picks for you if you never tap one
        </p>
      </div>
    </Sheet>
  );
}
