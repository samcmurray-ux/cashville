import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // All colors resolve to CSS vars set in globals.css so the theme can
      // swap at runtime (Travel Almanac / Stadium Night / Tabloid Tuesday).
      colors: {
        bg: "var(--c-bg)",
        bg2: "var(--c-bg2)",
        paper: "var(--c-paper)",
        ink: "var(--c-ink)",
        "ink-soft": "var(--c-ink-soft)",
        dim: "var(--c-dim)",
        faint: "var(--c-faint)",
        rule: "var(--c-rule)",
        "rule-strong": "var(--c-rule-strong)",
        burgundy: "var(--c-burgundy)",
        denim: "var(--c-denim)",
        mustard: "var(--c-mustard)",
        forest: "var(--c-forest)",
        brick: "var(--c-brick)",
        navy: "var(--c-navy)",
        push: "var(--c-push)",
      },
      fontFamily: {
        // Set in globals.css via next/font CSS vars.
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "serif"],
        mono: ["var(--font-mono)", "monospace"],
        stamp: ["var(--font-stamp)", "sans-serif"],
        scribble: ["var(--font-scribble)", "cursive"],
        slab: ["var(--font-slab)", "serif"],
      },
      boxShadow: {
        card: "2px 3px 0 rgba(28,26,22,0.16)",
      },
      borderRadius: {
        sheet: "20px",
      },
    },
  },
  plugins: [],
};

export default config;
