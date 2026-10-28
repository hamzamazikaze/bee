# Trip/Map Worker — opening brief

You are the **Trip & Map engineer** on a 12-hour Smart Tourism hackathon MVP.
Worktree: `~/Work/siyaha-trip` · Branch: `feat/trip-map`.

You own the two moments the jury actually remembers: **the map + timeline reveal**, and
**Adapt My Day → Less Walking**. Everything else in the app exists to get to those.

## Read first, in this order

1. `docs/MASTER_BRIEF.md` — product truth
2. `docs/DEMO_PATH.md` — **the exact numbers you must reproduce**
3. `docs/CONTRACTS.md` — the types you must use
4. `docs/WORKER_BOUNDARIES.md` — what you own
5. `docs/FALLBACKS.md` — your failure paths
6. `AGENTS.md` — **this is Next.js 16, not the Next.js in your training data**

Do not ask the human clarifying questions the docs already answer. Make the simplest
robust call and note it.

## You own

```
src/features/trip/**     src/features/map/**
src/lib/routing/**       (except types.ts and metrics.ts — Lead-owned)
src/lib/adaptation/**    (except types.ts — Lead-owned contract)
src/app/trip/**          src/app/api/route/**     src/app/api/weather/**
```

Everything else is someone else's. Never edit `src/types/**`, `src/config/**`,
`src/lib/{store,storage,validation,i18n}/**`, `src/lib/routing/metrics.ts`,
`src/data/**`, `src/app/layout.tsx`, `src/app/globals.css`, or `package.json` versions the
Lead pinned. If a contract is wrong, say so — do not fork it.

Exception you *may* edit: your own `trip` block in
`src/lib/i18n/messages/{en,fr,ar}.ts`.

## The timeline is yours

Ownership was settled by the Lead: the timeline's state is coupled to route segments,
stop durations and the Less Walking re-render, so splitting it would put the before/after
animation on a seam. The UI worker owns the trip header, the cultural detail sheet and
the Experience Mode chrome *around* your components.

**You must export these, and keep the names and prop shapes stable** — the UI worker is
building against them right now:

```ts
// src/features/map/index.ts
export { TripMap } from "./trip-map";           // { trip, activeStopId, onSelectStop }
// src/features/trip/index.ts
export { TripTimeline } from "./trip-timeline"; // { trip, activeStopId, onSelectStop }
export { AdaptSheet } from "./adapt-sheet";
```

Build against `src/data/fixtures/**` (`GOLDEN_TRIP`, `GOLDEN_LESS_WALKING`) from minute
one — real POIs arrive from the AI worker around hour 5 and will drop straight in.

## Order of work

### 1. Map (1.5 h)

`maplibre-gl` — add it in **your worktree only**. Style URL from `MAP.styleUrl` in
`@/config/app`; never hardcode a provider.

Visual direction: clean, premium, calm — Apple Maps, not a dashboard. Minimal clutter.
Numbered pins **1 2 3 4** only; no category icons on pins. Fit the 4 stops with
`MAP.fitPadding`. Lazy-load the map component — it must not block first render.

On pin select: a mini card with photo, name, category, duration, and a **View stop**
action. Selection is two-way with the timeline via `activeStopId` / `onSelectStop`.
No auto-scroll gymnastics required.

### 2. Route drawing (1 h)

Draw from `RouteSegment.geometry`. **`geometry: null` is legal and must render** — a
straight line between the two stops. That is the routing-failure path and it has to look
deliberate, not broken. Different treatment for walking vs car segments.

### 3. Timeline (1 h)

Vertical connected timeline. Per stop: time, image, name, duration, transport-to-next with
walk/car label, and `visitState` (`upcoming` / `current` / `visited`). Highly readable —
this is the screen a jury reads from three metres away. Use `useTranslation()` for copy
and Tailwind **logical** utilities (`ps-` `pe-` `ms-` `me-` `text-start`) so Arabic RTL
works structurally. Never `pl-` `pr-` `ml-` `mr-` `text-left`.

### 4. Routing provider + weather (1 h)

- `src/lib/routing/osrm.ts` (or your choice) implements `RoutingProvider` from
  `src/lib/routing/types.ts`. Config from `serverEnv.routing`.
- `src/app/api/route/route.ts` — batched segments, one result per request, in order,
  never a short array.
- On timeout or failure: `haversineMeters` + `estimateDurationMinutes` from
  `@/lib/routing/metrics`, `geometry: null`, `source: "fallback"`. Bound every call with
  an `AbortSignal` at `TIMEOUTS.routingSegmentMs`.
- `/api/weather` is lightweight and optional — on failure the header chip is simply
  omitted. No placeholder, no error.
- **Never compute metrics yourself.** `calculateMetrics(stops, segments)` from
  `@/lib/routing/metrics` is the only source of route numbers, shared with the trip
  engine. If you do your own arithmetic, the on-stage before/after will disagree.

### 5. Adapt My Day + Less Walking (1.5 h) — the wow moment

Bottom sheet (`vaul` or an accessible equivalent — **must work with a mouse, not only
swipe**; the demo may run on a laptop). Four options visible: Less Walking, Less Time,
Spend Less, Rainy Day.

**Only Less Walking is fully implemented.** The other three may be visible with minimal
placeholder behaviour. Do not overbuild them.

`src/lib/adaptation/less-walking.ts` implements `Adapter`:

- Keep the same POIs and the same narrative order whenever possible.
- Switch long walking segments to car (`WALKING_COMFORT_METERS` from config is the
  threshold). Reorder only if genuinely beneficial.
- Recalculate via `calculateMetrics()`. Populate `changedSegmentIds` — the map animates
  exactly those.
- Never throws. If nothing improves, return `applied: false` with a `reason`.
- Wire through `useAppStore().applyAdaptation()` / `revertAdaptation()` — the store keeps
  an exact pre-adaptation snapshot so Undo is a restore, not a recomputation.

For the golden day the result is fixed and already asserted by
`src/lib/__tests__/golden-fixtures.test.ts`:

| | Before | After |
|---|---|---|
| Walking | 6.4 km | **1.5 km** |
| Car | 0 | 6.0 km |
| Moving | 82 min | **42 min** |

Headline: **“77% less walking · ~40 min saved.”** Segments 1 and 3 flip walk→car;
segment 2 stays walking; arrival times do not move (the 16:00 Hassan II guided visit is
an anchor). Your generic adapter must reproduce these numbers when fed `GOLDEN_TRIP` —
write that test.

Animation: old route fades → new route draws → segment icons flip → timeline updates →
metrics count up. **Fast.** Respect `prefers-reduced-motion` (already handled globally in
`globals.css`).

### 6. Navigate

No turn-by-turn. Show route preview, mode, distance, duration, and a **Navigate** CTA that
opens Google Maps or Apple Maps externally. Robust link generation for both.

## Definition of done

`pnpm verify` green in your worktree, adapter tests passing, and the golden trip rendering
map + timeline + Less Walking **with the network off**.

Commit small and often. Never merge `main` into your branch and never merge into `main` —
the Lead integrates.
