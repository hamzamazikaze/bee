# CURRENT APP STATUS — Khotwa / Siyaha

Read-only snapshot taken 2026-08-29 10:57–11:10 (local). Method: git + package.json + source read, dev server reused on `localhost:3000`, headless Chrome driven over CDP at 390×844 (DPR 2), 430×932 and 1280×900. Nothing in `src/`, `public/`, config or data was modified by this inspection. Only this file and `docs/current-status/screenshots/` were created.

> **⚠ The working tree moved during the inspection.** At 10:57 `git status` showed only `?? references/` + `M CLAUDE.md`. By 11:10 it showed 5 modified `src/` files and new untracked `public/images/hero.webp` + `public/videos/{hero,habous,corniche}.mp4`. Several `claude` processes are running on this machine; another session is editing this repo in parallel. Where HEAD and the working tree differ, both are reported. Screenshots reflect whatever the dev server had hot-reloaded at capture time (an intermediate state: photo hero, no video yet).
>
> **At 11:15 (end of inspection)** the tree had moved again: 13 modified files — the 5 above plus `src/app/layout.tsx`, `src/app/manifest.ts`, `src/components/bottom-nav.tsx`, `src/components/ui/button.tsx`, `src/features/passport/passport-screen.tsx`, `src/lib/i18n/messages/{ar,en,fr}.ts` — and new untracked `docs/HACKATHON_UI_SYNC.md`, `scripts/shot.sh`. Those later edits (which plausibly target the themeColor/manifest, pill-button and naming findings below) were **not** inspected; §5, §6 and §23 describe HEAD `e5b6a4b`.

---

## 1. Repository state

| Item | Value |
|---|---|
| Root | `/Users/abdelkbirnainiaa/Work/Siyaha_hackathon` |
| Branch | `main` (remote `origin` = github.com/AbdelkbirNA/Siyaha_hackathon) |
| HEAD | `e5b6a4b` — "checkpoint before UI UX improvements" (2026-08-29) |
| Staged | none |
| Unstaged (at 11:10) | `CLAUDE.md` (+10, hackathon rule, this session); **from the parallel session:** `src/app/globals.css` (desktop frame `--app-h: min(780px, 100dvh - 5.5rem)`, width derived), `src/components/app-header.tsx` (`title?: ReactNode`), `src/components/media-card.tsx` (+`video` prop; scrim `from-foreground/90` → `from-background`), `src/features/home/home-screen.tsx` (header title → `<BrandLockup>`; hero `MediaCard src="/images/hero-arch.svg"` → `<video src="/videos/hero.mp4" poster="/images/hero.webp">`), `src/features/home/presets.ts` (+`video` on 2 moods) |
| Untracked | `references/` (2 files), `public/images/hero.webp`, `public/videos/` (3 mp4, 0.7 MB), `docs/current-status/` (this inspection) |
| Stashes | none |
| Worktrees | 4: this repo (`main`), `../siyaha-ai` (`feat/ai-data`, merged, 0 ahead), `../siyaha-trip` (`feat/trip-map`, merged, 0 ahead), `../siyaha-ui` (`feat/ui`, **NOT merged, 6 commits ahead** — an older "Siyaha travel design system" line: Checkmate phone mockup, WCAG pass, Explore/Saved/Profile v1) |
| Contains all product code? | Yes. `feat/ui`'s content was re-absorbed by `64eae24` ("absorb the siyaha-ui worker"); the unmerged branch is a superseded lineage, not missing code. |

Last 10 commits: `e5b6a4b` checkpoint · `75d3c66` api-designer agent · `5cdbf17` **become Khotwa** (charter palette + mark) · `17634e7` device-on-a-stage shell + tab bar everywhere · `9676b49` Organic design system · `64eae24` absorb siyaha-ui (Explore, Saved, tab bar) · `856dec6` API docs · `9e65f98` contrast/depth/motion pass · `c103680` golden demo real end-to-end · `c283bea` MapLibre worker fix.

**Verdict: A — one unified project**, with old-name remnants (see §5) and one stale sibling worktree.

## 2. Stack (from `package.json`)

pnpm `11.10.0` (`pnpm-lock.yaml`, `pnpm-workspace.yaml`). Node v26.4.0 at runtime.

| Concern | Package / version |
|---|---|
| Framework | `next 16.3.3` (App Router, Turbopack), `react 19.2.8`, `react-dom 19.2.8` |
| Language | `typescript ^5` |
| Styling | `tailwindcss ^4` + `@tailwindcss/postcss ^4`, `class-variance-authority`, `clsx`, `tailwind-merge` (shadcn-style `components.json`) |
| Animation | `motion ^13.1.1` (Framer Motion successor) |
| Map | `maplibre-gl ^6.6.0` |
| UI | `lucide-react ^1.34.0`, `vaul ^1.1.2` (used in one file) — no shadcn components installed beyond `ui/button.tsx` |
| State | `zustand ^5.0.15` + hand-rolled localStorage (`siyaha:v1:*`) |
| i18n | none (hand-rolled `src/lib/i18n`, en/fr/ar message objects) |
| Validation | `zod ^4.4.3` |
| Tests | `vitest ^4.1.11`, `@testing-library/react`, `jsdom` — **90 tests / 11 files pass** (run during this inspection) |
| Lint | `eslint ^9`, `eslint-config-next 16.3.3` |

Scripts: `dev`, `build`, `start`, `lint`, `typecheck` (`next typegen && tsc --noEmit`), `test`, `test:watch`, `verify` (lint+typecheck+test+build), `sync:map-worker`, `predev`/`prebuild` (copy MapLibre worker into `public/`).

## 3. Structure

