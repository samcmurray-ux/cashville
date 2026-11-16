"use client";

// Fines — who owes the pot what, and the house rules. A fine marked paid
// drops straight into the Pot ledger. Amounts are all editable: the
// defaults live in the Rules card, and any single fine can be changed.

import { useEffect, useState } from "react";
import { useBD } from "@/lib/useBD";
import { Avatar, Card, Chip, Eyebrow, Headline, Scribble } from "@/components/primitives";
import { Sheet } from "@/components/sheet";
import {
  ErrorLine,
  Label,
  NotReadyNote,
  PlayerChoice,
  Segmented,
  SheetButtons,
  inputStyle,
} from "@/components/ui";
import {
  FINE_LABEL,
  addFine,
  deleteFine,
  fineDeadline,
  fmtMoney,
  lossStreaks,
  saveSettings,
  setFinePaid,
  streakPenalty,
  updateFine,
} from "@/lib/bd";
import type { BD, Fine, FineKind, Settings } from "@/lib/types";
import { fireMoment } from "@/components/moments";
import { notify } from "@/lib/push";
import { useMe } from "@/lib/useMe";

const KIND_COLOR: Record<FineKind, string> = {
  late: "var(--c-mustard)",
  loss: "var(--c-burgundy)",
  overdue: "var(--c-ink)",
  manual: "var(--c-denim)",
};

