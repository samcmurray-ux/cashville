"use client";

// Side bets — 1v1 wagers on whether someone's pick wins or loses. The app
// only keeps score: players pay each other outside it. When the loser has
// paid, "squared up" drops the Pot's cut into the ledger.

import { useEffect, useState } from "react";
import { Sheet } from "./sheet";
import {
  addSideBet,
  deleteSideBet,
  respondSideBet,
  setSideBetPaid,
  sideBetOutcome,
} from "@/lib/bd";
import type { BD, Player, SideBet, ViewWeek } from "@/lib/types";
import { notify } from "@/lib/push";
import { fireMoment } from "./moments";
import { Card, Eyebrow, Scribble } from "./primitives";
import { ErrorLine, Label, NotReadyNote, PlayerChoice, Segmented, SheetButtons, inputStyle } from "./ui";

const euro = (n: number) => "€" + (Number.isInteger(n) ? n : n.toFixed(2));

export function SideBetsCard({
  bd,
  week,
  meId,
  onChanged,
}: {
  bd: BD;
  week: ViewWeek;
  meId: string | null;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const bets = bd.sideBets.filter((b) => b.week === week.week);
  const name = (id: string) => bd.players.find((p) => p.id === id)?.name ?? id;
  const act = async (fn: () => Promise<void>) => {
    try {
      await fn();
      onChanged();
    } catch (e) {
      alert((e as Error).message || "That didn't save");
    }
  };

  return (
    <Card accent="var(--c-denim)">
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--c-rule)" }}
      >
        <Eyebrow color="var(--c-ink)">Side bets · week {week.week}</Eyebrow>
        {bd.v2Ready && meId && (
          <button
            onClick={() => setAdding(true)}
            className="font-stamp uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              color: "var(--c-paper)",
              background: "var(--c-denim)",
              padding: "5px 9px",
              borderRadius: 2,
            }}
          >
            + Side bet
          </button>
        )}
      </div>
      {!bd.v2Ready ? (
        <div className="p-4">
          <NotReadyNote />
        </div>
      ) : bets.length === 0 ? (
        <div className="p-5 text-center">
          <Scribble color="var(--c-dim)" size={18} rotate={-1}>
            nobody's put their money where their mouth is
          </Scribble>
        </div>
      ) : (
        bets.map((b, i) => {
          const out = sideBetOutcome(b, bd.weeks, bd.settings.sideBetTaxPct);
          const involved = meId === b.creatorId || meId === b.opponentId;
          return (
            <div
              key={b.id}
              className="px-4 py-3"
              style={{ borderTop: i === 0 ? "none" : "1px solid var(--c-rule)" }}
            >
              <div className="font-body" style={{ fontSize: 14, color: "var(--c-ink)" }}>
                <strong>{name(b.creatorId)}</strong> bets <strong>{name(b.opponentId)}</strong>{" "}
                {euro(b.amount)} that {name(b.subjectId)}'s pick{" "}
                <strong>{b.creatorBacks === "win" ? "wins" : "loses"}</strong>
              </div>
              <div
                className="font-mono uppercase mt-1 flex items-center gap-2 flex-wrap"
                style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--c-dim)" }}
              >
                {out.state === "open" && <span>waiting on {name(b.opponentId)}</span>}
                {out.state === "declined" && <span>declined</span>}
                {out.state === "live" && <span style={{ color: "var(--c-denim)" }}>● it's on</span>}
                {out.state === "void" && <span>void · no bet</span>}
                {out.state === "won" && (
                  <span style={{ color: b.paid ? "var(--c-forest)" : "var(--c-burgundy)" }}>
                    {name(out.loserId)} {b.paid ? "paid" : "owes"} {name(out.winnerId)}{" "}
                    {euro(out.toWinner)}
                    {out.tax > 0 ? ` + ${euro(out.tax)} to the pot` : ""}
                  </span>
                )}

                {out.state === "open" && meId === b.opponentId && (
                  <>
                    <Mini onClick={() => act(async () => {
                        await respondSideBet(b.id, "accepted");
                        notify({ kind: "side_bet_reply", betId: b.id });
                        fireMoment("handshake");
                      })} solid>
                      Accept
                    </Mini>
                    <Mini onClick={() => act(async () => {
                        await respondSideBet(b.id, "declined");
                        notify({ kind: "side_bet_reply", betId: b.id });
                      })}>Decline</Mini>
                  </>
                )}
                {out.state === "won" && (
                  <Mini
                    onClick={() =>
                      act(async () => {
                        await setSideBetPaid(
                          b,
                          !b.paid,
                          out.tax,
                          `Side bet tax · ${name(out.winnerId)} beat ${name(out.loserId)}`,
                        );
                        if (!b.paid) fireMoment("gavel");
                      })
                    }
                    solid={!b.paid}
                  >
                    {b.paid ? "Undo paid" : "Squared up ✓"}
                  </Mini>
                )}
                {(involved || out.state === "void" || out.state === "declined") &&
                  out.state !== "won" && (
                    <Mini
                      onClick={() => {
                        if (confirm("Remove this side bet?")) void act(() => deleteSideBet(b));
                      }}
                    >
                      ✕
                    </Mini>
                  )}
              </div>
            </div>
          );
        })
      )}
      {bd.v2Ready && (
        <div
          className="px-4 py-2 font-mono"
          style={{
            fontSize: 9.5,
            letterSpacing: "0.08em",
            color: "var(--c-faint)",
            borderTop: "1px solid var(--c-rule)",
          }}
        >
          Loser pays the winner direct · {bd.settings.sideBetTaxPct}% of the winnings goes to the pot
        </div>
      )}
      {adding && meId && (
        <SideBetSheet
          open
          onClose={() => setAdding(false)}
          week={week}
          players={bd.players}
          meId={meId}
          onSaved={onChanged}
        />
      )}
    </Card>
  );
}

