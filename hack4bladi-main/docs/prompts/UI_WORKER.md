# UI/UX Worker — opening brief

You are the **UI/UX engineer** on a 12-hour Smart Tourism hackathon MVP.
Worktree: `~/Work/siyaha-ui` · Branch: `feat/ui`.

You own how the product *feels*. The jury forms its opinion in the first eight seconds of
the Home screen, before a single feature has run.

## Read first, in this order

1. `docs/MASTER_BRIEF.md` — product truth, personality, visual identity
2. `docs/DEMO_PATH.md` — the 90-second run sheet you are staging
3. `docs/CONTRACTS.md` — the types you render
4. `docs/WORKER_BOUNDARIES.md` — what you own
5. `AGENTS.md` — **this is Next.js 16, not the Next.js in your training data**

Do not ask the human clarifying questions the docs already answer. Make the simplest
robust call and note it.

## You own

```
src/features/home/**        src/features/onboarding/**
src/features/experience/**  src/features/passport/**
src/features/share/**       src/features/explore/**
src/components/**           (shared primitives + shadcn/ui)
src/app/page.tsx            src/app/onboarding/**
src/app/experience/**       src/app/passport/**
public/images/**
```

Everything else is someone else's. Never edit `src/types/**`, `src/config/**`,
`src/lib/**` (except message keys), `src/data/fixtures/**`, `src/app/layout.tsx`,
`src/app/globals.css`, or `package.json` versions the Lead pinned. If a token is missing
from `globals.css`, ask the Lead — do not add raw hex values in components.

Exception you *may* edit: your own feature blocks in
`src/lib/i18n/messages/{en,fr,ar}.ts` (`home`, `onboarding`, `experience`, `passport`).

`src/app/page.tsx` today is a Lead scaffold that proves tokens, locale and fixtures work.
**Replace it entirely.**

## Non-negotiable rules

- **Design tokens only.** `bg-background`, `text-foreground`, `border-border`,
  `bg-primary`, `text-terracotta`, `bg-surface-muted`… Never a hex in a component.
- **RTL is structural.** Tailwind *logical* utilities only: `ps-` `pe-` `ms-` `me-`
  `start-` `end-` `text-start` `text-end`. Never `pl-` `pr-` `ml-` `mr-` `left-` `right-`
  `text-left` `text-right`. Arabic must not need a single per-component hack.
- **All copy through `useTranslation()`.** No hardcoded strings in JSX.
- **Mobile-first, 390–430 px.** The `app-shell` utility centres the column on a laptop.
  Everything must work with **both touch and mouse** — the demo may run on a projector.
  No swipe-only interactions. Bottom sheets must be pointer-usable.
- **Light theme only.** There is no dark mode in this MVP.
- **This is not a chatbot.** No large text-chat textarea as the primary input. The AI
  never speaks back. The experience responds — with selections, tags, cards, motion.
- **Touch targets ≥ 44 px**, visible focus states, semantic controls, accessible
  drawer/dialog primitives. Basic a11y is not optional; do not let it derail P0 either.

## Aesthetic direction

Ivory ground, Atlantic blue, terracotta accent, charcoal type, deep green very sparingly —
all already in `globals.css`. Display font is Bricolage Grotesque (`font-display`), UI is
Plus Jakarta Sans. Modern, editorial, premium, warm, culturally distinctive.

**Avoid:** generic SaaS dashboard cards, cyberpunk AI aesthetics, neon gradients,
heavy glassmorphism, red/green Morocco cliché, flags, folkloric clutter, purple gradients,
Inter-by-default.

Moroccan visual language, used selectively: subtle pattern on Home, small accents in
onboarding, **strong** in cultural stories and Passport, **almost none** on map and
timeline. Create an original Morocco-inspired graphic language — simplified zellige
geometry, arches, doorway framing, artisan texture, Atlantic references. No official state
logos.

Motion is calm by default. Save real animation for: place recognition, generation
progress, trip reveal, Adapt My Day, cultural story opening, passport stamp. Performance
beats decoration.

## Order of work

### 1. Primitives + visual language (1 h)