export default function FinesPage() {
  const { bd, reload } = useBD();
  const [sheet, setSheet] = useState<{ fine: Fine | null } | null>(null);
  const [showPaid, setShowPaid] = useState(false);

  if (!bd) return null;
  if (!bd.v2Ready) {
    return (
      <div className="px-4 py-4">
        <NotReadyNote />
      </div>
    );
  }

  const unpaid = bd.fines.filter((f) => !f.paid);
  const paid = bd.fines.filter((f) => f.paid).reverse();
  const owedTotal = unpaid.reduce((a, f) => a + f.amount, 0);
  const paidTotal = paid.reduce((a, f) => a + f.amount, 0);
  const name = (id: string) => bd.players.find((p) => p.id === id)?.name ?? id;
  const owedBy = bd.players
    .map((p) => ({
      player: p,
      owed: unpaid.filter((f) => f.playerId === p.id).reduce((a, f) => a + f.amount, 0),
    }))
    .sort((a, b) => b.owed - a.owed);

  const togglePaid = async (f: Fine) => {
    try {
      await setFinePaid(f, !f.paid, name(f.playerId));
      await reload();
    } catch (e) {
      alert((e as Error).message || "That didn't save");
    }
  };

  const row = (f: Fine, i: number) => {
    const player = bd.players.find((p) => p.id === f.playerId);
    const deadline = fineDeadline(f, bd.weeks);
    const overdue = !f.paid && f.kind !== "overdue" && new Date() > deadline;
    return (
      <div
        key={f.id}
        className="px-4 py-3 flex items-center gap-3"
        style={{ borderTop: i === 0 ? "none" : "1px solid var(--c-rule)" }}
      >
        {player && <Avatar player={player} size={32} />}
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => setSheet({ fine: f })}
          aria-label="Edit fine"
        >
          <span className="flex items-center gap-2">
            <span className="font-display" style={{ fontSize: 17, color: "var(--c-ink)", lineHeight: 1.1 }}>
              {name(f.playerId)}
            </span>
            <Chip color={KIND_COLOR[f.kind]} small>
              {FINE_LABEL[f.kind]}
            </Chip>
          </span>
          <span
            className="font-mono uppercase block truncate"
            style={{
              fontSize: 9.5,
              letterSpacing: "0.1em",
              marginTop: 3,
              color: overdue ? "var(--c-burgundy)" : "var(--c-dim)",
            }}
          >
            {f.week != null ? `W${f.week} · ` : ""}
            {f.reason ? `${f.reason} · ` : ""}
            {f.paid
              ? "paid · in the pot"
              : f.kind === "overdue"
                ? "late-payment charge"
                : overdue
                  ? "overdue"
                  : `pay by ${deadline.toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" })}`}
          </span>
        </button>
        <div
          className="font-display shrink-0"
          style={{ fontSize: 20, lineHeight: 1, color: f.paid ? "var(--c-forest)" : "var(--c-burgundy)" }}
        >
          {fmtMoney(f.amount)}
        </div>
        <button
          onClick={() => togglePaid(f)}
          className="font-stamp uppercase shrink-0"
          style={{
            fontSize: 11,
            letterSpacing: "0.1em",
            padding: "6px 8px",
            borderRadius: 2,
            border: "1.5px solid var(--c-ink)",
            background: f.paid ? "transparent" : "var(--c-ink)",
            color: f.paid ? "var(--c-ink)" : "var(--c-paper)",
          }}
        >
          {f.paid ? "Undo" : "Paid ✓"}
        </button>
      </div>
    );
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <Card accent="var(--c-burgundy)">
        <div className="px-5 pt-5 pb-4">
          <Eyebrow color="var(--c-burgundy)">The Sin Bin</Eyebrow>
          <div className="flex items-baseline gap-2 mt-1">
            <Headline size={44} color={owedTotal > 0 ? "var(--c-burgundy)" : "var(--c-forest)"}>
              {fmtMoney(owedTotal)}
            </Headline>
            <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--c-dim)" }}>
              owed · {fmtMoney(paidTotal)} paid so far
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {owedBy.map(({ player, owed }) => (
              <div
                key={player.id}
                className="flex items-center gap-1.5"
                style={{
                  padding: "3px 9px 3px 3px",
                  borderRadius: 999,
                  border: "1px solid var(--c-rule)",
                  opacity: owed > 0 ? 1 : 0.45,
                }}
              >
                <Avatar player={player} size={22} />
                <span className="font-display" style={{ fontSize: 14, color: owed > 0 ? "var(--c-burgundy)" : "var(--c-dim)" }}>
                  {owed > 0 ? fmtMoney(owed) : "clear"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--c-rule)" }}>
          <Eyebrow color="var(--c-ink)">Unpaid fines</Eyebrow>
          <span className="font-mono" style={{ fontSize: 10, color: "var(--c-faint)", letterSpacing: "0.16em" }}>
            {unpaid.length}
          </span>
        </div>
        {unpaid.length === 0 ? (
          <div className="p-6 text-center">
            <Scribble color="var(--c-forest)" size={20} rotate={-1}>
              everyone's paid up 👏
            </Scribble>
          </div>
        ) : (
          unpaid.map(row)
        )}
      </Card>

      {paid.length > 0 && (
        <Card>
          <button
            onClick={() => setShowPaid((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between"
          >
            <Eyebrow color="var(--c-ink)">Paid fines</Eyebrow>
            <span className="font-mono" style={{ fontSize: 10, color: "var(--c-faint)", letterSpacing: "0.16em" }}>
              {paid.length} {showPaid ? "▴" : "▾"}
            </span>
          </button>
          {showPaid && <div style={{ borderTop: "1px solid var(--c-rule)" }}>{paid.map(row)}</div>}
        </Card>
      )}

      <StreaksCard bd={bd} />

      <RulesCard bd={bd} onSaved={() => void reload()} />

      <button
        onClick={() => setSheet({ fine: null })}
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
        + Fine
      </button>

      {sheet && (
        <FineSheet
          bd={bd}
          fine={sheet.fine}
          onClose={() => setSheet(null)}
          onSaved={() => void reload()}
        />
      )}
    </div>
  );
}

// ─── Losing streaks ──────────────────────────────────────────────────────
// Where everyone stands right now: how many they've lost
// in a row, what that costs on this week's bet, and what another loss
// would cost. Fines per player are totalled alongside.
function StreaksCard({ bd }: { bd: BD }) {
  const s = bd.settings;
  // Counting every result marked so far, including this week's.
  const streaks = lossStreaks(bd.weeks, Number.MAX_SAFE_INTEGER);
  const rows = bd.players
    .map((p) => {
      const streak = streaks[p.id] ?? 0;
      const mine = bd.fines.filter((f) => f.playerId === p.id);
      return {
        player: p,
        streak,
        now: streakPenalty(streak, s),
        nextFine: streak + 1 >= 4 ? s.streak4Fine : s.lossFine,
        next: streakPenalty(streak + 1, s),
        fined: mine.reduce((a, f) => a + f.amount, 0),
        count: mine.length,
      };
    })
    .sort((a, b) => b.streak - a.streak);

  return (
    <Card accent="var(--c-mustard)">
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--c-rule)" }}>
        <Eyebrow color="var(--c-ink)">Losing streaks · as it stands</Eyebrow>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.player.id}
          className="px-4 py-3 flex items-center gap-3"
          style={{ borderTop: i === 0 ? "none" : "1px solid var(--c-rule)" }}
        >
          <Avatar player={r.player} size={32} />
          <div className="min-w-0 flex-1">
            <div className="font-display" style={{ fontSize: 17, color: "var(--c-ink)", lineHeight: 1.1 }}>
              {r.player.name}
            </div>
            <div
              className="font-mono uppercase"
              style={{
                fontSize: 9.5,
                letterSpacing: "0.08em",
                marginTop: 3,
                lineHeight: 1.5,
                color: r.now.banned || r.now.topup > 0 ? "var(--c-burgundy)" : "var(--c-dim)",
              }}
            >
              {r.now.banned
                ? "banned for a month"
                : r.now.topup > 0
                  ? `€${r.now.topup} top-up on the next bet`
                  : r.streak === 0
                    ? "clean slate"
                    : "fined, nothing extra yet"}
              <br />
              <span style={{ color: "var(--c-dim)" }}>
                loses again → €{r.nextFine} fine
                {r.next.banned ? " + ban" : r.next.topup > 0 ? ` + €${r.next.topup} on next bet` : ""}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div
              className="font-display"
              style={{ fontSize: 22, lineHeight: 1, color: r.streak > 0 ? "var(--c-burgundy)" : "var(--c-faint)" }}
            >
              {r.streak > 0 ? `${"🔥".repeat(Math.min(r.streak, 4))} ${r.streak}` : "0"}
            </div>
            <div className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--c-dim)", marginTop: 3 }}>
              {r.count > 0 ? `${r.count} fine${r.count === 1 ? "" : "s"} · ${fmtMoney(r.fined)}` : "no fines"}
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}

// ─── Add / edit a fine ───────────────────────────────────────────────────
function FineSheet({
  bd,
  fine,
  onClose,
  onSaved,
}: {
  bd: BD;
  fine: Fine | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const defaults: Record<string, number> = {
    late: bd.settings.lateFine,
    loss: bd.settings.lossFine,
    manual: 10,
  };
  const { meId } = useMe();
  const [playerId, setPlayerId] = useState<string | null>(fine?.playerId ?? null);
  const [kind, setKind] = useState<"late" | "loss" | "manual">(
    fine && fine.kind !== "overdue" ? fine.kind : "manual",
  );
  const [amount, setAmount] = useState(String(fine?.amount ?? defaults.manual));
  const [weekStr, setWeekStr] = useState(String(fine?.week ?? bd.currentWeekNum));
  const [reason, setReason] = useState(fine?.reason ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError("Enter an amount");
    if (!fine && !playerId) return setError("Choose who's being fined");
    setSaving(true);
    try {
      if (fine) {
        await updateFine(fine, { amount: amt, reason });
      } else {
        await addFine({
          week: weekStr.trim() ? parseInt(weekStr, 10) : null,
          playerId: playerId!,
          kind,
          amount: amt,
          reason,
        });
        fireMoment("fined");
        notify({ kind: "fined", week: weekStr.trim() ? parseInt(weekStr, 10) : null, playerId: playerId!, fineKind: kind, actorId: meId });
      }
      onSaved();
      onClose();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(
        err.code === "23505"
          ? "They already have that fine for this week"
          : err.message || "Save failed",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title={fine ? "Edit fine" : "Hand out a fine"}>
      <div className="space-y-4">
        {!fine && (
          <>
            <div>
              <Label>Who</Label>
              <PlayerChoice players={bd.players} value={playerId} onChange={setPlayerId} />
            </div>
            <div>
              <Label>What for</Label>
              <Segmented
                options={[
                  { value: "late", label: "Late pick" },
                  { value: "loss", label: "Losing leg" },
                  { value: "manual", label: "Other" },
                ]}
                value={kind}
                onChange={(k) => {
                  setKind(k);
                  setAmount(String(defaults[k]));
                }}
              />
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Amount (€)</Label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-2 px-3 py-2 font-display bg-bg2"
              style={{ ...inputStyle, fontSize: 22 }}
            />
          </div>
          {!fine && (
            <div>
              <Label>Week</Label>
              <input
                type="number"
                inputMode="numeric"
                value={weekStr}
                onChange={(e) => setWeekStr(e.target.value)}
                className="w-full mt-2 px-3 py-2 font-mono bg-bg2"
                style={{ ...inputStyle, fontSize: 18 }}
              />
            </div>
          )}
        </div>
        <div>
          <Label>Reason (optional)</Label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="forgot his wallet again"
            className="w-full mt-2 px-3 py-2 font-body bg-bg2"
            style={inputStyle}
          />
        </div>
        <ErrorLine error={error} />
        <SheetButtons
          onCancel={onClose}
          onSubmit={submit}
          submitLabel={saving ? "Saving…" : fine ? "Save changes" : "Fine him"}
          disabled={saving}
          onDelete={
            fine
              ? async () => {
                  if (
                    !confirm(
                      fine.paid
                        ? "Delete this fine? Its payment comes back out of the pot too."
                        : "Delete this fine?",
                    )
                  )
                    return;
                  await deleteFine(fine);
                  onSaved();
                  onClose();
                }
              : undefined
          }
        />
      </div>
    </Sheet>
  );
}

const NUM_KEYS = [
  "lateFine",
  "lossFine",
  "topup2",
  "topup3",
  "streak4Fine",
  "overdueFine",
  "sideBetTaxPct",
] as const;

// ─── Rules + editable amounts ────────────────────────────────────────────
function RulesCard({ bd, onSaved }: { bd: BD; onSaved: () => void }) {
  const s = bd.settings;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    lateFine: String(s.lateFine),
    lossFine: String(s.lossFine),
    streak4Fine: String(s.streak4Fine),
    topup2: String(s.topup2),
    topup3: String(s.topup3),
    overdueFine: String(s.overdueFine),
    sideBetTaxPct: String(s.sideBetTaxPct),
    rulesText: s.rulesText,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setForm({
        lateFine: String(s.lateFine),
        lossFine: String(s.lossFine),
        streak4Fine: String(s.streak4Fine),
        topup2: String(s.topup2),
        topup3: String(s.topup3),
        overdueFine: String(s.overdueFine),
        sideBetTaxPct: String(s.sideBetTaxPct),
        rulesText: s.rulesText,
      });
    }
  }, [editing, s.lateFine, s.lossFine, s.streak4Fine, s.topup2, s.topup3, s.overdueFine, s.sideBetTaxPct, s.rulesText]);

  const save = async () => {
    const patch: Partial<Settings> = { rulesText: form.rulesText };
    for (const k of NUM_KEYS) {
      const n = parseFloat(form[k]);
      if (!Number.isFinite(n) || n < 0) return setError("Amounts must be numbers");
      patch[k] = n;
    }
    try {
      await saveSettings(patch);
      setError(null);
      setEditing(false);
      onSaved();
    } catch (e) {
      setError((e as Error).message || "Save failed");
    }
  };

  const rules: { key: (typeof NUM_KEYS)[number]; title: string; text: string; unit: string }[] = [
    { key: "lateFine", title: "Late pick", text: "Pick not in on time.", unit: "€" },
    { key: "lossFine", title: "Losing leg", text: "Your pick loses. Added automatically when it's marked lost.", unit: "€" },
    { key: "topup2", title: "2 losses in a row", text: "On top of the fine, add this to next week's bet.", unit: "€" },
    { key: "topup3", title: "3 losses in a row", text: "On top of the fine, add this to next week's bet.", unit: "€" },
    { key: "streak4Fine", title: "4 losses in a row", text: "Bigger fine instead of the usual one, plus a 1-month ban.", unit: "€" },
    { key: "overdueFine", title: "Unpaid fine", text: "Extra charge if a fine isn't paid before the start of the following weekend.", unit: "€" },
    { key: "sideBetTaxPct", title: "Side bet tax", text: "Share of side-bet winnings that goes to the pot.", unit: "%" },
  ];

  return (
    <Card accent="var(--c-forest)">
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--c-rule)" }}>
        <Eyebrow color="var(--c-ink)">The rules</Eyebrow>
        <button
          onClick={() => (editing ? save() : setEditing(true))}
          className="font-stamp uppercase"
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            padding: "5px 9px",
            borderRadius: 2,
            border: "1.5px solid var(--c-ink)",
            background: editing ? "var(--c-ink)" : "transparent",
            color: editing ? "var(--c-paper)" : "var(--c-ink)",
          }}
        >
          {editing ? "Save" : "✎ Edit"}
        </button>
      </div>
      {rules.map((r, i) => (
        <div
          key={r.key}
          className="px-4 py-3 flex items-center gap-3"
          style={{ borderTop: i === 0 ? "none" : "1px solid var(--c-rule)" }}
        >
          <div className="min-w-0 flex-1">
            <div className="font-display" style={{ fontSize: 17, color: "var(--c-ink)", lineHeight: 1.1 }}>
              {r.title}
            </div>
            <div className="font-body" style={{ fontSize: 12.5, color: "var(--c-ink-soft)", marginTop: 2 }}>
              {r.text}
            </div>
          </div>
          {editing ? (
            <input
              type="text"
              inputMode="decimal"
              value={form[r.key]}
              onChange={(e) => setForm({ ...form, [r.key]: e.target.value })}
              aria-label={r.title}
              className="font-display bg-bg2 text-right px-2 py-1"
              style={{ ...inputStyle, width: 72, fontSize: 20 }}
            />
          ) : (
            <div className="font-display shrink-0" style={{ fontSize: 22, color: "var(--c-burgundy)" }}>
              {r.unit === "€" ? fmtMoney(s[r.key]) : `${s[r.key]}%`}
            </div>
          )}
        </div>
      ))}
      <div className="px-4 py-3" style={{ borderTop: "1px solid var(--c-rule)" }}>
        <Label>House rules</Label>
        {editing ? (
          <textarea
            value={form.rulesText}
            onChange={(e) => setForm({ ...form, rulesText: e.target.value })}
            rows={6}
            placeholder="Anything else the group has agreed…"
            className="w-full mt-2 px-3 py-2 font-body bg-bg2"
            style={{ ...inputStyle, fontSize: 14 }}
          />
        ) : (
          <p
            className="font-body mt-2"
            style={{ fontSize: 14, color: "var(--c-ink-soft)", whiteSpace: "pre-wrap" }}
          >
            {s.rulesText || "Nothing written down yet — tap Edit to add the group's rules."}
          </p>
        )}
        {editing && (
          <button
            onClick={() => setEditing(false)}
            className="font-mono uppercase mt-2"
            style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--c-dim)", textDecoration: "underline" }}
          >
            Cancel
          </button>
        )}
        <ErrorLine error={error} />
      </div>
    </Card>
  );
}
