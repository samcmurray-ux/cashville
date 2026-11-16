"use client";

// App shell: BD + Me providers wrap the children, then a thin inner client
// component reads from them to render the header + nav.

import { BDProvider, useBD } from "@/lib/useBD";
import { MeProvider } from "@/lib/useMe";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { LoadingScreen } from "@/components/loading-screen";
import { SubTabs } from "@/components/sub-tabs";
import { Moments } from "@/components/moments";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { StreakContext } from "@/components/primitives";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BDProvider>
      <Shell>{children}</Shell>
    </BDProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { bd, loading } = useBD();
  const path = usePathname();
  // Who's hot and who's cold right now, for the 🔥 / 🧊 on avatars.
  const streaks = useMemo(() => {
    const out: Record<string, number> = {};
    if (!bd) return out;
    const weeks = [...bd.weeks].sort((a, b) => b.week - a.week);
    for (const p of bd.players) {
      let n = 0;
      for (const w of weeks) {
        const r = w.picks.find((x) => x.playerId === p.id)?.result;
        if (r !== "Won" && r !== "Lost") continue;
        const step = r === "Won" ? 1 : -1;
        if (n !== 0 && Math.sign(n) !== step) break;
        n += step;
      }
      out[p.id] = n;
    }
    return out;
  }, [bd]);
  const group =
    path === "/pot" || path === "/fines"
      ? "pot"
      : path === "/stats" || path === "/records" || path === "/history"
        ? "stats"
        : null;
  if (loading || !bd) return <LoadingScreen />;
  return (
    <StreakContext.Provider value={streaks}>
    <MeProvider players={bd.players}>
      <div
        className="max-w-md mx-auto min-h-screen flex flex-col"
        style={{ background: "var(--c-bg)" }}
      >
        <AppHeader
          players={bd.players}
          currentWeekNum={bd.currentWeekNum}
          playedCount={bd.playedCount}
          compact={path !== "/home"}
        />
        {group && <SubTabs group={group} />}
        <main className="flex-1 pb-24">{children}</main>
        <Moments />
        <BottomNav />
      </div>
    </MeProvider>
    </StreakContext.Provider>
  );
}
