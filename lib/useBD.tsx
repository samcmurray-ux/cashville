"use client";

// Single source of truth for the React UI. The layout wraps children in
// `BDProvider`, which fetches everything on mount, subscribes to realtime
// changes, and re-fetches when anything moves. Pages call `useBD()` to read.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { sb } from "./supabase";
import { fetchAll, buildView, sweepOverdueFines } from "./bd";
import type { BD } from "./types";

type Ctx = {
  bd: BD | null;
  loading: boolean;
  reload: () => Promise<void>;
};

const BDContext = createContext<Ctx>({
  bd: null,
  loading: true,
  reload: async () => {},
});

export function BDProvider({ children }: { children: ReactNode }) {
  const [bd, setBd] = useState<BD | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const raw = await fetchAll();
    setBd(buildView(raw));
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const raw = await fetchAll();
        if (!mounted) return;
        const view = buildView(raw);
        setBd(view);
        // Late-payment surcharges are added by whoever opens the app first.
        void sweepOverdueFines(view).catch(() => {});
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // Realtime: any change to picks/movements/weeks triggers a refetch.
    const channel = sb()
      .channel("cashville-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "picks" }, () => {
        void reload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "movements" }, () => {
        void reload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "weeks" }, () => {
        void reload();
      })
      .subscribe();

    // v2 tables get their own channel so the core slip still syncs live
    // if supabase/migration-v2.sql hasn't been run yet.
    const channelV2 = sb()
      .channel("cashville-realtime-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "fines" }, () => {
        void reload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => {
        void reload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "side_bets" }, () => {
        void reload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => {
        void reload();
      })
      .subscribe();

    return () => {
      mounted = false;
      sb().removeChannel(channel);
      sb().removeChannel(channelV2);
    };
  }, [reload]);

  return <BDContext.Provider value={{ bd, loading, reload }}>{children}</BDContext.Provider>;
}

export function useBD(): Ctx {
  return useContext(BDContext);
}