```
src/
  app/            layout.tsx (Poppins, stage shell, Splash), page.tsx, error.tsx, not-found.tsx, manifest.ts, globals.css
                  onboarding/ trip/ experience/ explore/ saved/ passport/  (one page.tsx each)
                  api/ analyze/ extract/ route/ transcribe/ weather/        (route.ts each)
  features/       home/ (home-screen, inspiration-composer, recognition-reveal, voice-capture, analyze, presets)
                  onboarding/ (onboarding-flow, steps, options, build-trip, processing-screen)
                  trip/ (trip-timeline, trip-metrics, adapt-sheet, poi-image, use-trip-data, use-count-up)
                  map/ (trip-map → dynamic map-canvas)   experience/ (experience-screen, cultural-sheet, start-trip[dead])
                  explore/ saved/ passport/   ai/ share/ (.gitkeep only)
  components/     app-header, bottom-nav, bottom-sheet(<dialog>), brand, stage-brand, splash, page-shell,
                  media-card, choice-chip, ornament (zellige/arch SVG), processing-state, section-title, ui/button
  data/           pois.ts (25 = golden 4 + casablanca 9 + coast 12), base-routes.ts (6 templates), poi-utils, fixtures/
  lib/            ai/ (gemini, groq, social, upload, resolve-poi)  matching/engine.ts  routing/ (osrm, metrics, navigation)
                  adaptation/ (less-walking only)  i18n/  store/  storage/  validation/  utils.ts
  config/         app.ts (APP, MAP, TIMEOUTS, PROCESSING_MIN_MS…), env.ts (server-only)
  types/          poi, trip, profile, adaptation, experience, common
public/           images/{hero.webp*, hero-arch.svg, placeholder.svg, poi/6, vibes/6, popular/3}, videos/*, audio/(empty),
                  maplibre-gl-worker.mjs, maplibre-gl-shared.mjs      (* = untracked)
docs/             ARCHITECTURE, CONTRACTS, DEMO_PATH, DESIGN_BRIEF (old Siyaha palette), FALLBACKS, IMPLEMENTATION_AUDIT,
                  API_REVIEW, openapi.yaml, prompts/ (3 worker briefs)
references/       Charte-graphique.pdf (8.9 MB), targetui.png
scripts/          sync-map-worker.mjs, generate-placeholders.py
.claude/          agents/api-designer.md
root              SIYAHA_APP_MASTER_QA.md (canonical spec, 41 KB), README.md, AGENTS.md, CLAUDE.md
```

121 TS/TSX files in `src/`. No `hooks/` or `services/` dirs; hooks live in features (`use-trip-data`, `use-count-up`), services in `lib/`.

## 4. References

| Asked for | Status |
|---|---|
| `references/` | FOUND |
| `references/target-ui.png` | FOUND UNDER DIFFERENT NAME → `references/targetui.png` (130 KB) |
| `references/Khotwa-UI-UX-Audit.pdf` | **MISSING** (no file matching `*audit*` outside `docs/IMPLEMENTATION_AUDIT.md`, which is a functional P0 audit, not the UI/UX audit) |
| `references/khotwa-brand.pdf` | FOUND UNDER DIFFERENT NAME → `references/Charte-graphique.pdf` (8.9 MB) |

Other design references present: `docs/DESIGN_BRIEF.md` (specifies the **old Siyaha** palette: Ivoire `#fbf7f0`, Bleu Atlantique `#17506e`, Terracotta `#bf5b3e`), `public/images/hero-arch.svg` (old Siyaha ivory/blue/terracotta illustration). No screenshots or Figma exports in the repo.

## 5. Product name / brand state

| Layer | Says |
|---|---|
| Browser metadata | `Khotwa — The Region, One Step Ahead.` (`layout.tsx` via `APP.name`); manifest `name: "Khotwa — Smart Tourism"`, `short_name: "Khotwa"` |
| App header | Home header title `Khotwa` (HEAD, via `common.appName`) / `<BrandLockup>` mark + `khotwa` wordmark (working tree). Other screens show no brand at all. Desktop stage caption: `khotwa` + tagline. Splash: Khotwa |
| Config | `src/config/app.ts` `name: "Khotwa"`, `tagline: "The Region, One Step Ahead."` |
| README / package | `README.md` `# Siyaha` + old tagline "See it. Plan it. Experience Morocco."; `package.json` `"name": "siyaha"` |
| UI-visible strings | en `appName: "Khotwa"`, ar `خطوة`; Arabic header wordmark renders Latin `khotwa` |
| Old references | localStorage prefix `siyaha:v1:`, sessionStorage `siyaha:splash`, SVG ids `siyaha-arch/band/field`, `console.error("[siyaha] …")`, `SIYAHA_APP_MASTER_QA.md`, `docs/DESIGN_BRIEF.md` (Siyaha throughout), `placeholder.svg aria-label="Siyaha"` (**this SVG is the PWA icon**), `hero-arch.svg` comment, `globals.css` header comment |

The product calls itself **Khotwa** everywhere a user can see, and **Siyaha** everywhere a developer can see.

## 6. Brand implementation (`src/app/globals.css`, `:root`)

| Token | Value |
|---|---|
| BACKGROUND / GROUND | `#08080a` |
| SURFACE / surface-muted | `#141417` / `#1f1f23` |
| PRIMARY / hover / fg / soft | `#5fdd85` / `#7ae59a` / `#010101` / `#14301f` |
| SECONDARY | alias only → `--surface-muted` |
| FOREGROUND | `#fefefe` |
| MUTED / muted-fg | `#26262b` / `#9d9d9d` |
| BORDER / strong | `#2a2a30` / `#6b6b78` |
| MIST | `#c2c9d4` |
| PLUM / plum-fg | `#48193e` / `#fefefe` |
| ring / success / warning / danger | `#5fdd85` / `#5fdd85` / `#f0b849` / `#ff6b5a` |
| Old blue/terracotta tokens | **none in CSS**. Survivors: `layout.tsx` `themeColor: "#17506e"`, `manifest.ts` `theme_color: "#17506e"`, `background_color: "#fbf7f0"`, `hero-arch.svg` (`#17506e`, `#bf5b3e`), shadow tint `color-mix(#2e2b25 …)` |

Fonts: **Poppins only** (`next/font/google`, display 600/700, ui 300–600, latin subset). No Arabic webfont; Arabic falls to `Geeza Pro / Noto Sans Arabic / sans-serif`; `--font-display-family` has no Arabic fallback. Type scale: no custom tokens — `body 15px/1.55`, one `eyebrow` utility (11px, 0.2em tracking), arbitrary `text-[…]` in 10 files. Radius: `--radius-sm/md/lg/xl = 8/16/28/32px`; **`rounded-full` hard-coded in the Button base and ChoiceChip** (32 usages; cards use `rounded-xl`). Shadows: 4 steps, ink-tinted. Spacing: Tailwind defaults, `px-5` columns, safe-area via `env()`. Dark only — there is no light theme despite the `globals.css` comment "Light theme only".

