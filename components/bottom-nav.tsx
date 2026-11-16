"use client";

// Fixed bottom tab nav — always visible.

import Link from "next/link";
import { usePathname } from "next/navigation";

// Four tabs. Fines lives under Pot, and Records + History under Stats —
// `match` lists every route that keeps a tab lit (see SubTabs).
const TABS = [
  { href: "/home", label: "Home", icon: HomeIcon, match: ["/home"] },
  { href: "/slip", label: "Slip", icon: SlipIcon, match: ["/slip"] },
  { href: "/pot", label: "Pot", icon: PotIcon, match: ["/pot", "/fines"] },
  { href: "/stats", label: "Stats", icon: StatsIcon, match: ["/stats", "/records", "/history"] },
] as const;

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="cv-nav fixed left-0 right-0 bottom-0 z-40 border-t border-rule-strong bg-paper pb-safe"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 6px)" }}
    >
      <div className="grid grid-cols-4 max-w-md mx-auto">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match.some((m) => path === m || path.startsWith(m + "/"));
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center py-2 gap-0.5"
              style={{
                color: active ? "var(--c-burgundy)" : "var(--c-dim)",
                minHeight: 56,
              }}
            >
              <Icon active={active} />
              <span
                className="font-stamp uppercase"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  marginTop: 2,
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Tiny inline icons — kept stroke-based so they inherit the nav color.
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path d="M4 11l8-7 8 7v9h-5v-6H9v6H4v-9z" strokeLinejoin="round" />
    </svg>
  );
}

function SlipIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path d="M6 3h12l-1.5 18-4.5-2-4.5 2L6 3z" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" />
    </svg>
  );
}

function PotIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path d="M5 9h14l-1 11H6L5 9z" strokeLinejoin="round" />
      <path d="M8 9V6a4 4 0 014-4 4 4 0 014 4v3" strokeLinecap="round" />
      <path d="M12 13v3" strokeLinecap="round" />
    </svg>
  );
}

function StatsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" strokeLinecap="round" />
    </svg>
  );
}
