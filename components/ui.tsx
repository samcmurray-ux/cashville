"use client";

// Small shared form bits for the bottom sheets.

import type { CSSProperties, ReactNode } from "react";
import type { Player } from "@/lib/types";
import { Avatar } from "./primitives";

export function Label({ children }: { children: ReactNode }) {
  return (
    <div
      className="font-mono uppercase"
      style={{ fontSize: 10, letterSpacing: "0.24em", color: "var(--c-dim)", fontWeight: 600 }}
    >
      {children}
    </div>
  );
}

export const inputStyle: CSSProperties = {
  border: "1.5px solid var(--c-rule-strong)",
  borderRadius: 2,
  color: "var(--c-ink)",
  fontSize: 16,
};

export function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p
      className="font-mono uppercase"
      style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--c-burgundy)" }}
    >
      ⚠ {error}
    </p>
  );
}

export function SheetButtons({
  onCancel,
  onSubmit,
  submitLabel,
  disabled,
  onDelete,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  disabled?: boolean;
  onDelete?: () => void;
}) {
  return (
    <div className="flex gap-2 pt-2">
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label="Delete"
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
        onClick={onCancel}
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
        onClick={onSubmit}
        disabled={disabled}
        className="flex-[2] font-stamp uppercase py-3"
        style={{
          fontSize: 16,
          letterSpacing: "0.16em",
          background: "var(--c-ink)",
          color: "var(--c-paper)",
          border: "none",
          borderRadius: 2,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {submitLabel}
      </button>
    </div>
  );
}

// A wrapping row of player chips; tap to choose one.
export function PlayerChoice({
  players,
  value,
  onChange,
  exclude = [],
}: {
  players: Player[];
  value: string | null;
  onChange: (id: string) => void;
  exclude?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {players
        .filter((p) => !exclude.includes(p.id))
        .map((p) => {
          const active = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              className="flex items-center gap-1.5 font-display"
              style={{
                padding: "4px 10px 4px 4px",
                borderRadius: 999,
                fontSize: 15,
                color: "var(--c-ink)",
                border: `1.5px solid ${active ? "var(--c-burgundy)" : "var(--c-rule-strong)"}`,
                background: active ? "var(--c-mustard)" : "transparent",
              }}
            >
              <Avatar player={p} size={24} />
              {p.name}
            </button>
          );
        })}
    </div>
  );
}

// Two-or-three way toggle.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="flex mt-2"
      style={{ border: "1.5px solid var(--c-ink)", borderRadius: 2, overflow: "hidden" }}
    >
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="flex-1 font-stamp uppercase py-2"
          style={{
            fontSize: 13,
            letterSpacing: "0.12em",
            borderLeft: i === 0 ? "none" : "1.5px solid var(--c-ink)",
            background: value === o.value ? "var(--c-ink)" : "transparent",
            color: value === o.value ? "var(--c-paper)" : "var(--c-ink)",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Shown on v2 screens until supabase/migration-v2.sql has been run.
export function NotReadyNote() {
  return (
    <div
      className="p-4 font-body"
      style={{
        fontSize: 14,
        color: "var(--c-ink-soft)",
        border: "1.5px dashed var(--c-burgundy)",
        borderRadius: 2,
      }}
    >
      This part of the app needs a one-off database update. Ask Sam to run the
      v2 script in Supabase, then reload.
    </div>
  );
}
