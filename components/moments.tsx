"use client";

// Celebrations and commiserations. Any screen calls fireMoment(kind, data);
// the <Moments /> overlay mounted in the app shell plays it for a few
// seconds, with a sound if the player has sounds switched on. Only the phone
// that made the change sees it. With "reduce motion" on, the banner still
// shows without the movement.

import { useEffect, useState } from "react";
import type { Player } from "@/lib/types";
import { playSound, type SoundName } from "@/lib/sound";
import { Avatar } from "./primitives";

export type MomentKind =
  | "landed" // all seven won
  | "killed" // first losing leg: tombstone
  | "fined"
  | "win" // money into the pot
  | "won" // one pick came in (plays that player's clip)
  | "star"
  | "poo"
  | "handshake" // side bet accepted
  | "gavel" // side bet squared up
  | "paid"; // fine paid

export type MomentData = { player?: Player | null; week?: number; text?: string };

const EVENT = "cashville:moment";

export function fireMoment(kind: MomentKind, data: MomentData = {}) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { kind, data } }));
  }
}

const SPEC: Record<
  MomentKind,
  { title: string; sub: string; color: string; sound?: SoundName; emoji?: string; ms: number }
> = {
  landed: { title: "It landed!", sub: "all seven · get the round in", color: "var(--c-forest)", sound: "cash", ms: 3600 },
  killed: { title: "Slip's dead", sub: "one leg down · thanks for that", color: "var(--c-burgundy)", sound: "trombone", ms: 4200 },
  fined: { title: "Fined", sub: "the sin bin grows", color: "var(--c-burgundy)", sound: "whistle", ms: 2600 },
  win: { title: "Ka-ching", sub: "into the pot it goes", color: "var(--c-forest)", sound: "cash", ms: 3000 },
  won: { title: "Get in", sub: "one leg home", color: "var(--c-forest)", sound: "pop", ms: 3200 },
  star: { title: "Bet of the week", sub: "your vote is in", color: "var(--c-mustard)", sound: "pop", emoji: "⭐", ms: 2200 },
  poo: { title: "Stinker", sub: "your vote is in", color: "var(--c-brick)", sound: "pop", emoji: "💩", ms: 2200 },
  handshake: { title: "It's on", sub: "side bet accepted", color: "var(--c-denim)", sound: "pop", emoji: "🤝", ms: 2400 },
  gavel: { title: "Squared up", sub: "the pot takes its cut", color: "var(--c-forest)", sound: "thud", emoji: "🔨", ms: 2400 },
  paid: { title: "Paid", sub: "into the pot", color: "var(--c-forest)", sound: "thud", ms: 2200 },
};

const CONFETTI = ["var(--c-mustard)", "var(--c-burgundy)", "var(--c-forest)", "var(--c-denim)", "var(--c-brick)"];

