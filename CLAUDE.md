# Atlas — Personal Performance Intelligence

## What This Is
A Garmin fitness data visualization platform. Zero backend — all data stays in the browser (IndexedDB). Built with React + Vite + TypeScript + Tailwind + shadcn/ui + D3.js.

## Quick Start
```bash
cd /Users/derekbiebel/atlas
npm run dev        # starts on http://localhost:5173
npm run build      # production build to dist/
```

## Architecture

### Data Flow
1. User drops a Garmin export `.zip` (or `.fit`/`.csv` files)
2. `importHandler.ts` extracts nested zips, finds FIT files + wellness JSON
3. FIT files → `fitParser.ts` → `AtlasActivity` records → IndexedDB (`activities` table)
4. Garmin JSON files → `wellnessParser.ts` → `WellnessDay` records → IndexedDB (`wellness` table)
   - UDS files: resting HR, steps, body battery, stress
   - Sleep files: sleep duration, deep/light/REM/awake
   - MetricsMaxMet files: VO2 Max
   - TrainingReadiness files: HRV, sleep scores
5. CSV files → `csvParser.ts` → synthetic activities (IDs prefixed `csv-`)

### Key Files
```
src/
├── views/                    # Page-level components
│   ├── Dashboard.tsx         # Main dashboard with stat cards, YTD chart, heatmap
│   ├── Performance.tsx       # CTL/ATL/TSB, HR zones, PRs, scatter plot
│   ├── Recovery.tsx          # Sleep, HRV, body battery, resting HR cards
│   ├── Explorer.tsx          # Sortable activity table + detail sheet
│   ├── Settings.tsx          # Units, appearance, data management
│   └── Insights.tsx          # Claude API fitness analysis
├── components/
│   ├── charts/               # D3 chart components
│   │   ├── WeeklyDistanceChart.tsx  # Multi-year cumulative YTD with sport/year filters
│   │   ├── YearHeatmap.tsx          # GitHub-style heatmap (load/sleep/HRV)
│   │   ├── Sparkline.tsx            # Smoothed mini trend lines (7-pt moving avg)
│   │   ├── FitnessChart.tsx         # CTL/ATL/TSB line chart
│   │   ├── HRZoneChart.tsx          # Horizontal stacked bars
│   │   ├── PRTimeline.tsx           # Personal records grid
│   │   └── StressRecoveryScatter.tsx # Load vs HR scatter with quadrants
│   ├── layout/
│   │   ├── Sidebar.tsx       # Dark sidebar nav (desktop + mobile)
│   │   ├── TopBar.tsx        # Sticky header with date range + sport filter
│   │   ├── DropZone.tsx      # File import UI with progress
│   │   ├── WelcomeScreen.tsx # First-launch unit picker (animated)
│   │   └── PageTransition.tsx # Framer Motion wrapper
│   ├── ui/                   # shadcn/ui components (lowercase filenames)
│   │   ├── StatCard.tsx      # Dashboard stat card with sparkline + YoY %
│   │   └── ChartExportButton.tsx
│   └── explorer/
│       └── ActivityDetail.tsx # Slide-out activity detail sheet
├── store/
│   ├── useAtlasStore.ts      # Zustand: date range, sport filter, import state
│   └── usePreferences.ts     # Zustand (persisted): units, theme, card/chart config
├── db/
│   ├── schema.ts             # Dexie DB: AtlasActivity + WellnessDay types
│   └── queries.ts            # Date-range queries, sport listing
├── lib/
│   ├── units.ts              # Imperial/metric conversion (all in one place)
│   ├── metrics.ts            # TSS, CTL, ATL, HR zones, PRs, sparkline data
│   ├── fitParser.ts          # FIT file → AtlasActivity
│   ├── csvParser.ts          # Garmin summary CSV → synthetic activities
│   ├── wellnessParser.ts     # Garmin JSON → WellnessDay (UDS, sleep, VO2, HRV)
│   ├── importHandler.ts      # Orchestrates extraction + parsing + DB writes
│   └── exportChart.ts        # SVG/PNG chart export
├── hooks/
│   ├── useTheme.ts           # Applies theme CSS variables to :root
│   └── use-mobile.ts         # Mobile breakpoint hook (shadcn)
└── App.tsx                   # Router, sidebar, mobile menu, import modal
```

### Data Models (src/db/schema.ts)
- **AtlasActivity**: id, timestamp, date, sport, duration, distance, elevationGain, avgHR, maxHR, calories, lapSplits[], hrTimeseries[], etc.
- **WellnessDay**: date, steps, restingHR, sleepDuration, deepSleep, lightSleep, remSleep, hrv, bodyBatteryStart/End/Min, vo2maxTrend, avgStress, sleepScore

### State Management
- **useAtlasStore** (Zustand): startDate, endDate, activeSport, isImporting, hasData, showWelcome
- **usePreferences** (Zustand + persist): units (imperial/metric), theme (mode, preset, accent), cards[] visibility, charts[] visibility + comparison settings

### Styling
- shadcn/ui components in `src/components/ui/` — **always lowercase filenames** (button.tsx, card.tsx, badge.tsx)
- Theme tokens in `src/index.css` — oklch colors mapped to shadcn variables
- Atlas-specific chart colors: `--atlas-sky`, `--atlas-peach`, `--atlas-sage`, `--atlas-teal`
- 8 theme presets in `src/hooks/useTheme.ts`: linen, slate, parchment, fog, graphite, midnight, forest, rose
- Fonts: DM Sans (UI), JetBrains Mono (data/numbers)

## Important Notes

### TypeScript
- Strict mode with `noUnusedLocals` and `noUnusedParameters` — unused imports will fail the build
- Always run `npm run build` to verify before pushing

### shadcn/ui Gotchas
- Import from lowercase: `@/components/ui/card`, `@/components/ui/button`
- Button does NOT support `asChild` prop (uses Base UI, not Radix)
- Use `@/lib/utils` for the `cn()` class merge helper

### Import/Data
- Garmin exports have nested zips — the importer handles this recursively
- CSV-generated activities have IDs starting with `csv-` — can be cleared separately in Settings
- All unit conversion happens at render time via `lib/units.ts` — stored data is always metric
- Wellness data comes from multiple JSON file types, merged per-date

### Deploy
- Configured for Vercel (vercel.json not needed — Vite auto-detected)
- GitHub repo: https://github.com/derekbiebel/Atlas
- SPA routing works on Vercel out of the box
