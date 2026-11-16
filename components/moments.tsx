"use client";

// Little celebrations (and commiserations). Any screen calls fireMoment();
// the <Moments /> overlay mounted in the app shell plays it for a couple of
// seconds. Only the phone that made the change sees it. With "reduce
// motion" switched on the banner still shows, without the movement.

import { useEffect, useState } from "react";

export type MomentKind = "landed" | "killed" | "fined";

const EVENT = "cashville:moment";

export function fireMoment(kind: MomentKind) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: kind }));
  }
}

const COPY: Record<MomentKind, { title: string; sub: string; color: string }> = {
  landed: { title: "It landed!", sub: "all seven · get the round in", color: "var(--c-forest)" },
  killed: { title: "Slip's dead", sub: "one leg down · thanks for that", color: "var(--c-burgundy)" },
  fined: { title: "Fined", sub: "the sin bin grows", color: "var(--c-burgundy)" },
};

const CONFETTI = ["var(--c-mustard)", "var(--c-burgundy)", "var(--c-forest)", "var(--c-denim)", "var(--c-brick)"];

export function Moments() {
  const [moment, setMoment] = useState<{ kind: MomentKind; id: number } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      const kind = (e as CustomEvent<MomentKind>).detail;
      setMoment({ kind, id: Date.now() });
      if (kind === "killed") {
        document.body.classList.add("cv-shake");
        setTimeout(() => document.body.classList.remove("cv-shake"), 600);
      }
      clearTimeout(timer);
      timer = setTimeout(() => setMoment(null), 2600);
    };
    window.addEventListener(EVENT, on);
    return () => {
      window.removeEventListener(EVENT, on);
      clearTimeout(timer);
    };
  }, []);

  if (!moment) return null;
  const c = COPY[moment.kind];

  return (
    <div
      key={moment.id}
      aria-live="polite"
      className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none overflow-hidden"
    >
      {moment.kind === "landed" &&
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
      {moment.kind === "fined" && (
        <span
          aria-hidden
          className="cv-redcard absolute"
          style={{ width: 96, height: 136, background: "var(--c-burgundy)", borderRadius: 8, border: "3px solid var(--c-ink)" }}
        />
      )}
      <div
        className="cv-moment-banner relative text-center px-6 py-4"
        style={{ background: "var(--c-paper)", border: `3px solid ${c.color}`, borderRadius: 4, boxShadow: "4px 6px 0 rgba(0,0,0,0.25)" }}
      >
        <div className="font-display" style={{ fontSize: 44, lineHeight: 1, color: c.color }}>
          {c.title}
        </div>
        <div className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.18em", color: "var(--c-dim)", marginTop: 6 }}>
          {c.sub}
        </div>
      </div>
    </div>
  );
}