**Palette verdict: C — mixed, cleanly split.** CSS tokens = Khotwa (black / mint / plum / mist, zero blue). Metadata colours, manifest, hero SVG artwork, shadow tint and `DESIGN_BRIEF.md` = old Siyaha.

## 7. Routes (runtime: all 200; `/nope` → 404)

| Route | Screen | Purpose | Works? | Main components |
|---|---|---|---|---|
| `/` | `HomeScreen` | Hero + inspiration composer + 3 moods + 3 popular | YES | AppHeader(locales), MediaCard, InspirationComposer, VoiceCapture, RecognitionReveal, BottomNav |
| `/onboarding` | `OnboardingFlow` | 3 steps → inline ProcessingScreen | YES | ChoiceChip, MediaCard tiles, InspirationComposer, ProcessingScreen |
| `/trip` | inline `TripPage` | Map + metrics + timeline + Adapt/Start | YES (seeds golden trip if store empty) | TripMap, TripMetrics, TripTimeline, AdaptSheet(vaul) |
| `/experience` | `ExperienceScreen` | Stop-by-stop day | YES (auto-`startTrip()` if landed directly) | ProgressRail, TripMap, MediaCard, CulturalSheet(`<dialog>`), TripTimeline, AdaptSheet |
| `/explore` | `ExploreScreen` | Browse/search 25 POIs | YES — **cards are not clickable (dead end)** | search input, ChoiceChip filters, MediaCard rails |
| `/saved` | `SavedScreen` | Shows passport stamps (no bookmark feature exists) | YES (empty until a stop is visited) | MediaCard |
| `/passport` | `PassportScreen` | Stamp collection | YES | motion stamps, ornaments |
| API | `POST /api/analyze` (Gemini), `POST /api/extract` (**no caller**), `POST /api/route` (OSRM), `POST /api/transcribe` (Groq), `GET /api/weather` (Open-Meteo) | all answered 200 during probe (weather returned real `24° Sunny`; route returned real OSRM geometry) |

## 8. Core user flow (as implemented, verified by clicking)

```
HOME (/)
 ├─ drop/choose/paste screenshot → POST /api/analyze (≥1.4 s floor) → RecognitionReveal (full-bleed)
 │     → "Build a day around this" → patch profile {destination, detectedPlace, detectedPoiId, sources:[image]}
 ├─ "Paste a link" → client-side regex → {platform,url} (no fetch)
 ├─ "Speak" → MediaRecorder → POST /api/transcribe
 ├─ "Just explore" → sources:[manual]
 ├─ 3 mood tiles / 3 popular rows → interests preset, sources:[preset]
 └─ all six paths → router.push("/onboarding")
ONBOARDING (/onboarding)  step 1 auto-skipped whenever profile.sources.length > 0 → lands on STEP 2
 ├─ Step 2 "Your vibe": 6 tiles, max 3 (oldest dropped), "Continue"
 ├─ Step 3 "Your day": time / budget / pace, all optional, "Build my trip"
 └─ setBuilding(true) → <ProcessingScreen> rendered in place (URL stays /onboarding)
PROCESSING  buildTrip(profile) [local match+schedule, optional POST /api/route for geometry] raced vs 10 s → golden fallback
 └─ onReady(trip) → setTrip → router.push("/trip")     measured: click → /trip in ≈2.5 s
TRIP (/trip)  map + 4 metrics + timeline ; "Adapt my day" (outline) | "Start trip" (filled)
 └─ startTrip() → router.push("/experience")
EXPERIENCE (/experience)  rail → map → hero card → "Read the story" (filled) / Navigate / Visited → next stop → timeline
 └─ sticky "Adapt my day" (filled) → vaul sheet → Less walking (real) | Less time / Spend less / Rainy day (no-op "Nothing to improve here")
 └─ Visited → markVisited → passport stamp → /passport and /saved
```

All steps work and are demo-ready in the sense of "no crash, no dead end". Caveats: recognition is canned (§17); onboarding step 1 is never seen from Home; Explore has no exit into the flow.

## 9. Home screen

- **Primary CTA:** none is a filled button. The dominant control is the drop-zone label "Add a screenshot" (mint circular icon in a zellige arch). Sub-hint: "Drop a screenshot, choose a file, or paste one."
- **Secondary actions:** "Paste a link" (outline), "Speak" (outline), "Just explore" (quiet), 3 mood tiles, 3 popular rows, Passport icon (header), EN/FR/AR switch, 5-tab bar.
- **Major entry points into onboarding: 9** (image, clipboard paste, link, voice, just-explore, 3 moods, 3 popular → 4 composer paths + explore + 6 presets).
- **Hero structure (HEAD):** `MediaCard src="/images/hero-arch.svg" ratio="hero" scrim max-h-[46dvh]`, h2 `text-primary-foreground` (black text) over `from-foreground/90 via-foreground/35` (white→transparent) gradient.
  **Hero structure (working tree, uncommitted):** `<video src="/videos/hero.mp4" poster="/images/hero.webp" autoplay muted loop>` in `h-[46dvh]`, gradient `from-background via-background/45`, h2 `text-foreground`.
  **Screenshot (01-home.png):** real Hassan II sunset photo, dark scrim, white title.
- **Copy:** eyebrow "Casablanca-Settat" · h2 "Turn what you saw into where you go" · sub "One screenshot becomes a day: mapped, timed and told." · sections "What inspired you?", "Start from a feeling", "Popular in the region".
- **Navigation:** sticky AppHeader + sticky 5-tab BottomNav.
- **Known bugs in code:** zero `TODO/FIXME`. Splash, RecognitionReveal use `.app-anchored` fixed-in-phone technique.

