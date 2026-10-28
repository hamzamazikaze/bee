# Hackathon UI sync (Wave 1) — 2026-08-29

Dev: `pnpm dev` → http://localhost:3000 (already running). Next 16 / React 19 / Tailwind v4 / motion / vaul / maplibre / zustand.
Desktop ≥1024px renders a 380×780 phone frame; below that the app IS the viewport.

## 1. Current hero flow (functional truth)
`/` Home → InspirationComposer (screenshot / link / voice / preset) → `/onboarding`
(step 1 detected inspiration, step 2 vibes, step 3 time/budget/pace) → **ProcessingScreen**
(inline inside /onboarding, `building=true`, 3 steps analyzing→matching→optimizing, ≥2.4s)
→ `/trip` (map + metrics + timeline + Adapt sheet + Start trip) → `/experience`
(stop-by-stop, cultural story sheet, Navigate, Visited) → `/passport`.

## 2. Routes
| Route | Screen | Owner |
|---|---|---|
| `/` | `features/home/home-screen.tsx` + `inspiration-composer.tsx`, `recognition-reveal.tsx`, `voice-capture.tsx`, `presets.ts` | A |
| `/onboarding` | `features/onboarding/onboarding-flow.tsx` (steps 1–3) | A |
| `/onboarding` (building) | `features/onboarding/processing-screen.tsx`, `components/processing-state.tsx` | B |
| `/trip` | `app/trip/page.tsx` (result/reveal header + metrics) | B (header/result) / C (map+timeline) |
| `/trip` | `features/map/*`, `features/trip/trip-timeline.tsx`, `trip-metrics.tsx`, `adapt-sheet.tsx`, `poi-image.tsx` | C |
| `/experience` | `features/experience/*` (place detail lives here) | C |
| `/explore`, `/saved`, `/passport` | secondary — untouched | — |

## 3. Must not break
- `useAppStore` (`lib/store`): `profile`, `trip`, `activeStopId`, `adaptation`, `passport`, `patchProfile`, `setTrip`, `setActiveStop`, `startTrip`.
- `recogniseImage` / `readSocialUrl` / `transcribe` (`features/home/analyze.ts`) → `/api/analyze`, `/api/transcribe`; golden fallback on any failure.
- `buildTrip` + `cloneGoldenTrip()` fallback; `useRoutedTrip`, `useWeather`.
- Map ↔ timeline two-way selection via `activeStopId`; `timelineAnchorId()`.
- Adapt My Day (`adapt-sheet.tsx`, vaul), Start trip → `/experience`, Visited/Navigate.
- i18n: EN/FR/AR via `t()` — new copy goes in `lib/i18n/messages/{en,fr,ar}.ts`. RTL: logical utilities only.

## 4. Changed / new vs. old target
- Target 01 Home: hero photo + greeting + search + category chips + suggestion cards. Current: video hero + composer + moods + popular. Keep composer (it IS the product); restyle.
- Target 02 Inspiration: text field + "from TikTok/Instagram/photo/place" list. Current composer already has photo/link/voice — align visually.
- Target 03 AI analysis: calm radial "understanding" + checklist. Current: plain 3-step list → redesign (B).
- Target 04 Generated itinerary (summary card, score, highlights, "Voir l'itinéraire"): **does not exist** → B adds it as the top of `/trip` (result header) — no new route.
- Target 05/06 Map + timeline, 07 Place detail: exist in `/trip` + `/experience`; restyle (C). Place detail = stop sheet in `/trip` or `/experience` card — C's call, no fake map.

## 5. Reusable infrastructure (FROZEN — consume, don't redesign)
- Tokens `src/app/globals.css`: `bg-background #0D0D0D`, `bg-surface #141615`, `bg-surface-muted`, `text-primary #52D68A`, `text-muted-foreground #8E8E93`, `border-border`, `eyebrow`, `washed`, radii sm10/md12/lg16/xl20/2xl24.
- `components/ui/button.tsx` (primary/accent/outline/soft/ghost/quiet; sm/md/lg/icon; block).
- `PageShell` (header/footer/nav), `BottomNav` (4 tabs: Home, Inspiration, Trip, Profile), `AppHeader`, `BottomSheet` (vaul), `ChoiceChip`, `MediaCard`, `SectionTitle`, `ProcessingState`, `Ornament`.

## 6. Ownership
- Lead: globals.css, button, bottom-nav, page-shell, app-header, i18n nav keys.
- A: home/*, onboarding-flow.tsx (steps 1–3), presets, home i18n keys.
- B: processing-screen.tsx, processing-state.tsx, `/trip` result header (top of app/trip/page.tsx ONLY), trip-metrics.tsx, B i18n keys.
- C: map/*, trip-timeline.tsx, poi-image.tsx, adapt-sheet.tsx, experience/*, C i18n keys.
Page-local components before shared ones. Screenshot at 390×844, fix top-5 mismatches, stop.
