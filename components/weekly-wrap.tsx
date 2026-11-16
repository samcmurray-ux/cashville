"use client";

// The weekly wrap — last weekend told as a story in chapters: the dream,
// the legs coming in one by one, the twist, the villain, the aftermath and
// a cliffhanger for next week. Full-screen cards advance on their own,
// each with its own animated scene and a one-liner that changes weekly. Tap the right side to skip on, the
// left to go back. Built to be screen-recorded into the group chat.

import { useEffect, useMemo, useState } from "react";
import { fmtMoney, lossStreaks, streakPenalty } from "@/lib/bd";
import { computeAwards, computeRecap } from "@/lib/honours";
import { playSound, type SoundName } from "@/lib/sound";
import type { BD, Player } from "@/lib/types";
import { Avatar } from "./primitives";

const CARD_MS = 4400;

type Scene =
  | "intro"
  | "dream"
  | "legs"
  | "twist"
  | "next"
  | "landed"
  | "died"
  | "hero"
  | "villain"
  | "lineup"
  | "star"
  | "poo"
  | "fines"
  | "topups"
  | "bets"
  | "trophies"
  | "pot";

type WrapCard = {
  scene: Scene;
  bg: string;
  kicker: string;
  title: string;
  lines?: string[];
  quip?: string;
  player?: Player;
  players?: Player[];
  // A euro figure in the title that counts up from zero.
  count?: number;
  countSuffix?: string;
  sound?: SoundName;
  pct?: number;
  // The leg-by-leg reveal: one row per pick, shown one at a time.
  legs?: { player: Player; sel: string; odds: number | null; result: string }[];
  ms?: number; // how long the card stays up (default CARD_MS)
};

// One-liners. The week number picks which, so everyone sees the same joke
// and it changes every week.
const QUIPS: Record<string, string[]> = {
  dream: ["This was the week. We could feel it.", "Spirits were high. Odds were higher.", "What could possibly go wrong?", "The group chat was buzzing. Briefly."],
  legs: ["Watch closely. It goes wrong near the end.", "One by one, they came in. Mostly.", "So far, so good. Too good."],
  legsWon: ["Not a single one of us bottled it.", "Seven for seven. Unheard of."],
  twist: ["Every story needs a villain.", "You could hear the group chat go quiet.", "And it was all going so well."],
  next: ["Same time next week. Same hope. Same outcome, probably.", "We go again. God help us.", "Tune in Friday. Bring your wallet."],
  intro: ["Viewer discretion is advised.", "Previously, on Ca$hville…", "No refunds. No apologies.", "Brought to you by poor decisions."],
  landed: ["Nobody saw that coming. Least of all us.", "Screenshot it. It won't happen again.", "The bookies are furious. Probably.", "Drinks are on the pot. They're not."],
  died: ["Another week, another eulogy.", "Thoughts and prayers to the slip.", "It was fun while it lasted. About an hour.", "The bookies send their regards."],
  hero: ["Carried the team. Back is in bits.", "Give that man a raise. Of nothing.", "Proof that even we get one right.", "Don't let it go to your head."],
  villainSolo: ["One job. One.", "Six men did their bit. One did this.", "A crime against accumulators.", "He'll say it was unlucky. It wasn't."],
  villain: ["Leading from the back.", "First among the guilty.", "Short odds. Shorter excuses.", "A bold strategy. It did not pay off."],
  lineup: ["Round up the usual suspects.", "A team effort, in the worst way.", "No one is innocent here.", "Safety in numbers."],
  star: ["The people's champion. Insufferable.", "Finally, some taste.", "Frame it. Hang it in the jacks."],
  poo: ["The group has spoken. Unkindly.", "You could smell it from Friday.", "Democracy is brutal."],
  fines: ["The sin bin is doing numbers.", "Crime doesn't pay. Criminals do.", "Nashville thanks you for your service."],
  topups: ["Losing is getting expensive.", "The more you lose, the more you pay. Beautiful.", "A tax on optimism."],
  bets: ["Friendship is temporary. Debts are forever.", "Betting on your mates losing. Lovely stuff.", "The real action was off the slip."],
  trophies: ["Silverware on the move.", "Engravers working overtime.", "Glory is rented, never owned."],
  pot: ["Nashville isn't going to fund itself.", "One day we'll get there. One day.", "Same time next week, lads."],
};
const quip = (key: string, week: number) => QUIPS[key][week % QUIPS[key].length];