| Question | Answer | Evidence |
|---|---|---|
| Old hero width bug still exists? | **NO** at runtime | `documentElement.scrollWidth === 390`, hero rect 390 wide, no element overflowing x at 390 or 430; `.app-stage` was switched from grid to flex (`globals.css` comment) precisely for this |
| Old white scrim still exists? | **CHANGED** — YES at HEAD, NO in working tree / runtime | HEAD `media-card.tsx`: `from-foreground/90` (= `#fefefe`) + black h2 on an ivory SVG; working tree: `from-background`; screenshot shows dark scrim |
| Too many equal-weight entry points? | **YES** | 9 entry points, no filled hero CTA; "Add a screenshot" is a label, "Paste a link"/"Speak" are same-size outline buttons, 6 photo tiles below |

## 10. Onboarding

| Step | Title / lead | Choices | Defaults | CTA | Skip |
|---|---|---|---|---|---|
| 1 "Your inspiration" — "Give us whatever you have. We understand the rest." | full InspirationComposer (or read-back card + "Change" if a source exists) | none | "Continue" (if summary) | **"Skip"** button (composer view) → `sources+manual`, step 2 |
| 2 "Your vibe" — "Two or three is plenty." | Culture & Heritage, Food, Coast & Nature, Local & Hidden Gems, Art & Creative, Activities & Adventure (arch photo tiles) | `interests: []` (2 prefilled by a mood preset) | "Continue" (enabled at 0 chosen) | none |
| 3 "Your day" — "Nothing here is required." | TIME A few hours/Half day/Full day · BUDGET Low/Medium/Premium · PACE Relaxed/Balanced/Explorer | all `null` | "Build my trip" + "You can change all of it afterwards." | none |

- Defaults preselected? **No** — everything null/empty; the engine handles empty profiles.
- "Just explore" still exists? **Yes**, inside the composer (Home and step 1).
- "Skip" still exists? **Yes**, step 1 only.
- Equivalent? **Behaviourally yes** (both patch `destination ?? Casablanca` + `sources:["manual"]`), **but separate handlers**: Just explore on Home navigates to `/onboarding` (which then skips step 1); Skip inside onboarding calls `setStep(2)`.
- Changed since previous audit? The audit only recorded "3 steps, nothing mandatory, 6 vibe tiles" — all still true. Step 1 is now auto-skipped whenever a source exists (so Home visitors never see it) — UNKNOWN whether that predates the audit.
- Data collected → `AppState.profile: TripProfile` (`siyaha:v1:profile`), e.g. `{destination:"Casablanca", detectedPlace:"Hassan II Mosque", detectedPoiId:"poi-hassan-ii", interests:[], timeAvailable:"half_day", budgetLevel:null, pace:null, sources:["image"]}` (captured from localStorage).

## 11. Processing screen

Visual: centred column on bare shell (no header/tabs) — eyebrow `CASABLANCA`, rotating 8-point zellige star outline (24 s loop), 3-row step list; active row = pill surface + pulsing mint dot; done rows = plum check. No spinner, no progress bar. `aria-live="polite"`.

Stages: 1 "Analyzing your inspiration" · 2 "Matching experiences" · 3 "Optimizing your route".

| | |
|---|---|
| **VISUAL / TIMER STATE** | `setTimeout` 950 ms → stage 2, 1800 ms → stage 3; `PROCESSING_MIN_MS = 2400` floor. Stage advancement is **timer-driven** and unrelated to what the pipeline is doing. |
| **REAL PIPELINE STATE** | `Promise.race([buildTrip(profile).catch(golden), wait(10 000).then(golden)])`. `buildTrip` = local matching engine + local scheduling + one optional `POST /api/route` (geometry only, 4 s × 3 timeout). Navigation to `/trip` waits for **the real promise AND the 2.4 s floor**. |
| Measured | click → `/trip` ≈ 2.5 s (URL changed between the 1.6 s and 3.1 s samples). Docstring promises "7–10 s perceived window"; reality is 2.4 s. |

Stage "Analyzing your inspiration" is decorative: no AI runs at build time (recognition happened on Home).

## 12. Trip / itinerary (`/trip`)

Top→bottom: header (eyebrow city, "Your day", "4 stops", weather chip `24° · Sunny` from Open-Meteo) → map `h-[42dvh] min-h-64` → 2×2 metrics card (Walking / By car / Moving / Est. cost, count-up 700 ms) → timeline (compact 64 px rows: number node, 56 px thumb, time, name, duration) → sticky footer "Adapt my day" (outline) + "Start trip" (filled) → tab bar. Route connector = a flex child `span.bg-border.min-h-8.w-px.flex-1` inside a row-direction flex parent. Transport leg row = 24 px icon disc + text `Walk · 1.2 km · 16 min` / `Car · 3 km · 8 min`. No story, tip or "why this stop" text anywhere on `/trip`. Photography: `PoiImage` → `media.heroImage` with `onError` → category image.

| Question | Answer | Evidence |
|---|---|---|
| Connector still renders incorrectly? | **YES** | `w-px flex-1` in a row flex → basis 0 + grow fills the 36 px column: screenshot 04-trip.png shows a solid grey ~36×32 block left of each leg, no rail beside stop rows |
| Stops still inside large cards? | **CHANGED** — compact rows | `min-h-16 rounded-xl border p-2.5` rows, thumbnail 56 px |
| Walking and driving identical styling? | **YES** (timeline) / NO (map) | `trip-timeline.tsx` ternary returns the same class for both modes (`bg-primary-soft text-primary`); only the lucide icon differs. On the map walking = dashed mint, car = solid mist — distinct |
| "By car 0 m" still appears? | **YES** | Default golden trip is all-walking → metrics tile "By car / 0 m" (screenshots 07-adapt-sheet.png, 08b-trip-ar.png, 10-desktop). Generated trips show real km. `formatDistance(0)` has no zero case. Also: "Est. cost **140–140 MAD**" on the generated trip (degenerate range, 04-trip.png) |
| Stories in the main flow? | **NO** on `/trip`; YES on `/experience` via "Read the story" sheet and on Explore hero card | `cultural.story/tip` rendered only in `cultural-sheet.tsx` and `explore-screen.tsx` |

## 13. Map

