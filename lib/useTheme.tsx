"use client";

// Theme system — three switchable themes from the prototype. Selection is
// persisted in localStorage and applied as a data-theme attribute on <html>
// (CSS in globals.css picks it up). Falls back to prefers-color-scheme on
// first visit so dark-mode users land on Stadium Night, not Almanac.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type ThemeId = "almanac" | "stadium" | "tabloid";

export const THEMES: { id: ThemeId; label: string; blurb: string; swatch: string[] }[] = [
  {
    id: "almanac",
    label: "Travel Almanac",
    blurb: "cream paper, stamps, postmarks",
    swatch: ["#efe6d4", "#8c2334", "#c89216", "#2d5d3a"],
  },
  {
    id: "stadium",
    label: "Stadium Night",
    blurb: "green felt + brass, an old card room",
    swatch: ["#162017", "#d6493d", "#f0c34c", "#7fcb87"],
  },
  {
    id: "tabloid",
    label: "Tabloid Tuesday",
    blurb: "newsprint cream + screaming red",
    swatch: ["#fdfbf2", "#c81020", "#0a0a0a", "#d49a00"],
  },
];

const STORAGE_KEY = "cashville_theme";

type Ctx = {
  themeId: ThemeId | null;
  setThemeId: (id: ThemeId) => void;
};

const ThemeCtx = createContext<Ctx>({
  themeId: null,
  setThemeId: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId | null>(null);

  // Restore on mount. Done in effect (not initial state) so SSR + first
  // paint stay in sync — the data-theme attribute will be set on the next
  // tick. The CSS dark-mode fallback handles the gap on dark phones.
  useEffect(() => {
    let stored: ThemeId | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "almanac" || raw === "stadium" || raw === "tabloid") {
        stored = raw;
      }
    } catch {}
    if (stored) {
      setThemeIdState(stored);
      document.documentElement.setAttribute("data-theme", stored);
    }
  }, []);

  const setThemeId = (id: ThemeId) => {
    setThemeIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
    document.documentElement.setAttribute("data-theme", id);
  };

  return (
    <ThemeCtx.Provider value={{ themeId, setThemeId }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
