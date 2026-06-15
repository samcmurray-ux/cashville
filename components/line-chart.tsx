"use client";

// Multi-line SVG chart for cumulative hit rate over the season — one line
// per player in their avatar hue. Tap a name in the legend to isolate that
// line (dims the rest). No chart library; hand-drawn polylines.

import { useState } from "react";
import type { CumulativeSeries } from "@/lib/stats";

export function CumulativeChart({
  weeks,
  series,
}: {
  weeks: number[];
  series: CumulativeSeries[];
}) {
  const [isolated, setIsolated] = useState<string | null>(null);

  // viewBox space — we draw in a fixed coordinate system and let SVG scale.
  const W = 320;
  const H = 150;
  const padL = 26; // room for y-axis %
  const padR = 8;
  const padT = 8;
  const padB = 18; // room for x-axis weeks
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  if (!weeks.length) return null;

  const n = weeks.length;
  const x = (i: number) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (rate: number) => padT + (1 - rate) * plotH; // rate 0..1, 1=top

  // Gridlines at 0/25/50/75/100%.
  const gridY = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cumulative hit rate over the season">
        {/* Horizontal gridlines + y labels */}
        {gridY.map((g) => (
          <g key={g}>
            <line
              x1={padL}
              y1={y(g)}
              x2={W - padR}
              y2={y(g)}
              stroke="var(--c-rule)"
              strokeWidth={1}
            />
            <text
              x={padL - 4}
              y={y(g) + 3}
              textAnchor="end"
              fontSize={8}
              fontFamily="var(--font-mono), monospace"
              fill="var(--c-faint)"
            >
              {Math.round(g * 100)}
            </text>
          </g>
        ))}

        {/* X-axis week labels — first, middle, last to avoid clutter */}
        {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 5}
            textAnchor="middle"
            fontSize={8}
            fontFamily="var(--font-mono), monospace"
            fill="var(--c-faint)"
          >
            W{weeks[i]}
          </text>
        ))}

        {/* One polyline per player */}
        {series.map((s) => {
          const hue = s.player.hue;
          const color = `oklch(0.58 0.14 ${hue})`;
          const dimmed = isolated !== null && isolated !== s.player.id;
          const pts = s.points
            .map((p, i) => `${x(i).toFixed(1)},${y(p.rate).toFixed(1)}`)
            .join(" ");
          return (
            <polyline
              key={s.player.id}
              points={pts}
              fill="none"
              stroke={color}
              strokeWidth={isolated === s.player.id ? 2.4 : 1.6}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={dimmed ? 0.12 : 1}
            />
          );
        })}
      </svg>

      {/* Legend — tap to isolate */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {series.map((s) => {
          const color = `oklch(0.58 0.14 ${s.player.hue})`;
          const active = isolated === s.player.id;
          return (
            <button
              key={s.player.id}
              onClick={() => setIsolated(active ? null : s.player.id)}
              className="flex items-center gap-1.5"
              style={{
                padding: "3px 8px",
                borderRadius: 2,
                border: `1.5px solid ${active ? color : "var(--c-rule)"}`,
                background: active ? "var(--c-bg2)" : "transparent",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                }}
              />
              <span
                className="font-mono"
                style={{ fontSize: 11, color: "var(--c-ink)" }}
              >
                {s.player.name}
              </span>
            </button>
          );
        })}
      </div>
      <p
        className="font-mono mt-1.5"
        style={{ fontSize: 9, color: "var(--c-faint)", letterSpacing: "0.1em" }}
      >
        tap a name to isolate their line · y-axis = running hit rate %
      </p>
    </div>
  );
}