function buildCards(bd: BD): WrapCard[] {
  const r = computeRecap(bd);
  if (!r) return [];
  const w = r.week;
  const n = w.week;
  const cards: WrapCard[] = [];

  const placer = bd.players.find((p) => p.id === w.placerId);
  const legs = w.picks
    .filter((p) => p.filled)
    .map((p) => ({ player: bd.players.find((x) => x.id === p.playerId)!, sel: p.sel, odds: p.odds, result: p.result as string }))
    .filter((l) => l.player)
    // Winners first, shortest price first; the legs that lost come last.
    .sort((a, b) => (a.result === "Lost" ? 1 : 0) - (b.result === "Lost" ? 1 : 0) || (a.odds ?? 0) - (b.odds ?? 0));
  const wonCount = legs.filter((l) => l.result === "Won").length;

  cards.push({ scene: "intro", bg: "#14121f", kicker: `Ca$hville · week ${n}`, title: "The wrap", quip: quip("intro", n), sound: "pop" });

  // Chapter 1 — the dream: what was on the line.
  cards.push({
    scene: "dream",
    bg: "#22406b",
    kicker: "Chapter one · the dream",
    title: "on the line",
    count: w.stake * w.combinedOdds,
    lines: [
      `${fmtMoney(w.stake)} staked at ${w.combinedOdds.toFixed(2)}`,
      placer ? `${placer.name} put the bet on` : "seven picks, one slip",
    ],
    quip: quip("dream", n),
    sound: "pop",
  });

  // Chapter 2 — leg by leg, in the order that hurts most.
  if (legs.length) {
    cards.push({
      scene: "legs",
      bg: "#14121f",
      kicker: "Chapter two · leg by leg",
      title: w.accaWon ? "They all came in" : `${wonCount} came in…`,
      quip: quip(w.accaWon ? "legsWon" : "legs", n),
      legs,
      ms: 2600 + legs.length * 650,
      sound: "pop",
    });
  }

  // Chapter 3 — the twist.
  if (!w.accaWon) {
    cards.push({ scene: "twist", bg: "#000000", kicker: "Chapter three · the twist", title: "And then…", quip: quip("twist", n), sound: "thud", ms: 3000 });
  }
  cards.push(
    w.accaWon
      ? {
          scene: "landed",
          bg: "#1f5f3a",
          kicker: "Chapter three · the miracle",
          title: "It landed",
          lines: [`all seven at ${w.combinedOdds.toFixed(2)}`, `${fmtMoney(w.payout)} into the pot`],
          quip: quip("landed", n),
          sound: "cash",
        }
      : {
          scene: "died",
          bg: "#5a1826",
          kicker: "The damage",
          title: r.losers.length === 1 ? "One leg short" : `${r.losers.length} legs down`,
          lines: [`would've paid ${fmtMoney(w.stake * w.combinedOdds)}`],
          quip: quip("died", n),
          sound: "trombone",
        },
  );
  if (r.hero) {
    cards.push({
      scene: "hero",
      bg: "#22406b",
      kicker: w.accaWon ? "Hero of the week" : "The silver lining · hero of the week",
      title: r.hero.player.name,
      lines: [`${r.hero.sel} · landed at ${r.hero.odds.toFixed(2)}`],
      quip: quip("hero", n),
      player: r.hero.player,
      sound: "pop",
    });
  }
  if (r.villain) {
    cards.push({
      scene: "villain",
      bg: "#2b2b28",
      kicker: r.villain.solo ? "Wanted · killed it alone" : "Wanted · villain of the week",
      title: r.villain.player.name,
      lines: [`${r.villain.sel} · lost at ${r.villain.odds.toFixed(2)}`],
      quip: quip(r.villain.solo ? "villainSolo" : "villain", n),
      player: r.villain.player,
      sound: "whistle",
    });
  }
  if (r.losers.length > 1) {
    cards.push({
      scene: "lineup",
      bg: "#3a3a36",
      kicker: "The line-up",
      title: `${r.losers.length} let us down`,
      lines: [r.losers.map((p) => p.name).join(" · ")],
      quip: quip("lineup", n),
      players: r.losers,
      sound: "thud",
    });
  }
  if (r.star) {
    cards.push({
      scene: "star",
      bg: "#8a6410",
      kicker: "Bet of the week",
      title: r.star.player.name,
      lines: [`${r.star.votes} vote${r.star.votes === 1 ? "" : "s"} from the group`],
      quip: quip("star", n),
      player: r.star.player,
      sound: "pop",
    });
  }
  if (r.poo) {
    cards.push({
      scene: "poo",
      bg: "#5c3a1e",
      kicker: "Stinker of the week",
      title: r.poo.player.name,
      lines: [`${r.poo.votes} vote${r.poo.votes === 1 ? "" : "s"} · it wasn't close`],
      quip: quip("poo", n),
      player: r.poo.player,
      sound: "trombone",
    });
  }
  if (r.fines.length) {
    cards.push({
      scene: "fines",
      bg: "#7a1f30",
      kicker: "The aftermath · the sin bin",
      title: "in fines",
      count: r.fines.reduce((a, f) => a + f.amount, 0),
      lines: r.fines.map((f) => `${f.player.name} · ${fmtMoney(f.amount)}`),
      quip: quip("fines", n),
      players: r.fines.map((f) => f.player),
      sound: "whistle",
    });
  }
  if (r.topups.length) {
    cards.push({
      scene: "topups",
      bg: "#8a3a1c",
      kicker: "On a losing streak",
      title: "Top-ups due",
      lines: r.topups.map((t) => `${t.player.name} adds ${fmtMoney(t.amount)} to the next bet`),
      quip: quip("topups", n),
      players: r.topups.map((t) => t.player),
      sound: "thud",
    });
  }
  if (r.sideBets.length) {
    cards.push({
      scene: "bets",
      bg: "#22406b",
      kicker: "Side bets",
      title: "Money changed hands",
      lines: r.sideBets.map((b) => `${b.winner.name} took ${fmtMoney(b.amount)} off ${b.loser.name}`),
      quip: quip("bets", n),
      players: [r.sideBets[0].loser, r.sideBets[0].winner],
      sound: "cash",
    });
  }
  const moved = computeAwards(bd).filter((a) => a.takenFrom);
  if (moved.length) {
    cards.push({
      scene: "trophies",
      bg: "#1f5f3a",
      kicker: "Trophies on the move",
      title: `${moved.length} changed hands`,
      lines: moved.slice(0, 4).map((a) => `${a.title}: ${a.winner.name}, from ${a.takenFrom!.name}`),
      quip: quip("trophies", n),
      players: [moved[0].takenFrom!, moved[0].winner],
      sound: "pop",
    });
  }
  const pct = Math.max(0, Math.min(100, (bd.trip.current / bd.trip.target) * 100));
  cards.push({
    scene: "pot",
    bg: "#14121f",
    kicker: "Meanwhile · the road to Nashville",
    title: "",
    count: bd.trip.current,
    lines: [`${pct.toFixed(0)}% of ${fmtMoney(bd.trip.target)} · picks in by Friday 6pm`],
    quip: quip("pot", n),
    pct,
    sound: "cash",
  });
  // Epilogue — next week's cliffhanger.
  const nextWeek = bd.weeks.find((x) => x.week === n + 1) ?? bd.currentWeek;
  const nextPlacer = bd.players.find((p) => p.id === nextWeek?.placerId);
  const streaks = lossStreaks(bd.weeks, n + 1);
  const worst = [...bd.players].sort((a, b) => (streaks[b.id] ?? 0) - (streaks[a.id] ?? 0))[0];
  const worstRun = worst ? streaks[worst.id] ?? 0 : 0;
  const nextLines = [nextPlacer ? `${nextPlacer.name} places the bet for week ${n + 1}` : `week ${n + 1} is up next`];
  if (worst && worstRun >= 2) {
    const after = streakPenalty(worstRun + 1, bd.settings);
    nextLines.push(
      `${worst.name} has lost ${worstRun} in a row${after.banned ? " — one more and it's a ban" : ""}`,
    );
  } else if (worst && worstRun === 1) {
    nextLines.push(`${worst.name} is looking to bounce back`);
  }
  cards.push({
    scene: "next",
    bg: "#14121f",
    kicker: "Next time on Ca$hville",
    title: "To be continued…",
    lines: nextLines,
    quip: quip("next", n),
    player: nextPlacer,
    sound: "pop",
  });

  // Running order: build-up, twist, culprit, damage, then the silver lining
  // and the fallout.
  const ORDER: Scene[] = [
    "intro", "dream", "legs", "twist", "villain", "lineup", "died", "landed",
    "hero", "star", "poo", "fines", "topups", "bets", "trophies", "pot", "next",
  ];
  return cards.sort((a, b) => ORDER.indexOf(a.scene) - ORDER.indexOf(b.scene));
}