- MapLibre GL 6.6.0, lazy (`dynamic`, `ssr:false`), worker shipped via `scripts/sync-map-worker.mjs` (Turbopack workaround).
- Style: `NEXT_PUBLIC_MAP_STYLE_URL ?? https://tiles.openfreemap.org/styles/dark` → **dark** style is what loads (no `.env.local`; `.env.example` says `positron`). Runtime requests: `styles/dark`, `planet`, sprites `ofm@2x`, Noto Sans glyphs — all 200.
- Markers: DOM `<button>` `Marker`s labelled `stop.order` (1-based, same as timeline and rail) — **no index mismatch**. Active pin larger + ring.
- Route line: GeoJSON source + 3 layers (casing / walk dashed `--primary` / car solid `--mist`), geometry from OSRM via `/api/route` when available, else straight lines. `fitBounds(padding 64, maxZoom 15)` on load and on stop change. **No `flyTo`** — selecting a stop never recenters.
- Sync: shared `activeStopId`; pin click → mini card; timeline click → pin restyle; "View stop" → `scrollIntoView`.
- Attribution: `attributionControl: { compact: true }`, **no custom CSS**; renders expanded (`maplibregl-compact-show`) as a white 352×24 px bar at the map's bottom edge. Controls: none (`dragRotate:false`).
- Error/fallback: "Map unavailable — your day is right below." only if `error` fires before `load`; the listener is attached after the constructor, so MapLibre 6's synchronous "WebGL2 is required" error is missed → silent blank box on no-WebGL2 clients (code-level, not reproduced).

| Question | Answer | Evidence |
|---|---|---|
| Attribution still covers content? | **YES** | Measured: attribution rect y 414–438 in a map ending at 448; mini card's "View stop"/"Navigate" buttons sit at the same y → attribution bar overlays the buttons (04-trip.png). On `/experience` the bar wraps to 2 lines and fully covers the card's Navigate button (05-experience.png) |
| Pin/card index mismatch? | **NO** | both use `stop.order` |
| MapLibre console errors | none. Warnings: `Image "wood-pattern" could not be loaded…` (OpenFreeMap dark style references a sprite image that is missing) ×1 per map; GPU `ReadPixels` stall warnings (headless SwiftShader only) |

## 14. Experience mode (`/experience`)

Purpose: run the day. Layout is a scrolling list: header (back, "Experience mode", city, "Morocco Passport" pill) → 4-circle ProgressRail → map `aspect-[16/10]` (mini card with Navigate only) → hero MediaCard (order badge, "YOU ARE HERE" + name overlaid on photo) → "Arrive 09:30 · Stay 1 h 10" → **"Read the story" (filled, lg)** → Navigate / Visited (outline, sm) → "Next stop" row → "The day ahead" full timeline → sticky **"Adapt my day" (filled, full width)**.

- Stop progression: forward-only; `markVisited` marks visited, promotes next to `current`, adds passport stamp, advances `activeStopId`. Any stop selectable via rail/pin/timeline. No "previous".
- Story: `<dialog>` sheet with `cultural.story` + "GOOD TO KNOW" tip (real dataset text — verified: Ancienne Médina story renders), "Visited" inside the sheet, "Listen" only if audio exists (none does).
- Visited state: `visitState` per stop; visited rows dimmed + check; rail turns plum.
- Adapt: same vaul sheet as `/trip`. On `/experience`, `changedSegmentIds` is not passed to the map → no route-rewrite animation there.

| Question | Answer | Evidence |
|---|---|---|
| Two competing primary CTAs? | **YES** | "Read the story" and "Adapt my day" both filled `bg-primary`, both visible without scrolling (05-experience.png); "Open passport" makes three on completion |
| Does Adapt My Day work? | **PARTIAL** | "Less walking" is real: 6.4 km → 1.5 km walking, car 0 → 6 km, moving 1 h 22 → 42 min, banner "77% less walking · ~40 min saved", Undo restores (07b-adapt-result.png). "Less time", "Spend less", "Rainy day" are placeholders returning "Nothing to improve here" |

## 15. Imagery

16 webp + 2 svg tracked (1.86 MB) + untracked `hero.webp` (125 KB) + untracked `videos/` (0.7 MB). Tracked webp inventory: `poi/` 6 (896×1120, corniche 1200×1500), `vibes/` 6, `popular/` 3.

- **Real photographs vs generated:** `scripts/generate-placeholders.py` emits pure-SVG zellige fields at 1200×1500 / 900×1125 / 1200×750. Commit `6f32706` shipped exactly those. **HEAD `e5b6a4b` replaced all 13 and added 2**; 12/15 now have dimensions the script cannot produce, and viewing them confirms they are photographs (Hassan II at sunset, market, medina arch, corniche, Sacré-Cœur). Verdict: **all 15 tracked webp are photographic; 0 generated placeholders remain in use** (the `.py` script and `placeholder.svg` still exist; comments in `golden-pois.ts` / `poi-utils.ts` still call them "art-directed placeholders" — stale). Provenance/licensing of the photos is **UNKNOWN** — no commit body, no credits file.
- **Duplicates (byte-identical):** `poi/sacre-coeur.webp` ≡ `vibes/art.webp`; `poi/ancienne-medina.webp` ≡ `vibes/hidden-gems.webp`.
- **Unused:** `hero-arch.svg` (HEAD still references it as the Home hero; working tree drops it). `BASE_ROUTES.heroImage` points at 5 non-existent `.jpg`s (no consumer).
- **Fallback:** `MediaCard`: `src → fallbackSrc → /images/placeholder.svg`; `PoiImage`: `heroImage → fallbackImage` (category photo). `placeholder.svg` (ivory→blue Siyaha art) is also the PWA icon and RecognitionReveal falls back to `hassan-ii.webp`.

| POI | Image path | Real photo? | Unique? |
|---|---|---|---|
| Mosquée Hassan II | `/images/poi/hassan-ii.webp` | Yes | Yes |
| Quartier Habous | `/images/poi/habous.webp` | Yes | Yes |
| Marché Central | `/images/poi/marche-central.webp` | Yes | Yes |
| Espace Sacré-Cœur | `/images/poi/sacre-coeur.webp` | Yes | **No** — same file as `vibes/art.webp` |
| Ancienne Médina | `/images/poi/ancienne-medina.webp` | Yes | **No** — same file as `vibes/hidden-gems.webp` |
| Corniche Aïn Diab | `/images/poi/corniche-ain-diab.webp` | Yes | Yes |
| Cité Portugaise (El Jadida) | `/images/poi/cite-portugaise-mazagan.webp` | **file missing** → falls back to `vibes/culture.webp` (Hassan II photo) | — |
| Médina d'Azemmour | `/images/poi/azemmour-medina.webp` | **file missing** → `vibes/hidden-gems.webp` (= Ancienne Médina photo) | — |
| 17 other POIs | `/images/poi/<slug>.webp` | **file missing** → category photo | — |

