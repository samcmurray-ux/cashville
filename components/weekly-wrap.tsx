"use client";

// The weekly wrap — last weekend told as a story: full-screen cards that
// advance on their own, one beat at a time. Tap the right side to skip on,
// the left to go back. Built to be screenshotted into the group chat.

import { useEffect, useMemo, useState } from "react";
import { fmtMoney } from "@/lib/bd";
import { computeAwards, computeRecap } from "@/lib/honours";
import { playSound } from "@/lib/sound";
import type { BD, Player } from "@/lib/types";
import { Avatar } from "./primitives";

const CARD_MS = 3800;

type WrapCard = {
  bg: string;
  kicker: string;
  title: string;
  lines?: string[];
  player?: Player;
  grey?: boolean; // the villain gets the black-and-white treatment
  emoji?: string;
};

function buildCards(bd: BD): WrapCard[] {
  const r = computeRecap(bd);
  if (!r) return [];
  const w = r.week;
  const cards: WrapCard[] = [];
  const names = (ps: Player[]) => ps.map((p) => p.name).join(", ");

  cards.push({
    bg: "var(--c-ink)",
    kicker: `Ca$hville · week ${w.week}`,
    title: "The wrap",
    lines: ["seven gents, one slip", "here's how it went"],
    emoji: "🎬",
  });
  cards.push(
    w.accaWon
      ? {
          bg: "var(--c-forest)",
          kicker: "The result",
          title: "It landed",
          lines: [`all seven at ${w.combinedOdds.toFixed(2)}`, `${fmtMoney(w.payout)} into the pot`],
          emoji: "🎉",
        }
      : {
          bg: "var(--c-burgundy)",
          kicker: "The result",
          title: r.losers.length === 1 ? "One leg short" : `${r.losers.length} legs down`,
          lines: [`would've paid ${fmtMoney(w.stake * w.combinedOdds)}`, `at ${w.combinedOdds.toFixed(2)} combined`],
          emoji: "💀",
        },
  );
  if (r.hero) {
    cards.push({
      bg: "var(--c-denim)",
      kicker: "Hero of the week",
      title: r.hero.player.name,
      lines: [r.hero.sel, `landed at ${r.hero.odds.toFixed(2)}`],
      player: r.hero.player,
    });
  }
  if (r.villain) {
    cards.push({
      bg: "#2b2b28",
      kicker: r.villain.solo ? "Villain · killed it alone" : "Villain of the week",
      title: r.villain.player.name,
      lines: [r.villain.sel, `lost at ${r.villain.odds.toFixed(2)}`],
      player: r.villain.player,
      grey: true,
    });
  }
  if (r.losers.length > 1) {
    cards.push({ bg: "var(--c-brick)", kicker: "The guilty", title: `${r.losers.length} let us down`, lines: [names(r.losers)], emoji: "🙈" });
  }
  if (r.star) {
    cards.push({
      bg: "var(--c-mustard)",
      kicker: "Bet of the week",
      title: r.star.player.name,
      lines: [`${r.star.votes} ⭐ vote${r.star.votes === 1 ? "" : "s"} from the group`],
      player: r.star.player,
    });
  }
  if (r.poo) {
    cards.push({
      bg: "var(--c-brick)",
      kicker: "Stinker of the week",
      title: r.poo.player.name,
      lines: [`${r.poo.votes} 💩 vote${r.poo.votes === 1 ? "" : "s"} · the people have spoken`],
      player: r.poo.player,
    });
  }
  if (r.fines.length) {
    cards.push({
      bg: "var(--c-burgundy)",
      kicker: "The sin bin",
      title: fmtMoney(r.fines.reduce((a, f) => a + f.amount, 0)) + " in fines",
      lines: r.fines.map((f) => `${f.player.name} · ${fmtMoney(f.amount)}`),
      emoji: "🟥",
    });
  }
  if (r.topups.length) {
    cards.push({
      bg: "var(--c-brick)",
      kicker: "On a losing streak",
      title: "Top-ups due",
      lines: r.topups.map((t) => `${t.player.name} adds ${fmtMoney(t.amount)} to the next bet`),
      emoji: "🔥",
    });
  }
  if (r.sideBets.length) {
    cards.push({
      bg: "var(--c-denim)",
      kicker: "Side bets",
      title: "Money changed hands",
      lines: r.sideBets.map((b) => `${b.winner.name} took ${fmtMoney(b.amount)} off ${b.loser.name}`),
      emoji: "🤝",
    });
  }
  const moved = computeAwards(bd).filter((a) => a.takenFrom);
  if (moved.length) {
    cards.push({
      bg: "var(--c-forest)",
      kicker: "Trophies on the move",
      title: `${moved.length} changed hands`,
      lines: moved.slice(0, 5).map((a) => `${a.title}: ${a.winner.name} (from ${a.takenFrom!.name})`),
      emoji: "🏆",
    });
  }
  const pct = Math.max(0, Math.min(100, (bd.trip.current / bd.trip.target) * 100));
  cards.push({
    bg: "var(--c-ink)",
    kicker: "Road to Nashville",
    title: fmtMoney(bd.trip.current),
    lines: [`${pct.toFixed(0)}% of ${fmtMoney(bd.trip.target)}`, "picks in by Friday 6pm"],
    emoji: "✈️",
  });
  return cards;
}

