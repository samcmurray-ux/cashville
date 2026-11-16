"use client";

// Second-level tabs for the sections that share a bottom-bar slot:
// Pot (Fund · Fines & rules) and Stats (Stats · Records · History).

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS = {
  pot: [
    { href: "/pot", label: "The fund" },
    { href: "/fines", label: "Fines & rules" },
  ],
  stats: [
    { href: "/stats", label: "Stats" },
    { href: "/records", label: "Records" },
    { href: "/history", label: "History" },
  ],
} as const;

export function SubTabs({ group }: { group: keyof typeof GROUPS }) {
  const path = usePathname();
  return (
    <nav
      className="flex mx-4 mt-4"
      style={{ border: "1.5px solid var(--c-ink)", borderRadius: 2, overflow: "hidden" }}
    >
      {GROUPS[group].map((t, i) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className="flex-1 text-center font-stamp uppercase"
            style={{
              padding: "11px 4px",
              fontSize: 13,
              letterSpacing: "0.12em",
              borderLeft: i === 0 ? "none" : "1.5px solid var(--c-ink)",
              background: active ? "var(--c-ink)" : "transparent",
              color: active ? "var(--c-paper)" : "var(--c-ink)",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
