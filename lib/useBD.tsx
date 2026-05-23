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
import { fetchAll, buildView } from "./bd";
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
        setBd(buildView(raw));
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

    return () => {
      mounted = false;
      sb().removeChannel(channel);
    };
  }, [reload]);

  return <BDContext.Provider value={{ bd, loading, reload }}>{children}</BDContext.Provider>;
}

export function useBD(): Ctx {
  return useContext(BDContext);
}