export function WeeklyWrap({ bd, onClose }: { bd: BD; onClose: () => void }) {
  const cards = useMemo(() => buildCards(bd), [bd]);
  const [i, setI] = useState(0);

  useEffect(() => {
    playSound("pop");
    const t = setTimeout(() => (i < cards.length - 1 ? setI(i + 1) : onClose()), CARD_MS);
    return () => clearTimeout(t);
  }, [i, cards.length, onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const card = cards[i];
  if (!card) return null;
  // Every card is a dark or saturated panel, so text is always light.
  const ink = "#fffaf0";

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: card.bg, color: ink, transition: "background 300ms ease" }}>
      <div className="flex gap-1 px-3 pt-3" style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}>
        {cards.map((_, n) => (
          <div key={n} className="flex-1 overflow-hidden" style={{ height: 3, background: "rgba(255,250,240,0.3)", borderRadius: 2 }}>
            {n < i ? (
              <div style={{ height: "100%", background: ink }} />
            ) : n === i ? (
              <div key={i} className="cv-wrap-bar" style={{ height: "100%", background: ink, animationDuration: `${CARD_MS}ms` }} />
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex justify-end px-3 pt-2">
        <button
          onClick={onClose}
          aria-label="Close the wrap"
          className="font-stamp"
          style={{ fontSize: 22, color: ink, width: 44, height: 44, position: "relative", zIndex: 2 }}
        >
          ✕
        </button>
      </div>

      <div key={i} className="cv-wrap-card flex-1 flex flex-col items-center justify-center text-center px-8 gap-4">
        {card.player ? (
          <div style={{ filter: card.grey ? "grayscale(1)" : "none" }}>
            <Avatar player={card.player} size={132} />
          </div>
        ) : (
          card.emoji && (
            <div aria-hidden style={{ fontSize: 84, lineHeight: 1 }}>
              {card.emoji}
            </div>
          )
        )}
        <div className="font-mono uppercase" style={{ fontSize: 12, letterSpacing: "0.3em", opacity: 0.85, fontWeight: 600 }}>
          {card.kicker}
        </div>
        <div className="font-display" style={{ fontSize: 56, lineHeight: 0.98, color: ink }}>
          {card.title}
        </div>
        {card.lines?.map((l, n) => (
          <div key={n} className="font-body" style={{ fontSize: 19, lineHeight: 1.3, opacity: 0.95 }}>
            {l}
          </div>
        ))}
      </div>

      <div className="font-mono uppercase text-center pb-6" style={{ fontSize: 10, letterSpacing: "0.2em", opacity: 0.7 }}>
        {i + 1} / {cards.length} · tap to skip
      </div>

      {/* Tap zones: left third goes back, the rest goes on. */}
      <button aria-label="Previous" className="absolute left-0 bottom-0" style={{ top: 70, width: "33%" }} onClick={() => setI(Math.max(0, i - 1))} />
      <button
        aria-label="Next"
        className="absolute right-0 bottom-0"
        style={{ top: 70, width: "67%" }}
        onClick={() => (i < cards.length - 1 ? setI(i + 1) : onClose())}
      />
    </div>
  );
}
