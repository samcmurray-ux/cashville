# Ca$hville Tracker — v1

The seven lads, the weekly slip, the Nashville fund. Built per `../HANDOFF.md`.

## What's in v1

**P0 shipped:**
- Mobile-first Slip screen with the 7 rows, Add Pick bottom sheet, week navigation
- Pot screen with running total, progress bar to €10k, full movements ledger, Log Movement sheet
- Stats screen with Pecking Order leaderboard (full Awards Wall is v1.1)
- History screen with weekly cards (settled-week detail tap is v1.1)
- Bottom tab nav (Slip / Pot / Stats / History)
- Realtime sync: any pick/movement/week change pushes to every connected client via Supabase
- PWA manifest (installable from "Add to Home Screen")
- Travel Almanac theme matches the HTML prototype; Stadium Night auto-applies in dark mode

**Skipped for v1 (per chat with Sam):**
- Magic-link auth. We're using a localStorage **player picker** instead — the lad picks his name once, the app remembers him. The existing `dev-open-rls` policies on Supabase allow this. Magic link + the strict per-email RLS in `supabase/migration.sql` is a v1.1 swap.

## Stack

- Next.js 15 (App Router) + React 19 RC
- Tailwind CSS
- `@supabase/supabase-js` directly (no SSR auth wrapper needed for v1)
- All 6 Google Fonts loaded via CSS import (DM Serif Display, Lora, IBM Plex Mono, Bebas Neue, Caveat, Alfa Slab One)

## Deploy

The fastest way: push to GitHub, hit "Import" on Vercel, set the two env vars below, deploy.

```bash
# from this dir
git init
git add .
git commit -m "Ca$hville v1"
git branch -M main
gh repo create cashville --private --source=. --push
# then on vercel.com → New Project → import the repo
```

### Required env vars (set in Vercel project settings)

```
NEXT_PUBLIC_SUPABASE_URL=https://cgiceazldmnvxffxjywp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase-app.jsx, copied into .env.local.example>
```

These are the live Supabase project from the prototype — 27 weeks of data already
seeded. No migrations needed.

## Run locally

You need Node 20+ (this machine doesn't have it; install via the .pkg from
nodejs.org, or `brew install node` if you set up Homebrew first):

```bash
cp .env.local.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

## Project layout

```
cashville/
├── app/
│   ├── (app)/                    Layout that mounts BD + Me providers + nav
│   │   ├── slip/                 The most important screen
│   │   ├── pot/                  Fund + ledger + Log Movement
│   │   ├── stats/                Pecking Order (full charts v1.1)
│   │   └── history/              Week cards (week detail v1.1)
│   ├── globals.css               Theme CSS vars + font imports + animations
│   └── layout.tsx                Root metadata + PWA viewport
├── components/
│   ├── primitives.tsx            Card, Stamp, Avatar, Eyebrow, Chip, Postmark, …
│   ├── sheet.tsx                 Bottom-sheet primitive
│   ├── app-header.tsx            Postmark + headline + switch-player avatar
│   ├── bottom-nav.tsx            4-tab fixed bottom nav
│   ├── slip-row.tsx              One row of the Slip
│   ├── add-pick-sheet.tsx        The single most important interaction
│   ├── log-movement-sheet.tsx    Pot screen's + Log button
│   ├── player-picker.tsx         v1 "auth"
│   └── loading-screen.tsx        Splash
└── lib/
    ├── supabase.ts               Browser client init
    ├── bd.ts                     fetchAll + buildView + mutators (port of data.js)
    ├── types.ts                  Row + view-shape types
    ├── useBD.tsx                 BDProvider with realtime subscription + reload
    └── useMe.tsx                 Player-picker context (localStorage)
```

## Visual reference vs the prototype

Open `../Ca$hville Tracker.html` to diff. The mobile reflow of `app-1.jsx`'s
desktop grid is the main visual change — same components, same fonts, same
palette. The Tweaks-toggle theme switcher (Travel Almanac / Stadium Night /
Tabloid Tuesday) is staged for v1.1; right now Stadium Night auto-activates
via `prefers-color-scheme: dark`.

## Open follow-ups

- **PNG icons**: the manifest references only the SVG. Drop `icon-192.png` and
  `icon-512.png` into `public/icons/` and add them back to the manifest if you
  want richer iOS install UI.
- **Magic-link auth + strict RLS**: see HANDOFF.md "Auth strategy" and
  `supabase/migration.sql`. The `dev-open-rls.sql` policies must be removed
  before flipping the switch.
- **Settle Week flow**: admin UI to mark each pick W/L/Push. Currently shows
  a stub note on settled-week view.
- **Charts**: Long Climb, Heat Strip, Damage Report, Pick Mix, Hit Rates — port
  from `charts.jsx` + `app-charts.jsx` using Recharts.
- **Push notifications**: Supabase Edge Function + Web Push for the "Conor
  still hasn't picked, kickoff in 2 hours" nudge.
