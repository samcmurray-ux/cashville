// Hand-drawn SVG donut chart — no Recharts/Chart.js. Renders one ring per
// slice using SVG arc paths. Designed small (32–48px) so we can grid them.

import { SPORT_COLORS } from "./primitives";

export function Donut({
  slices,
  size = 44,
  thickness = 9,
}: {
  slices: Array<{ sport: string; pct: number }>;
  size?: number;
  thickness?: number;
}) {
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // No data → empty ring.
  if (!slices.length) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--c-rule)"
          strokeWidth={thickness}
        />
      </svg>
    );
  }

  // Sort by largest slice first so labels (if we add them later) sit on top.
  const ordered = [...slices].sort((a, b) => b.pct - a.pct);

  // Walk around the circle accumulating offsets.
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {ordered.map((s, i) => {
        const color = SPORT_COLORS[s.sport] || "var(--c-dim)";
        const start = offset;
        const end = offset + s.pct;
        offset = end;
        return (
          <Arc
            key={s.sport + i}
            cx={cx}
            cy={cy}
            r={radius}
            startFraction={start}
            endFraction={end}
            color={color}
            thickness={thickness}
          />
        );
      })}
    </svg>
  );
}

function Arc({
  cx,
  cy,
  r,
  startFraction,
  endFraction,
  color,
  thickness,
}: {
  cx: number;
  cy: number;
  r: number;
  startFraction: number;
  endFraction: number;
  color: string;
  thickness: number;
}) {
  // Special case: a slice that's effectively the whole circle. SVG arcs
  // can't draw a full 360° in one path, so render as a stroked circle.
  if (endFraction - startFraction >= 0.9999) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
      />
    );
  }
  const startAngle = startFraction * 2 * Math.PI - Math.PI / 2;
  const endAngle = endFraction * 2 * Math.PI - Math.PI / 2;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = endFraction - startFraction > 0.5 ? 1 : 0;
  const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={thickness}
      strokeLinecap="butt"
    />
  );
}
