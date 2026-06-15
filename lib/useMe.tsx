"use client";

// "Who am I?" — the player-picker stand-in for v1 auth.
// Persists to localStorage so the player doesn't re-pick every visit.
// v1.1 swaps this out for Supabase magic-link auth (the email allowlist + RLS
// in supabase/migration.sql is already written for it).

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Player } from "./types";

const STORAGE_KEY = "cashville_me";
const ADMIN_IDS = new Set(["sam", "conor"]);

type MeCtx = {
  meId: string | null;
  me: Player | null;
  setMeId: (id: string | null) => void;
  isAdmin: boolean;
};

const Ctx = createContext<MeCtx>({
  meId: null,
  me: null,
  setMeId: () => {},
  isAdmin: false,
});

export function MeProvider({ players, children }: { players: Player[]; children: ReactNode }) {
  const [meId, setMeIdState] = useState<string | null>(null);

  // Restore on mount. Done in effect (not initial state) so SSR + first paint
  // match — the picker modal handles the null case.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setMeIdState(stored);
    } catch {}
  }, []);

  const setMeId = (id: string | null) => {
    setMeIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const me = meId ? players.find((p) => p.id === meId) ?? null : null;
  const isAdmin = me ? ADMIN_IDS.has(me.id) || !!me.is_admin : false;

  return <Ctx.Provider value={{ meId, me, setMeId, isAdmin }}>{children}</Ctx.Provider>;
}

export function useMe() {
  return useContext(Ctx);
}