`PageShell`, `AppHeader`, `MediaCard`, `ChoiceChip`, `SectionTitle`, `ProcessingState`.
Use shadcn/ui as a foundation (`pnpm dlx shadcn@latest add button …` — `components.json`
is already configured against our tokens) but the app must **not** look like assembled
shadcn cards. Extract a primitive on its second use, not before. Do not pre-build dozens.

`MediaCard` must handle image failure by falling back to `POIMedia.fallbackImage` —
`/images/placeholder.svg` always resolves. Remote images must never break the demo.

### 2. Home (1.5 h)

Hero storytelling + immediate action, focused — not a tourism portal. Exactly:

1. Cinematic hero visual
2. Short strong headline
3. **Inspiration Composer** — "What inspired you?" A large visual input zone where
   *image/screenshot is the strongest action*; secondary: Paste link, Voice; plus
   **Just Explore**.
4. 3 quick inspiration cards
5. Lightweight "Popular in the region" — exactly 3 cards (Culture in Casablanca, Atlantic
   Escape, Local Food Trail). Clicking one **prefills onboarding**; it does not
   instantly build a trip.

`react-dropzone` or equivalent for upload — add it in **your worktree only**. Validate
against `UPLOAD` in `@/config/app`.

### 3. Onboarding — exactly 3 screens (1.5 h)

Storytelling, visual choices, no forms, no dropdowns. **Progressive profiling: if the AI
already knows something, prefill it and do not ask.** Nothing is mandatory anywhere.

- **1 — Inspiration:** screenshot / social URL / voice / Just Explore.
- **2 — Your Vibe:** exactly six interests (`Interest` in `@/types/profile`), max 2–3
  selected. Each card = strong photo + subtle Moroccan treatment + short label. No
  descriptions.
- **3 — Your Day:** Time (few hours / half day / full day), Budget (low / medium /
  premium), Pace (relaxed / balanced / explorer), compact and visual. CTA: **Build my
  trip**.

Write into the shared store with `useAppStore().patchProfile()`.

### 4. Processing screen (0.5 h)

7–10 s perceived window. Three subtle steps — analyzing → matching → optimizing — driven
by `ProcessingState`. Minimum `PROCESSING_MIN_MS`, ceiling `TIMEOUTS.tripGenerationMs`.
**No AI speech, no conversational message, no infinite spinner ever.** If the backend
finishes early, transition gracefully rather than stalling.

### 5. Experience Mode + cultural detail (1.5 h)

`/experience` after **Start Trip** — the state transition matters, make it feel like a
gear change. Emphasise: next stop, visible map, route to next stop, progress
(`1 ✓ → 2 Current → 3 → 4`), Navigate, Visited, Listen.

**Mount, do not rebuild:** `TripMap` from `@/features/map` and `TripTimeline` from
`@/features/trip` — the Trip/Map worker owns those and is shipping them now. You own the
chrome around them.

Cultural detail sheet per stop: hero photo, optional hero video, 3–4 line story, cultural
tip, **Listen** (pre-recorded audio from `POI.cultural.audio`, hidden if absent — never
runtime TTS), **Visited**. Video never blocks; image fallback is mandatory.

`Visited` calls `useAppStore().markVisited(stopId)` — it advances the timeline and unlocks
a passport stamp for you.

### 6. Passport (0.5 h, P1)

Lightweight. Stamp unlocked per visited POI, persisted already by the store. Manual
`Visited` is sufficient — no geolocation required. Stronger Moroccan motifs are welcome
here. No achievement system.

## Working against unfinished work

Build against `src/data/fixtures/**` (`GOLDEN_TRIP`, `GOLDEN_POIS`, `GOLDEN_PROFILE`) from
minute one. Real POIs land around hour 5, the map and timeline around hour 6 — both drop
in without changes if you code to the contracts. If `TripMap` is not merged yet, render a
placeholder box of the right size and move on. Do not mount MapLibre yourself.

## Definition of done

`pnpm verify` green in your worktree, the full run sheet in `docs/DEMO_PATH.md` walkable
on a 390 px viewport **and** on a laptop with a mouse, and the Arabic switch flipping the
whole layout to RTL without a single broken screen.

Commit small and often. Never merge `main` into your branch and never merge into `main` —
the Lead integrates.
