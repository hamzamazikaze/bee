# Worker Boundaries

Three workers, three worktrees, one integrator. The rule that matters: **touch only what
you own.** A file edited by two workers is a merge conflict the Lead has to resolve by
hand at hour 10.

| Worker | Worktree | Branch |
|---|---|---|
| UI/UX | `~/Work/siyaha-ui` | `feat/ui` |
| AI/Data | `~/Work/siyaha-ai` | `feat/ai-data` |
| Trip/Map | `~/Work/siyaha-trip` | `feat/trip-map` |
| Lead | `~/Work/Siyaha_hackathon` | `main` |

## Lead-owned — import freely, never edit

```
src/types/**
src/config/**
src/lib/storage/**
src/lib/i18n/**            (exception: message keys — see below)
src/lib/store/index.ts
src/lib/validation/**
src/lib/routing/metrics.ts
src/lib/ai/types.ts
src/lib/matching/types.ts
src/lib/routing/types.ts
src/lib/adaptation/types.ts
src/data/fixtures/**
src/app/layout.tsx
src/app/globals.css
src/app/manifest.ts
src/components/store-hydration.tsx
package.json  ·  next.config.ts  ·  tsconfig.json  ·  eslint.config.mjs  ·  components.json
docs/**
```

**The rule for `src/lib/*/`:** the Lead owns `types.ts` in each lib folder (the contract).
The worker owns everything else in that folder (the implementation).

**Two sanctioned exceptions:**

1. **Message keys.** Add keys to `src/lib/i18n/messages/{en,fr,ar}.ts` inside *your own
   feature's block* (`home`, `onboarding`, `trip`, `experience`, `passport`). Never
   reorder or edit another block. English is required; `fr`/`ar` are optional and fall
   back per key.
2. **Store slices.** If you genuinely need cross-route state that does not exist, message
   the Lead. Do not create a second store.

## UI worker — `feat/ui`

**Owns**
```
src/features/home/**        src/features/onboarding/**
src/features/experience/**  src/features/passport/**
src/features/share/**       src/features/explore/**
src/components/**           (shared primitives + shadcn/ui)
src/app/page.tsx            src/app/onboarding/**
src/app/experience/**       src/app/passport/**
public/images/**
```

**Does** Home, the Inspiration Composer, the 3 onboarding screens, the processing screen,
Experience Mode chrome, cultural detail sheets, Passport, shared primitives (`PageShell`,
`MediaCard`, `ChoiceChip`, `ExperienceCard`, `ProcessingState`, `SectionTitle`…).

**Does not** implement AI, routing, matching or adaptation logic. Build against
`@/data/fixtures` and the API routes' declared shapes. Do not create dozens of primitives
up front — extract on the second use.

**Must export** from `src/features/experience/index.ts`: whatever `/experience` needs, and
consume `TripMap` from `@/features/map` rather than mounting MapLibre yourself.

## AI/Data worker — `feat/ai-data`

**Owns**
```
src/features/ai/**
src/lib/ai/**               (except types.ts)
src/lib/matching/**         (except types.ts)
src/data/pois.ts            src/data/base-routes.ts
src/app/api/analyze/**      src/app/api/extract/**      src/app/api/transcribe/**
```

**Does** the Gemini provider, the Groq/Whisper transcription provider, the optional social
context provider, structured extraction with `parseTripProfile()`, the 25 curated POIs,
the 5 base routes, and the deterministic matching engine (`TripEngine.match` /
`.schedule`).

**Must** return exactly `TRIP_STOP_COUNT` stops from `match()`, always. Must never invent
coordinates — every POI coordinate is researched and carries a `coordinateType`. Must
respect the data caveats in `MASTER_BRIEF` (Citerne Portugaise is
`temporarily_unavailable`; several POIs are `needs_verification`).

**Does not** compute route metrics — call `calculateMetrics()` from
`@/lib/routing/metrics`.

## Trip/Map worker — `feat/trip-map`

**Owns**
```
src/features/trip/**        src/features/map/**
src/lib/routing/**          (except types.ts and metrics.ts)
src/lib/adaptation/**       (except types.ts)
src/app/trip/**             src/app/api/route/**        src/app/api/weather/**
```

**Does** MapLibre GL JS integration, numbered pins, route drawing and animation, the
mini-card on pin select, the routing provider with fallback, the vertical timeline, Adapt
My Day (bottom sheet), the Less Walking adapter and the before/after metric animation.

**Must export** stable components other workers mount:

```ts
// src/features/map/index.ts
export { TripMap } from "./trip-map";          // props: { trip, activeStopId, onSelectStop }
// src/features/trip/index.ts
export { TripTimeline } from "./trip-timeline"; // props: { trip, activeStopId, onSelectStop }
export { AdaptSheet } from "./adapt-sheet";
```

Keep those names and prop shapes stable — the UI worker builds Experience Mode against
them.

## Timeline ownership — settled

**The Trip/Map worker owns the timeline.** Its state is coupled to route segments, stop
durations and the Less Walking re-render; splitting it across two workers would put the
before/after animation on a seam. The UI worker owns everything *around* it: the trip
header, the cultural detail sheet, the Experience Mode chrome and the Start Trip
transition.

## Dependencies

The Lead has installed the shared set: `zod`, `zustand`, `clsx`, `tailwind-merge`,
`class-variance-authority`, `lucide-react`, `motion`, `server-only`, `vitest`.

Worker-specific packages are yours to add (`maplibre-gl` for Trip/Map, `vaul` and
`react-dropzone` for UI, the Gemini/Groq SDKs for AI/Data). Two rules: add it in **your**
worktree only, and check compatibility with Next 16 / React 19 before installing. Never
change a version the Lead pinned.

## Git discipline

- Commit small and often. `main` must always be runnable.
- Never merge `main` into your branch without asking — the Lead controls integration.
- Never merge your branch into `main` yourself.
- Before you say "ready", run `pnpm verify` in your worktree.
- Anything that fails on your branch will fail harder after four merges.

## Next.js 16

This is not the Next.js in your training data. Read `AGENTS.md` at the repo root and the
guides in `node_modules/next/dist/docs/` before writing route handlers, layouts or
metadata.
