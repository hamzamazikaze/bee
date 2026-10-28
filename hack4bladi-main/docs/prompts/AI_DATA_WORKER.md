# AI/Data Worker — opening brief

You are the **AI/Data engineer** on a 12-hour Smart Tourism hackathon MVP.
Worktree: `~/Work/siyaha-ai` · Branch: `feat/ai-data`.

**You are the critical path.** Two other Claude sessions are building the map and the UI
in parallel against fixtures. The sooner your real POI dataset lands, the sooner their
work becomes real. Ship `src/data/pois.ts` first and tell the human the moment it is done.

## Read first, in this order

1. `docs/MASTER_BRIEF.md` — product truth
2. `docs/CONTRACTS.md` — the types you must use
3. `docs/WORKER_BOUNDARIES.md` — what you own
4. `docs/FALLBACKS.md` — your failure paths
5. `AGENTS.md` — **this is Next.js 16, not the Next.js in your training data**

Do not ask the human clarifying questions the docs already answer. Make the simplest
robust call and note it.

## You own

```
src/features/ai/**
src/lib/ai/**            (except types.ts — Lead-owned contract)
src/lib/matching/**      (except types.ts — Lead-owned contract)
src/data/pois.ts
src/data/base-routes.ts
src/app/api/analyze/**   src/app/api/extract/**   src/app/api/transcribe/**
```

Everything else is someone else's. Never edit `src/types/**`, `src/config/**`,
`src/lib/{store,storage,validation,i18n}/**`, `src/lib/routing/metrics.ts`,
`src/data/fixtures/**`, `src/app/layout.tsx`, `src/app/globals.css`, or `package.json`
versions the Lead pinned. If a contract is wrong, say so — do not fork it.

Exception you *may* edit: your own feature block in
`src/lib/i18n/messages/{en,fr,ar}.ts`.

## Order of work

### 1. `src/data/pois.ts` — 25 curated POIs (target: 1.5 h) — DO THIS FIRST

Type: `POI` from `@/types/poi`. Model your entries on the four in
`src/data/fixtures/golden-pois.ts` — same shape, same depth of cultural writing.

Coverage: **Casablanca** (Hassan II Mosque, Habous, Marché Central, Ancienne Médina,
La Sqala, Espace Sacré-Cœur, Musée du Judaïsme Marocain, Fondation Slaoui, Villa des Arts,
Place Mohammed V, Bd Mohammed V Art Deco walk, Corniche Aïn Diab, Cinéma Rialto),
**El Jadida** (Cité Portugaise de Mazagan, Bastion de l'Ange, Citerne Portugaise, Phare
Sidi Bouafi, Plage/Deauville), **Azemmour** (Médina & remparts), **Oualidia** (Lagune,
Plage, Lagoon Boat Trip, Oyster Tasting), **Mohammedia** (Kasbah), **Boulaouane** (Kasbah).

Hard rules:

- **Never invent a coordinate.** Every lat/lng is researched. Area-type POIs (Corniche,
  lagoon, boulevard, medina) get `coordinateType: "representative"` — never label a
  representative anchor as an exact entrance.
- **Data caveats, non-negotiable:** Citerne Portugaise → `availability.status:
  "temporarily_unavailable"`. Musée du Judaïsme Marocain, Cinéma Rialto, Villa des Arts,
  Bastion de l'Ange, Phare Sidi Bouafi, Kasbah de Boulaouane → `verification:
  "needs_verification"`.
- Opening hours are **curated**, never a live API. Uncertain → `needsVerification: true`.
- Price uses the `PriceRange` bands. Do not claim exact dynamic pricing unless verified.
- `cultural.story` is **3–4 lines** in en/fr/ar — interesting, respectful, concrete, never
  encyclopedic. `cultural.tip` is one genuinely useful sentence.
- `media.heroImage` → `/images/poi/<slug>.jpg` (assets land later).
  `media.fallbackImage` → `/images/placeholder.svg` (exists today).
- 4–6 tags each. `signature: true` only for genuine must-sees. `hero: true` for the
  regional hero-card candidates.
- The four golden POIs must appear here too, with **identical ids and coordinates** to
  `src/data/fixtures/golden-pois.ts`.

### 2. `src/data/base-routes.ts` — the 5 templates (0.5 h)

Type `BaseRoute`. Culture & Heritage, Food & Local Life, Coast & Sunset, Hidden Gems,
Best of the Region — exactly as listed in the master brief. These are curated
foundations the engine personalises from; the engine must **never** return one raw.

### 3. `src/lib/matching/engine.ts` — the trip engine (1.5 h)

Implement `TripEngine` from `src/lib/matching/types.ts`. Deterministic, synchronous, local
— **it never calls a model.**

- `match()` returns **exactly `TRIP_STOP_COUNT` (4)** POIs, always, for any profile —
  including a completely empty one. Selection pattern: 2 strongly aligned + 1
  complementary + 1 signature must-see.
- Score on: destination, interests (`POICategory === Interest`, so it is `===`), budget
  band, walking preference, geographic proximity, category diversity, priority. Exclude
  `permanently_closed` and `temporarily_unavailable`; avoid known-closed where practical.
- `schedule()` orders as a **narrative day**, not shortest-distance: morning culture/local
  → midday food → afternoon discovery → sunset coast/icon. Apply
  `PACE_DURATION_MULTIPLIER` from `@/config/app` to each POI's `baseDurationMinutes`.
  Pace changes duration, **never stop count**.
- Do **not** compute route metrics — that is `calculateMetrics()` from
  `@/lib/routing/metrics`. One source of truth, or the on-stage before/after numbers lie.
- Write unit tests: always 4 stops, empty profile still works, budget filtering, pace
  affects duration not count, deterministic for a fixed input.

### 4. Providers + route handlers (1.5 h)

- `src/lib/ai/gemini.ts` implements `AIProvider`. Model id from `serverEnv.gemini.model` —
  never hardcoded in business logic.
- `src/lib/ai/groq.ts` implements `TranscriptionProvider`.
- Optional `SocialContextProvider` — **cheap and best-effort only**. No heavy TikTok /
  Instagram / Facebook scraping. Failure is silent and never blocks generation.
- Route handlers in `src/app/api/{analyze,extract,transcribe}/route.ts`. Keys stay
  server-side. Validate upload size and MIME against `UPLOAD` in `@/config/app`.
- Every model response goes through `parseTripProfile()` from
  `@/lib/validation/trip-profile`. It never throws — unparseable output yields an empty
  profile and the user still gets a trip.
- Every call takes an `AbortSignal` bounded by the matching `TIMEOUTS` value. No missing
  key, no timeout, no bad JSON may ever produce an error screen. Read `docs/FALLBACKS.md`
  and make every row in your columns true.

## Definition of done

`pnpm verify` green in your worktree (`lint && typecheck && test && build`), engine tests
passing, and the app still generating a 4-stop trip with **no API keys set at all**.

Commit small and often. Never merge `main` into your branch and never merge into `main` —
the Lead integrates.
