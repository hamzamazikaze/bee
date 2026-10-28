# Architecture

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind v4 ·
Zustand · Zod · pnpm.

## Decisions and why

**Package manager: pnpm.** Four worktrees share one content-addressable store — installs
are near-instant after the first and disk stays flat. Do not switch later; a mixed
lockfile is a merge conflict nobody has time for.

**State: Zustand, one store (`src/lib/store/index.ts`).** Trip state genuinely spans
routes owned by different workers (onboarding → generation → `/trip` → `/experience`).
Context would mean a provider tree plus setters drilled across feature boundaries. No
Redux, no second store, no `persist` middleware — the trip object is large and we control
the save points.

**i18n: hand-rolled, no library.** `next-intl` and friends want a `[locale]` route
segment, which would force all three workers to restructure their page paths mid-build.
Instead the locale lives in the store, `useTranslation()` reads it, and
`<StoreHydration />` syncs `<html lang dir>`. English is the source of truth; `fr` and
`ar` are `DeepPartial` and fall back per key, so a missing translation can never break a
screen or the build.

**RTL is structural.** Arabic works because components use Tailwind *logical* utilities
(`ps-` `pe-` `ms-` `me-` `start-` `end-` `text-start` `text-end`) and `dir` is set on the
root element. Never `pl-` `pr-` `ml-` `mr-` `left-` `right-` `text-left` `text-right`.
This is the one styling rule with no exceptions.

**Validation: Zod at exactly one boundary.** Model-produced JSON is the only untrusted
input, and `parseTripProfile()` is the only door. `localStorage` is our own data — shape
guards in `src/lib/storage` are proportionate there, a full schema is not.

**Fonts.** Display slot is `--font-display-family` (currently Bricolage Grotesque, freely
licensed) and is designed to be swapped when a licensed expressive face is cleared. UI is
Plus Jakarta Sans with system Arabic faces in the fallback stack, so Arabic renders well
without shipping a second webfont.

## Directory map

```
src/
  app/                    routes; one page.tsx per worker (see WORKER_BOUNDARIES)
    api/                  route handlers — all provider calls happen here
  components/             shared primitives + shadcn/ui   [UI worker]
  config/                 app.ts (public) · env.ts (server-only)   [Lead]
  data/
    fixtures/             golden demo safety net          [Lead]
    pois.ts               25 curated POIs                 [AI/Data]
    base-routes.ts        5 curated templates             [AI/Data]
  features/
    home/ onboarding/ experience/ passport/ share/        [UI]
    ai/                                                   [AI/Data]
    trip/ map/                                            [Trip/Map]
    explore/                                              [UI, P2]
  lib/
    ai/        types.ts [Lead] · providers [AI/Data]
    matching/  types.ts [Lead] · engine    [AI/Data]
    routing/   types.ts + metrics.ts [Lead] · providers [Trip/Map]
    adaptation/ types.ts [Lead] · adapters [Trip/Map]
    storage/   [Lead]
    i18n/      [Lead; workers add message keys]
    store/     [Lead]
    validation/ [Lead]
  types/                  domain contracts                [Lead]
```

## Client / server boundary

Secrets never reach the browser. `src/config/env.ts` imports `server-only`, so importing
it from a client component is a **build error**, not a runtime leak.

Anything holding a key runs in a route handler under `src/app/api/`:

| Route | Owner | Purpose |
|---|---|---|
| `POST /api/analyze` | AI/Data | image / social URL → `ImageAnalysisResult` |
| `POST /api/extract` | AI/Data | all signals → validated `TripProfile` |
| `POST /api/transcribe` | AI/Data | audio → text (Groq Whisper) |
| `POST /api/route` | Trip/Map | stop coordinates + modes → `SegmentResult[]` |
| `GET  /api/weather` | Trip/Map | city → `WeatherSummary` |

Everything else is client-side: matching, scheduling, adaptation arithmetic and metrics
are pure local functions. They are fast, deterministic and work offline — which is exactly
why the fallback path is credible.

## Trip generation flow

```
inputs (image | url | voice | manual)
  → POST /api/extract          [AI, bounded by TIMEOUTS.profileExtractionMs]
  → parseTripProfile()         [never throws]
  → engine.match()             [local, deterministic, returns exactly 4 POIs]
  → engine.schedule()          [pace → durations, narrative arrival times]
  → POST /api/route            [bounded; on failure → haversine + FALLBACK_SPEED]
  → calculateMetrics()         [single source of route numbers]
  → Trip → store.setTrip() → localStorage
```

The processing screen shows three steps (analyzing / matching / optimizing) for at least
`PROCESSING_MIN_MS` and at most `TIMEOUTS.tripGenerationMs`. Past the ceiling it shows the
trip anyway, built from local data. There is no infinite spinner anywhere in this app.

## Persistence

`localStorage` only, through `src/lib/storage`, keyed `siyaha:v1:`. Stored: last trip,
passport, profile, locale. Bump `STORAGE_VERSION` to invalidate everything from an older
build. Reads are guarded — a corrupt value is dropped, never thrown.

## PWA / offline

`src/app/manifest.ts` ships now. A service worker caching the app shell, the golden
fixtures and Tier-1 images is **P1** and belongs to the Lead — no worker adds one. Scope:
poor Wi-Fi must not kill the demo. Explicitly not in scope: offline map tiles, offline
routing, sync.

## Error handling

No raw errors, no unhandled rejections, no blank screens. Every external call has a
timeout from `TIMEOUTS`, an error state and a fallback. The principle:

> External services enrich the experience. They do not own it.

See `docs/FALLBACKS.md` for the per-dependency table.
