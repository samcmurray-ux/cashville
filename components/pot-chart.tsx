"use client";

// The fund's balance week by week. It's a step line because the pot only
// moves when something is logged: flat, then a jump. The biggest single
// week is marked and labelled; touch or hover anywhere for that week's
// balance. The ledger below the chart is the table view of the same data.

import { useMemo, useState } from "react";
import { fmtMoney } from "@/lib/bd";
import type { ViewMovement } from "@/lib/types";

const W = 340;
const H = 170;
const PAD = { l: 8, r: 8, t: 26, b: 22 };

export function PotChart({ movements, target }: { movements: ViewMovement[]; target: number }) {
  const [hover, setHover] = useState<number | null>(null);

  const pts = useMemo(() => {
    const byWeek = new Map<number, number>();
    for (const m of movements) {
      const wk = m.week ?? 0;
      byWeek.set(wk, (byWeek.get(wk) ?? 0) + m.amount);
    }
    const weeks = [...byWeek.keys()].sort((a, b) => a - b);
    if (!weeks.length) return [];
    const out: { week: number; change: number; total: number }[] = [];
    let total = 0;
    for (let w = weeks[0]; w <= weeks[weeks.length - 1]; w++) {
      const change = byWeek.get(w) ?? 0;
      total += change;
      out.push({ week: w, change, total });
    }
    return out;
  }, [movements]);

  if (pts.length < 2) return null;

  const max = Math.max(...pts.map((p) => p.total), 1);
  const min = Math.min(...pts.map((p) => p.total), 0);
  const x = (i: number) => PAD.l + (i / (pts.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);

  // Step-after path: hold the balance, then jump at the next week.
  let d = `M ${x(0)} ${y(pts[0].total)}`;
  for (let i = 1; i < pts.length; i++) d += ` H ${x(i)} V ${y(pts[i].total)}`;
  const area = `${d} V ${y(min)} H ${x(0)} Z`;

  const bigIdx = pts.reduce((best, p, i) => (p.change > pts[best].change ? i : best), 0);
  const big = pts[bigIdx];
  const last = pts[pts.length - 1];
  const shown = hover != null ? pts[hover] : null;
  const ticks = [min, min + (max - min) / 2, max];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (pts.length - 1));
    setHover(Math.max(0, Math.min(pts.length - 1, i)));
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`The fund week by week, now ${fmtMoney(last.total)} of ${fmtMoney(target)}. Biggest week: week ${big.week}, ${fmtMoney(big.change, { alwaysSign: true })}.`}
        style={{ display: "block", touchAction: "pan-y" }}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--c-rule)" strokeWidth={1} />
            <text x={PAD.l} y={y(t) - 3} fontSize={9} fill="var(--c-dim)" className="font-mono">
              {fmtMoney(t)}
            </text>
          </g>
        ))}
        <path d={area} fill="var(--c-forest)" opacity={0.1} />
        <path d={d} fill="none" stroke="var(--c-forest)" strokeWidth={2} strokeLinejoin="round" />

        {/* The biggest week, labelled directly. */}
        {big.change > 0 && (
          <g>
            <circle cx={x(bigIdx)} cy={y(big.total)} r={5} fill="var(--c-mustard)" stroke="var(--c-paper)" strokeWidth={2} />
            <text
              x={Math.min(Math.max(x(bigIdx), 70), W - 70)}
              y={Math.max(y(big.total) - 10, 10)}
              fontSize={10}
              textAnchor="middle"
              fill="var(--c-ink)"
              className="font-mono"
              fontWeight={600}
            >
              W{big.week} · {fmtMoney(big.change, { alwaysSign: true })}
            </text>
          </g>
        )}
        <circle cx={x(pts.length - 1)} cy={y(last.total)} r={4} fill="var(--c-forest)" stroke="var(--c-paper)" strokeWidth={2} />

        {shown && hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--c-rule-strong)" strokeWidth={1} />
            <circle cx={x(hover)} cy={y(shown.total)} r={4} fill="var(--c-paper)" stroke="var(--c-forest)" strokeWidth={2} />
          </g>
        )}

        <text x={PAD.l} y={H - 6} fontSize={9} fill="var(--c-dim)" className="font-mono">
          W{pts[0].week}
        </text>
        <text x={W - PAD.r} y={H - 6} fontSize={9} fill="var(--c-dim)" textAnchor="end" className="font-mono">
          W{last.week}
        </text>
      </svg>
      {shown && hover != null && (
        <div
          className="absolute font-mono pointer-events-none"
          style={{
            top: 0,
            left: `${Math.min(Math.max((x(hover) / W) * 100, 18), 82)}%`,
            transform: "translateX(-50%)",
            background: "var(--c-ink)",
            color: "var(--c-paper)",
            fontSize: 10.5,
            padding: "3px 8px",
            borderRadius: 3,
            whiteSpace: "nowrap",
          }}
        >
          W{shown.week} · {fmtMoney(shown.total)}
          {shown.change !== 0 ? ` (${fmtMoney(shown.change, { alwaysSign: true })})` : ""}
        </div>
      )}
    </div>
  );
}