function Mini({
  children,
  onClick,
  solid,
}: {
  children: React.ReactNode;
  onClick: () => void;
  solid?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="font-stamp uppercase"
      style={{
        fontSize: 11,
        letterSpacing: "0.1em",
        padding: "3px 8px",
        borderRadius: 2,
        border: "1.5px solid var(--c-ink)",
        background: solid ? "var(--c-ink)" : "transparent",
        color: solid ? "var(--c-paper)" : "var(--c-ink)",
      }}
    >
      {children}
    </button>
  );
}

function SideBetSheet({
  open,
  onClose,
  week,
  players,
  meId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  week: ViewWeek;
  players: Player[];
  meId: string;
  onSaved: () => void;
}) {
  // Only picks that are in and not yet settled can be bet on.
  const openPicks = week.picks.filter((p) => p.filled && !p.result).map((p) => p.playerId);
  const [subject, setSubject] = useState<string | null>(null);
  const [backs, setBacks] = useState<"win" | "lose">("lose");
  const [opponent, setOpponent] = useState<string | null>(null);
  const [amount, setAmount] = useState("10");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const amt = parseFloat(amount);
  const submit = async () => {
    setError(null);
    if (!subject) return setError("Choose whose pick");
    if (!opponent) return setError("Choose who you're betting against");
    if (!Number.isFinite(amt) || amt <= 0) return setError("Enter an amount");
    setSaving(true);
    try {
      const betId = await addSideBet({
        week: week.week,
        creatorId: meId,
        opponentId: opponent,
        subjectId: subject,
        creatorBacks: backs,
        amount: Math.round(amt * 100) / 100,
      });
      notify({ kind: "side_bet_offer", betId });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={`Side bet · Week ${week.week}`}>
      <div className="space-y-4">
        {openPicks.length === 0 ? (
          <p className="font-body" style={{ fontSize: 14, color: "var(--c-ink-soft)" }}>
            No picks to bet on right now. Side bets open once a pick is in and
            close when its result is marked.
          </p>
        ) : (
          <>
            <div>
              <Label>Whose pick</Label>
              <PlayerChoice
                players={players.filter((p) => openPicks.includes(p.id))}
                value={subject}
                onChange={setSubject}
              />
            </div>
            <div>
              <Label>I say it</Label>
              <Segmented
                options={[
                  { value: "lose", label: "Loses" },
                  { value: "win", label: "Wins" },
                ]}
                value={backs}
                onChange={setBacks}
              />
            </div>
            <div>
              <Label>Against</Label>
              <PlayerChoice players={players} value={opponent} onChange={setOpponent} exclude={[meId]} />
            </div>
            <div>
              <Label>Amount (€)</Label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full mt-2 px-3 py-3 font-display bg-bg2"
                style={{ ...inputStyle, fontSize: 24 }}
              />
            </div>
            <ErrorLine error={error} />
            <SheetButtons
              onCancel={onClose}
              onSubmit={submit}
              submitLabel={saving ? "Sending…" : "Offer the bet"}
              disabled={saving}
            />
          </>
        )}
      </div>
    </Sheet>
  );
}