6 of 25 POIs have their own hero; 19 show a category photo (so e.g. every El Jadida culture POI shows the Hassan II sunset).

## 16. Dataset (`src/data`)

25 POIs, region `Casablanca-Settat`: Casablanca 13, El Jadida 5, Oualidia 4, Azemmour 1, Mohammedia 1, Boulaouane 1. Every POI has `coordinates` + `coordinateType: exact|representative`, `cultural.story` and `cultural.tip` as full `{en,fr,ar}` (tests assert >80 / >20 chars per locale), `localizedName {fr,ar}` (**no `en`; `name` is the French form — Arabic UI shows "Quartier Habous" in Latin**), 2–3 `categories` (= the 6 interests), 4–6 `tags`, `openingHours` (13 null, others full weekly with `needsVerification: true`), `priceRange` (13 free, …), `verification` (16 verified / 9 needs_verification), `availability.status` (22 open, 1 temporarily_unavailable — Citerne Portugaise, 2 unknown, 1 seasonal), `sources` (23 → shared OSM constant; Boulaouane adds Wikidata Q12232935; **golden 4 have none**), `media {heroImage, fallbackImage, heroVideo:null}`, `cultural.audio` (unused), `priority 1–5`, `signature`, `hero`, `walkingScore`, `baseRouteIds`. 6 `BASE_ROUTES` templates (header comment says five). Example: `poi-hassan-ii` — 33.60847,-7.6326 exact, 09:00–17:00, 90 min, 60_150 / approx [140,140] MAD, tags atlantic/guided visit/zellige/minaret/sunset, priority 5, signature.

## 17. AI / recommendation — real vs simulated

**No `.env.local` exists → `GEMINI_API_KEY`, `GROQ_API_KEY`, `ROUTING_API_KEY` are all absent → every AI path below runs its degraded branch today.**

| Capability | REAL implementation (with keys) | TODAY (observed) |
|---|---|---|
| Screenshot recognition | `/api/analyze` → Gemini `gemini-2.5-flash` JSON prompt, 8 s bound; POI id resolved locally by `resolvePoiId` | Route returns `{ok:true, degraded:true, result:EMPTY_ANALYSIS}`; client `recogniseImage` treats `detectedPlace:null` as failure → returns **`GOLDEN_RECOGNITION` = "Hassan II Mosque, Casablanca", labels atlantic/guided visit/zellige**. Verified: a plain teal canvas PNG was "recognised" as Hassan II Mosque (03b-recognition-reveal.png). `confidence:null` → no score chip. |
| Link processing | `OpenGraphSocialProvider` in `/api/extract` (OG scrape, 3 s) | **Never called** — no client references `/api/extract`. UI parses host → platform client-side only. |
| Voice | `/api/transcribe` → Groq Whisper | `{degraded:true, text:""}` → VoiceCapture shows a failed state; CTA not blocked |
| Recommendation | `lib/matching/engine.ts`: deterministic scoring (priority×5, +34 route membership, +34/+20 interest hits, budget, walking pref, distance gravity `14·e^(−m/6000)`, availability penalties), 2+1+1 selection, exactly 4 stops | same — local, no keys needed |
| Itinerary generation | `buildTrip`: match → schedule (09:30 start, pace multiplier) → local haversine legs → `/api/route` geometry only → `calculateMetrics` | same; OSRM geometry did load (route polyline followed streets) |
| Route optimisation | `orderNarratively`: brute-force 24 permutations maximising phase affinity (morning→sunset). **No TSP, no distance term** | same |
| Adaptation | `less-walking.ts`: walking legs >1800 m → car (×1.25 detour, +3 min); other 3 types are `noChange` placeholders | same |
| Weather | `/api/weather` → Open-Meteo, no key | **real** (`24°, sunny` returned) |
| Fallback/demo | `goldenFallback` / `cloneGoldenTrip()` on any throw or 10 s timeout; `/trip` seeds golden trip on empty store | |

Env var names: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GROQ_API_KEY`, `GROQ_MODEL`, `ROUTING_API_KEY`, `ROUTING_BASE_URL`, `WEATHER_BASE_URL`, `NEXT_PUBLIC_MAP_STYLE_URL`, `NEXT_PUBLIC_APP_URL`. External services: Google Gemini, Groq, OSRM public demo server, Open-Meteo, OpenFreeMap tiles, Google/Apple Maps deep links.

## 18. RTL / languages

Locales `en`, `fr`, `ar` (store + localStorage, switch in Home header only). `<html lang="en" dir="ltr">` is hard-coded; a client `useEffect` flips `lang`/`dir` after hydration (Arabic first paint is LTR). Logical CSS: clean — 0 physical `ml-/mr-/pl-/pr-/left-/right-`; `text-start`, `ms-/ps-/pe-`, `inset-inline`, `rtl:rotate-180` on back arrow. Runtime: `dir="rtl"`, layout mirrors correctly (08b-trip-ar.png). Arabic font: system fallback (no webfont). Number formatting: `Intl.NumberFormat(locale)` only in `formatDistance`; `formatDuration` ignores locale; price inlined `${min}–${max} ${t("common.mad")}`; times are raw `HH:mm`. No `<bdi>`, no `dir="ltr"` wrappers, no `unicode-bidi`, no Arabic-Indic digits. `common.km`/`common.minutes` Arabic strings exist but are never used.

Observed Arabic strings (trip screen):

| Value | Rendered | Status |
|---|---|---|
| time `09:30` | `09:30` | OK (Latin, isolated) |
| distance 6.4 km | `km 6.4` (unit before number) | **STILL BROKEN** visually |
| duration 1 h 22 | `h 22 1` | **STILL BROKEN** (order scrambled) |
| price 180–200 MAD | `200–180 درهم` | **STILL BROKEN** (range reversed) |
| leg `Walk · 2.4 km · 30 min` | `km · 30 min 2.4 · مشي` | **STILL BROKEN** |
| eyebrow / POI names | `CASABLANCA`, `Quartier Habous` in Latin | untranslated (no `en`/`ar` name shown; dataset has `ar` names but UI uses `name`) |

**Verdict: Arabic numeric issue STILL BROKEN.** Tests cover none of this (only `direction("ar")==="rtl"` and one hero-title render).

## 19. Mobile shell

Structure: `body > .app-stage (flex, centre) > .app-phone (--app-w × --app-h) > #app-viewport (overflow-y:auto, overscroll contain, hidden scrollbar)`. Mobile: `--app-w:100%`, `--app-h:100dvh`, radius 0. Desktop ≥1024: 380×780 (HEAD) / `min(780px, 100dvh − 5.5rem)` (working tree), 12 px black bezel via box-shadow, radial mint glow, brand lockup + decorative arcs on stage (10-desktop-stage-1280.png: phone 380×780 centred). No transform on the phone, so `position:fixed` overlays use `.app-anchored` to pin to the device box.

