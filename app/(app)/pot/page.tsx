"use client";

// Pot screen — the fund. Total + progress bar to €10k + movement list +
// floating Log Movement button. Long Climb chart is v1.1.

import { useState } from "react";
import { useBD } from "@/lib/useBD";
import { Card, Eyebrow, Headline, Postmark, Scribble, Chip } from "@/components/primitives";
import { LogMovementSheet } from "@/components/log-movement-sheet";
import { fmtMoney, removeMovement } from "@/lib/bd";

const TYPE_COLOR: Record<string, string> = {
  win: "var(--c-forest)",
  forfeit: "var(--c-burgundy)",
  bonus: "var(--c-mustard)",
  adjust: "var(--c-dim)",
};

const TYPE_LABEL: Record<string, string> = {
  win: "Win",
  forfeit: "Forfeit",
  bonus: "Bonus",
  adjust: "Adjust",
};

export default function PotPage() {
  const { bd, reload } = useBD();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!bd) return null;

  const pct = Math.min(100, (bd.trip.current / bd.trip.target) * 100);
  const remaining = bd.trip.target - bd.trip.current;
  const wins = bd.weeks.filter((w) => w.accaWon).length;
  // Rough "X more weeks at this pace" — average movement per played week.
  const pacePerWeek = bd.playedCount > 0 ? bd.trip.current / bd.playedCount : 0;
  const weeksLeft = pacePerWeek > 0 ? Math.ceil(remaining / pacePerWeek) : null;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* The fund headline card */}
      <Card accent="var(--c-mustard)">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Eyebrow color="var(--c-mustard)">The Ca$hville Fund</Eyebrow>
              <Headline size={32} italic>Route 615 → BNA</Headline>
              <Scribble
                color="var(--c-burgundy)"
                size={18}
                rotate={-1.5}
                style={{ marginTop: 4 }}
              >
                {pct >= 50 ? "halfway there, players" : "still climbing"}
              </Scribble>
            </div>
            <Postmark
              text={pct.toFixed(0) + "%"}
              sub="THERE"
              color="var(--c-forest)"
              size={68}
            />
          </div>

          <div className="flex items-baseline gap-2 mt-4">
            <Headline size={48} color="var(--c-forest)">
              {fmtMoney(bd.trip.current)}
            </Headline>
            <Headline size={22} color="var(--c-faint)">
              / {fmtMoney(bd.trip.target)}
            </Headline>
          </div>

          {/* Plane-on-a-dashed-line progress bar */}
          <div className="relative mt-4 mb-1" style={{ height: 52 }}>
            <div
              className="absolute left-2 right-2"
              style={{
                top: 18,
                height: 2,
                background:
                  "repeating-linear-gradient(90deg, var(--c-ink) 0 8px, transparent 8px 14px)",
              }}
            />
            <div
              className="absolute left-2"
              style={{
                top: 17,
                height: 4,
                background: "var(--c-forest)",
                width: `calc(${pct}% - 4px)`,
              }}
            />
            <div
              className="absolute"
              style={{
                top: 7,
                left: `calc(${pct}% - 14px)`,
                fontSize: 24,
              }}
            >
              ✈
            </div>
            <div
              className="absolute left-0 font-mono uppercase"
              style={{
                bottom: 0,
                fontSize: 9,
                letterSpacing: "0.18em",
                color: "var(--c-dim)",
              }}
            >
              DUB
            </div>
            <div
              className="absolute right-0 text-right font-mono uppercase"
              style={{
                bottom: 0,
                fontSize: 9,
                letterSpacing: "0.18em",
                color: "var(--c-dim)",
              }}
            >
              BNA · OCT '26
            </div>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            <Stat label="Yet to raise" value={fmtMoney(remaining)} color="var(--c-burgundy)" />
            <Stat
              label="Acca wins"
              value={`${wins}/${bd.playedCount}`}
              color="var(--c-denim)"
            />
            <Stat
              label="Pace"
              value={weeksLeft ? `${weeksLeft} wks` : "—"}
              color="var(--c-mustard)"
            />
          </div>
        </div>
      </Card>

      {/* Movements ledger */}
      <Card>
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--c-rule)" }}
        >
          <Eyebrow color="var(--c-ink)">Every euro in the pot</Eyebrow>
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              color: "var(--c-faint)",
              letterSpacing: "0.16em",
            }}
          >
            {bd.movements.length} entries
          </span>
        </div>
        {bd.movements.length === 0 ? (
          <div className="p-6 text-center">
            <Scribble color="var(--c-dim)" size={20} rotate={-1}>
              no movements yet — log the first one ↓
            </Scribble>
          </div>
        ) : (
          <div>
            {[...bd.movements]
              .sort((a, b) => (b.week ?? 0) - (a.week ?? 0))
              .map((m, i) => (
                <div
                  key={m.id}
                  className="px-4 py-3 flex items-center gap-3"
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid var(--c-rule)",
                  }}
                >
                  <div
                    className="font-mono shrink-0"
                    style={{
                      fontSize: 10,
                      color: "var(--c-faint)",
                      letterSpacing: "0.1em",
                      width: 32,
                    }}
                  >
                    {m.week != null ? `W${m.week}` : "—"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Chip color={TYPE_COLOR[m.type]} small>
                        {TYPE_LABEL[m.type] || m.type}
                      </Chip>
                      {m.notes && (
                        <span
                          className="font-body truncate"
                          style={{ fontSize: 13, color: "var(--c-ink-soft)" }}
                        >
                          {m.notes}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="font-display shrink-0"
                    style={{
                      fontSize: 20,
                      color: m.amount >= 0 ? "var(--c-forest)" : "var(--c-burgundy)",
                      lineHeight: 1,
                    }}
                  >
                    {fmtMoney(m.amount, { alwaysSign: true })}
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm("Delete this movement?")) {
                        await removeMovement(m.id);
                        await reload();
                      }
                    }}
                    aria-label="Delete movement"
                    className="font-mono shrink-0"
                    style={{
                      fontSize: 10,
                      color: "var(--c-faint)",
                      letterSpacing: "0.1em",
                      padding: "4px 6px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* Floating + Log button */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed font-stamp uppercase shadow-card"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 70px)",
          right: 16,
          background: "var(--c-burgundy)",
          color: "var(--c-paper)",
          border: "2px solid var(--c-ink)",
          padding: "12px 18px",
          borderRadius: 999,
          fontSize: 14,
          letterSpacing: "0.14em",
          zIndex: 30,
        }}
      >
        + Log
      </button>

      <LogMovementSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        defaultWeek={bd.currentWeekNum}
        onSaved={() => void reload()}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="flex-1"
      style={{
        minWidth: 88,
        padding: "8px 10px",
        border: "1px solid var(--c-rule)",
        borderRadius: 2,
      }}
    >
      <div
        className="font-mono uppercase"
        style={{
          fontSize: 9,
          letterSpacing: "0.18em",
          color: "var(--c-dim)",
        }}
      >
        {label}
      </div>
      <div
        className="font-display"
        style={{ fontSize: 18, color, lineHeight: 1.1, marginTop: 2 }}
      >
        {value}
      </div>
    </div>
  );
}