// Counts a euro figure up from zero over about a second.
function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setV(to);
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 1300);
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{fmtMoney(v)}</>;
}

// Scatter of emoji that fall, float or fly, depending on the class.
function Bits({ emoji, count, cls, size = 30 }: { emoji: string[]; count: number; cls: string; size?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cls}
          style={{
            left: `${(i * 41 + 9) % 94}%`,
            fontSize: size + (i % 3) * 8,
            animationDelay: `${(i % 9) * 140}ms`,
            animationDuration: `${1900 + ((i * 67) % 1300)}ms`,
          }}
        >
          {emoji[i % emoji.length]}
        </span>
      ))}
    </>
  );
}

// The picture at the top of each card.
function SceneArt({ card }: { card: WrapCard }) {
  const p = card.player;
  switch (card.scene) {
    case "intro":
      return (
        <div className="cv-w-clap" aria-hidden style={{ fontSize: 96, lineHeight: 1 }}>
          🎬
        </div>
      );
    case "dream":
      return (
        <div className="relative flex items-center justify-center" style={{ width: 220, height: 150 }}>
          <Bits emoji={["💭", "💶", "🤠", "🎸"]} count={9} cls="cv-w-float" size={22} />
          <div className="cv-w-bounce" aria-hidden style={{ fontSize: 92, lineHeight: 1 }}>
            🤞
          </div>
        </div>
      );
    case "legs":
      return (
        <div className="w-full" style={{ maxWidth: 330 }}>
          {(card.legs ?? []).map((l, k) => {
            const lost = l.result === "Lost";
            return (
              <div
                key={l.player.id}
                className={"cv-w-leg flex items-center gap-2.5 text-left" + (lost ? " cv-w-leg-lost" : "")}
                style={{
                  animationDelay: `${600 + k * 650}ms`,
                  padding: "6px 10px",
                  marginTop: 5,
                  borderRadius: 8,
                  background: lost ? "rgba(217,44,63,0.3)" : "rgba(255,250,240,0.1)",
                  border: `1.5px solid ${lost ? "#ff6b7d" : "rgba(255,250,240,0.25)"}`,
                }}
              >
                <div style={{ filter: lost ? "grayscale(1)" : "none" }}>
                  <Avatar player={l.player} size={30} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display" style={{ fontSize: 15, lineHeight: 1.1 }}>
                    {l.player.name}
                  </div>
                  <div className="font-body truncate" style={{ fontSize: 12, opacity: 0.85 }}>
                    {l.sel}
                    {l.odds ? ` @ ${l.odds.toFixed(2)}` : ""}
                  </div>
                </div>
                <span aria-hidden style={{ fontSize: 22 }}>
                  {l.result === "Won" ? "✅" : lost ? "❌" : "➖"}
                </span>
              </div>
            );
          })}
        </div>
      );
    case "twist":
      return (
        <div className="cv-w-zoom" aria-hidden style={{ fontSize: 110, lineHeight: 1 }}>
          😱
        </div>
      );
    case "next":
      return p ? (
        <div className="relative cv-w-bounce">
          <Avatar player={p} size={110} />
          <span aria-hidden className="absolute" style={{ fontSize: 46, right: -22, bottom: -10 }}>
            🎟️
          </span>
        </div>
      ) : (
        <div className="cv-w-bounce" aria-hidden style={{ fontSize: 92, lineHeight: 1 }}>
          🎟️
        </div>
      );
    case "landed":
      return (
        <>
          <Bits emoji={["💶", "🎉", "💰", "🍾"]} count={26} cls="cv-note" />
          <div className="cv-w-bounce" aria-hidden style={{ fontSize: 96, lineHeight: 1 }}>
            🏆
          </div>
        </>
      );
    case "died":
      return (
        <>
          <Bits emoji={["💧"]} count={22} cls="cv-w-rain" size={16} />
          <div className="relative" aria-hidden>
            <div className="cv-w-cloud" style={{ fontSize: 64, lineHeight: 1 }}>
              🌧️
            </div>
            <div className="cv-w-tomb" style={{ fontSize: 96, lineHeight: 1 }}>
              🪦
            </div>
          </div>
        </>
      );
    case "hero":
      return p ? (
        <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
          <div aria-hidden className="cv-w-rays absolute inset-0" />
          <Bits emoji={["✨", "⭐"]} count={10} cls="cv-w-twinkle" size={18} />
          <div className="cv-w-bounce relative">
            <span aria-hidden className="cv-w-crown absolute" style={{ fontSize: 54, top: -44, left: "50%" }}>
              👑
            </span>
            <Avatar player={p} size={132} />
          </div>
        </div>
      ) : null;
    case "villain":
      return p ? (
        <div className="cv-w-poster relative text-center" style={{ background: "#e4d3a8", padding: "10px 18px 14px", border: "3px solid #3a2a12" }}>
          <div className="font-stamp" style={{ fontSize: 34, letterSpacing: "0.2em", color: "#3a2a12", lineHeight: 1 }}>
            WANTED
          </div>
          <div style={{ filter: "grayscale(1) contrast(1.1)", marginTop: 8 }}>
            <Avatar player={p} size={124} />
          </div>
          <div className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.2em", color: "#3a2a12", marginTop: 8, fontWeight: 600 }}>
            for crimes against the slip
          </div>
          {[0, 1, 2].map((k) => (
            <span key={k} aria-hidden className={`cv-w-tomato cv-w-tomato-${k}`} style={{ fontSize: 44 }}>
              🍅
            </span>
          ))}
        </div>
      ) : null;
    case "lineup":
      return (
        <div className="cv-w-lineup flex items-end justify-center gap-2 px-4 pt-6 pb-2">
          {(card.players ?? []).slice(0, 5).map((pl, k) => (
            <div key={pl.id} className="cv-w-suspect" style={{ animationDelay: `${k * 220}ms`, filter: "grayscale(1)" }}>
              <Avatar player={pl} size={62} />
            </div>
          ))}
        </div>
      );
    case "star":
      return p ? (
        <div className="relative flex items-center justify-center" style={{ width: 200, height: 190 }}>
          <Bits emoji={["⭐", "🌟"]} count={12} cls="cv-w-orbit" size={22} />
          <div className="cv-w-bounce">
            <Avatar player={p} size={132} />
          </div>
        </div>
      ) : null;
    case "poo":
      return p ? (
        <div className="relative flex items-center justify-center" style={{ width: 200, height: 190 }}>
          <Bits emoji={["🪰"]} count={6} cls="cv-w-fly" size={20} />
          <div className="cv-w-wobble relative">
            <Avatar player={p} size={132} />
            <span aria-hidden className="cv-w-plop absolute" style={{ fontSize: 60, top: -34, left: "50%" }}>
              💩
            </span>
          </div>
        </div>
      ) : null;
    case "fines":
      return (
        <div className="relative flex items-center justify-center" style={{ height: 150, width: 240 }}>
          {[0, 1, 2, 3, 4].map((k) => (
            <span
              key={k}
              aria-hidden
              className="cv-w-deal absolute"
              style={{
                width: 62,
                height: 88,
                background: "#d92c3f",
                border: "3px solid #1c1a16",
                borderRadius: 7,
                animationDelay: `${k * 160}ms`,
                ["--cv-rot" as string]: `${(k - 2) * 13}deg`,
                ["--cv-x" as string]: `${(k - 2) * 34}px`,
              }}
            />
          ))}
        </div>
      );
    case "topups":
      return (
        <div className="flex items-end justify-center gap-3" style={{ height: 150 }}>
          {(card.players ?? []).slice(0, 3).map((pl) => (
            <div key={pl.id} className="relative cv-w-wobble">
              <Avatar player={pl} size={84} />
              <span aria-hidden className="cv-streak-hot absolute" style={{ fontSize: 52, top: -40, left: "50%", marginLeft: -26 }}>
                🔥
              </span>
            </div>
          ))}
        </div>
      );
    case "bets":
    case "trophies": {
      const [from, to] = card.players ?? [];
      return from && to ? (
        <div className="relative flex items-center justify-between" style={{ width: 270, height: 130 }}>
          <div style={{ filter: "grayscale(1)", opacity: 0.8 }}>
            <Avatar player={from} size={84} />
          </div>
          <span aria-hidden className="cv-w-pass absolute" style={{ fontSize: 48, left: 60, top: 36 }}>
            {card.scene === "bets" ? "💶" : "🏆"}
          </span>
          <div className="cv-w-bounce">
            <Avatar player={to} size={84} />
          </div>
        </div>
      ) : null;
    }
    case "pot":
      return (
        <div className="relative" style={{ width: 280, height: 90 }}>
          <div className="absolute left-0 right-0" style={{ top: 52, height: 3, background: "repeating-linear-gradient(90deg, #fffaf0 0 10px, transparent 10px 18px)", opacity: 0.6 }} />
          <span aria-hidden className="cv-w-plane absolute" style={{ fontSize: 50, top: 18, ["--cv-to" as string]: `${Math.max(6, card.pct ?? 0) * 2.3}px` }}>
            ✈️
          </span>
          <span className="absolute font-mono" style={{ left: 0, bottom: 0, fontSize: 10, letterSpacing: "0.2em", opacity: 0.8 }}>
            DUB
          </span>
          <span className="absolute font-mono" style={{ right: 0, bottom: 0, fontSize: 10, letterSpacing: "0.2em", opacity: 0.8 }}>
            🤠 BNA
          </span>
        </div>
      );
  }
}