Measured at 390×844: `scrollWidth 390`, viewport `scrollHeight 1226`, no horizontal overflow, sticky footer+tab block 132 px at bottom. At 430×932: header 94 px, map 391 px, nav 59 px, `scrollWidth 430`, clean. Safe areas: `viewportFit:cover`, `env(safe-area-inset-top)` on header, `-bottom` on the lower of footer/nav (no double gap), sheets and reveal. Tab bar: 5 tabs (Home, Explore, Trip, Saved, Profile), sticky inside the viewport, on every tabbed screen; **absent** on onboarding/processing/experience (intentional). Sheets: hand-rolled `<dialog>` (story) + `vaul` (adapt) — two sheet systems coexist. Splash: 900 ms once per session.

**Structural mobile-native score: 7/10.** Solid: single scroll container, sticky footer, safe areas, no overflow, tab bar everywhere. Missing: no pull-to-refresh guard on stage, no swipe-back, header+tabs+footer eat 285 px of 844 on `/trip` (34 %), map doesn't recenter on selection, Explore filter rail is the only horizontal gesture.

## 20. Run

Reused the existing dev server (pid 24240, `next dev`, cwd = this repo, Turbopack, Node 26). `http://localhost:3000` → 200 in 38 ms; all 7 routes 200, unknown route 404. Console: **0 errors**. Warnings: MapLibre `wood-pattern` sprite missing (OpenFreeMap dark style), Next `Image … LCP` hint on POI hero (`/experience`), GPU stall (headless only). Broken requests: 0 (two `ERR_ABORTED` on navigation — normal). Stale `.next`: not suspected (hot reload picked up the parallel session's edits between captures).

## 21. Screenshots (`docs/current-status/screenshots/`, 390×844 @2x unless noted)

`01-home.png` · `02-onboarding.png` (step 1 direct) · `02-onboarding-step2.png` · `02-onboarding-step3.png` · `03-processing.png` / `03-processing-b.png` (t≈0.4 s / 1.6 s) · `03a-recognition-analyzing.png` · `03b-recognition-reveal.png` · `04-trip.png` (generated trip) · `05-experience.png` · `05b-experience-story.png` · `06-explore.png` · `07-adapt-sheet.png` · `07b-adapt-result.png` · `08-home-ar.png` · `08b-trip-ar.png` · `08c-experience-ar.png` · `09-home-430.png` / `09b-trip-430.png` (430×932) · `10-desktop-stage-1280.png` (1280×900).

All screens reachable. Note the Chrome extension was unavailable; captures were made with headless Chrome over CDP (SwiftShader WebGL — map tiles rendered).

## 22. Visual status (strict, from screenshots only)

| Screen | Mobile-native | Hierarchy | Brand consistency | Product identity | Demo quality |
|---|---|---|---|---|---|
| Home | 7 | 6 — big photo + title, then a dark composer box whose only "CTA" is an icon; 3 outline buttons of equal weight | 7 | 7 | 7 |
| Processing | 8 | 7 — clean, but a black screen with a spinning outline for 2.5 s | 8 | 6 | 7 |
| Trip | 7 | 5 — attribution bar slices through the mini-card buttons; grey connector block; `140–140 MAD`; two equal footer buttons | 7 | 7 | 5 |
| Experience | 7 | 4 — two filled CTAs; attribution wraps over the card; "YOU ARE HERE" eyebrow illegible on the photo; map+card+hero stack repeats the same stop three times | 7 | 6 | 5 |

Other observations: onboarding vibe tiles show clipped glyph fragments at the top-left of each arch (selection badge cut by the arch clip-path) and labels sit on the photo without a scrim (02-onboarding-step2.png); Explore is the most polished screen.

## 23. Previous-audit status check

`Khotwa-UI-UX-Audit.pdf` is **not in the repo**. The findings below are checked against current code + runtime regardless of source; `docs/IMPLEMENTATION_AUDIT.md` (2026-08-28, functional P0 audit) does not mention any of them.

| Previous finding | Current status | Evidence |
|---|---|---|
| No photography | **FIXED** (tracked) — 15 photos replaced placeholders in `e5b6a4b`; hero photo + 3 videos are **uncommitted** | §15, screenshots |
| Hero width collapse | **FIXED** at runtime | `scrollWidth` 390/430, hero full-bleed; `.app-stage` flex fix |
| Wrong (white) hero scrim | **STILL PRESENT at HEAD / FIXED in working tree** | `from-foreground/90` (HEAD) vs `from-background` (uncommitted) |
| Map attribution overlay | **STILL PRESENT** | bar overlays mini-card buttons on `/trip`, wraps over the card on `/experience` |
| Timeline connector blocks | **STILL PRESENT** | `w-px flex-1` → 36×32 grey block |
| Walk/car identical | **STILL PRESENT** (timeline) / **FIXED** (map line) | identical class ternary; dashed vs solid on map |
| Arabic number reversal | **STILL PRESENT** | `h 22 1`, `km 6.4`, `200–180` |
| Timer-driven AI progress | **PARTIAL** | stages on 950/1800 ms timers; final transition gated on the real promise |
| Too many Home entry points | **STILL PRESENT** | 9 entry points, no filled CTA |
| Pill monoculture | **STILL PRESENT** | `rounded-full` in Button base + ChoiceChip (32 uses); cards `rounded-xl` |
| Brand naming inconsistency | **PARTIAL** | user-facing = Khotwa; package/README/storage keys/PWA icon/brief = Siyaha; themeColor + manifest colours = old blue/ivory |

## 24. What changed since the audit (commits after `4b7cc61`, 2026-08-28 → 29)

**IMPLEMENTED:** MapLibre worker fix (map renders) · golden flow real end-to-end, Less-walking real on generated trips · Adapt reachable from Experience · contrast/depth/motion pass · Explore, Saved, tab bar on every screen · Organic design system → Khotwa palette (black/mint/plum/mist), Khotwa mark, splash, desktop "device on a stage" with brand · real photographs for all tiles/POIs (HEAD) · weather chip (Open-Meteo) · 90 tests.
**PARTIALLY IMPLEMENTED:** brand rename (UI only) · photography (6/25 POI heroes; 2 duplicates; 19 fall back to 4 category photos) · Adapt (1 of 4 modes) · video hero / mood clips (uncommitted, in flight right now).
**REGRESSED:** `themeColor`/manifest now contradict the palette (were consistent with the old ivory theme) · `DESIGN_BRIEF.md` now describes a palette that no longer exists · `.env.example` map style (`positron`) no longer matches the default (`dark`).
**NOT IMPLEMENTED:** attribution placement · connector · walk/car leg styling · Arabic number isolation · Home CTA hierarchy · Explore → flow link · cultural audio · `/api/extract` wiring · Arabic POI names in UI · PWA icon.

## 25. Blockers

**P0 — prevents demo / broken**
- None that crash. Two P0-class *risks*: (a) **the working tree is being edited by a parallel session** — uncommitted hero video + scrim + shell changes can be lost or conflict with the next iteration; (b) **no API keys → recognition is 100 % canned**: any image → "Hassan II Mosque". If the pitch claims live recognition this is a credibility blocker; if the demo uses the Hassan II screenshot it is invisible.

**P1 — major visible**
- Attribution bar overlaps the map mini-card buttons (`/trip`) and covers Navigate (`/experience`).
- Two filled primary CTAs on `/experience`.
- Arabic numerals/units scrambled (`h 22 1`, `km 6.4`, `200–180`).
- Timeline connector renders as a grey block; walk/car legs indistinguishable.
- "By car 0 m" on the default golden trip; "140–140 MAD" on generated trips.
- Home: no filled CTA, 9 equal-weight entry points.

**P2 — quality**
- 19/25 POIs show a category photo; two POI heroes duplicate vibe tiles; missing-image "fallback" means El Jadida shows Hassan II.
- Onboarding tiles: clipped glyphs at arch top-left; labels without scrim.
- Explore cards are not tappable (dead end); Saved promises a save action that doesn't exist.
- `themeColor #17506e` / manifest ivory + Siyaha placeholder as PWA icon.
- Arabic UI shows Latin `CASABLANCA`, Latin POI names, Latin `khotwa` wordmark; no Arabic webfont; first paint LTR.
- Map never recenters on stop selection; adaptation animation missing on `/experience`.
- `.env.example` vs runtime default map style; `wood-pattern` warning from the dark style.

**P3 — polish**
- Pill monoculture; `StartTripButton` dead code; two sheet implementations; stale comments ("Light theme only", "art-directed placeholders", "five templates"); `package.json`/README still Siyaha; `hero-arch.svg` orphaned (working tree).

## 26. Demo readiness — hero flow

| Step | Status | Note |
|---|---|---|
| HOME | WORKING | |
| INSPIRATION | WORKING | image / link / voice / explore / presets all reach onboarding |
| RECOGNITION | PARTIAL | works visually; result is always the golden Hassan II fallback (no key) |
| INTENT | WORKING | steps 2–3 |
| PROCESSING | WORKING | 2.5 s, timer stages, real completion gate |
| TRIP | PARTIAL | functional; P1 visual defects (attribution, connector, 0 m / 140–140) |
| EXPERIENCE | PARTIAL | functional (story, navigate, visited, passport); two primaries, attribution over card |
| ADAPT | PARTIAL | Less walking real with undo; 3 of 4 options are no-ops |

**DEMO READINESS: 64 / 100.** Top 5 reasons: (1) every step runs without crash or dead end, offline-safe, 90 tests green; (2) recognition is canned — fine for the scripted screenshot, fragile for any other; (3) the two screens the jury stares at longest (`/trip`, `/experience`) carry the most visible defects (attribution overlap, connector block, competing CTAs, `0 m`); (4) Arabic is structurally right (RTL, translations) but every number reads wrong; (5) the working tree is mid-edit by another session — what will be demoed is not yet what is committed.

## 27. What must not be touched (working, stable, evidenced)

- **Map engine**: worker shipping script, style/tiles, 4 numbered pins, OSRM geometry, fitBounds, two-way `activeStopId` sync, changed-segment animation on `/trip`.
- **Matching engine + scheduler** (`lib/matching/engine.ts`): deterministic, exactly-4-stops guarantee, 21+ unit tests, narrative ordering.
- **`buildTrip` / fallback ladder** (`Promise.race`, golden fallback, never-throw API routes): the reason nothing can hang.
- **Less-walking adaptation + `calculateMetrics` + Undo** (verified numbers 6.4→1.5 km, 77 %/~40 min).
- **Dataset** (25 POIs, trilingual story/tip, verification flags, tests).
- **Mobile shell** (`.app-stage/.app-phone/#app-viewport/.app-anchored`, safe areas, sticky footer+tabs): measured clean at 390/430/1280.
- **RTL layout plumbing** (logical properties, `dir` flip) — only the number formatting on top of it is broken.
- **Store + persistence** (`siyaha:v1:*`, passport stamps): rename the prefix only with a migration.
- **Recognition reveal + composer** (all input paths reach onboarding; 1.4 s floor hides the canned answer).

## 28–29. Files

Created by this inspection: `docs/CURRENT_APP_STATUS.md`, `docs/current-status/screenshots/*` (20 PNG). Nothing else was modified.
