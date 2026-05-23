// Ca$hville design primitives — port of the JSX equivalents in app-1.jsx.
// All colors flow through CSS vars so the same components work across all
// three themes (Travel Almanac / Stadium Night / Tabloid Tuesday).

import type { CSSProperties, ReactNode } from "react";
import type { Player } from "@/lib/types";

// ─── Card ──────────────────────────────────────────────────────────────
export function Card({
  children,
  accent,
  className = "",
}: {
  children: ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={
        "relative bg-paper border border-rule-strong shadow-card " + className
      }
      style={{ borderRadius: 2 }}
    >
      {accent && (
        <div
          aria-hidden
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: accent }}
        />
      )}
      {children}
    </div>
  );
}

// ─── Eyebrow ───────────────────────────────────────────────────────────
export function Eyebrow({
  children,
  color,
}: {
  children: ReactNode;
  color?: string;
}) {
  const c = color ?? "var(--c-burgundy)";
  return (
    <div
      className="font-mono text-[10px] font-semibold uppercase flex items-center gap-2.5"
      style={{ letterSpacing: "0.32em", color: c }}
    >
      <span className="w-[18px] h-px" style={{ background: c }} />
      {children}
      <span className="flex-1 h-px opacity-30" style={{ background: c }} />
    </div>
  );
}

// ─── Headline ──────────────────────────────────────────────────────────
export function Headline({
  children,
  size = 56,
  color,
  italic,
  family = "display",
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  italic?: boolean;
  family?: "display" | "slab";
}) {
  return (
    <h2
      className={family === "slab" ? "font-slab" : "font-display"}
      style={{
        fontSize: size,
        fontWeight: 400,
        lineHeight: 0.95,
        letterSpacing: "-0.015em",
        color: color ?? "var(--c-ink)",
        fontStyle: italic ? "italic" : "normal",
        margin: 0,
      }}
    >
      {children}
    </h2>
  );
}

// ─── Stamp (Bebas Neue, outlined, rotated) ─────────────────────────────
export function Stamp({
  children,
  color,
  rotate = -8,
  size = "md",
}: {
  children: ReactNode;
  color?: string;
  rotate?: number;
  size?: "md" | "lg";
}) {
  const c = color ?? "var(--c-burgundy)";
  const big = size === "lg";
  return (
    <span
      className="inline-flex items-center font-stamp uppercase whitespace-nowrap leading-none"
      style={{
        padding: big ? "10px 18px" : "5px 11px",
        border: `${big ? 3 : 2}px solid ${c}`,
        borderRadius: 4,
        color: c,
        fontSize: big ? 28 : 13,
        letterSpacing: big ? "0.08em" : "0.15em",
        transform: `rotate(${rotate}deg)`,
        background: "transparent",
        opacity: 0.92,
      }}
    >
      {children}
    </span>
  );
}

// ─── BigStamp (Alfa Slab, diagonal overlay) ────────────────────────────
export function BigStamp({
  children,
  color,
  rotate = -14,
  size = 36,
}: {
  children: ReactNode;
  color?: string;
  rotate?: number;
  size?: number;
}) {
  const c = color ?? "var(--c-burgundy)";
  return (
    <span
      className="inline-flex items-center font-slab uppercase whitespace-nowrap leading-none"
      style={{
        padding: "8px 18px",
        border: `4px double ${c}`,
        borderRadius: 6,
        color: c,
        fontSize: size,
        letterSpacing: "0.06em",
        transform: `rotate(${rotate}deg)`,
        background: "transparent",
        opacity: 0.78,
        textShadow: `1px 1px 0 ${c}22`,
      }}
    >
      {children}
    </span>
  );
}