export function WeeklyWrap({ bd, onClose }: { bd: BD; onClose: () => void }) {
  const cards = useMemo(() => buildCards(bd), [bd]);
  const [i, setI] = useState(0);

  useEffect(() => {
    const card = cards[i];
    if (card?.sound) playSound(card.sound);
    const t = setTimeout(() => (i < cards.length - 1 ? setI(i + 1) : onClose()), card?.ms ?? CARD_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, cards.length]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const card = cards[i];
  if (!card) return null;
  // Every card is a dark panel, so text is always light.
  const ink = "#fffaf0";

  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-hidden" style={{ background: card.bg, color: ink, transition: "background 350ms ease" }}>
      <div className="flex gap-1 px-3" style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}>
        {cards.map((_, n) => (
          <div key={n} className="flex-1 overflow-hidden" style={{ height: 3, background: "rgba(255,250,240,0.3)", borderRadius: 2 }}>
            {n < i ? (
              <div style={{ height: "100%", background: ink }} />
            ) : n === i ? (
              <div key={i} className="cv-wrap-bar" style={{ height: "100%", background: ink, animationDuration: `${card.ms ?? CARD_MS}ms` }} />
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex justify-end px-3 pt-2">
        <button
          onClick={onClose}
          aria-label="Close the wrap"
          className="font-stamp"
          style={{ fontSize: 22, color: ink, width: 44, height: 44, position: "relative", zIndex: 3 }}
        >
          ✕
        </button>
      </div>

      <div key={i} className="flex-1 flex flex-col items-center justify-center text-center px-7 gap-3 relative">
        <SceneArt card={card} />
        <div className="cv-w-in font-mono uppercase" style={{ fontSize: 12, letterSpacing: "0.3em", opacity: 0.85, fontWeight: 600, animationDelay: "250ms" }}>
          {card.kicker}
        </div>
        <div className="cv-w-slam font-display" style={{ fontSize: 54, lineHeight: 0.98, color: ink, animationDelay: "450ms" }}>
          {card.count != null ? (
            <>
              <CountUp to={card.count} /> {card.title}
            </>
          ) : (
            card.title
          )}
        </div>
        {card.lines?.map((l, n) => (
          <div key={n} className="cv-w-in font-body" style={{ fontSize: 18, lineHeight: 1.3, opacity: 0.95, animationDelay: `${800 + n * 180}ms` }}>
            {l}
          </div>
        ))}
        {card.quip && (
          <div
            className="cv-w-in font-scribble"
            style={{ fontSize: 26, lineHeight: 1.15, marginTop: 6, transform: "rotate(-2deg)", color: "#ffd98a", animationDelay: "1500ms" }}
          >
            “{card.quip}”
          </div>
        )}
      </div>

      <div className="font-mono uppercase text-center pb-6" style={{ fontSize: 10, letterSpacing: "0.2em", opacity: 0.7 }}>
        {i + 1} / {cards.length} · tap to skip
      </div>

      {/* Tap zones: left third goes back, the rest goes on. */}
      <button aria-label="Previous" className="absolute left-0 bottom-0" style={{ top: 70, width: "33%", zIndex: 2 }} onClick={() => setI(Math.max(0, i - 1))} />
      <button
        aria-label="Next"
        className="absolute right-0 bottom-0"
        style={{ top: 70, width: "67%", zIndex: 2 }}
        onClick={() => (i < cards.length - 1 ? setI(i + 1) : onClose())}
      />
    </div>
  );
}
