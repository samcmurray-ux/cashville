"use client";

// First-run identity picker. Locks the lad in via localStorage so the rest
// of the app knows "this is your row, this is the Add my pick button."
// Hidden behind a Switch button in the header once chosen.

import { useMe } from "@/lib/useMe";
import type { Player } from "@/lib/types";
import { Avatar } from "./primitives";
import { Sheet } from "./sheet";

export function PlayerPicker({
  players,
  open,
  onClose,
}: {
  players: Player[];
  open: boolean;
  onClose: () => void;
}) {
  const { meId, setMeId } = useMe();
  return (
    <Sheet open={open} onClose={onClose} title="Who's playing?">
      <p
        className="font-scribble mb-4"
        style={{ color: "var(--c-dim)", fontSize: 22, transform: "rotate(-1deg)" }}
      >
        pick yourself — we'll remember →
      </p>
      <div className="grid grid-cols-1 gap-2">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setMeId(p.id);
              onClose();
            }}
            className="flex items-center gap-3 p-3 rounded border text-left transition"
            style={{
              borderColor: meId === p.id ? "var(--c-burgundy)" : "var(--c-rule)",
              background: meId === p.id ? "var(--c-bg2)" : "transparent",
            }}
          >
            <Avatar player={p} size={44} />
            <div className="flex-1 min-w-0">
              <div
                className="font-display"
                style={{ fontSize: 22, lineHeight: 1.05, color: "var(--c-ink)" }}
              >
                {p.name}
              </div>
              <div
                className="font-mono uppercase"
                style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--c-dim)", marginTop: 2 }}
              >
                {p.persona ?? "—"}
              </div>
            </div>
            {meId === p.id && (
              <span
                className="font-stamp uppercase"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  color: "var(--c-burgundy)",
                  border: "1.5px solid var(--c-burgundy)",
                  padding: "3px 9px",
                  borderRadius: 2,
                }}
              >
                You
              </span>
            )}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
