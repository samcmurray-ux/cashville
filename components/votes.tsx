"use client";

// Votes on a pick: ⭐ bet of the week, 💩 worst bet of the week, and the
// vibes (👍 it'll win / 👎 it'll lose). Everyone sees every vote, live.
// One ⭐ and one 💩 per voter per week; never on your own pick.

import { useState } from "react";
import { Sheet } from "./sheet";
import { castVote } from "@/lib/bd";
import type { Player, ViewPick, Vote, VoteKind } from "@/lib/types";
import { Avatar } from "./primitives";
import { ErrorLine } from "./ui";

const KINDS: { kind: VoteKind; icon: string; label: string; sub: string }[] = [
  { kind: "star", icon: "⭐", label: "Bet of the week", sub: "one per week" },
  { kind: "poo", icon: "💩", label: "Stinker of the week", sub: "one per week" },
  { kind: "win", icon: "👍", label: "It'll win", sub: "vibes" },
  { kind: "lose", icon: "👎", label: "It'll lose", sub: "vibes" },
];

// The compact strip under a slip row. Tapping it opens the sheet.
export function VoteStrip({
  votes,
  meId,
  onOpen,
}: {
  votes: Vote[]; // votes for this pick only
  meId: string | null;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      aria-label="Votes"
      className="flex items-center gap-2 font-mono"
      style={{ fontSize: 11, color: "var(--c-dim)" }}
    >
      {KINDS.map(({ kind, icon }) => {
        const n = votes.filter((v) => v.kind === kind).length;
        const mine = !!meId && votes.some((v) => v.kind === kind && v.voterId === meId);
        return (
          <span
            key={kind}
            style={{
              padding: "1px 5px",
              borderRadius: 999,
              border: `1px solid ${mine ? "var(--c-mustard)" : "var(--c-rule)"}`,
              background: mine ? "rgba(200,146,22,0.15)" : "transparent",
              opacity: n === 0 && !mine ? 0.45 : 1,
            }}
          >
            {icon} {n}
          </span>
        );
      })}
    </button>
  );
}

export function VotesSheet({
  open,
  onClose,
  weekNum,
  pick,
  player,
  players,
  votes,
  meId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  weekNum: number;
  pick: ViewPick;
  player: Player;
  players: Player[];
  votes: Vote[]; // every vote in the app (castVote needs the voter's others)
  meId: string | null;
  onSaved?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const forPick = votes.filter((v) => v.week === weekNum && v.targetId === player.id);
  const own = meId === player.id;
  const settled = !!pick.result;

  const vote = async (kind: VoteKind) => {
    if (!meId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await castVote(weekNum, meId, player.id, kind, votes);
      onSaved?.();
    } catch (e) {
      setError((e as Error).message || "Vote failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={`${player.name}'s pick`}>
      <div className="space-y-3">
        <p className="font-body" style={{ fontSize: 15, color: "var(--c-ink-soft)" }}>
          {pick.sel}
          {pick.odds ? ` @ ${pick.odds.toFixed(2)}` : ""}
        </p>
        {own && (
          <p className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--c-dim)" }}>
            You can't vote on your own pick
          </p>
        )}
        {KINDS.map(({ kind, icon, label, sub }) => {
          const voters = forPick.filter((v) => v.kind === kind);
          const mine = !!meId && voters.some((v) => v.voterId === meId);
          // Vibes close once the result is in; ⭐ and 💩 stay open.
          const locked = own || !meId || ((kind === "win" || kind === "lose") && settled);
          return (
            <button
              key={kind}
              onClick={() => vote(kind)}
              disabled={locked || busy}
              className="w-full flex items-center gap-3 p-3 text-left"
              style={{
                border: `1.5px solid ${mine ? "var(--c-mustard)" : "var(--c-rule-strong)"}`,
                background: mine ? "rgba(200,146,22,0.15)" : "transparent",
                borderRadius: 2,
                opacity: locked && !voters.length ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 24 }}>{icon}</span>
              <span className="flex-1 min-w-0">
                <span className="font-display block" style={{ fontSize: 17, color: "var(--c-ink)", lineHeight: 1.1 }}>
                  {label}
                </span>
                <span className="font-mono uppercase block" style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--c-dim)", marginTop: 2 }}>
                  {mine ? "your vote · tap to undo" : sub}
                </span>
              </span>
              <span className="flex items-center" style={{ gap: 2 }}>
                {voters.map((v) => {
                  const p = players.find((x) => x.id === v.voterId);
                  return p ? <Avatar key={v.id} player={p} size={24} /> : null;
                })}
              </span>
            </button>
          );
        })}
        <ErrorLine error={error} />
      </div>
    </Sheet>
  );
}
