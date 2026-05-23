"use client";

// Slip screen — the most important screen in the app. Per HANDOFF.md:
// "The single thing that has to work on day one: Jamie can open it on his
//  phone Friday night, enter 'Bayern over 2.5 goals' at 1.40 odds, tap
//  Lock In, and Sam can see it appear on his screen 2 seconds later."

import { useState, useMemo } from "react";
import { useBD } from "@/lib/useBD";
import { useMe } from "@/lib/useMe";
import { Card, Eyebrow, Headline, Scribble, Stamp } from "@/components/primitives";
import { SlipRow } from "@/components/slip-row";
import { AddPickSheet } from "@/components/add-pick-sheet";
import { fmtMoney } from "@/lib/bd";

export default function SlipPage() {
  const { bd, reload } = useBD();
  const { me, meId, isAdmin } = useMe();

  // Selected week — defaults to current; user can paginate to past weeks.
  const [selected, setSelected] = useState<number | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);

  // Memos before any early return so hook order is stable.
  const allWeeks = useMemo(() => {
    if (!bd) return [] as number[];
    return [...bd.weeks]
      .filter((w) => w.filled || w.week === bd.currentWeekNum)
      .map((w) => w.week)
      .sort((a, b) => a - b);
  }, [bd]);

  if (!bd) return null; // layout shows LoadingScreen

  const wkNum = selected ?? bd.currentWeekNum;
  const week = bd.weeks.find((w) => w.week === wkNum) ?? bd.currentWeek;
  const isCurrent = week.week === bd.currentWeekNum && !week.filled;
  const entered = week.picks.filter((p) => p.filled).length;

  const myPick = meId ? week.picks.find((p) => p.playerId === meId) ?? null : null;
  const iNeedToPick = isCurrent && meId && myPick && !myPick.filled;

  const idx = allWeeks.indexOf(week.week);
  const prevW = idx > 0 ? allWeeks[idx - 1] : null;
  const nextW = idx >= 0 && idx < allWeeks.length - 1 ? allWeeks[idx + 1] : null;

  const editingPick = editingPlayer
    ? week.picks.find((p) => p.playerId === editingPlayer) ?? null
    : null;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Sticky-feeling slip header card — matches ThisWeek in app-1.jsx ish. */}
      <Card accent="var(--c-burgundy)">
        <div
          className="px-5 pt-5 pb-4 relative"
          style={{ borderBottom: "2px dashed var(--c-rule)" }}
        >
          {/* The little ticket-stub notches on either side of the dashed line. */}
          <span
            aria-hidden
            className="absolute -left-2 rounded-full"
            style={{
              bottom: -8,
              width: 16,
              height: 16,
              background: "var(--c-bg)",
            }}
          />
          <span
            aria-hidden
            className="absolute -right-2 rounded-full"
            style={{
              bottom: -8,
              width: 16,
              height: 16,
              background: "var(--c-bg)",
            }}
          />

          <Eyebrow color="var(--c-burgundy)">
            Week {week.week}
            {isCurrent ? " · current" : week.accaWon ? " · winner" : " · settled"}
          </Eyebrow>

          <div className="flex items-start justify-between gap-3 mt-2">
            <div className="min-w-0 flex-1">
              <Headline size={40}>The Slip</Headline>
              <div className="mt-1">
                {isCurrent ? (
                  <Scribble color="var(--c-dim)" size={20} rotate={-2}>
                    get yours in lads ↓
                  </Scribble>
                ) : week.accaWon ? (
                  <Scribble color="var(--c-forest)" size={20} rotate={-1.5}>
                    this one landed 🎉
                  </Scribble>
                ) : (
                  <Scribble color="var(--c-burgundy)" size={20} rotate={1}>
                    this one died on us
                  </Scribble>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div
                className="font-mono uppercase"
                style={{
                  fontSize: 9,
                  color: "var(--c-faint)",
                  letterSpacing: "0.22em",
                }}
              >
                Combined
              </div>
              <div
                className="font-display"
                style={{
                  fontSize: 48,
                  color: week.accaWon ? "var(--c-forest)" : "var(--c-denim)",
                  lineHeight: 1,
                }}
              >
                {week.combinedOdds.toFixed(2)}
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
                {isCurrent
                  ? `${entered} of 7 in`
                  : `paid €${Math.round(week.payout || 70 * week.combinedOdds).toLocaleString()}`}
              </div>
            </div>
          </div>

          {/* Week navigation: prev/this/next */}
          <div className="flex items-center gap-1.5 mt-3">
            <WeekBtn
              disabled={!prevW}
              onClick={() => prevW && setSelected(prevW)}
            >
              ← W{prevW ?? week.week}
            </WeekBtn>
            <select
              value={week.week}
              onChange={(e) => setSelected(+e.target.value)}
              className="font-mono"
              style={{
                background: "var(--c-bg2)",
                color: "var(--c-ink)",
                border: "1.5px solid var(--c-ink)",
                padding: "5px 8px",
                borderRadius: 2,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
              }}
            >
              {allWeeks.map((w) => {
                const wk = bd.weeks.find((x) => x.week === w);
                const tag = wk?.accaWon ? "★" : wk?.filled ? "" : "· live";
                return (
                  <option key={w} value={w}>
                    WEEK {w} {tag}
                  </option>
                );
              })}
            </select>
            <WeekBtn
              disabled={!nextW}
              onClick={() => nextW && setSelected(nextW)}
            >
              W{nextW ?? week.week} →
            </WeekBtn>
            {week.week !== bd.currentWeekNum && (
              <button
                onClick={() => setSelected(bd.currentWeekNum)}
                className="font-stamp uppercase ml-1"
                style={{
                  background: "var(--c-mustard)",
                  color: "var(--c-ink)",
                  border: "none",
                  padding: "5px 9px",
                  borderRadius: 2,
                  fontSize: 11,
                  letterSpacing: "0.12em",
                }}
              >
                ↶ This wk
              </button>
            )}
          </div>
        </div>

        {/* Big "Add my pick" banner — only when it's your slot and unfilled. */}
        {iNeedToPick && me && (
          <button
            onClick={() => setEditingPlayer(me.id)}
            className="w-full px-4 py-3 flex items-center justify-between"
            style={{
              background: "var(--c-mustard)",
              borderBottom: "1px solid var(--c-ink)",
            }}
          >
            <div className="text-left">
              <div
                className="font-mono uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  color: "var(--c-ink)",
                }}
              >
                you're up, {me.name.toLowerCase()}
              </div>
              <div
                className="font-display"
                style={{ fontSize: 22, color: "var(--c-ink)", lineHeight: 1.1 }}
              >
                Add my pick →
              </div>
            </div>
            <Stamp color="var(--c-ink)" rotate={-4} size="md">
              tap to lock
            </Stamp>
          </button>
        )}

        {/* The 7 rows. Each player can open the Add Pick sheet for their own
            row on any week — current to lock in, past to correct after the
            fact (typo in odds, wrong selection text, etc.). */}
        <div>
          {week.picks.map((p, i) => {
            const player = bd.players.find((x) => x.id === p.playerId)!;
            const youOwnThisRow = meId === p.playerId;
            return (
              <SlipRow
                key={p.playerId}
                pick={p}
                player={player}
                idx={i}
                isMe={youOwnThisRow}
                isCurrent={isCurrent}
                onAdd={youOwnThisRow ? () => setEditingPlayer(p.playerId) : undefined}
              />
            );
          })}
        </div>

        {/* Stake / payout / fund-after — 3 stacked stats on mobile. */}
        <div
          className="grid grid-cols-3 border-t"
          style={{ borderColor: "var(--c-rule)", background: "var(--c-bg2)" }}
        >
          <Stat label="Stake" value="€70" sub="€10 a head" />
          <Stat
            label={isCurrent ? "If all 7 land" : week.accaWon ? "Banked" : "Would've paid"}
            value={fmtMoney(week.payout || 70 * week.combinedOdds)}
            valueColor={
              week.accaWon
                ? "var(--c-forest)"
                : isCurrent
                  ? "var(--c-forest)"
                  : "var(--c-faint)"
            }
            sub={
              isCurrent
                ? entered < 7
                  ? `so far · ${entered}/7`
                  : "all in"
                : week.accaWon
                  ? "7/7 landed"
                  : `${week.picks.filter((p) => p.result === "Lost").length} missed`
            }
            divider
          />
          <Stat
            label={isCurrent ? "Fund jumps to" : "Fund after"}
            value={fmtMoney(
              bd.trip.current + (isCurrent ? 70 * week.combinedOdds - 70 : 0),
            )}
            valueColor="var(--c-mustard)"
            sub="vs €10k"
            divider
          />
        </div>

        {/* Settle button — admin only, only on settled-eligible weeks */}
        {isAdmin && !isCurrent && (
          <div className="px-4 py-3 border-t" style={{ borderColor: "var(--c-rule)" }}>
            <p
              className="font-mono uppercase"
              style={{
                fontSize: 10,
                letterSpacing: "0.18em",
                color: "var(--c-dim)",
              }}
            >
              Settle flow lands in v1.1 — for now edit results in Supabase.
            </p>
          </div>
        )}
      </Card>

      {/* Add Pick sheet — opens for your own row on whichever week is
          selected. Past weeks edit the historical pick in place. */}
      {meId && editingPlayer === meId && (
        <AddPickSheet
          open={true}
          onClose={() => setEditingPlayer(null)}
          weekNum={week.week}
          playerId={meId}
          existing={editingPick}
          onSaved={() => void reload()}
        />
      )}
      {/* Tapping someone else's row in v1 doesn't open the sheet (you only
          edit your own pick). A read-only popover is a v1.1 task. */}
    </div>
  );
}

function WeekBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="font-stamp uppercase"
      style={{
        background: "transparent",
        color: disabled ? "var(--c-faint)" : "var(--c-ink)",
        border: `1.5px solid ${disabled ? "var(--c-rule)" : "var(--c-ink)"}`,
        padding: "5px 9px",
        borderRadius: 2,
        fontSize: 12,
        letterSpacing: "0.12em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Stat({
  label,
  value,
  sub,
  valueColor,
  divider,
}: {
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
  divider?: boolean;
}) {
  return (
    <div
      className="px-3 py-3"
      style={{ borderLeft: divider ? "1px dashed var(--c-rule)" : "none" }}
    >
      <div
        className="font-mono uppercase"
        style={{
          fontSize: 8.5,
          color: "var(--c-faint)",
          letterSpacing: "0.18em",
        }}
      >
        {label}
      </div>
      <div
        className="font-display"
        style={{
          fontSize: 22,
          color: valueColor ?? "var(--c-ink)",
          lineHeight: 1,
          marginTop: 2,
        }}
      >
        {value}
      </div>
      <div
        className="font-mono uppercase"
        style={{
          fontSize: 9,
          color: "var(--c-dim)",
          letterSpacing: "0.1em",
          marginTop: 3,
        }}
      >
        {sub}
      </div>
    </div>
  );
}
