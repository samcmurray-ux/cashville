"use client";

// Stats — Pecking Order leaderboard (Week-1 viable), full Awards Wall +
// Damage Report + Heat Strip + Pick Mix come in v1.1.

import { useBD } from "@/lib/useBD";
import { Avatar, Card, Eyebrow, Headline, Scribble, Chip } from "@/components/primitives";

export default function StatsPage() {
  const { bd } = useBD();
  if (!bd) return null;

  // Same shape buildView in data.js produces, computed inline for v1.
  const rows = bd.players.map((player) => {
    const all = bd.weeks
      .filter((w) => w.filled)
      .map((w) => w.picks.find((p) => p.playerId === player.id))
      .filter((p): p is NonNullable<typeof p> => !!p && p.filled);
    const wins = all.filter((p) => p.result === "Won").length;
    const losses = all.filter((p) => p.result === "Lost").length;
    const denom = Math.max(1, all.length);
    return {
      player,
      wins,
      losses,
      played: all.length,
      hit: wins / denom,
    };
  });

  const sorted = [...rows].sort((a, b) => b.hit - a.hit);
  const topHit = sorted[0]?.hit ?? 0;
  const bottomHit = sorted[sorted.length - 1]?.hit ?? 0;

  return (
    <div className="px-4 py-4 space-y-4">
      <Card accent="var(--c-denim)">
        <div
          className="px-5 pt-5 pb-3"
          style={{ borderBottom: "1px solid var(--c-rule)" }}
        >
          <Eyebrow color="var(--c-denim)">Pecking Order</Eyebrow>
          <Headline size={32}>The standings</Headline>
          <Scribble color="var(--c-dim)" size={18} rotate={-1.5} style={{ marginTop: 4 }}>
            by hit rate, all weeks ↓
          </Scribble>
        </div>
        <div>
          {sorted.map((r, i) => (
            <div
              key={r.player.id}
              className="px-4 py-3 flex items-center gap-3"
              style={{
                borderTop: i === 0 ? "none" : "1px solid var(--c-rule)",
              }}
            >
              <div
                className="font-mono shrink-0"
                style={{
                  fontSize: 14,
                  color: i === 0 ? "var(--c-mustard)" : "var(--c-faint)",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  width: 22,
                }}
              >
                {i + 1}
              </div>
              <Avatar player={r.player} size={36} />
              <div className="min-w-0 flex-1">
                <div
                  className="font-display"
                  style={{ fontSize: 18, color: "var(--c-ink)", lineHeight: 1.1 }}
                >
                  {r.player.name}
                </div>
                <div className="flex gap-1 mt-1">
                  <Chip color="var(--c-forest)" small>{r.wins}W</Chip>
                  <Chip color="var(--c-burgundy)" small>{r.losses}L</Chip>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className="font-display"
                  style={{
                    fontSize: 24,
                    color:
                      r.hit === topHit
                        ? "var(--c-forest)"
                        : r.hit === bottomHit
                          ? "var(--c-burgundy)"
                          : "var(--c-ink)",
                    lineHeight: 1,
                  }}
                >
                  {Math.round(r.hit * 100)}%
                </div>
                <div
                  className="font-mono uppercase"
                  style={{
                    fontSize: 9,
                    color: "var(--c-faint)",
                    letterSpacing: "0.15em",
                    marginTop: 2,
                  }}
                >
                  hit rate
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="px-5 py-4 text-center">
          <Eyebrow color="var(--c-dim)">Coming in v1.1</Eyebrow>
          <p
            className="font-body mt-2"
            style={{ color: "var(--c-ink-soft)", fontSize: 14 }}
          >
            Honours Wall · Damage Report · Heat Strip · Pick Mix donut
          </p>
        </div>
      </Card>
    </div>
  );
}