// ─── Scribble (Caveat handwriting) ─────────────────────────────────────
export function Scribble({
  children,
  color,
  size = 22,
  rotate = -2,
  style,
}: {
  children: ReactNode;
  color?: string;
  size?: number;
  rotate?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      className="font-scribble inline-block leading-none"
      style={{
        fontSize: size,
        fontWeight: 700,
        color: color ?? "var(--c-burgundy)",
        transform: `rotate(${rotate}deg)`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ─── Postmark (circular dashed border) ─────────────────────────────────
export function Postmark({
  text,
  sub,
  color,
  size = 96,
}: {
  text: string;
  sub?: string;
  color?: string;
  size?: number;
}) {
  const c = color ?? "var(--c-burgundy)";
  return (
    <div
      className="inline-flex flex-col items-center justify-center shrink-0 relative"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2.5px dashed ${c}`,
        color: c,
        transform: "rotate(-6deg)",
      }}
    >
      <div
        className="absolute"
        style={{ inset: 6, border: `1.5px solid ${c}`, borderRadius: "50%" }}
      />
      <div
        className="font-stamp leading-none"
        style={{ fontSize: size * 0.23, letterSpacing: "0.06em" }}
      >
        {text}
      </div>
      {sub && (
        <div
          className="font-mono mt-0.5"
          style={{ fontSize: 8, letterSpacing: "0.2em" }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Avatar (player initials + colored bg + ink border) ────────────────
export function Avatar({
  player,
  size = 36,
  ring,
}: {
  player: Player | null | undefined;
  size?: number;
  ring?: string;
}) {
  if (!player) return null;
  const initials = player.name.slice(0, 2).toUpperCase();
  const bg = `oklch(0.58 0.14 ${player.hue})`;
  return (
    <div
      className="inline-flex items-center justify-center font-display shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "var(--c-paper)",
        fontWeight: 400,
        fontSize: size * 0.42,
        letterSpacing: "0.01em",
        border: "2px solid var(--c-ink)",
        boxShadow: ring
          ? `0 0 0 3px var(--c-paper), 0 0 0 5px ${ring}`
          : "none",
      }}
    >
      {initials}
    </div>
  );
}

// ─── Chip (Bebas Neue pill, outlined or filled) ────────────────────────
export function Chip({
  children,
  color,
  filled,
  small,
}: {
  children: ReactNode;
  color?: string;
  filled?: boolean;
  small?: boolean;
}) {
  const c = color ?? "var(--c-denim)";
  return (
    <span
      className="inline-flex items-center font-stamp uppercase whitespace-nowrap"
      style={{
        gap: 4,
        padding: small ? "2px 7px" : "3px 9px",
        borderRadius: 2,
        fontSize: small ? 10 : 11,
        letterSpacing: "0.14em",
        color: filled ? "var(--c-paper)" : c,
        background: filled ? c : "transparent",
        border: `1.5px solid ${c}`,
        lineHeight: 1.3,
      }}
    >
      {children}
    </span>
  );
}

// ─── ResultBadge ───────────────────────────────────────────────────────
export function ResultBadge({
  result,
  small,
}: {
  result: "" | "Won" | "Lost" | "Push" | null | string;
  small?: boolean;
}) {
  if (result === "Won") return <Chip color="var(--c-forest)" filled small={small}>W</Chip>;
  if (result === "Lost") return <Chip color="var(--c-burgundy)" small={small}>L</Chip>;
  if (result === "Push") return <Chip color="var(--c-push)" small={small}>P</Chip>;
  return (
    <span className="font-mono text-faint" style={{ fontSize: 11 }}>
      —
    </span>
  );
}

// ─── Sport → color (re-export so Slip rows match the prototype) ────────
export const SPORT_COLORS: Record<string, string> = {
  Football: "var(--c-denim)",
  Rugby: "var(--c-forest)",
  NFL: "var(--c-brick)",
  Horses: "var(--c-burgundy)",
  GAA: "var(--c-mustard)",
  Golf: "var(--c-navy)",
  NBA: "var(--c-brick)",
  MMA: "var(--c-burgundy)",
  Darts: "var(--c-navy)",
  Other: "var(--c-dim)",
};