export function Moments() {
  const [moment, setMoment] = useState<{ kind: MomentKind; data: MomentData; id: number } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      const { kind, data } = (e as CustomEvent<{ kind: MomentKind; data: MomentData }>).detail;
      // A single winning leg only gets a moment if that player has a clip.
      if (kind === "won" && !data.player?.clip) return;
      setMoment({ kind, data, id: Date.now() });
      const spec = SPEC[kind];
      if (spec.sound) playSound(spec.sound);
      if (kind === "killed") {
        document.body.classList.add("cv-shake");
        setTimeout(() => document.body.classList.remove("cv-shake"), 600);
      }
      clearTimeout(timer);
      timer = setTimeout(() => setMoment(null), spec.ms);
    };
    window.addEventListener(EVENT, on);
    return () => {
      window.removeEventListener(EVENT, on);
      clearTimeout(timer);
    };
  }, []);

  if (!moment) return null;
  const { kind, data } = moment;
  const c = SPEC[kind];
  const player = data.player ?? null;
  const clip = (kind === "won" || kind === "killed" || kind === "landed") && player?.clip ? player.clip : null;
  const rain = kind === "landed" || kind === "win";

  return (
    <div
      key={moment.id}
      aria-live="polite"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 pointer-events-none overflow-hidden"
      style={{ ["--cv-ms" as string]: `${c.ms}ms` }}
    >
      {kind === "landed" &&
        Array.from({ length: 48 }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className="cv-confetti"
            style={{
              left: `${(i * 37) % 100}%`,
              background: CONFETTI[i % CONFETTI.length],
              animationDelay: `${(i % 12) * 60}ms`,
              animationDuration: `${1500 + ((i * 53) % 900)}ms`,
              width: 6 + (i % 3) * 3,
              height: 10 + (i % 4) * 3,
            }}
          />
        ))}
      {rain &&
        Array.from({ length: 22 }, (_, i) => (
          <span
            key={`n${i}`}
            aria-hidden
            className="cv-note"
            style={{
              left: `${(i * 43 + 7) % 96}%`,
              animationDelay: `${(i % 11) * 110}ms`,
              animationDuration: `${1900 + ((i * 71) % 1100)}ms`,
              fontSize: 26 + (i % 3) * 8,
            }}
          >
            💶
          </span>
        ))}
      {kind === "fined" && (
        <span
          aria-hidden
          className="cv-redcard absolute"
          style={{ width: 96, height: 136, background: "var(--c-burgundy)", borderRadius: 8, border: "3px solid var(--c-ink)" }}
        />
      )}

      {/* A player's own celebration clip, when they've uploaded one. */}
      {clip &&
        (/\.gif(\?|$)/i.test(clip) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clip} alt="" className="cv-clip" />
        ) : (
          <video src={clip} className="cv-clip" autoPlay muted loop playsInline />
        ))}

      {kind === "killed" ? (
        <div className="cv-tomb relative text-center">
          <div
            style={{
              width: 210,
              padding: "26px 16px 20px",
              background: "#8f8f8a",
              border: "3px solid #2b2b28",
              borderRadius: "105px 105px 6px 6px",
              color: "#1c1a16",
              boxShadow: "inset -10px 0 0 rgba(0,0,0,0.12)",
            }}
          >
            <div className="font-display" style={{ fontSize: 40, lineHeight: 1 }}>
              R.I.P.
            </div>
            <div className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.16em", marginTop: 8, fontWeight: 600 }}>
              Week {data.week ?? ""} slip
            </div>
            {player && (
              <div className="flex justify-center mt-3 cv-tomb-avatar">
                <Avatar player={player} size={56} />
              </div>
            )}
            <div className="font-display" style={{ fontSize: 20, lineHeight: 1.15, marginTop: 8 }}>
              Killed by {player?.name ?? "one of ye"}
            </div>
            {data.text && (
              <div className="font-body italic" style={{ fontSize: 12, marginTop: 4 }}>
                {data.text}
              </div>
            )}
          </div>
          <div style={{ height: 14, margin: "0 -22px", background: "#3f5a36", borderRadius: "50%" }} />
        </div>
      ) : kind === "paid" ? (
        <div
          className="cv-stamp font-stamp uppercase"
          style={{
            fontSize: 64,
            letterSpacing: "0.12em",
            color: c.color,
            border: `6px solid ${c.color}`,
            padding: "6px 22px",
            borderRadius: 8,
            background: "var(--c-paper)",
          }}
        >
          Paid
        </div>
      ) : (
        <>
          {c.emoji && (
            <span aria-hidden className={kind === "handshake" ? "cv-clap" : "cv-splat"} style={{ fontSize: 120, lineHeight: 1 }}>
              {c.emoji}
            </span>
          )}
          <div
            className="cv-moment-banner relative text-center px-6 py-4"
            style={{ background: "var(--c-paper)", border: `3px solid ${c.color}`, borderRadius: 4, boxShadow: "4px 6px 0 rgba(0,0,0,0.25)" }}
          >
            <div className="font-display" style={{ fontSize: 44, lineHeight: 1, color: c.color }}>
              {kind === "won" && player ? `${player.name} lands it` : c.title}
            </div>
            <div className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.18em", color: "var(--c-dim)", marginTop: 6 }}>
              {data.text ?? c.sub}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
