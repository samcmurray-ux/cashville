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
import { SettleWeekSheet } from "@/components/settle-week-sheet";
import { fmtMoney, lossStreaks, setPickResult, streakPenalty } from "@/lib/bd";
import { EditStakeSheet } from "@/components/edit-stake-sheet";
import { WeekInfoSheet } from "@/components/week-info-sheet";
import { VoteStrip, VotesSheet } from "@/components/votes";
import { SideBetsCard } from "@/components/side-bets";

export default function SlipPage() {
  const { bd, reload } = useBD();
  const { me, meId } = useMe();
  // No admin gating in v1 — anyone can settle, anyone can edit any row.
  // The picker just establishes a visual "you" identity for the highlight,
  // it doesn't grant or restrict permissions.

  // Selected week — defaults to current; user can paginate to past weeks.
  const [selected, setSelected] = useState<number | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);
  const [editingStake, setEditingStake] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [votingPlayer, setVotingPlayer] = useState<string | null>(null);

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
  // "Current" simply = this is the active week in the season. A week with
  // 7 picks but no results yet is still current (the players are awaiting
  // kickoff / waiting for full-time). It rolls past only once someone settles.
  const isCurrent = week.week === bd.currentWeekNum;
  const entered = week.picks.filter((p) => p.filled).length;

  const myPick = meId ? week.picks.find((p) => p.playerId === meId) ?? null : null;
  const iNeedToPick = isCurrent && meId && myPick && !myPick.filled;

  const idx = allWeeks.indexOf(week.week);
  const prevW = idx > 0 ? allWeeks[idx - 1] : null;
  const nextW = idx >= 0 && idx < allWeeks.length - 1 ? allWeeks[idx + 1] : null;

  // Losing-streak consequences for this week's bet: top-ups and bans.
  // Top-ups are normally added automatically when the loss is marked; one
  // that's due but not on the books yet shows as a reminder instead.
  const streaks = lossStreaks(bd.weeks, week.week);
  const autoTopups = week.topups.reduce((a, t) => a + t.amount, 0);
  const streakNotes = bd.v2Ready
    ? bd.players
        .map((p) => {
          const streak = streaks[p.id] ?? 0;
          const applied = week.topups.find((t) => t.playerId === p.id)?.amount ?? 0;
          const penalty = streakPenalty(streak, bd.settings);
          return { name: p.name, streak, applied, due: applied ? 0 : penalty.topup, banned: penalty.banned };
        })
        .filter((x) => x.applied > 0 || x.due > 0 || x.banned)
    : [];
  const topups = streakNotes.filter((x) => x.due > 0).map((x) => ({ name: x.name, amount: x.due }));

  const placer = bd.players.find((p) => p.id === week.placerId) ?? null;
  const weekVotes = bd.votes.filter((v) => v.week === week.week);
  const votingPick = votingPlayer
    ? week.picks.find((p) => p.playerId === votingPlayer) ?? null
    : null;

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

          {/* Weekend date + whose turn it is to place the bet. Tap to edit. */}
          <button
            onClick={() => setEditingInfo(true)}
            className="font-mono uppercase text-left mt-1.5 flex items-center gap-1.5 flex-wrap"
            style={{ fontSize: 10.5, letterSpacing: "0.12em", color: "var(--c-ink-soft)" }}
          >
            <span>📅 {fmtWeekend(week.date)}</span>
            {bd.v2Ready && placer && (
              <span
                style={{
                  padding: "2px 6px",
                  borderRadius: 2,
                  background: placer.id === meId ? "var(--c-mustard)" : "var(--c-bg2)",
                  color: placer.id === meId ? "var(--c-on-mustard)" : "var(--c-ink)",
                  fontWeight: 600,
                }}
              >
                🎟 {placer.id === meId ? "your turn to place it" : `${placer.name} places it`}
              </span>
            )}
            <span style={{ color: "var(--c-faint)" }}>✎</span>
          </button>

          <div className="flex items-start justify-between gap-3 mt-2">
            <div className="min-w-0 flex-1">
              <Headline size={40}>The Slip</Headline>
              <div className="mt-1">
                {isCurrent ? (
                  <Scribble color="var(--c-dim)" size={20} rotate={-2}>
                    picks due Friday 6pm ↓
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
                  : `paid €${Math.round(week.payout || week.stake * week.combinedOdds).toLocaleString()}`}
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
                  color: "var(--c-on-mustard)",
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
                  color: "var(--c-on-mustard)",
                }}
              >
                you're up, {me.name.toLowerCase()}
              </div>
              <div
                className="font-display"
                style={{ fontSize: 22, color: "var(--c-on-mustard)", lineHeight: 1.1 }}
              >
                Add my pick →
              </div>
            </div>
            <Stamp color="var(--c-on-mustard)" rotate={-4} size="md">
              tap to lock
            </Stamp>
          </button>
        )}

        {/* The 7 rows. Anyone can add, edit, delete OR settle any pick on
            any week. The `isMe` flag is just for visual emphasis (avatar
            ring + 'you' chip + gradient bg + bigger Add button). */}
        <div>
          {week.picks.map((p, i) => {
            const player = bd.players.find((x) => x.id === p.playerId)!;
            return (
              <div key={p.playerId}>
              <SlipRow
                pick={p}
                player={player}
                idx={i}
                isMe={meId === p.playerId}
                isCurrent={isCurrent}
                onAdd={() => setEditingPlayer(p.playerId)}
                onSetResult={async (result) => {
                  // setPickResult also auto-rolls up the week if this is
                  // the 7th settle (and logs the win movement if it landed).
                  // Realtime push will re-render everyone.
                  await setPickResult(week.week, p.playerId, result);
                  await reload();
                }}
              />
              {/* Votes: ⭐ 💩 👍 👎 — tap to see who voted and cast yours. */}
              {bd.v2Ready && p.filled && (
                <div className="px-4 pb-2.5" style={{ marginTop: -4, paddingLeft: 82 }}>
                  <VoteStrip
                    votes={weekVotes.filter((v) => v.targetId === p.playerId)}
                    meId={meId}
                    onOpen={() => setVotingPlayer(p.playerId)}
                  />
                </div>
              )}
              </div>
            );
          })}
        </div>

        {/* Stake / payout / fund-after — 3 stacked stats on mobile. */}
        <div
          className="grid grid-cols-3 border-t"
          style={{ borderColor: "var(--c-rule)", background: "var(--c-bg2)" }}
        >
          <Stat
            label="Stake"
            value={fmtMoney(week.stake)}
            sub={
              (autoTopups > 0
                ? `incl. €${autoTopups} top-ups`
                : `€${+(week.stake / 7).toFixed(2)} a head`) + (week.accaWon ? "" : " · ✎ edit")
            }
            // Stake is locked once an acca has landed — the win is already
            // logged in the pot at the old stake.
            onClick={week.accaWon ? undefined : () => setEditingStake(true)}
          />
          <Stat
            label={isCurrent ? "If all 7 land" : week.accaWon ? "Banked" : "Would've paid"}
            value={fmtMoney(week.payout || week.stake * week.combinedOdds)}
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
              // Gross return adds to the pot — the players consider the full
              // bookies' payout (stake + winnings) as the pot's intake.
              bd.trip.current + (isCurrent ? week.stake * week.combinedOdds : 0),
            )}
            valueColor="var(--c-mustard)"
            sub="vs €10k"
            divider
          />
        </div>

        {streakNotes.length > 0 && !week.accaWon && (
          <div
            className="px-4 py-2 font-mono border-t"
            style={{ borderColor: "var(--c-rule)", fontSize: 10.5, letterSpacing: "0.06em", color: "var(--c-burgundy)", lineHeight: 1.6 }}
          >
            {streakNotes.map((x) => (
              <div key={x.name}>
                🔥 {x.name} · {x.streak} losses in a row ·{" "}
                {x.banned
                  ? "1-month ban"
                  : x.applied
                    ? `€${x.applied} added to this bet`
                    : `owes €${x.due} on this bet · tap Stake to add`}
              </div>
            ))}
          </div>
        )}

        {/* Settle button — anyone can settle. Available on any week once all
            7 picks are filled. Re-settling is fine; results overwrite. */}
        {week.picks.every((p) => p.filled) && (
          <div className="px-4 py-3 border-t" style={{ borderColor: "var(--c-rule)" }}>
            <button
              onClick={() => setSettling(true)}
              className="w-full font-stamp uppercase py-3"
              style={{
                background: "var(--c-ink)",
                color: "var(--c-paper)",
                border: "none",
                borderRadius: 2,
                fontSize: 14,
                letterSpacing: "0.16em",
              }}
            >
              {week.accaWon
                ? "↺ Re-settle (already won)"
                : week.picks.some((p) => p.result)
                  ? "↺ Re-settle this week"
                  : "Settle this week →"}
            </button>
          </div>
        )}
      </Card>

      <SideBetsCard bd={bd} week={week} meId={meId} onChanged={() => void reload()} />

      {/* Add Pick sheet — opens for whichever row's tapped (anyone, any week).
          The sheet title shows the player's name + week so you don't get
          confused about whose pick you're editing. */}
      {editingPlayer && (
        <AddPickSheet
          open={true}
          onClose={() => setEditingPlayer(null)}
          weekNum={week.week}
          playerId={editingPlayer}
          playerName={
            bd.players.find((p) => p.id === editingPlayer)?.name ?? editingPlayer
          }
          existing={editingPick}
          stake={week.stake}
          lateFine={
            bd.fines.find(
              (f) => f.kind === "late" && f.week === week.week && f.playerId === editingPlayer,
            ) ?? null
          }
          lateFineAmount={bd.v2Ready ? bd.settings.lateFine : undefined}
          onSaved={() => void reload()}
        />
      )}

      {editingInfo && (
        <WeekInfoSheet
          open={true}
          onClose={() => setEditingInfo(false)}
          week={week}
          players={bd.players}
          onSaved={() => void reload()}
        />
      )}

      {votingPlayer && votingPick && (
        <VotesSheet
          open={true}
          onClose={() => setVotingPlayer(null)}
          weekNum={week.week}
          pick={votingPick}
          player={bd.players.find((p) => p.id === votingPlayer)!}
          players={bd.players}
          votes={bd.votes}
          meId={meId}
          onSaved={() => void reload()}
        />
      )}

      {/* Edit Stake sheet — anyone can change the week's acca stake */}
      {editingStake && (
        <EditStakeSheet
          open={true}
          onClose={() => setEditingStake(false)}
          weekNum={week.week}
          stake={week.stake}
          topups={topups}
          autoTopups={autoTopups}
          onSaved={() => void reload()}
        />
      )}

      {/* Settle Week sheet — anyone can settle */}
      {settling && (
        <SettleWeekSheet
          open={true}
          onClose={() => setSettling(false)}
          week={week}
          players={bd.players}
          onSaved={() => void reload()}
        />
      )}
    </div>
  );
}

function fmtWeekend(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });
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
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
  divider?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className="px-3 py-3 text-left"
      style={{
        borderLeft: divider ? "1px dashed var(--c-rule)" : "none",
        background: "transparent",
      }}
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
    </Tag>
  );
}
