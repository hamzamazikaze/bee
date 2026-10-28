# SIYAHA / KHOTWA — JURY INTELLIGENCE REPORT

**Audit date:** 2026-08-30 · **Commit at audit start:** `cd79d3c` · **Branch:** `main` · **Tree:** clean at start
**Note:** a parallel session was editing this repository throughout the audit. It rewrote the generation screen at 14:02 (see the ADDENDUM) and committed an in-progress copy of this report as `70692d5`. Every finding below was re-verified against the tree as it stood at 14:10.
**Method:** full source read of `src/` (224 files), `docs/` (20 files), `public/`, `scripts/`; dataset statistics computed by executing the real data modules through Vitest; the four quality gates run; five live API calls made against the running dev server on `localhost:3000` with the project's own keys.
**Nothing in the application was modified.** Two temporary test files were created inside `src/` to compute statistics and were deleted immediately after execution.

> This report is written to be handed to a hostile jury simulator. It is deliberately unflattering where the code is unflattering. Marketing language has been stripped out. Every load-bearing claim carries a file reference.

---

## 0. THE THIRTY-SECOND SUMMARY OF WHAT IS ACTUALLY TRUE

- The product is a **mobile-first Next.js 16 PWA with no backend, no database and no auth**. Everything runs in the browser plus seven thin Next.js route handlers that exist only to hold API keys.
- The trip itself is built by a **839-line deterministic, pure, synchronous TypeScript engine** (`src/lib/matching/engine.ts`). It is genuinely the decision-maker. This is the strongest technical asset in the repository.
- **Two different AI postures coexist and they contradict each other.** The onboarding path ("AI understands, the engine decides") is grounded and cannot invent a place. The `/chat` guide path lets the model **author entirely new POIs with model-invented coordinates, prices and opening hours**, and the UI renders them under a shield icon labelled *"Verified places"* next to a line that says *"It never invents a location or a coordinate."* This is the single most dangerous thing in the project.
- The dataset is **36 hand-curated POIs**, not 25 as the code comments and docs claim. 22 of them are in Casablanca. The region beyond Casablanca is thin (El Jadida 6, Oualidia 5, Azemmour 1, Mohammedia 1, Boulaouane 1).
- **All four quality gates pass**: lint, typecheck, 356 tests, production build.
- The "local impact" number is **honestly computed and defensible** — it is a floor summed from curated prices, not an invented percentage.
- Several documents in `docs/` are **stale relative to the code** and would make the presenter say things that are no longer true.

---

## PHASE 1 — REPOSITORY RECONNAISSANCE

### 1.1 Stack (verified from `package.json`, `pnpm-lock.yaml`)

| Concern | Actual |
|---|---|
| Framework | `next@16.3.3` (App Router, Turbopack), `react@19.2.8`, `react-dom@19.2.8` |
| Language | TypeScript `^5`, `strict: true` (`tsconfig.json:7`) |
| Package manager | `pnpm@11.10.0` (`pnpm-workspace.yaml` present, single package) |
| Styling | `tailwindcss@^4` + `@tailwindcss/postcss`, `class-variance-authority`, `clsx`, `tailwind-merge`. One shadcn-style component only (`src/components/ui/button.tsx`) |
| Animation | `motion@^13.1.1` (Framer Motion successor) |
| Map | `maplibre-gl@^6.6.0` |
| Icons | `@phosphor-icons/react@^2.1.10` |
| State | `zustand@^5.0.15`, one store, hand-rolled `localStorage` persistence |
| Validation | `zod@^4.4.3` |
| Sheets | `vaul@^1.1.2` |
| Tests | `vitest@^4.1.11`, `@testing-library/react`, `jsdom` |
| Server-only guard | `server-only@^0.0.1` |

**There is no separate backend.** No Express, no Nest, no Python, no database driver, no ORM, no auth library, no queue. The "backend" is 13 Next.js route handlers.

### 1.2 Meaningful repository tree

```
src/
  app/                       Next.js App Router — 12 pages + 13 API route handlers
    page.tsx                 Home
    onboarding/page.tsx      3-step planner + processing + reveal
    trip/page.tsx            The result screen (map + timeline + adapt)
    experience/page.tsx      "Day is running" mode
    chat/page.tsx            The conversational guide (AI-first path)
    explore/page.tsx         Editorial browse over the dataset
    explore/[category]/      Per-category listing
    saved/ passport/         Kept places, stamps, wallet, settings
    test-ai/ test-openai/ test-ai-darija/   DEV DIAGNOSTIC PAGES — SHIPPED IN THE PROD BUILD
    api/
      extract/route.ts       THE understanding endpoint (text|voice|url|image → TripIntentDraft)
      analyze/route.ts       Image-only vision endpoint (returns analysis + draft together)
      curate/route.ts        The day curator (OpenAI): which 4 of ours belong in this day
      chat/route.ts          One turn with the conversational guide (OpenAI), stateless
      transcribe/route.ts    Voice → text; Whisper-first with a Darija re-run on MoulSot
      route/route.ts         Batched OSRM segment routing (geometry only)
      weather/route.ts       Open-Meteo chip; 204 on any failure
      test-ai/* test-openai/*  6 diagnostic endpoints
  features/                  Screen-level composition, one folder per surface
    home/                    inspiration-composer (753 lines), analyze.ts (all client fetches),
                             recognition-reveal, voice-capture, presets, draft-summary
    onboarding/              onboarding-flow, steps, options, build-trip.ts (orchestration),
                             processing-screen, generation-panels/visual
    trip/                    trip-summary (incl. ProvenanceSheet), trip-timeline, trip-metrics,
                             day-check, day-glance, adapt-sheet, place-sheet, experience-block,
                             local-impact, poi-image, trip-insights.ts (all derived numbers)
    experience/              experience-screen, cultural-sheet
    map/                     trip-map (lazy wrapper) → map-canvas (MapLibre)
    chat/ explore/ saved/ passport/ wallet/
  lib/
    matching/engine.ts       839 lines. THE trip engine. Pure, synchronous, no network.
    routing/                 metrics.ts (haversine, detour factor, cost bands), osrm.ts, navigation.ts
    adaptation/              4 adapters + shared.ts + index.ts registry
    ai/                      gemini-client, openai-client, gemini, intent, curator, guide,
                             groq, darija-stt, transcript-quality, resolve-poi, url, social,
                             output-language, upload, http, types
    intent/                  schema.ts (Zod), normalize.ts (buildDraft/scoreDraft), sources.ts,
                             local-extract.ts (no-model keyword pass), confirm.ts (draft→profile)
    i18n/                    7 locales, hand-rolled, message objects + completeness tests
    store/  storage/  wallet/  validation/  utils.ts
  data/
    pois.ts                  Barrel: golden 4 + Casablanca + Coast + Experiences = 36
    pois-casablanca.ts  pois-coast.ts  experiences.ts  base-routes.ts (7 curated day templates)
    poi-utils.ts             media()/hours()/poiName() constructors
    content/                 es/de/it/pt narrative overlay merged at module load
    fixtures/                golden-pois, golden-trip, golden-adaptation (the demo floor)
  types/                     8 files, the shared domain vocabulary
  config/                    app.ts (all tunables), env.ts (server-only secrets), rewards.ts
public/
  images/poi/*.webp          36 images + sources.json (Wikimedia provenance)
  images/vibes/ popular/     6 + 3 art-directed category images
  videos/                    hero.mp4 420K, habous.mp4 168K, corniche.mp4 100K
  audio/                     EMPTY (.gitkeep + README only)
  maplibre-gl-worker.mjs     Copied by predev/prebuild, Turbopack workaround
scripts/
  jury/{smoke,voice-flow,wallet-flow,driver}.mjs   CDP-driven demo smoke suites
  sync-map-worker.mjs        predev/prebuild hook
  fetch-wikimedia-poi-images.py  Image sourcing tool
docs/                        20 markdown files, ~5,100 lines (several stale — see §18.5)
```

### 1.3 Environment variables (`.env.example`, `src/config/env.ts`)

**Every key is optional.** `src/config/env.ts:1` imports `server-only`; importing it from a client component is a build error. Every value is a **getter**, read at call time, not snapshotted at import.

| Var | Default | Purpose | Present in `.env.local`? |
|---|---|---|---|
| `GEMINI_API_KEY` | — | Image understanding + intent extraction | **Yes** |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | | no (default used) |
| `OPENAI_API_KEY` | — | Curator, guide, Whisper fallback | **Yes** |
| `OPENAI_MODEL` | `gpt-4o-mini` | | no |
| `OPENAI_TRANSCRIBE_MODEL` | `gpt-4o-transcribe` | | no |
| `GROQ_API_KEY` | — | `whisper-large-v3-turbo` | **No** |
| `YOUTUBE_API_KEY` | — | YouTube Data API v3 | **No** |
| `ROUTING_BASE_URL` | `https://router.project-osrm.org` | Public OSRM demo server | no |
| `WEATHER_BASE_URL` | `https://api.open-meteo.com/v1` | | no |
| `NEXT_PUBLIC_MAP_STYLE_URL` | `https://tiles.openfreemap.org/styles/dark` | | no |
| `VOICE_ENGINE` | `auto` | `auto` \| `darija` | **Yes** |

`serverCapabilities` (`src/config/env.ts`) derives four booleans — `ai`, `transcription`, `curation`, `youtube` — that drive graceful degradation.

### 1.4 CI/CD, deployment

**NONE.** There is no `.github/`, no Dockerfile, no `vercel.json`, no deployment config of any kind. The app is run locally with `pnpm dev` or `pnpm build && pnpm start`. `pnpm verify` (lint + typecheck + test + build) is the whole quality pipeline and it is manual.

---

## PHASE 2 — PRODUCT DEFINITION

### 2.1 What Siyaha actually is

A **single-day trip planner for the Casablanca-Settat region of Morocco** that accepts loose, multimodal inspiration (a typed sentence, a spoken sentence in Darija/French/English, a photo or screenshot, a TikTok/YouTube/any URL, or a conversation) and returns **exactly four stops**, ordered as a narrative day, plotted on a map, with a timeline, cost and distance estimates, per-stop cultural stories, four one-tap adaptations, an experience mode with a passport of stamps, and a loyalty-coin ledger.

**Naming warning for the presenter:** the product calls itself **Khotwa** in the UI (`src/config/app.ts` — `APP.name = "Khotwa"`, tagline *"The Region, One Step Ahead."*), the repository and README call it **Siyaha**, and `localStorage` keys are prefixed `siyaha:v1:` (`src/lib/storage/index.ts`). A jury reading the README and then looking at the screen will see two different products. **Decide on one name before the pitch.**

### 2.2 One-sentence value proposition (supported by code)

> Turn whatever inspired you — a screenshot, a TikTok link, a sentence in Darija — into one concrete, walkable, priced, culturally-narrated day in Casablanca-Settat, and let you change that day in one tap.

### 2.3 The problem, and why it is regional

The premise in `docs/MASTER_BRIEF.md` is that discovery and planning are disconnected: people find Morocco on TikTok and then rebuild the trip by hand. That is a real behaviour claim but **it is asserted, not evidenced anywhere in the repository** — there is no user research, no survey, no analytics. Treat it as a founder hypothesis, not a finding.

What *is* regionally specific in the code:
- The Darija speech path (`src/lib/ai/darija-stt.ts`, `src/app/api/transcribe/route.ts`) exists because Whisper measurably fails on Moroccan Darija. This is documented with real measured transcripts in the route's header comment.
- The Darija keyword vocabulary in `src/lib/intent/local-extract.ts` (`كازا`, `الماكلة`, `نهار كامل`, `ماشي بزاف ديال المشي`, Latin-script `ljdida`, `lwalidia`).
- The dataset is entirely Casablanca-Settat.
- French is the **default locale** (`src/lib/i18n/locales.ts` — `DEFAULT_LOCALE = "fr"`), Arabic is pinned to `ar-MA`.

### 2.4 Differentiation, classified honestly

**Implemented differentiation (defensible in front of a jury):**
1. **A Darija-capable voice pipeline that decides from the audio, not from the menu.** `src/app/api/transcribe/route.ts` transcribes with Whisper first (~1s), inspects the answer with `needsDarijaEngine()` (`src/lib/ai/transcript-quality.ts:186`), and re-runs on the MoulSot Darija Space only when the text is Arabic script or Latin letters belonging to no European language. It also rejects known Whisper hallucinations (`looksHallucinated()` — subtitle artefacts like *"شكرا على المشاهدة"* / *"thanks for watching"*, and 3× sentence loops).
2. **Hard grounding on the onboarding path.** The model is never asked for an id. `resolvePoiId()` (`src/lib/ai/resolve-poi.ts:57`) does token-overlap matching against the curated dataset and requires **two shared significant words**. A bare "Casablanca" resolves to nothing.
3. **A real deterministic engine with obligations and repair passes.** `fitToLimit()` (`src/lib/matching/engine.ts:411`) brings a day under a stated budget or time limit by swapping one stop at a time, and refuses any swap that breaks an obligation (the anchor the traveller named, every stated interest, the *kinds* of stop the day is made of).
4. **Experiences as first-class stops.** 6 of 36 POIs are workshops / food experiences / local activities with a host, a price, what you'll do, what you'll learn, and a reward. `COMPOSITION_TARGETS` in the engine actively tries to put a MAKE or a TASTE stop in the day.
5. **An honest local-impact figure** (see §10).
6. **Adaptations that refuse rather than fake.** All four adapters return `applied: false` with a specific reason when they cannot improve the day (`src/lib/adaptation/index.ts` — `noChange`).

**Designed but incomplete differentiation:**
- **Cultural audio narration.** The types (`CulturalContent.audio`), the player (`cultural-sheet.tsx` — `ListenButton`) and the host-voice player (`experience-block.tsx` — `HostVoice`) all exist. **Zero audio files exist.** `public/audio/` contains only `.gitkeep` and a README. Measured: 0 of 36 POIs carry narration audio, 0 carry `hostAudio`. The Listen button therefore never renders. `docs/DEMO_PATH.md` line 70 tells the presenter to demo "Listen".
- **Partner offers / wallet economy.** Fully implemented mechanically (idempotent ledger, deterministic transaction ids), but only **3 of 36** POIs carry a discount and all 6 experiences are `partnerStatus: "demo"` — no real commercial agreement exists, and the UI says so (`activity.demoPartner`).

**Potential differentiation (not built):**
- Multi-day trips, booking, payments, real-time availability, live opening hours, accounts.

**Marketing claim without implementation evidence:**
- The UI string `trip.trustLine`: *"The AI reads your inspiration. The places come from our curated dataset. It never invents a location or a coordinate."* — **False on the `/chat` and curator custom-stop path.** See §5 and §18.4. This is the highest-risk sentence in the product.
- `docs/MASTER_BRIEF.md` §"Not a chatbot": *"There is no conversational assistant anywhere in the product."* — There is. `/chat` is a full conversational guide. The brief is stale.

---

## PHASE 3 — COMPLETE USER JOURNEYS (traced from code)

### 3.A Entry / onboarding

```
User opens /
  ↓ src/app/page.tsx → HomeScreen (src/features/home/home-screen.tsx)
     Video hero (/videos/hero.mp4, poster hero.webp), language menu, greeting
  ↓ Three doors:
     1. "Plan my day" → /onboarding?new  (fresh, composer at step 1)
     2. quiet text link → /onboarding?new
     3. "Ask a local" → /chat            (the AI-first path)
     4. Category tiles → /explore/[category]
     5. Popular cards → patchProfile({interests}) → /onboarding
  ↓ OnboardingFlow (src/features/onboarding/onboarding-flow.tsx)
     Step 1: InspirationComposer (all modalities)
     Step 2: interests (max 3, toggleInterest drops the oldest at the cap)
     Step 3: time / budget / pace / walking
        — defaults half_day · medium · balanced are applied ONLY when the user
          actually reaches step 3 (onboarding-flow.tsx:~96), deliberately, so the
          understanding layer does not read them as deliberate choices
  ↓ "Build my trip" → ProcessingScreen → buildTrip() → setTrip() → router.push("/trip")
```

No account, no login, no server-side session. State lives in one Zustand store (`src/lib/store/index.ts`) hydrated once from `localStorage` by `<StoreHydration/>` in the root layout.

### 3.B Inspiration / intent input — the five modalities

Every modality funnels to **one** structure, `TripIntentDraft` (`src/types/intent.ts`).

#### (1) TEXT
```
textarea → readText() (inspiration-composer.tsx:~408)
  → understand({source:"text", text, locale}) (features/home/analyze.ts)
  → POST /api/extract
  → createIntentProvider() → GeminiIntentProvider.extractIntent (lib/ai/intent.ts)
      one prompt, gemini-3.5-flash-lite, temperature 0.2, responseMimeType json
  → buildDraft() (lib/intent/normalize.ts:219) — normalise + ground + score
  → mergeKnown() — a tap always beats the model
  → parseTripIntentDraft() Zod boundary (lib/intent/schema.ts)
  → applyDraft() → draftToProfile() → patchProfile()
```
**No key / timeout / bad JSON →** `draftFromLocalText()` runs `localExtract()` (`src/lib/intent/local-extract.ts`), a deterministic EN/FR/AR+Darija keyword pass, marked `degraded: true`, confidence ceiling **0.45**.

#### (2) VOICE
```
VoiceCapture (features/home/voice-capture.tsx)
  MediaRecorder, preferred mime from [webm/opus, webm, mp4, ogg/opus]
  recorder.start(1000) — timeslice so a backgrounded tab does not lose the clip
  empty blob → "failed" without a round trip
  → transcribe(blob, locale) → POST /api/transcribe (multipart)
  → readAudioUpload(): 9 accepted mimes, ≤8MB, non-zero
  → VOICE_ENGINE=auto:
        Whisper (Groq if key, else OpenAI gpt-4o-transcribe) — ~1s, language auto-detected
        accept() rejects hallucinated text
        needsDarijaEngine(text)? → MoulSot v0.3 HF Space (Gradio upload → call → SSE), ≤45s
        MoulSot's answer WINS when it has one
     VOICE_ENGINE=darija:  both run in parallel, MoulSot wins
  → transcript → applyTranscript() → understand({source:"audio", transcript})
```
The interface locale is **deliberately not** used to pick the engine (`route.ts` header comment explains why at length). This is a genuinely good piece of engineering.

#### (3) IMAGE / SCREENSHOT
```
FileRow/FileCard/drag/Cmd-V paste → handleFile()
  validateImage(): 4 mimes (jpeg/png/webp/heic), ≤8MB
  toBase64(): createImageBitmap → downscale longest edge to 1600px → JPEG q0.85
     (a 5.6MB photo took 8.02s end-to-end and timed out; this makes it ~300KB)
  → POST /api/analyze?locale=xx  { image: {base64, mimeType} }
  → GeminiProvider.analyzeImage (lib/ai/gemini.ts)
       ANALYZE_PROMPT injects CURATED_PLACE_NAMES as a SPELLING REFERENCE, explicitly
       "not a menu" — the model is told to name a real place it does not cover rather
       than substitute one from the list
  → detectedPoiId = resolvePoiId(detectedPlace)  ← resolved LOCALLY, never model-authored
  → draftFromImageAnalysis() → buildDraft()
  → RecognitionReveal (full-bleed reveal)
```
Failure path is **not** a fallback to a fixture. `failedRecognition()` (`features/home/analyze.ts`) returns nulls with a documented rationale: *"A demo that lies about what it saw is worse than one that says it could not look."* The reveal then offers alternatives or a manual path.

#### (4) URL (TikTok / YouTube / anything)
```
paste link → submitLink() → readSocialUrl() (client-side platform sniff only)
  → POST /api/extract {source:"url", url}
  → extractUrlMetadata() (lib/ai/url.ts):
        tiktok  → https://www.tiktok.com/oembed  (official, public, no key)
        youtube → Data API v3 videos.list IF YOUTUBE_API_KEY, else OpenGraph
        other   → OpenGraph, two user-agents tried (facebookexternalhit, then KhotwaBot);
                  readHead() streams only to </head>, cap 2MB
  → if thumbnailUrl: fetchRemoteImage() (https only, mime-checked, ≤8MB)
        the thumbnail becomes the IMAGE input to the same multimodal extractor
  → draft with provenance "url_thumbnail"
```
No scraping, no headless browser, no private APIs. Worst case returns `provider: "platform_only"` and the day is still built.

#### (5) CONVERSATION (`/chat`)
```
ChatScreen → POST /api/chat { turns[], locale, profile, currentPoiIds }
  stateless: the whole history is replayed every turn, capped at 20 turns / 2000 chars
  → ask() (lib/ai/guide.ts:168) → OpenAI gpt-4o-mini, response_format json_object
  → parseGuideAnswer() (guide.ts:111) — the trust boundary
  → picks with ≥2 surviving stops render a card with "build this day"
  → buildDay(picks, pois) → buildTrip(profile, picks, extraPois)
```

### 3.C Intent understanding — the structures

`TripIntentDraft` (`src/types/intent.ts`) — what the AI *understood*:

```ts
{ source: "image"|"audio"|"text"|"url",
  destination: { region, city, detectedPlace, detectedPoiId, confidence },
  candidates: PoiCandidate[],           // ranked LOCAL matches, kind: "name" | "coverage"
  interests: Interest[],                // max 3
  timeAvailable, budgetLevel, pace,     // enums or null
  mobility: { avoidLongWalks: boolean|null },
  constraints: string[],                // max 6, quoted
  evidence: { transcript, ocrText, urlTitle, urlDescription, urlAuthor,
              urlThumbnailUrl, visualClues[], provider },
  confidence: number, band: "high"|"medium"|"low",
  uncertainFields: DraftField[], provenance: Record<DraftField, FieldProvenance>,
  degraded: boolean, locale, createdAt }
```

`TripProfile` (`src/types/profile.ts`) — what the traveller *confirmed*. Every field nullable. `draftToProfile()` (`src/lib/intent/confirm.ts`) is the only bridge; precedence is **edits > draft > existing profile**.

**Confidence scoring** — `scoreDraft()` (`src/lib/intent/normalize.ts:166`). This is not the model's self-report:
```
grounding = detectedPoiId ? max(0.85, placeConf)
          : detectedPlace ? placeConf * 0.7
          : city          ? 0.7
          :                 0.2

coverage  = Σ weight(filled field) / 7      // interests 2, time 2, budget 1, pace 1, mobility 1

image|url:   grounding×0.60 + coverage×0.15 + selfReport×0.25, ÷ 1.00
text|audio:  grounding×0.25 + coverage×0.60 + selfReport×0.25, ÷ 1.10

ceiling = degraded ? 0.45 : 1.0
bands:  high ≥ 0.80 · medium ≥ 0.50 · low < 0.50
```
**Measured live** (`/api/extract`, "I want a half day in Casablanca, culture and food, medium budget, not too much walking"): `confidence: 0.843`, `band: "high"`, `provider: "gemini"`, **0.89 s**.

### 3.D Trip generation — the engine

`match()` (`src/lib/matching/engine.ts:485`). Full trace:

```
0.  Filter out permanently_closed / temporarily_unavailable
1.  destinationPool(): POIs whose city matches; if < 4 → the whole region
2.  anchorFor(): the resolved POI's coordinates, else the centroid of PLACES only
       (experiences deliberately cannot move the city's centre of gravity)
3.  curatedPoiIds(): EXACTLY ONE base route whose city matches and whose interests
       are a superset of the traveller's; ties broken by summed curation priority
4.  suggestedPoiIds: the curator's / guide's picks, filtered to ids in the pool
5.  scorePoi() over every POI (formula in §7), sort by score desc then id asc
6.  SELECTION, in this exact order:
      a. the anchor the traveller explicitly named        (take)
      b. the curator's picks, in the order proposed        (take)
      c. top up to 2 "strongly aligned"                    (take)
      d. 1 signature must-see — curated signature first    (take)
      e. interest obligations: any stated interest with no carrier yet
      f. composition loop: curated ?? unseen MAKE/TASTE ?? unseen kind
         ?? unseen category ?? best remaining
      g. top up from pool, then from the whole region — ALWAYS exactly 4
7.  Obligations = { anchorId, interests present in pool, kinds now in the day }
8.  fitToLimit(budget)  — swap the dearest droppable stop, ≤4 passes
9.  fitToLimit(time)    — same, protecting experiential stops (an appointment is not trimmable)
10. orderNarratively()  — brute-force all 24 permutations, best PHASE_AFFINITY score wins
```

`schedule()` (`engine.ts:811`) then times the day: start 09:30 (or the next :30 if later, capped 18:00), legs estimated with `estimateLeg()`, arrivals rounded up to 5 minutes, visit duration = `visitDurationMinutes()` (pace multiplier applied to `place` only).

Orchestration lives in `buildTrip()` (`src/features/onboarding/build-trip.ts:190`):
```
buildTrip(profile, chosen?, extraPois?)
  ├─ chosen given (from /chat)? use it, SKIP the curator
  └─ else POST /api/curate (15s budget) → picks
  ├─ if any AI-authored POI exists: destination := that POI's city, and the pool
  │   becomes ONLY that city's POIs ∪ the authored ones
  ├─ match({profile, pois, suggestedPoiIds})
  ├─ schedule() → withCuratorReasons() (the curator's line replaces the template line)
  ├─ if stops.length !== 4 → goldenFallback()
  ├─ localSegments() → withRoutedGeometry() (POST /api/route, GEOMETRY ONLY)
  ├─ calculateMetrics()
  └─ any throw → goldenFallback(profile)
```

### 3.E Processing experience — what is real, what is choreography

`src/features/onboarding/processing-screen.tsx`. Four visual phases: `understanding → discovering → optimizing → revealing`.

**The honest answer:** there is exactly **one** real async operation, `buildTrip()`, kicked off on the first frame. The four phases are a *view* of it, not four separate computations.

| Phase | Real work behind it | Timing |
|---|---|---|
| `understanding` | none — the profile is already frozen | ends when generation answers OR after `full.understand` (620ms), floored at `quick.understand` (340ms) |
| `discovering` | **this is where `await generation` actually blocks** | floor 660ms, ceiling = however long `buildTrip` takes |
| `optimizing` | none — the trip is already in hand (`setTrip(built)` happens *before* this phase) | fixed 760ms (full) / 640ms (quick) |
| `revealing` | none | 420ms / 360ms |

There are three tempos — `full`, `quick` (chosen when generation had already settled), and `reduced` (when `prefers-reduced-motion`, total ~540ms). A hard ceiling of `TIMEOUTS.tripGenerationMs = 20_000` races `buildTrip` against `cloneGoldenTrip()`.

**Jury-relevant:** the phase labelled *"optimizing"* does no optimizing. The route is already built. Say "the reveal is choreographed around one real generation call" rather than "four processing stages".

Cancellation: a `cancelled` flag in the effect cleanup; the component is remounted by `key={attempt}` on retry. There is no `AbortController` on `buildTrip` itself — an in-flight `/api/curate` continues after the user navigates away.

### 3.F Trip result — everything on `/trip`

`src/app/trip/page.tsx`, in render order:
1. `TripHeader` — destination, day label, optional weather chip
2. `TripMeta` — stops, distance, duration, cost
3. `AdaptationBanner` — "Day updated" + Undo, only after an applied adaptation
4. `DayCheck` — **one** highest-priority insight row + a sheet with the full audit (§F below)
5. `TripMap` — MapLibre, 4 numbered pins, one route (walk = primary colour, car = mist), fit-bounds with a reserved bottom band
6. Tap hint line
7. `DayGlance` — two sentences generated from `dayBrief()`, **not** a model call
8. `TripTimeline` — 4 rows, arrival, duration, reason line
9. `VerifiedLink` → `ProvenanceSheet` — local impact figure + receipt + "Verified places" list
10. Sticky footer: `AdaptSheet` (outline) + `Start trip` (filled)
11. `PlaceSheet` on tap — hours, price, story, tip, `ExperienceBlock` for experiences

`DayCheck` insights (`buildInsights()`, `src/features/trip/trip-insights.ts:169`), sorted warn → good → info:
- **Opening hours** — `stopHoursIssue()` compares arrival+duration against the POI's weekly windows *for today*. Four kinds: `closedToday`, `opensLater`, `closedOnArrival`, `closesDuring`. First offender only.
- **Rain/wind** — only if the weather chip says so AND ≥1 stop is not `indoor`. Carries `fix: "rainy_day"`.
- **Walking** — against `WALKING_LIMIT` = `{minimal: 2000, normal: 4500, plenty: 8000}` metres. `fix: "less_walking"`.
- **Budget** — against `BUDGET_CAP_MAD` = `{low: 150, medium: 400, premium: ∞}`. `fix: "spend_less"`.
- **Interest match** — matched stops / total, plus the interests it could *not* serve.
- **Length** — `dayWindow()` start→end; warns when `totalMinutes > TIME_BUDGET_MINUTES`. `fix: "less_time"`.

A `fix` is only attached where an adapter can genuinely act. **No dead buttons by design.**

### 3.G Adaptation — does it actually recompute?

`src/lib/adaptation/`. **All four recompute. None is UI-only.**

| Control | What it really does | Recomputes? |
|---|---|---|
| **Less walking** | Converts every walking segment > `LESS_WALKING_SEGMENT_METERS` (1800m) to car: distance × 1.25 rounded to 500m, duration = `estimateDurationMinutes(car)` + 3 min hail/park. Refuses any conversion that costs time. **Stops, order and arrival times are untouched** — the promise is less walking, not a different day. | Yes — new segments, `calculateMetrics()` re-run |
| **Less time** | Trims each non-experience visit toward `max(25, round(base×0.65))`, converts long walks to car, **re-times the whole day** with `reschedule()`. Refuses if saving < 20 min. Booked experiences are never trimmed. | Yes — new stops, segments, times, metrics |
| **Spend less** | Swaps the single dearest stop for a cheaper candidate in the same city that **shares a category**, min saving 20 MAD, rebuilds segments and times. | Yes — stop swap + full rebuild |
| **Rainy day** | Swaps every `outdoor` stop (not `mixed`) for an `indoor` candidate sharing a category and costing ≤ +60 MAD. | Yes — stop swaps + full rebuild |

Undo is exact: `applyAdaptation` snapshots the previous `Trip` object into `tripBeforeAdaptation` (`src/lib/store/index.ts:198`); `revertAdaptation` restores it. A rejection (`applied: false`) is **not** stored — it is shown locally in the sheet so it cannot wipe a standing adaptation's headline.

**What is NOT adaptable:** duration, budget or interests cannot be changed after generation except by regenerating; there is no "replace this specific stop"; there is no drag-to-reorder; there is no accessibility/wheelchair control (only `avoidLongWalks` → `walkingPreference: "minimal"` before generation).

### 3.H Scan / landmark experience

There is no dedicated "scan" screen. Landmark recognition happens inside the image modality:
- Camera: the file input has `accept` on image mimes; on mobile that offers the camera. There is no live camera preview or continuous recognition.
- Classification: one Gemini vision call, `ANALYZE_PROMPT` (`src/lib/ai/gemini.ts`), returns `destination`, `country`, `detectedPlace`, `labels[3-6]`, `ocrText`, `interestHints`, `activityHints`, `confidence{destination, detectedPlace}`.
- Grounding: `resolvePoiId(detectedPlace)` locally. Then `resolvePoiCandidates()` ranks alternatives; if nothing matched by name, `coverageCandidates()` offers the closest curated stops **in the named city**, scored ≤ 0.5 and tagged `kind: "coverage"` so the UI cannot present them as a match.
- Confidence: shown as a percentage chip **only when a real provider returned one** (`Recognition.confidence` is `null` on the fallback path, and the chip is suppressed).
- Alternatives are only offered when `band !== "high"` — *"Offering them at HIGH confidence turns a good answer into a quiz."*
- Narration: none (no audio files).

---

## PHASE 4 — THE AI SYSTEM

### 4.1 Every AI call in the repository

| # | AI feature | Model / provider | File | Input | Output | Why AI | Fallback |
|---|---|---|---|---|---|---|---|
| 1 | **Image / screenshot understanding** | Gemini `gemini-3.5-flash-lite` (default), `v1beta:generateContent`, `temperature 0.2`, `responseMimeType: application/json` | `src/lib/ai/gemini.ts` — `GeminiProvider.analyzeImage` | base64 image + `ANALYZE_PROMPT` + locale directive | `{destination, country, detectedPlace, labels[], ocrText, interestHints[], activityHints[], confidence{}}` | No deterministic way to name a monument from a photo | `EMPTY_ANALYSIS` + `degraded: true`; the reveal says it could not place it |
| 2 | **Structured intent extraction (all 4 modalities)** | Same Gemini model | `src/lib/ai/intent.ts` — `GeminiIntentProvider.extractIntent` | evidence block (typed text, transcript, OCR, URL title/description/author, visual clues, `known`) + optional image | `{city, region, detectedPlace, interests[], timeAvailable, budgetLevel, pace, avoidLongWalks, constraints[], confidence}` | Maps free multilingual prose (incl. Darija) onto fixed enums | `localExtract()` keyword pass, `degraded: true`, confidence ≤ 0.45 |
| 3 | **Day curator** | OpenAI `gpt-4o-mini` (default), `response_format: json_object`, **no temperature, no max_tokens sent** | `src/lib/ai/curator.ts:314` — `curate()` | traveller block + the whole 36-line catalogue | `{headline, note, picks[{id\|custom, reason}]}` | Judges which curated stops belong *together* for this person, in their language | `null` → `match()` builds the day exactly as before |
| 4 | **Conversational guide** | OpenAI `gpt-4o-mini`, `json_object` | `src/lib/ai/guide.ts:168` — `ask()` | system prompt + catalogue + context + up to 12 replayed turns | `{reply, picks[], headline, profile{}}` | Open-ended Q&A about Morocco; the day emerges from conversation | `null` → screen says the guide is unavailable; every other path still works |
| 5 | **Voice → text (primary)** | Groq `whisper-large-v3-turbo` if `GROQ_API_KEY`, else OpenAI `gpt-4o-transcribe` | `src/lib/ai/groq.ts` | audio blob, language auto-detected | `{text, detectedLocale?}` | — | next engine, then `degraded: true` with empty text |
| 6 | **Voice → text (Darija)** | **MoulSot v0.3** (Qwen3-ASR fine-tuned on Darija) on the public HF Space `atlasia-moulsot-v0-3.hf.space`, Gradio API, **no key** | `src/lib/ai/darija-stt.ts` | audio blob, `"Auto (Darija / Arabic)"` | Arabic-script transcript | Whisper measurably fails on Darija | falls back to Whisper's answer |
| 7 | **Wikipedia image lookup for AI-authored stops** | Wikimedia REST summary API (not an LLM, but AI-triggered) | `src/lib/ai/curator.ts:186` — `withWikiImages` | article title the model named | thumbnail URL, `upload.wikimedia.org` only, 3s each | Makes a model-authored stop look real | keeps the category image |
| 8–13 | **Diagnostic endpoints** | Gemini + OpenAI | `src/app/api/test-ai/*`, `src/app/api/test-openai/*` | — | model availability, translation, transcription comparison | dev tooling | — |

### 4.2 Prompt-by-prompt detail

**`ANALYZE_PROMPT`** (`src/lib/ai/gemini.ts`) — the interesting instruction is rule 2:
> *"The list is a spelling reference, not a menu: NEVER answer with a place from it that the photo does not show. An office district is not a marina, and a beach we do not cover is still that beach by name."*

This directly counters the obvious failure mode (snapping every photo to the nearest curated landmark). Combined with `resolvePoiId`'s two-token requirement it is a real anti-hallucination measure.

**`INTENT_PROMPT`** (`src/lib/ai/intent.ts`) — enum values are quoted literally so the model copies rather than paraphrases. The comment is honest about it: *"the prompt is an optimisation, not the guarantee"* — `pickInterests()` and `pickEnum()` drop anything invented.

**Curator `SYSTEM`** (`src/lib/ai/curator.ts:264`) — this is where the grounding posture changes:
> *"When the traveller asks for a city, a place or an activity the catalogue does not cover, do NOT substitute somewhere else: build the day where they asked, from real, well-known places you are confident exist, as `custom` picks."*

A `custom` pick carries `{name, city, lat, lng, categories, tags, open, close, durationMinutes, priceRange, indoorOutdoor, story, tip, wikipedia}`. `syntheticPoi()` (`curator.ts:83`) turns it into a full `POI` with `id: "ai-<slug>"`, `coordinateType: "representative"`, `verification: "unverified"`, `availability: {status: "unknown"}`.

**Guide `SYSTEM`** (`src/lib/ai/guide.ts:74`) — same custom-pick licence, plus an explicit instruction to *say in `reply` that it comes from your own knowledge and is not yet verified by the app*.

**Output language** — `outputLanguageDirective()` (`src/lib/ai/output-language.ts`) affects **only free prose**. It explicitly forbids translating JSON keys, enum values, place names, ids, coordinates and confidence numbers, with the reason spelled out: a Spanish traveller needs the name written on the building.

### 4.3 Token strategy, latency, cost

- The curator and the guide both send **the entire catalogue** (`buildCatalog()` — 36 lines of `id | name | kind | categories | city | duration | price | indoor/outdoor | detail`) on **every call**. That is roughly 1.5–2k tokens of context per turn. At 36 POIs this is fine; at 500 POIs it is not, and there is **no retrieval layer**. This is the clearest scaling limitation in the AI design and a jury will find it.
- The guide replays the last 12 turns as `user` messages every turn (deliberately, so JSON mode keeps the last word with the traveller).
- **No caching anywhere.** No prompt caching, no response cache, no memoisation of curations.
- **Measured latency (live, this machine, dev server, 2026-08-30):**
  - `/api/weather` → **0.33 s**
  - `/api/extract` (Gemini text) → **0.89 s**
  - `/api/curate` (OpenAI, full catalogue) → **2.98 s**
  - `/api/route` (public OSRM, 1 segment) → sub-second, returns real geometry
  - Voice: Whisper ~1 s, MoulSot **~20 s measured** (documented in `src/app/api/transcribe/route.ts` header: MoulSot 20.1 s vs gpt-4o-transcribe 0.9 s on the same clip)

**Critical path, user taps "Build my trip" → trip on screen:**
`/api/curate` (≈3 s, ceiling 15 s) → `match()` + `schedule()` (synchronous, sub-millisecond) → `/api/route` (≤4 s×3 segments, parallel) → reveal choreography (≈2.5 s floor at full tempo, overlapping). **Observed shape: ~3.5–5 s.** Hard ceiling 20 s, after which the golden day is shown.

### 4.4 Does Siyaha actually need AI? — classification

| AI usage | Classification | Justification |
|---|---|---|
| **Darija speech-to-text (MoulSot)** | **ESSENTIAL** | There is no rule-based path from Moroccan Darija audio to text. And the route's own measured evidence shows the generic model fails: Whisper returned a YouTube-subtitle artefact on a real Darija clip. This is the one AI usage no amount of engineering replaces. |
| **Image / screenshot landmark recognition** | **ESSENTIAL** | Naming a monument from a photo is not solvable with rules over a 36-row dataset. |
| **Intent extraction from free prose** | **VALUABLE, not essential** | `localExtract()` proves the point: a 160-line keyword table already extracts city, interests, time, budget, pace and walking preference across EN/FR/AR/Darija. On the measured sentence the model added *nothing the keyword pass would have missed* except a higher confidence score. **A jury will push on this and the honest answer is: the model handles the long tail and the phrasing we did not anticipate; the rules handle the common case.** |
| **Day curator** | **VALUABLE** | It changes *which* four, and it writes the per-stop "why this, for you" line in the traveller's language. But the engine produces a coherent day without it (`buildTrip` treats it as optional). It is an opinion, not a dependency. |
| **Conversational guide** | **VALUABLE — and the highest-risk component** | It is the only surface that answers open questions ("is it fine after dark?"). It is also the one that can author fictional POIs. |
| **Wikipedia image fetch for AI stops** | **GIMMICK, and actively harmful** | Its only purpose is to make a model-invented stop look like a curated one. It increases the credibility of unverified content without increasing its truth. |
| **`/test-ai/translate`, `/test-ai/audio`, `/test-ai/intent`** | **DEV TOOLING** | Should not be in the production build. |

**There is no AI in:** ranking, routing, scheduling, cost estimation, distance calculation, adaptation, the day brief, the local-impact figure, or the insight sentences. All of those are deterministic TypeScript. **This is the strongest thing to say to a jury** and it is verifiably true.

---

## PHASE 5 — GROUNDING & ANTI-HALLUCINATION

### 5.1 The two postures, side by side

**Posture A — the onboarding path (`/api/extract`, `/api/analyze`). Genuinely grounded.**
- The model is **never asked for a POI id**. `ANALYZE_PROMPT` and `INTENT_PROMPT` both say *"Never invent a place, a coordinate, a price, an id or an itinerary."*
- `detectedPoiId` is produced by `resolvePoiId()` (`src/lib/ai/resolve-poi.ts:57`) — token-overlap against `POIS`, requiring **two shared significant words** (or every word of a one-word name), stopwords removed, NFD-folded, Arabic and Latin both handled. Deterministic: highest overlap wins, ties to the earlier POI.
- `resolvePoiCandidates()` (`:94`) surfaces alternatives under the **same qualification rule** — city and tag overlap only *rank* survivors, they can never promote a POI no name matched.
- `coverageCandidates()` (`:179`) handles the honest case ("we read the place correctly, we just don't cover it"), **scores capped at 0.5** so a coverage stand-in can never reach the HIGH band, tagged `kind: "coverage"`, and only reachable when nothing matched by name **and** the model named a place at all.
- Everything crosses Zod: `tripIntentDraftSchema` (`src/lib/intent/schema.ts`) uses `.catch()` on every field so a bad value degrades instead of throwing, arrays are capped (`candidates ≤ 5`, `interests ≤ 3`, `constraints ≤ 6`, `visualClues ≤ 8`), and **`band` is re-derived from `confidence`, never accepted from outside** — *"it is the one field a caller could use to claim a certainty the number does not support."*
- `mergeKnown()` guarantees a tap always beats the model.

**Posture B — the curator/guide custom-stop path. Not grounded at all.**
- `parsePicks()` (`src/lib/ai/curator.ts:132`) accepts `{custom: {...}}` entries and calls `syntheticPoi()`, which validates only: name and city are non-empty strings, `lat`/`lng` are finite and within ±90/±180, categories are from the six (defaults to `culture` if none), duration clamped to 30–240, price range from the enum.
- **Coordinates are whatever the model said.** There is no reverse-geocode, no bounding-box check, no cross-reference against any gazetteer. A model that puts the Grand Bazaar at the wrong end of Istanbul produces a wrong pin and nothing catches it.
- Opening hours, price band and duration are the model's guesses, stored as if curated.
- The one real guard is **one-city coherence**: if any pick is custom, catalogue picks from another city are dropped and only same-city custom stops survive (`parsePicks` closing block). This exists to stop the engine's distance repair blowing up, not for truth.
- A second guard: `parseCuration` / `parseGuideAnswer` return no day if **fewer than 2** picks survive.

### 5.2 Live proof (executed during this audit)

`POST /api/chat` with `"I saw a TikTok about Istanbul. Plan me one day in Istanbul."` returned, in full:

```
picks: ai-hagia-sophia, ai-grand-bazaar, ai-basilica-cistern, ai-galata-tower
headline: "A Perfect Day Exploring Istanbul's Treasures"
profile: { destination: "Istanbul", interests: [culture, food], timeAvailable: full_day, ... }
pois[0]: { id: "ai-hagia-sophia", city: "Istanbul", coordinates: {lat: 41.0082, lng: 28.979},
           openingHours: 09:00–17:00 every day, priceRange: "150_300",
           verification: "unverified", availability: {status:"unknown"},
           media.heroImage: "https://upload.wikimedia.org/.../Hagia_Sophia...330px..." }
```

`buildTrip()` then narrows the pool to `POIS.filter(city === "istanbul")` — **empty** — union the four AI POIs, so the resulting day is **100% model-authored**, scheduled and priced by the real engine, and rendered by the real UI.

**And the same UI renders, on that day:**
- `ProvenanceSheet` (`src/features/trip/trip-summary.tsx:164`): a `ShieldCheck` icon beside **every** stop, under the heading `trip.verified` = **"Verified places"**, with the model's coordinates printed to 4 decimals.
- `trip.trustLine`: *"The AI reads your inspiration. The places come from our curated dataset. **It never invents a location or a coordinate.**"*

`POI.verification` is set correctly to `"unverified"` in the data — and is **never read by any component**. Verified by grep: `verification` appears in zero `.tsx` files. Same for `POI.sources` and `POI.availability.note`.

### 5.3 Hallucination attack-surface assessment

| Feature | Can the model produce an entity the app did not have? | Rating |
|---|---|---|
| Image landmark recognition | No — id resolved locally, coverage capped at 0.5 | **LOW** |
| Text/voice/URL intent extraction | No — enums filtered, place grounded, Zod boundary | **LOW** |
| Free-text prose the model writes (labels, activity hints, constraints, curator `reason`) | Yes, but it is descriptive copy shown as chips/one-liners, not facts about places | **LOW–MEDIUM** |
| Curator picking from the catalogue | No — unknown ids dropped by `parsePicks` | **LOW** |
| **Curator / guide `custom` stops** | **Yes — name, city, coordinates, hours, price, story, tip, all model-authored** | **HIGH** |
| Guide `reply` (open Q&A: prices, safety, etiquette, opening times) | Yes — free text, no grounding, no citations | **HIGH** |
| `withWikiImages` | It only accepts `upload.wikimedia.org` URLs, but it attaches a *real photo of the article the model named* to a *model-invented stop*, which raises apparent credibility | **MEDIUM** |
| Trip metrics, cost, distance, timing | No AI involved at all | **NONE** |
| Local impact figure | No AI involved | **NONE** |
| Day brief / insight sentences | Deterministic, `dayBrief()` explicitly not a model call | **NONE** |

**The fix a jury will expect to hear** (not implemented — do not claim it): a region bounding-box check on `syntheticPoi`, plus an explicit "unverified — from the guide's own knowledge" badge wherever `verification !== "verified"`, plus removing the shield from unverified stops in `ProvenanceSheet`.

---

## PHASE 6 — DATASET

### 6.1 Verified statistics (computed by executing `src/data/pois.ts`)

**Total POIs: 36** — 30 `place` + 6 experiences (3 `food_experience`, 2 `workshop`, 1 `local_activity`).

> Note: `src/data/pois.ts` line 2 says *"25 places plus the curated experiences"* and `README`/docs repeat "25 POIs". **That comment is stale — the real count is 36.** Use 36.

| Dimension | Distribution |
|---|---|
| **City** | Casablanca 22 · El Jadida 6 · Oualidia 5 · Azemmour 1 · Mohammedia 1 · Boulaouane 1 |
| **Kind** | place 30 · food_experience 3 · workshop 2 · local_activity 1 |
| **Category** (multi-label, up to 3 each) | hidden_gems 26 · culture 25 · coast_nature 16 · food 14 · art_creative 13 · activities 10 |
| **Verification** | verified 16 · needs_verification 14 · unverified 6 (all six experiences) |
| **Availability** | open 31 · seasonal 2 · unknown 2 · temporarily_unavailable 1 |
| **Price range** | free 17 · 60_150 7 · 0_30 4 · 30_60 3 · 150_300 3 · unknown 2 |
| **Coordinates** | every POI has one; `coordinateType` is `exact` or `representative` |
| **Opening hours** | **19 of 36** carry an `OpeningHours` object; all are `needsVerification: true` by construction (`poi-utils.ts` — `hours()`) |
| **Explicit price** (`approxPriceMad`) | 25 of 36 |
| **Sources** (`POISource[]`) | 21 of 36 — all `OpenStreetMap` |
| **Narration audio** | **0 of 36** |
| **Host audio** | **0 of 36** |
| **Gallery images** | 0 of 36 |
| **Hero video on a POI** | 0 of 36 |
| **Partner discount** | 3 of 36 |
| **`supportsLocalBusiness`** | 6 of 36 (exactly the six experiences) |
| **`signature`** | 6 — hassan-ii, ancienne-medina, corniche-ain-diab, cite-portugaise, citerne-portugaise, oualidia-lagune |
| **`hero`** | 16 |
| **Base routes** | 7 curated day templates |
| **Images on disk** | 36 `.webp` in `public/images/poi/` (6.5 MB total) |

### 6.2 The most important POIs

**The golden four** (`src/data/fixtures/golden-pois.ts`, re-exported by `pois.ts` so ids and coordinates cannot drift):
`poi-hassan-ii` (Mosquée Hassan II, prio 5, 140 MAD, 90 min, signature+hero), `poi-habous` (Quartier Habous, prio 4, free), `poi-marche-central` (Marché Central, prio 4, free), `poi-sacre-coeur` (Espace Sacré-Cœur, prio 3, 40–60 MAD).

**The six experiences** (all `partnerStatus: "demo"`, all `verification: "unverified"`):
`exp-cooking-mi-naima` (250 MAD, 105 min, "Local family"), `exp-leather-bag` (180 MAD, 75 min), `exp-habous-artisans` (80 MAD, 60 min), `exp-tea-ritual` (60 MAD, 45 min), `exp-pottery-eljadida` (140–200 MAD, 90 min), `exp-oualidia-oysters` (120 MAD, seasonal).

**Regional anchors:** `poi-cite-portugaise` (El Jadida, prio 5), `poi-oualidia-lagune` (Oualidia, prio 5), `poi-azemmour-medina`, `poi-kasbah-boulaouane`, `poi-kasbah-mohammedia`.

### 6.3 Provenance — how the dataset was built

**Mixed, and mostly hand-curated:**
- **Coordinates:** read from OpenStreetMap (`src/data/poi-utils.ts` — `OSM` source constant, *"Every coordinate in this dataset was read from OSM data, not from memory."*), attached to 21 POIs as an explicit `sources` entry.
- **Narrative content** (story, tip): hand-authored in EN/FR/AR inside the POI objects. ES/DE/IT/PT arrive as a **thin overlay keyed by POI id** (`src/data/content/`), merged at module load, so coordinates and prices exist exactly once.
- **Images:** 30 of the 36 have machine-readable Wikimedia Commons provenance in `public/images/poi/sources.json` — author, file, licence, original URL, crop box, and a `match` grade: **24 EXACT, 5 STRONG_RELATED, 1 GENERIC_FALLBACK**. Licences: CC BY-SA 4.0 ×20, CC BY 2.0 ×5, CC BY-SA 3.0 ×3, CC0 ×1, CC BY 3.0 ×1. Fetched by `scripts/fetch-wikimedia-poi-images.py`.
- **Opening hours / prices:** curated by hand, explicitly `needsVerification: true`, never from a live API.
- **The six experiences:** invented as product content, not sourced from real partners — the type system says so (`PartnerStatus = "demo" | "confirmed"`) and the UI prints a disclaimer.

**⚠ Attribution gap (concrete, legal):** 30 images are CC BY-SA / CC BY, which **require attribution**. `POIMedia.credit` is never populated in the dataset and is never rendered by any component (verified: zero matches for `credit` in `src/**/*.tsx`). `sources.json` sits in `public/` as a record but is not surfaced to a user. **This is a real compliance gap and a jury with an open-source-minded member may raise it.**

### 6.4 Missing data

No ratings, no reviews, no popularity signal, no accessibility metadata beyond a 1–5 `walkingScore`, no wheelchair/step-free flags, no contact details, no booking links, no seasonality windows beyond a `seasonal` status, no crowding data, no public-transport information, 17 of 36 with no opening hours, 11 of 36 with no explicit price.

### 6.5 "Can this scale from Casablanca-Settat to all Morocco?"

**Honest answer: the engine scales; the dataset and the prompt do not, as built.**

What already scales:
- `match()` is `O(n log n)` over the city pool plus a bounded repair loop. At any realistic n it is sub-millisecond. `orderNarratively()` is `O(4!) = 24` and constant.
- The data shape is uniform — adding a city is adding objects to an array plus one image per POI.
- `destinationPool()` already narrows by city name before scoring.

What breaks:
1. **The curator and guide send the entire catalogue in every prompt.** At 500+ POIs that is a context and cost problem with no retrieval layer to fall back on. This is the single hard blocker.
2. **`CURATED_PLACE_NAMES` is injected into both vision and intent prompts** — the whole name list, every call.
3. **The dataset is a TypeScript module compiled into the bundle.** Every POI ships to every client. At 36 that is fine; at thousands it is not.
4. **Content is human-authored per POI in 3 languages + a 4-language overlay.** That is the real cost of a new city, not the code.
5. **No CMS, no ingestion pipeline, no admin.** Adding a POI is a code change and a redeploy.
6. Curation fields (`priority`, `signature`, `hero`, base routes) are hand-set and do not generalise automatically.

**What would have to change:** move POIs to a real datastore with a geospatial index; add embedding-based retrieval so the curator sees ~30 relevant candidates instead of the whole catalogue; add an ingestion + human-verification workflow; keep `match()` exactly as it is.

---

## PHASE 7 — RECOMMENDATION ENGINE (reverse-engineered)

### 7.1 The actual scoring formula

`scorePoi()` — `src/lib/matching/engine.ts:210`. Weights at `engine.ts:132`.

```
score(poi) =
      poi.priority × 5                                    // priority ∈ 1..5  → 5..25
    + 34   if poi.id ∈ curatedRouteIds                     // exactly ONE matching base route
    + 30   if poi.id ∈ suggestedPoiIds                     // the curator's / guide's picks
    +  6   if poi.signature
    +  2   if poi.hero
    + Σ over stated interests:
          + 34   if poi.categories[0] === interest         // primary category
          + 20   if poi.categories[i>0] === interest       // secondary category
    +  7   if kindOf(poi) !== "place"                      // experiential bonus
    + budgetScore(poi.priceRange, profile.budgetLevel)
    + walkingAdjustment
    + timeAdjustment
    + 14 × exp( −haversine(anchor, poi) / 6000 )           // geographic gravity
    −  4   if availability === "unknown"
    −  2   if availability === "seasonal"
    −  2   if verification === "needs_verification"
```

where

```
BAND_WEIGHT = { free:0, 0_30:15, 30_60:45, 60_150:105, 150_300:225, 300_plus:400, unknown:30 }

budgetScore(range, budget):
  budget === null      →  0
  budget === "low"     →  +12 if w ≤ 30   else  −min(24, w/8)
  budget === "medium"  →   +8 if w ≤ 150  else  −min(16, (w−150)/12)
  budget === "premium" →   +8 if w ≥ 30   else  +2

walkingAdjustment:
  "minimal" → −(walkingScore − 1) × 10        // walkingScore ∈ 1..5 → 0..−40
  "plenty"  → +(walkingScore − 1) × 4
  else      → 0

timeAdjustment:
  timeAvailable === "few_hours" → −max(0, baseDurationMinutes − 60) / 10
```

Sort: `score DESC, then poi.id ASC` (`byScoreThenId`) — **fully deterministic, no randomness anywhere in the engine.**

### 7.2 Hard filters vs soft filters

**Hard (a POI cannot appear):**
- `availability.status ∈ {permanently_closed, temporarily_unavailable}` — removed before scoring (`BLOCKED_STATUSES`).
- Not in the destination pool, *unless* the city has fewer than 4 POIs, in which case the pool widens to the whole region.
- Already taken (`taken` set — no duplicate POI in one day).

**Soft (score penalties):** budget mismatch, walking preference, short-day duration penalty, unknown/seasonal availability, needs-verification, distance from the anchor.

**Obligations (checked on every repair swap, `meetsObligations`):**
- The anchor the traveller explicitly named must stay in the day.
- Every stated interest that the pool can serve must have at least one carrier.
- The *kinds* the selection arrived at (SEE / MEET / MAKE / TASTE) must be preserved — *"a traveller who then answers 'medium budget' has not asked to be sent to four monuments instead."*

**Diversity constraints:**
- `COMPLEMENTARY_POOL = 6` — the composition slot may only reach into the top 6 ranked contenders (*"a stop that is half the score and five kilometres away is not complementary, it is a detour"*).
- The composition loop prefers, in order: a curated stop → an unseen MAKE/TASTE → any unseen kind → an unseen category → the best remaining.

**Budget and time repair** (`fitToLimit`, `engine.ts:411`): up to 4 passes; each pass sorts current stops by cost/time descending and tries to replace the worst offender with any ranked candidate that keeps all obligations and lowers the measure; one victim per pass. If nothing improves, **the day comes back unchanged and over the limit, and `buildInsights` says so** — an explicitly documented honesty choice.

### 7.3 Narrative ordering

`orderNarratively()` (`engine.ts:318`) evaluates **all 24 permutations** of the four stops and takes the best `PHASE_AFFINITY` total.

```
PHASE_AFFINITY[category] = [morning, midday, afternoon, sunset]
  culture      [ 4,  0,  2,  1]
  food         [-1,  5,  0, -2]
  coast_nature [ 0,  0,  1,  5]
  hidden_gems  [ 2,  0,  4,  0]
  art_creative [ 1,  0,  4,  0]
  activities   [ 0,  1,  3,  2]

slotAffinity(poi, slot) = Σ_i PHASE_AFFINITY[categories[i]][slot] / (i + 1)
  + 3  if slot === 3 and poi.signature          // sunset icon
  − 2  if slot === 3 and poi.indoorOutdoor === "indoor"
  − 4  if slot === 0 and earliestOpenMinutes(poi) ≥ 11:00
```

**This is not distance optimisation. It is story optimisation.** The engine's own comment: *"A day reads morning culture → midday food → afternoon discovery → sunset icon."*

### 7.4 A real worked example (executed against the real dataset)

**Profile: Casablanca · interests [culture, food] · half day · low budget · balanced.**

Top scores produced by the engine:
```
poi-marche-central   132.2      poi-sacre-coeur       89.8
poi-habous           130.8      exp-tea-ritual        81.6
poi-ancienne-medina  104.8      poi-boulevard-moh-v   76.1
poi-hassan-ii         98.0      exp-cooking-mi-naima  73.5
```
Day produced: **Habous 09:30 → Marché Central 11:20 → Sacré-Cœur 12:55 → Ancienne Médina 14:15**, 5.28 km walking, 0 car, 349 min total, **40–60 MAD**.

**Why Marché Central (132.2) and not Hassan II (98.0)?** Decompose:

| Term | Marché Central | Hassan II |
|---|---|---|
| priority × 5 | 4 × 5 = **20** | 5 × 5 = **25** |
| curated route (route-casablanca-signature contains both) | **+34** | **+34** |
| signature | 0 | **+6** |
| hero | +2 | +2 |
| interest `culture` | categories `[food, culture, hidden_gems]` → index 1 → **+20** | categories `[culture, coast_nature, art_creative]` → index 0 → **+34** |
| interest `food` | index 0 → **+34** | absent → **0** |
| experiential | 0 | 0 |
| budget (low) | `free` → w=0 ≤ 30 → **+12** | `60_150` → w=105 → **−13.1** |
| proximity (anchor = centroid of Casablanca places) | ≈ **+13** (central) | ≈ **+10** (2.5 km west) |
| verification | verified → 0 | verified → 0 |
| **≈ total** | **≈132** | **≈98** |

**The three decisive terms are: `food` as a primary category (+34), the low-budget bonus for a free stop (+12 vs −13.1), and central proximity.** Hassan II's larger priority and signature bonus (+31 combined) cannot close a ~34-point gap opened by a stated interest.

**And Hassan II still appears** whenever the traveller states `culture` without `low` budget — e.g. the "unknown city" and "few hours" scenarios both include it.

### 7.5 Engine behaviours a jury can attack (found by running it)

| Scenario run | Result | Problem |
|---|---|---|
| **Empty profile, Casablanca** | Ancienne Médina → Cooking class → Leather bag → Hassan II. **570 MAD, 8.0 km by car, 816 m walking.** | With no budget stated there is no cap, and the experiential bonus + high `priority: 5` on the two experiences produces an expensive, car-heavy day for someone who answered nothing. |
| **Oualidia, coast+food, full day** | Plage de Oualidia → **Dégustation d'huîtres chez Ostréa** → **Oysters at the Lagoon** → Lagune de Oualidia | **Two oyster tastings in one day.** The guide/curator prompt forbids "two stops that do the same thing"; the deterministic engine has no such rule — it only tracks *kind* and *category*, and one is a `place` and one is a `food_experience`. This is a genuine, reproducible duplicate-role defect. |
| **Destination "Marrakech"** (via onboarding, no chat) | Ancienne Médina → Habous → Place Mohammed V → Hassan II, silently relabelled Casablanca | `destinationPool()` falls through to the whole region when the named city has <4 POIs, and `buildTrip` sets `destination = stops[0].poi.city`. **The traveller asked for Marrakech and got Casablanca with no explanation.** (The `/chat` path handles this differently — it invents a Marrakech day instead.) |
| **El Jadida, coast, full day** | Cité Portugaise → Plage Deauville → Pottery workshop → **Phare Sidi Bouafi** | Phare Sidi Bouafi is `availability: unknown`, `priceRange: unknown`, `verification: needs_verification`. Only 6 POIs exist in El Jadida and one is blocked, so the engine has almost no choice — 4 of 5 available. |
| **Anchored on the cooking class, half day** | Ancienne Médina → Cooking class → Habous artisans → Phare El Hank. **9.1 km by car, 700 m walking.** | The anchor works, but the resulting day is mostly driving and nothing warns about it (the walking insight only fires when walking is *too high*). |

---

## PHASE 8 — ROUTING / OPTIMISATION

### 8.1 What is actually used

| Concern | Implementation |
|---|---|
| Distance between stops | **Haversine** (`haversineMeters`, `src/lib/routing/metrics.ts`) × **`STREET_DETOUR_FACTOR = 1.22`** (`metrics.ts:32`) — calibrated against the specification's own golden day, whose legs are 2000/1219/2048 m as the crow flies and are quoted at 2.4/1.5/2.5 km on foot |
| Mode choice | `distance > WALKING_COMFORT_METERS (2600 m)` → car, else walking (`estimateLeg`) |
| Duration | `distance / speed`, `FALLBACK_SPEED = {walkingKmh: 4.6, carKmh: 22}` |
| Road network | **OSRM public demo server**, `router.project-osrm.org`, profiles `foot`/`driving`, `overview=full&geometries=geojson` |
| **What OSRM's answer is used for** | **GEOMETRY ONLY.** Its distances and durations are explicitly discarded. |
| Stop ordering | **Not distance-optimised.** Brute-force best of 24 permutations by narrative phase affinity. |
| TSP / shortest path | **None.** |

### 8.2 Why OSRM's numbers are discarded — verified live during this audit

```
POST /api/route  Habous → Marché Central, mode "walking"
→ { distanceMeters: 2826, durationMinutes: 5, geometry: [...441 points...] }
```
**2,826 m in 5 minutes is 34 km/h.** The public OSRM demo server answers with *driving* data for every profile. `docs/FALLBACKS.md` documents this and the code acts on it: `withRoutedGeometry()` (`build-trip.ts:52`) takes only `geometry`, and `useRoutedTrip()` (`use-trip-data.ts`) does the same on the client. **This is a genuinely good engineering decision and excellent material for a jury answer about verifying third-party data.**

### 8.3 Complexity

- Scoring: `O(n log n)` over the city pool.
- Selection + repair: `O(4 × 4 × n)` worst case = linear.
- Ordering: `O(4!) = 24`, constant.
- Routing: 3 HTTP calls in parallel, each bounded at 4 s, each degrading independently to a straight line.

**Total: linear in dataset size, constant in trip size.** At n = 36 this is microseconds; the whole `match()` + `schedule()` is far below 1 ms.

### 8.4 "Why do you call this optimisation?"

**The honest answer, which the presenter must give:**

> We do not optimise for distance and we say so. There is no TSP, no shortest-path solve. What we optimise is **narrative order**: with four stops there are only 24 orderings, so we score every one of them against a phase-affinity table — morning culture, midday food, afternoon discovery, sunset icon — and take the best outright. That is exact, not heuristic, because the search space is 24.
>
> Two things *are* constrained optimisations, both greedy repairs rather than searches: `fitToLimit` brings the day under a stated budget or time limit by surrendering one stop at a time and only accepting a replacement that preserves every obligation; and `less_walking` converts long walking legs to car only when doing so actually saves time.
>
> Distance enters as a **soft score term** — a 14-point exponential gravity well around the anchor with a 6 km falloff — not as an objective. That is deliberate: shortest-path days in a city like Casablanca produce four stops on one street.

If a jury pushes: **the selection step is a greedy heuristic with obligation checks, not a global optimum, and the code says so** — *"Deliberately a repair and not a search... a combinatorial optimiser would throw all three away to save twenty dirhams."*

---

## PHASE 9 — MAP SYSTEM

| Concern | Implementation |
|---|---|
| Library | MapLibre GL JS 6.6, loaded via `next/dynamic` with `ssr: false` (`src/features/map/trip-map.tsx`) so the GL bundle never blocks first render |
| Tiles | **OpenFreeMap** — `https://tiles.openfreemap.org/styles/dark` (default in `src/config/app.ts`), `positron` in `.env.example`. No key, no quota documented, third-party public service |
| Worker | MapLibre's tile-parsing worker is **copied into `public/`** by `scripts/sync-map-worker.mjs` on predev/prebuild and pointed at with `setWorkerUrl("/maplibre-gl-worker.mjs")`. Turbopack does not emit `new Worker(new URL(...))` correctly — without this the map rendered blank with zero markers and no error |
| Markers | 4 HTML markers, numbered; visual circle is an **inner span** so our transform does not fight MapLibre's inline placement; active pin scales 0.667 → 1 with a ring |
| Route | One GeoJSON source, three line layers: casing, walk (primary colour), car (mist); car line widens to 4px when `changed` is true (adaptation animation) |
| Geometry source | OSRM `geometry` when available; **`geometry: null` is legal and means "draw a straight line"** |
| Fit bounds | `fitToStops()` with a reserved bottom band, clamped to 45% of container height, `maxZoom: 15` |
| Interaction | `pitchWithRotate: false`, `dragRotate: false` — *"A tourist map is for reading, not for flying through."* Pin tap → `setActiveStop` + `revealTimelineStop` |
| Failure | `map.on("error")` sets `failed` **only before load**; after load a 404 tile is not a broken map. On failure the UI shows `trip.mapUnavailable` = *"Map unavailable. Your day is right below."* |
| Adaptation reveal | `revealRouteMap()` scrolls the map into view on `scrollIntoView({block:"center"})`, respecting `prefers-reduced-motion` |

**Real vs visual-only:** pin positions are real coordinates from the dataset (or from the model, on the AI path). Route *geometry* is real street geometry when OSRM answers, otherwise a straight line. Route **labels** (distance, duration, mode) are always the app's own numbers, never the provider's.

**Offline:** tiles require internet. With tiles blocked the timeline is fully usable and the app says so. **There is no offline tile cache and no service worker.**

**API limits:** OpenFreeMap and the OSRM demo server are both free public services with no contractual SLA. Neither is rate-limited by the app. On a demo day this is a real (if small) risk.

---

## PHASE 10 — LOCAL IMPACT / SUSTAINABILITY

### 10.1 The figure, and exactly where it comes from

`localImpact()` — `src/features/trip/trip-insights.ts:283`:

```ts
for (const stop of trip.stops) {
  const meta = stop.poi.experience;
  if (!meta?.supportsLocalBusiness) continue;      // hard gate #1
  const mad = meta.price?.amount ?? meta.price?.min ?? null;
  if (typeof mad !== "number" || !isFinite(mad) || mad <= 0) continue;  // hard gate #2
  lines.push({ poi: stop.poi, mad: Math.round(mad) });
}
if (lines.length === 0) return null;               // renders NOTHING rather than a zero
return { totalMad: sum(lines), lines };
```

**Two hard gates, both from curated data:** the POI must be flagged `experience.supportsLocalBusiness` (true for exactly the 6 experiences) **and** must have a real price. A range is counted at its **low** end. Admission to a mosque, a free medina and transport contribute **nothing**.

**Rendered as:** `≈{total} MAD of this day goes straight to local hosts and artisans` (`trip.impactLine`), always with the **itemised receipt** underneath (`LocalImpact` component and `ProvenanceSheet`).

### 10.2 Classification of every metric shown

| Metric | Where | Classification |
|---|---|---|
| `≈N MAD stays local` | `local-impact.tsx`, `ProvenanceSheet` | **CALCULATED** — summed from curated prices of stops actually in this day. A **floor**, not an estimate. Renders nothing when no qualifying stop exists. |
| Per-stop breakdown | same | **CALCULATED** |
| Walking / car metres, moving minutes, activity minutes, total minutes | `calculateMetrics()` | **CALCULATED** from haversine × 1.22 and fixed speeds. **Estimated inputs**, arithmetically exact. |
| `estimatedCostMad` [min, max] | `estimateCostMad()` | **CALCULATED** from `approxPriceMad ?? PRICE_BANDS[priceRange]`. The bands (`free:[0,0] … 300_plus:[300,500]`) are **hardcoded product constants**. |
| `77% less walking · ~40 min saved` | `less-walking.ts` `headlineFor()` | **CALCULATED** from real before/after metrics. **On the golden day the numbers happen to be exactly the ones in `docs/DEMO_PATH.md`**, because the golden fixture was authored to produce them — but the computation is real, and `src/lib/__tests__/golden-fixtures.test.ts` asserts they agree. |
| Khotwa Coins (20/50/80/100 + 100 day bonus) | `src/config/rewards.ts` | **HARDCODED product constants.** Not money, not settled, explicitly documented as a loyalty ledger. |
| Partner discounts | `experience.discount` on 3 POIs | **HARDCODED demonstration content.** `partnerStatus: "demo"` and the UI prints `activity.demoPartner`. |
| Interest match "3 of 4 stops" | `interestMatch()` | **CALCULATED** |
| Weather chip | `/api/weather` → Open-Meteo | **LIVE**, omitted entirely on failure |
| Recognition "N% match" | model's own `confidence.detectedPlace` | **MODEL SELF-REPORT.** Shown only when a real provider returned one; `null` on the fallback path suppresses the chip. **Do not describe this as an accuracy figure.** |
| Draft `confidence` / band | `scoreDraft()` | **CALCULATED** — a blend of grounding (verifiable), coverage (verifiable) and the model's self-report at ¼ weight |

**There is no CO₂ figure, no sustainability score, no "70% local impact" percentage anywhere in the code.** If any deck slide contains one, it is not backed by the product. **Do not claim it.**

### 10.3 The honest sustainability position

What exists: money routed to `supportsLocalBusiness` hosts, counted and itemised; a preference for walking over car in mode selection (2.6 km comfort threshold); the six experiences are people rather than chains. What does not exist: emissions accounting, transport-mode carbon comparison, any environmental metric at all.

**Safe sentence:** *"We do not claim a carbon number. We claim a cash number, we compute it as a floor from the curated prices of the stops in this specific day, and we show you the receipt."*

---

## PHASE 11 — UX / UI ARCHITECTURE

The app renders as a **390×844 phone on a desktop stage** (`.app-stage` / `.app-phone` / `#app-viewport` in `src/app/layout.tsx` + `globals.css`). On a projector this is intentional, not a layout bug — the runbook says so.

### Screen inventory

| Screen | Purpose | Primary CTA | Secondary | Data source | Loading | Empty | Error | Mobile | A11y notes |
|---|---|---|---|---|---|---|---|---|---|
| **`/` Home** | Choose a way in | "Plan my day" → `/onboarding?new` | "Ask a local" → `/chat`; 6 category tiles; 3 Popular cards; language menu | static presets + `CATEGORIES` | none needed | n/a | n/a | video hero `object-cover`, horizontal scroll rows | video has `aria-label`, is `muted`+`playsInline`; category label boxes are fixed 2-line to stop reflow |
| **`/onboarding` step 1** | Composer — all modalities | "Continue" / auto on recognition | file rows, link field, mic, paste, presets | `/api/extract`, `/api/analyze` | dedicated `analyzing` phase that **keeps the user's input on screen in the same box**; indeterminate bar (deliberately not a fake percentage) | shows starting points | upload issues surface as a line; network failure → low-confidence draft | 56px rows, `<label>`-wrapped file inputs so the whole row is the target | `aria-expanded` on source rows; `role="status"` on the analysing line |
| **Recognition reveal** | Confirm what we understood | "Build a day around this" | alternatives (only when band ≠ high), "Try another" | `Recognition` + draft | — | third state: "we could not place this one", still moves forward | never dead-ends | full-bleed inside the app viewport | `role="dialog" aria-modal` with a computed `aria-label` |
| **`/onboarding` step 2** | Interests, max 3 | Continue | — | `INTEREST_OPTIONS` | — | — | — | tapping a 4th drops the oldest rather than ignoring the tap | `ChoiceChip` is a real button |
| **`/onboarding` step 3** | Time / budget / pace / walking | **"Build my trip"** | — | option tables | — | defaults applied on arrival at the step | — | — | `<fieldset><legend>`; every option is deselectable |
| **Processing** | Watch the day being built | none (auto-navigates) | Retry on failure | `buildTrip()` | *is* the loading state | — | explicit error card + Retry, remounts via `key` | — | `prefers-reduced-motion` → 540 ms total tempo |
| **`/trip`** | The result | "Start trip" | Adapt my day, Day check sheet, pins, timeline rows, Verified link | store + `/api/route` + `/api/weather` | skeleton **inside** the shell so the tab bar never blinks | seeds the golden Casablanca day if the store is empty | map failure → "Map unavailable. Your day is right below." | 42dvh map, sticky footer | tap hint line explains map↔timeline coupling |
| **`/experience`** | The day is running | "Visited" | story sheet, Navigate, Adapt, progress rail | store | — | — | — | 44px+ targets on the rail | `aria-current="step"`, `aria-label` with position |
| **`/chat`** | Conversational guide | send | "Build this day" on a proposal card | `/api/chat` | pending state | 3 openers | "guide unavailable" line | auto-scroll to newest | — |
| **`/explore` + `/explore/[category]`** | Editorial browse | open a place | search, category chips, save | `POIS` | — | — | — | snap-scroll rows | — |
| **`/saved`** | Kept + finished | open a place | — | `savedPoiIds` + passport | — | honest empty state | — | — | — |
| **`/passport`** | Stamps, wallet, settings, reset | — | Wallet sheet, language, "Reset my data" | store | — | empty stamp state | — | — | stamps have deterministic tilt so they never jitter |

### UX strengths (evidenced)

1. **Nothing is mandatory.** Every onboarding control is deselectable; the CTA is never blocked by a failed AI call. This is enforced in code, not just design.
2. **Failure is always forward.** Every route handler answers **200** with a usable body. There is no error screen in the AI paths at all.
3. **The composer keeps your input visible while it thinks** — a specific, documented fix for "the app lost my text".
4. **The indeterminate progress bar** replaced a fake percentage that tweened 12%→88% over 2.4 s while the request finished in 1 s.
5. **Day check is one row, not a panel** — the previous version spent ~355 px of 696 px on an audit nobody needed.
6. **Adaptations refuse honestly** rather than pretending.
7. **RTL is real** — `dir` is set server-side from a cookie so the first byte is correct.

### Confusing flows / demo stall risks

1. **Two front doors that behave completely differently.** `/onboarding` is grounded and cannot leave the region; `/chat` will happily plan Istanbul. A jury member who wanders into `/chat` gets a different product with different truth guarantees, and nothing on screen tells them.
2. **"Verified places" appears on every day, including a fully AI-authored one.** (§5.2)
3. **The `optimizing` phase does no optimizing.** A jury member watching closely and then reading the code will notice.
4. **`/test-ai`, `/test-openai`, `/test-ai-darija` ship in the production build** and are reachable by URL. They show raw model output, model lists and transcription comparisons. Keys are redacted (`redact()` in both status routes) but this is developer surface on a jury's projector.
5. **Asking for a city we don't cover, via onboarding, silently gives Casablanca** relabelled to Casablanca. No message.
6. **The "Listen" button never appears** — `docs/DEMO_PATH.md` step 55–70 s tells the presenter to demo it.
7. **`docs/JURY_SAFE_RUNBOOK.md` warns about Arabic + numbers**: `1 h 22` renders as `h 22 1` inside a sentence. Layout is fine; embedded units are not.
8. **Empty-profile days can cost 570 MAD** and be 90% car (measured, §7.5).

### Interactions that look functional but are not backed

- The `ShieldCheck` next to every stop is decorative — it reflects nothing in the data.
- `Navigate` is real but leaves the app for Google/Apple Maps (the runbook advises against tapping it on stage).
- Wallet "unlock" spends coins and records an entitlement; **nothing is paid, nothing is settled**, and only 3 POIs have an offer.

---

## PHASE 12 — MOTION & EXPERIENCE

`src/components/motion.ts` centralises `DURATION`, `EASE_OUT`, `rise()`, `riseInView()`, `prefersReducedMotion()`.

| Animation | Where | Classification |
|---|---|---|
| Home hero video loop | `home-screen.tsx` | **Aesthetic decoration** (autoplay, muted, `playsInline`, 420 KB) |
| Card `rise()` entrances (staggered) | Home rows, chat turns, trip header | **Aesthetic decoration** |
| Composer "analysing" state — input stays, indeterminate bar | `inspiration-composer.tsx` | **Functional feedback** (deliberately indeterminate) |
| Recognition reveal — full-bleed image + rising content | `recognition-reveal.tsx` | **Narrative storytelling** — this is the product's emotional moment |
| Processing: brand mark draw + per-letter "khotwa" stagger, headline crossfade per phase, `GenerationProgress`, `DiscoveryInsight` | `processing-screen.tsx`, `generation-visual.tsx` | **Narrative storytelling**, and partly **cover for real latency** — see below |
| Map fit-bounds fly (600 ms) | `map-canvas.tsx` | **Functional feedback** |
| Route re-draw on adaptation + `changed` line widening + `revealRouteMap()` scroll | `map-canvas.tsx`, `trip-map.tsx` | **Functional feedback** — the changed segments are exactly `changedSegmentIds` from the real `AdaptationResult` |
| Metric count-up | `use-count-up.ts`, `local-impact.tsx` | **Aesthetic decoration** over real numbers |
| Passport stamp: scale 1.5→1 with deterministic tilt | `passport-screen.tsx` | **Narrative storytelling** |
| Pin scale on active (transform only, not width/height) | `map-canvas.tsx` | **Functional feedback**, deliberately composited |
| Splash | `components/splash.tsx` | **Potential UX distraction** on repeat visits |

### Does animation hide real loading, or merely delay results?

**Both, and the code is unusually explicit about it.**

- The generation promise starts on the **first frame**; the choreography measures itself against it, never the reverse (`processing-screen.tsx` — *"the animation measures itself against generation, never the other way round"*).
- The first beat ends **the moment generation answers**, floored at `quick.understand` (340 ms) and ceilinged at `full.understand` (620 ms).
- The `discovering` beat's ceiling **is generation itself** — a slow backend leaves the scanner turning rather than replaying entrances.
- **But**: `setTrip(built)` happens *before* `optimizing`, so `optimizing` (760 ms) and `revealing` (420 ms) are **pure delay** — ~1.2 s of animation after the trip is already in hand at full tempo.
- Under `prefers-reduced-motion` the whole thing collapses to ~540 ms.
- The composer additionally floors image recognition at **1400 ms** (`handleFile`) *"a result that appears before the user has read the frame reads as a bug, not as speed"*.

**Honest presenter line:** *"About 2.5 seconds of the reveal is choreography and about 1.2 seconds of that is after the day is already built. We compress it automatically when the backend is fast and we remove it entirely for reduced-motion."*

---

## PHASE 13 — TECHNICAL ARCHITECTURE

### 13.1 The real diagram

```
                          ┌──────────────────────────────────────────┐
                          │  Browser (the whole application)         │
                          │                                          │
  screenshot ─┐           │  React 19 · Next.js 16 App Router        │
  voice ──────┤           │  Zustand store (one) ─ localStorage      │
  typed text ─┼──────────▶│  features/home/analyze.ts = ALL fetches  │
  TikTok URL ─┤           │                                          │
  conversation┘           │  ┌────────────────────────────────────┐  │
                          │  │ lib/matching/engine.ts  (PURE)     │  │
                          │  │  match() · schedule()              │  │
                          │  │ lib/routing/metrics.ts  (PURE)     │  │
                          │  │ lib/adaptation/*        (PURE)     │  │
                          │  │ lib/intent/*  Zod boundary (PURE)  │  │
                          │  │ data/pois.ts  36 POIs (in bundle)  │  │
                          │  └────────────────────────────────────┘  │
                          │            │                             │
                          │            ▼  MapLibre GL (lazy, no SSR) │
                          └──────────────────────────────────────────┘
                                       │ fetch (same origin)
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
 /api/extract                    /api/curate                    /api/route
 /api/analyze                    /api/chat                      /api/weather
 /api/transcribe                                                (Next route handlers —
        │                              │                         they exist ONLY to hold keys)
        ▼                              ▼                              ▼
  Gemini generateContent        OpenAI chat/completions       OSRM public demo
  MoulSot HF Space (Gradio)     OpenAI audio/transcriptions   Open-Meteo
  Groq Whisper                  Wikimedia REST                OpenFreeMap tiles (direct from browser)
  TikTok oEmbed / YouTube API / arbitrary OpenGraph
```

**The single most important architectural fact: the trip is generated in the browser.** `buildTrip()` (`src/features/onboarding/build-trip.ts`) runs client-side and calls the API routes only for things that need a secret or a third party. There is no server-side trip service.

### 13.2 Frontend / backend boundary

- `src/config/env.ts` imports `server-only` — importing it from a client component is a **build error**. That is the enforced boundary for secrets.
- `src/lib/ai/index.ts` also imports `server-only`, so the whole AI surface is server-side.
- Deliberately **not** `server-only`: `src/lib/ai/resolve-poi.ts`, `src/lib/ai/url.ts`, `src/lib/intent/*` — so they stay unit-testable and usable on both sides.
- `vitest.config.mts` aliases `server-only` to a stub (`vitest.server-only.ts`) so the **real route handlers and providers** are tested, not copies.

### 13.3 State management

One Zustand store (`src/lib/store/index.ts`, 326 lines), no `zustand/persist` (*"the trip object is large and we control the save points"*). Slices: `hydrated`, `locale`, `profile`, `trip`, `processing`, `mode`, `activeStopId`, `adaptation`, `tripBeforeAdaptation`, `passport`, `savedPoiIds`, `wallet`, `lastReward`.

Persistence: `src/lib/storage/index.ts`, keys `siyaha:v1:{trip,passport,profile,locale,saved,wallet}`. Every read is guarded by a shape guard; a corrupt value is dropped, never thrown. Quota/private-mode failures are swallowed — *"persistence is a convenience, never a requirement."*

Hydration happens once via `<StoreHydration/>` in the root layout. Locale is additionally written to a **cookie** (`writeLocaleCookie`) so `<html lang dir>` is correct in the first byte.

The chat conversation is deliberately **component state only** — not in the store, not on the server: *"a chat with a stranger about a Tuesday in Casablanca is not state the app should still be holding tomorrow."*

### 13.4 API contracts

Every product route answers **200 with a usable body**, even on total failure. Only `/api/route` returns 4xx (400 on invalid JSON or a Zod failure). `/api/weather` returns **204** on any failure so the chip disappears.

| Route | Method | Request | Response |
|---|---|---|---|
| `/api/extract` | POST | `{source?, text?, transcript?, url?, image?, known?, locale?}` | `{ok, degraded, draft, profile, trace?}` (`trace` only outside production) |
| `/api/analyze` | POST | multipart `file` **or** `{image:{base64,mimeType}}`, `?locale=` | `{ok, degraded, reason?, result, draft}` |
| `/api/curate` | POST | `{profile}` | `{ok, degraded, headline, note, picks[], pois[]}` |
| `/api/chat` | POST | `{turns[], locale?, profile?, currentPoiIds?}` | `{ok, degraded, reply, picks[], headline, profile, pois[]}` |
| `/api/transcribe` | POST | multipart `file`\|`audio`, `locale?` | `{ok, degraded, reason?, text, detectedLocale?, provider?}` |
| `/api/route` | POST | `{segments:[{from,to,mode}]}` (1..9) | `{segments:[SegmentResult]}` — **always one per request, in order** |
| `/api/weather` | GET | `?lat&lng&city` | `WeatherSummary` or **204** |

`docs/openapi.yaml` exists. **Not verified against the code during this audit — treat it as possibly stale.**

### 13.5 Caching, concurrency, cancellation, error propagation

- **Caching: none.** Every provider fetch uses `cache: "no-store"` or has no cache directive. No memoisation, no SWR, no prompt caching.
- **Concurrency:** `/api/route` batches with `Promise.all` and never returns a short array. `VOICE_ENGINE=darija` runs both transcription engines in parallel. `withWikiImages` fetches all thumbnails in parallel with a 3 s each budget.
- **Cancellation:** `boundedSignal(ms, outer)` (`src/lib/ai/http.ts`) = `AbortSignal.any([outer, AbortSignal.timeout(ms)])` — every provider call is bounded **and** honours the incoming request signal. Client hooks (`useRoutedTrip`, `useWeather`) use `AbortController` in effect cleanup. **`buildTrip()` itself is not cancellable** — navigating away leaves an in-flight `/api/curate`.
- **Error propagation:** `orFallback(task, fallback)` swallows everything — timeout, network, 500, bad JSON — and **never surfaces a provider name**. `parseJsonLoosely` strips code fences and slices `{`…`}` before giving up.
- **Security boundaries:** `server-only` for secrets; `readImageUpload`/`readAudioUpload` validate mime + size before a byte reaches a provider; Zod on `/api/route`; `parseTripProfile` on curate/chat; `readTurns` caps history at 20 turns × 2000 chars; `readPoiIds` filters to known ids and caps at 8.

---

## PHASE 14 — EXTERNAL DEPENDENCIES

| Service | Used for | Mandatory? | Failure effect | Demo risk |
|---|---|---|---|---|
| **Google Gemini** (`generativelanguage.googleapis.com`) | image understanding, intent extraction | No | `degraded: true`; `localExtract()` keyword pass takes over; confidence ≤ 0.45; a photo comes back "we could not place this one" | **Medium** — the recognition moment is the emotional peak of the demo |
| **OpenAI** (`api.openai.com`) | curator, guide, Whisper fallback | No | curator returns `null` → engine builds the day alone; **`/chat` becomes unusable** ("guide unavailable") | **High for `/chat`, low for `/onboarding`** |
| **MoulSot HF Space** (`atlasia-moulsot-v0-3.hf.space`) | Darija STT | No | falls back to Whisper's answer | **High** — a public HF Space can be cold (hence the 45 s budget) or down entirely, and this is the differentiating feature |
| **Groq** | fast Whisper | No | OpenAI Whisper used instead | Low (no key set anyway) |
| **OSRM demo** (`router.project-osrm.org`) | street geometry only | No | straight lines on the map; **all numbers unchanged** | **Low** — by design |
| **Open-Meteo** | weather chip | No | chip omitted, 204 | Very low |
| **OpenFreeMap tiles** | base map | No | "Map unavailable. Your day is right below." | **Medium** — the map is the visual centrepiece |
| **TikTok oEmbed** | link title/author/thumbnail | No | falls to OpenGraph, then to platform+URL only | Low |
| **YouTube Data API v3** | link metadata | No (no key set) | OpenGraph branch | Low |
| **Arbitrary OpenGraph fetch** | any pasted link | No | `provider: "platform_only"` | Low functionally, **see §15 for the SSRF risk** |
| **Wikimedia REST** | photos for AI-authored stops | No | keeps the category image | Low |
| **Google Fonts (Poppins)** | typography | Build-time via `next/font/google` — **self-hosted after build** | none at runtime | None |

### "What happens if internet access fails during the jury demo?"

**The real answer, in order:**

1. **The app still runs** — `next dev`/`next start` is local, and the 36-POI dataset is compiled into the bundle. **This is the strongest fallback story in the project.**
2. **Every AI path degrades to local logic.** `localExtract()` still parses "half a day in Casablanca, culture and food" in EN/FR/AR/Darija. The engine still builds a full four-stop day.
3. **Photos fail honestly** — the reveal says it could not place the image and offers a manual path. It does **not** pretend it recognised Hassan II. (`docs/JURY_SAFE_RUNBOOK.md` still says it does — that doc is stale.)
4. **Voice fails** — both engines are remote. The mic records and reports it could not hear you. The CTA is never blocked.
5. **`/chat` is dead.** "The guide is unavailable." Do not demo `/chat` without internet.
6. **The map goes blank** and is replaced by "Map unavailable. Your day is right below." The timeline, timings, distances and adaptations all still work.
7. **Adaptations, wallet, passport, explore, saved: all fully local.** Less Walking, Less Time, Spend Less and Rainy Day are pure functions.
8. The runbook states this was **verified with every `/api/*` call and every map tile blocked** and the full demo still ran.

**What you lose offline:** recognition, voice, the guide, the curator's per-stop "why this, for you" lines, weather, street geometry and the map. **What you keep:** a complete, timed, priced, adaptable four-stop day.

---

## PHASE 15 — SECURITY & PRIVACY

### FINDING S1 — Server-Side Request Forgery on `/api/extract` · **HIGH**

`extractUrlMetadata()` (`src/lib/ai/url.ts`) fetches **any user-supplied http/https URL** server-side. `parseUrl()` rejects non-http(s) schemes and hosts without a dot — and nothing else. There is **no private-IP, loopback, or link-local blocklist**, and `redirect: "follow"` is set.

- Reachable by anyone who can POST to `/api/extract` with `{"url": "..."}`.
- `<title>`, `og:title` and `og:description` of the fetched page are returned to the caller in `draft.evidence.urlTitle` / `urlDescription`, so this is a **read-SSRF with limited data exfiltration**.
- On a cloud host this reaches instance metadata endpoints; on a laptop it reaches anything on the LAN.
- Mitigations that exist: 3 s timeout, 2 MB head cap, one redirect chain, and only two metadata fields returned. `fetchRemoteImage()` is stricter (https only, mime-checked, size-capped) but also unguarded on host.
- **Not exploitable in a laptop-only demo. It is a genuine blocker for any deployment.**

### FINDING S2 — Unauthenticated, unmetered LLM/ASR proxy · **HIGH (if deployed)**

Every route is public and there is **no auth, no rate limit, no CAPTCHA, no origin check, no CORS restriction** anywhere in the repository. `/api/chat`, `/api/curate`, `/api/extract`, `/api/analyze` and `/api/transcribe` all spend the project's OpenAI/Gemini credits per request. `/api/chat` accepts up to 20 turns × 2000 chars = 40 KB of attacker-controlled prompt per call. **Deployed publicly, this is a billing incident waiting to happen.**

### FINDING S3 — Developer diagnostic pages in the production build · **MEDIUM**

`next build` emits `/test-ai`, `/test-ai-darija`, `/test-openai` and six `/api/test-*` endpoints. `/api/test-openai/status` returns the **full list of the key's speech models** and the configured model names; `/api/test-ai/status` returns Gemini model availability. Both **redact key-shaped strings** from upstream error bodies (`redact()`), which is genuinely careful — but this is developer surface that discloses account configuration and burns quota.

### FINDING S4 — Prompt injection through pasted URLs and images · **MEDIUM**

Page titles, descriptions, OCR text and TikTok captions are inserted **verbatim** into `INTENT_PROMPT`'s evidence block (`src/lib/ai/intent.ts` — `evidenceBlock`). A crafted page could try to steer extraction. **The blast radius is small by design**: the model's output can only become enum values (filtered by `pickEnum`/`pickInterests`), free-text constraint strings (capped at 6, rendered as chips) and a place *name* (which must then survive `resolvePoiId`'s two-token rule). It cannot inject a POI id or a coordinate on this path. On the `/chat` path, where custom stops are allowed, the ceiling is higher.

### FINDING S5 — Wikipedia-thumbnail lending credibility to invented stops · **MEDIUM**

`withWikiImages` (`src/lib/ai/curator.ts:186`) is host-restricted to `upload.wikimedia.org`, which is the right control against URL invention. The residual risk is presentational: it attaches a real photograph to a model-authored stop.

### FINDING S6 — CC BY-SA image attribution not rendered · **MEDIUM (legal, not technical)**

See §6.3. 30 images require attribution; none is shown.

### FINDING S7 — `.env.local` contains live keys and is correctly gitignored · **LOW**

Verified: `.gitignore` covers `.env*`. Keys are read only through `src/config/env.ts` (server-only getters). **No `NEXT_PUBLIC_` variable holds a secret.** Confirmed by inspection: the only public vars are the map style URL and the app URL.

### FINDING S8 — Upload validation is genuinely good · **LOW / positive**

`src/lib/ai/upload.ts`: mime allowlist (4 image, 9 audio), 8 MB cap, zero-byte rejection, base64 length→bytes conversion for the JSON path, codec-parameter stripping for audio (`audio/webm;codecs=opus`). Files are **never written to disk** — they go straight to the provider as base64/multipart. Rejection happens *before* a byte reaches a paid API.

### Privacy posture

- **No accounts, no telemetry, no analytics, no third-party tracking scripts.** Verified by search.
- **No server-side persistence of anything.** Images, audio and transcripts are held in memory for the duration of one request and then discarded. There is no upload directory, no S3, no database.
- Audio and images **are** sent to Google/OpenAI/Hugging Face; that is inherent and should be stated plainly if asked.
- Everything the user keeps lives in **their own browser's localStorage** and "Reset my data" (`resetAll`) genuinely clears trip, profile, passport, saved places and wallet.
- Geolocation is **never requested** (`docs/FALLBACKS.md`, confirmed — no `navigator.geolocation` in the codebase).

### Summary

| Finding | Severity |
|---|---|
| S1 SSRF on `/api/extract` | **High** (deployment blocker; not demo-relevant) |
| S2 Unauthenticated LLM proxy, no rate limit | **High** (deployment blocker) |
| S3 Diagnostic pages in prod build | Medium |
| S4 Prompt injection via URL/image evidence | Medium |
| S5 Wiki thumbnails on invented stops | Medium |
| S6 CC BY-SA attribution missing | Medium |
| S7 Key handling | Low (correct) |
| S8 Upload validation | Low (correct) |

---

## PHASE 16 — PERFORMANCE

### Heavy dependencies

`maplibre-gl` is by far the largest, and it is **lazy-loaded with `ssr: false`** so it never blocks first render. `motion`, `zustand`, `zod`, `vaul`, `@phosphor-icons/react` are all small. **No moment.js, no lodash, no chart library, no vendor AI SDK** — both Gemini and OpenAI are plain `fetch` (*"no vendor SDK, no version risk"*).

### Assets

`hero.mp4` 420 KB, `habous.mp4` 168 KB, `corniche.mp4` 100 KB, `hero.webp` 124 KB, `public/images/poi/` **6.5 MB** across 36 WebP files (~180 KB each). Fonts are Poppins via `next/font/google` — self-hosted at build, `display: swap`.

**The 36 POI objects are compiled into the client bundle**, including 7 languages of narrative text. That is the main JS payload growth vector.

### Network calls per journey

| Journey | Calls |
|---|---|
| Home → onboarding → trip (typed input) | `/api/extract` (1) + `/api/curate` (1) + `/api/route` (1 batched, 3 segments) + `/api/weather` (1) = **4** |
| + image | + `/api/analyze` (1) |
| + voice | + `/api/transcribe` (1) |
| Chat → build | `/api/chat` × turns + `/api/route` + `/api/weather` (**no curate** — the guide's picks are used directly) |

**Duplicate work found:** `buildTrip()` calls `/api/route` for geometry, and then `/trip` mounts `useRoutedTrip()` which calls `/api/route` **again with the same segments**. Two identical round trips per trip. Harmless (both degrade silently) but wasteful.

### Sequential vs parallel

The critical path is genuinely sequential: understanding → curation → match → routing. Nothing is parallelised across those stages because each depends on the last. Within routing, all 3 segments go in one batched request handled with `Promise.all`.

### Measured critical path (live, this machine, `next dev`)

```
/api/weather   0.33 s
/api/extract   0.89 s   (Gemini, text)
/api/curate    2.98 s   (OpenAI gpt-4o-mini, full 36-line catalogue)
/api/route     sub-second (OSRM, real geometry returned)

user taps "Build my trip"
  → /api/curate            ~3.0 s   (ceiling 15 s)
  → match() + schedule()   <1 ms    (pure, synchronous)
  → /api/route             ~0.5 s   (ceiling 4 s × 3, parallel, degrades to straight lines)
  → reveal choreography    ~2.5 s floor at full tempo, overlapping the above
  ────────────────────────────────
  observed shape           ~3.5 – 5 s     hard ceiling 20 s → golden day shown
```

**Voice adds up to 20 s** when MoulSot is used (measured in the route's own header comment: MoulSot 20.1 s vs gpt-4o-transcribe 0.9 s on the same clip), and the budget is 45 s for a cold Space. **This is the single biggest latency risk on stage.**

### Rendering

`useCountUp` animates numbers; pin scaling uses `transform` only (deliberately — animating the box relaid out the marker every frame); the route `line-opacity` transition is 220 ms; MapLibre is built once and trips are pushed into the existing map rather than remounting it. Images use a `POIImage` component with a documented fallback chain (hero → category image → placeholder) rather than loading all sources at once.

---

## PHASE 17 — TESTING & RELIABILITY

### Quality gates — all four run during this audit

| Gate | Command | Result |
|---|---|---|
| **Lint** | `npx eslint` | ✅ **PASS** — exit 0, zero output |
| **Typecheck** | `npx next typegen && npx tsc --noEmit` | ✅ **PASS** — exit 0, strict mode |
| **Tests** | `npx vitest run` | ✅ **PASS** — **30 files, 356 tests, 0 failures, 2.51 s** |
| **Build** | `npx next build` | ✅ **PASS** — compiled in 528 ms, TypeScript 1425 ms, 34 static pages generated, 27 routes emitted |

### Test inventory (356 tests, 30 files)

Two Vitest projects: **`logic`** (node, `*.test.ts`, 348 tests) and **`render`** (jsdom with a real origin, `*.test.tsx`, 8 tests).

| File | Tests | Covers |
|---|---|---|
| `lib/i18n/completeness.test.ts` | 36 | every message key present in all 7 locales |
| `lib/intent/__tests__/normalization.test.ts` | 23 | enum filtering, confidence clamping, `mergeKnown` precedence |
| `lib/ai/__tests__/understanding.test.ts` | 23 | the intent pipeline end to end |
| `lib/matching/__tests__/anchor-coverage-budget.test.ts` | 22 | anchor honoured, coverage candidates, budget repair |
| `lib/ai/__tests__/url-chain.test.ts` | 21 | TikTok/YouTube/OpenGraph branches, `parseUrl` rejections, HTML entity decoding |
| `lib/intent/__tests__/modalities.test.ts` | 20 | all four modalities produce the same draft shape |
| `lib/wallet/wallet.test.ts` | 19 | idempotent credits, redemption, balance guards |
| `lib/__tests__/golden-fixtures.test.ts` | 18 | the golden day's numbers match `docs/DEMO_PATH.md` |
| `lib/ai/__tests__/darija-stt.test.ts` | 17 | `parseSSE` against real captured Gradio frames |
| `lib/matching/engine.test.ts` | 16 | scoring, selection, ordering, determinism |
| `lib/matching/__tests__/experience-composition.test.ts` | 14 | the SEE/MEET/MAKE/TASTE composition, incl. the hero demo day |
| `data/content/coverage.test.ts` | 14 | the es/de/it/pt overlay covers every POI |
| `lib/ai/__tests__/transcript-quality.test.ts` | 13 | hallucination artefacts, loops, `looksEuropean` |
| `lib/ai/ai.test.ts` | 10 | provider factories, no-key paths |
| `lib/adaptation/__tests__/less-walking.test.ts` | 9 | before/after metrics |
| `features/__tests__/screens.test.tsx` | 8 | **render smoke floor** — screens mount |
| `data/pois.test.ts` | 8 | dataset invariants |
| `lib/i18n/format.test.ts` | 7 | MAD, distance, duration formatting |
| `lib/ai/__tests__/curator.test.ts` | 7 | `parseCuration`, hallucinated ids dropped, `syntheticPoi` |
| `lib/adaptation/__tests__/experience-schedules.test.ts` | 7 | experiences keep their full duration |
| `lib/matching/__tests__/golden-route.test.ts` | 6 | **the golden four stops asserted by name** |
| `lib/ai/__tests__/guide.test.ts` | 6 | `parseGuideAnswer` trust boundary |
| `lib/intent/__tests__/coverage-candidates.test.ts` | 5 | coverage never outranks a name match |
| `features/onboarding/__tests__/build-trip.test.ts` | 5 | orchestration and fallbacks |
| `data/__tests__/media-assets.test.ts` | 5 | **every referenced local image exists on disk** |
| `lib/i18n/wallet-i18n.test.ts` | 4 | |
| `features/home/__tests__/recognise-image.test.ts` | 4 | |
| `lib/routing/__tests__/navigation.test.ts` | 3 | Apple vs Google Maps hand-off |
| `features/trip/__tests__/local-impact.test.ts` | 3 | the impact figure |
| `features/onboarding/__tests__/steps.test.ts` | 3 | |

### What is NOT tested

- **No E2E test in the automated suite.** The `scripts/jury/*.mjs` CDP smoke suites (`jury:smoke` — 15 assertions, ~46 s; `jury:voice`; `jury:wallet`) exist but are **not** part of `pnpm verify` and require a running dev server and a local Chrome. **NOT RUN during this audit** (they need an interactive Chrome launch).
- No visual regression tests.
- No load or performance tests.
- No security tests.
- Only 8 render tests, all smoke-level — no interaction testing of the composer, adapt sheet or chat.
- No test asserts that AI-authored POIs are labelled unverified in the UI (because they are not).

### Reliability engineering that is genuinely present

- `orFallback` around every provider call.
- `boundedSignal` on every external fetch.
- Every adapter wrapped once at the registry so a throw returns the unchanged day.
- `buildTrip` has a `try/catch` returning the golden day.
- `match()` guarantees exactly 4 stops; `buildTrip` **asserts it anyway** and falls back if violated.
- `storage` guards every read and write.
- `map.on("error")` distinguishes pre-load (fatal) from post-load (a 404 tile is not a broken map).

---

## PHASE 18 — WHAT IS REAL VS DEMO MAGIC

### 18.1 Fully implemented — genuinely works end to end

| Feature | Evidence |
|---|---|
| Deterministic 4-stop trip engine with scoring, obligations, budget/time repair, narrative ordering | `src/lib/matching/engine.ts` (839 lines), 16 + 22 + 14 + 6 tests |
| Route metrics: haversine × 1.22, mode selection, durations, cost bands, per-day totals | `src/lib/routing/metrics.ts`, used identically by engine and adapters |
| All four adaptations, each recomputing real numbers, each refusing honestly | `src/lib/adaptation/*`, 9 + 7 tests, undo via exact snapshot |
| Grounded place resolution (token overlap, two-word rule, coverage capped at 0.5) | `src/lib/ai/resolve-poi.ts`, 5 tests |
| Zod validation boundary for everything a model says | `src/lib/intent/schema.ts`, 23 tests |
| Multimodal intent extraction — text, voice, URL, image → one `TripIntentDraft` | `/api/extract`, 20 tests, **measured 0.89 s live** |
| Darija-aware voice routing (Whisper → detect → MoulSot), hallucination rejection | `src/app/api/transcribe/route.ts`, `transcript-quality.ts`, 13 + 17 tests |
| URL provider chain: TikTok oEmbed → YouTube API → OpenGraph (two UAs, head-streamed) | `src/lib/ai/url.ts`, 21 tests |
| No-model keyword fallback in EN/FR/AR + Darija | `src/lib/intent/local-extract.ts` |
| MapLibre map with real coordinates, real OSRM geometry, adaptation redraw | `src/features/map/*` |
| Loyalty ledger: idempotent credits via deterministic ids, redemption, balance guards | `src/lib/wallet/index.ts`, 19 tests |
| Passport stamps, saved places, experience mode, reset-all | `src/lib/store/index.ts` |
| 7-language UI with RTL, server-rendered `dir`, completeness enforced by test | `src/lib/i18n/*`, 36 tests |
| Day check insights: opening hours vs arrival, rain, walking, budget, interest match, length | `trip-insights.ts:169` |
| Local impact figure with itemised receipt | `trip-insights.ts:283`, 3 tests |
| Conversational guide with a real trust boundary on picks and enums | `src/lib/ai/guide.ts`, 6 tests |
| The day curator | `src/lib/ai/curator.ts`, 7 tests, **measured 2.98 s live** |
| Full graceful degradation with zero API keys | `serverCapabilities`, every route answers 200 |

### 18.2 Partially implemented — works under limited conditions

| Feature | Limit |
|---|---|
| **Regional coverage** | 22 of 36 POIs are Casablanca. El Jadida has 6 (one blocked), Oualidia 5, and Azemmour/Mohammedia/Boulaouane have **1 each** — a single-POI city can never fill a day, so `destinationPool` silently widens to the whole region |
| **Opening-hours checking** | Only 19 of 36 POIs have hours; all are `needsVerification: true`; there is no live availability API |
| **Partner offers** | Only 3 of 36 POIs have a discount; all 6 experiences are `partnerStatus: "demo"` |
| **`Spend less` / `Rainy day`** | Depend on the same-city candidate pool. In El Jadida (5 usable POIs) or Oualidia (5) they will frequently return "no cheaper stop nearby plays the same role" |
| **Image recognition** | Only as good as Gemini on Moroccan landmarks; grounding limits it to the 36 curated names |
| **Weather-driven insights** | Only fire if the Open-Meteo call succeeds |
| **PWA** | Manifest + `standalone` display + theme colour exist. **No service worker, no offline cache, no install prompt.** It is installable, not offline-capable |
| **Accessibility metadata** | `walkingScore` 1–5 and `walkingPreference: "minimal"` only. No wheelchair, step-free, or sensory data |

### 18.3 Hardcoded / deterministic demo logic

| Thing | File | What it is |
|---|---|---|
| **`GOLDEN_TRIP`** — Habous 09:30 → Marché Central 11:30 → Sacré-Cœur 14:00 → Hassan II 15:40, 6.4 km all walking | `src/data/fixtures/golden-trip.ts` | The demo floor. Shown when: `buildTrip` throws, the 20 s ceiling fires, `match()` returns ≠ 4 stops, **or the user lands on `/trip` with an empty store** (`trip/page.tsx` — `if (hydrated && !trip) setTrip(cloneGoldenTrip())`). Marked `isFallback: true` for internal QA only — **never shown to the user** |
| `GOLDEN_PROFILE` with `confidence: {destination: 0.97, detectedPlace: 0.93, interests: 0.91}` | same | Hardcoded confidence numbers on the fixture. They are not displayed as a recognition score (that comes from `Recognition.confidence`, which is `null` on the fallback path) but they exist |
| **`route-casablanca-signature`** and 6 other base routes | `src/data/base-routes.ts` | Hand-picked day templates worth **+34** in scoring. `golden-route.test.ts` asserts the signature day's four stops **by name** |
| The **hero demo day** (Habous artisans → Cooking class → Leather bag → Hassan II) | `experience-composition.test.ts` | Asserted by test so the demo sentence is reproducible |
| `PRICE_BANDS`, `BUDGET_CAP_MAD`, `TIME_BUDGET_MINUTES`, `WALKING_LIMIT`, coin values, `STREET_DETOUR_FACTOR`, `FALLBACK_SPEED`, `ROAD_DETOUR_FACTOR`, `CAR_READY_MINUTES` | `config/app.ts`, `config/rewards.ts`, `metrics.ts`, `adaptation/shared.ts`, `trip-insights.ts` | Product constants, tuned by hand. Every one is documented with the reason it has that value |
| `PROCESSING_MIN_MS = 2400`, the three tempos, the 1400 ms recognition floor | `processing-screen.tsx`, `inspiration-composer.tsx` | Deliberate pacing |
| `SLOT_REASONS` / `KIND_REASONS` — the per-stop "why this stop" lines in 7 languages | `engine.ts` | Hardcoded templates, **replaced by the curator's line when the curator ran** |
| `dayBrief()` — the two summary sentences | `trip-insights.ts:339` | Template + params, explicitly **not** a model call: *"a summary that can hallucinate is worse than no summary"* |

### 18.4 Visual prototype only — UI suggesting functionality not backed

| UI element | Reality |
|---|---|
| **"Verified places" + `ShieldCheck` on every stop** (`trip-summary.tsx:231`) | The shield is **unconditional**. `POI.verification` (`verified` 16 / `needs_verification` 14 / `unverified` 6) is **never read by any component** — verified by grep across all `.tsx`. A `needs_verification` POI, and an AI-invented Istanbul stop, both get the same shield |
| **`trip.trustLine`: "It never invents a location or a coordinate."** | **False on the curator/guide custom-stop path.** Demonstrated live in §5.2 |
| **"Listen" / narration** (`cultural-sheet.tsx`) | Gated on `poi.cultural.audio` — **0 of 36 POIs have it**, `public/audio/` is empty. The button never renders |
| **"Hear from your host"** (`experience-block.tsx`) | Gated on `media.hostAudio` — **0 of 36**. Correctly designed (the README forbids synthesised voices attributed to real people) but currently dead |
| **Partner offers** | Real ledger mechanics, but only 3 POIs, all `demo`, nothing is settled |
| **`POI.sources`** (21 POIs carry OSM attribution) | Never displayed |
| **`POI.availability.note`** | Never displayed; only `status` is used, as an engine filter |
| **Image credits** (30 CC-licensed Wikimedia images) | `POIMedia.credit` is never set in the dataset and never rendered |
| **Processing phase "optimizing"** | The trip is already built when this phase starts |
| **`Trip.isFallback`** | Computed but never surfaced anywhere in the UI (by design) |

### 18.5 Documentation that is stale and would make the presenter say untrue things

| Doc | Says | Reality |
|---|---|---|
| `docs/MASTER_BRIEF.md` §"Not a chatbot" | *"There is no conversational assistant anywhere in the product."* | `/chat` is a full conversational guide |
| `docs/MASTER_BRIEF.md` §Differentiators 2 | *"Less Walking is fully working; the other three are visible but minimal."* | All four are fully implemented |
| `docs/MASTER_BRIEF.md`, `README`, `src/data/pois.ts:2` | "25 POIs" | **36** |
| `docs/FALLBACKS.md` | Gemini image failure → *"fall through to the golden demo profile"* | Code explicitly changed this: `failedRecognition()` returns nulls and says it could not look |
| `docs/FALLBACKS.md` | Whole generation timeout *"10s"* | `TIMEOUTS.tripGenerationMs = 20_000` |
| `docs/FALLBACKS.md` | *"leg distances are straight-line and read roughly 20% short"* | `STREET_DETOUR_FACTOR = 1.22` was added; they are no longer straight-line |
| `docs/JURY_SAFE_RUNBOOK.md` | *"Without `GEMINI_API_KEY` any image comes back as Hassan II Mosque"* | No longer true |
| `docs/JURY_SAFE_RUNBOOK.md` | *"Only Less walking rewrites the day"* | All four do |
| `docs/JURY_SAFE_RUNBOOK.md` | *"there is a 10 s ceiling"* | 20 s |
| `docs/DEMO_PATH.md` 55–70 s | *"open Hassan II cultural story, Listen"* | The Listen button never renders — no audio files |
| `docs/DEMO_PATH.md` | *"Golden audio (EN/FR/AR, 30–60s) is prepared for all four stops"* | `public/audio/` contains `.gitkeep` and a README |
| `docs/CURRENT_APP_STATUS.md` | "90 tests / 11 files" | 356 tests / 30 files |

**Before the pitch: either fix these docs or do not read from them.**

---

## PHASE 19 — INNOVATION ANALYSIS

Scored on what the repository actually contains. No inflation.

| Axis | Innovation | Technical depth | Demo value | Defensibility | Notes |
|---|---|---|---|---|---|
| **Darija-first voice, engine chosen from the audio not the menu** | **8/10** | **8/10** | **7/10** | **6/10** | The genuinely novel piece. `needsDarijaEngine()` decides from Arabic-script ratio + a per-language function-word test that requires **two hits in one language** (a pooled bag of six languages let transliterated Darija through on `el`/`she`). Plus rejection of Whisper's subtitle-artefact hallucinations. Defensibility is capped because MoulSot is a third-party public Space, not our model. Demo value is capped by ~20 s latency. |
| **Grounding: AI understands, engine decides** | **6/10** | **8/10** | **5/10** | **5/10** | Architecturally strong and rigorously implemented on the onboarding path (never asks for an id; two-token resolution; coverage capped at 0.5; Zod with derived band). **Undermined by the `/chat` custom-stop path.** The idea is not novel — it is standard good practice — but the execution is unusually disciplined. |
| **Deterministic engine with obligations + repair** | **6/10** | **9/10** | **6/10** | **6/10** | The `Obligations` concept (a repair may change *which* stop but not *what kind of day this is*) is a genuinely thoughtful piece of design. `fitToLimit` fitting the day to a budget **before** the reveal instead of apologising after it is the kind of detail juries reward. |
| **Multimodal inspiration → one `TripIntentDraft`** | **6/10** | **7/10** | **8/10** | **4/10** | Five modalities converging on one normalised structure with per-field provenance and a real confidence model. Very demoable. Not defensible — any team can build this. |
| **Composition as product thesis (SEE / MEET / MAKE / TASTE)** | **7/10** | **6/10** | **8/10** | **7/10** | The strongest *product* idea. The engine actively tries to put a workshop or a family kitchen in the day, and protects it from being trimmed or price-swapped out. Defensible because the moat is the curated experience supply, not the code. |
| **Local economic impact as a computed floor with a receipt** | **7/10** | **5/10** | **8/10** | **6/10** | Low technical depth (a filtered sum) but very high integrity: two hard gates, low end of a range, renders nothing when it cannot substantiate. **It is the claim most likely to survive a hostile question.** |
| **Adaptability (4 adapters, all recomputing, all refusing honestly)** | **6/10** | **7/10** | **9/10** | **4/10** | The best 10 seconds of the demo. `changedSegmentIds` drives the exact map animation. Not defensible technically. |
| **Explainability** | **5/10** | **5/10** | **6/10** | **3/10** | Per-stop reason lines, the Day check, the interest-match count and the impact receipt. But the scoring itself is never exposed — a user cannot see *why* a stop scored 132 vs 98. |
| **Fallback integrity (works with every service dead)** | **5/10** | **8/10** | **7/10** | **3/10** | Not innovative; genuinely rare in a hackathon. Every route answers 200; every provider bounded; three keyword-fallback languages. |
| **Route intelligence** | **2/10** | **4/10** | **5/10** | **2/10** | Haversine × 1.22 and a 24-permutation narrative sort. **Do not sell this as routing innovation** — sell the decision to *discard* OSRM's numbers, which is the actually clever part. |
| **Loyalty ledger (Khotwa Coins)** | **3/10** | **6/10** | **6/10** | **3/10** | The idempotency-by-derived-id design is elegant. The economy is invented and no partner is real. |
| **Contextual AI / conversational guide** | **4/10** | **5/10** | **7/10** | **2/10** | It is a well-bounded `gpt-4o-mini` wrapper. The trust boundary in `parseGuideAnswer` is good. The custom-POI licence is a liability, not an innovation. |

### The three claims to actually make

1. **"AI understands, a deterministic engine decides, and we can prove the second half is deterministic."** — 839 lines of pure TypeScript, 356 tests, zero randomness, byte-identical output for the same input. **Caveat it honestly for `/chat`.**
2. **"We route Darija speech to the engine that can actually read it, and we decide that from the recording, not from the menu the user happened to open."** — with the measured comparison in the code.
3. **"Our local-impact number is a floor, computed from the curated prices of the stops in this specific day, with the receipt on screen."**

---

## PHASE 20 — COMPETITIVE CHALLENGE

### "Why not just use ChatGPT?"

**Current MVP answer:** Three concrete things. (1) **ChatGPT invents.** Ask it for a day in Casablanca and it will happily give you a restaurant that closed in 2019, at coordinates it estimated. Our onboarding path physically cannot: the model is never asked for an id, and `resolvePoiId` requires two shared significant words against 36 curated places. (2) **ChatGPT gives you prose; we give you an executable day** — timed to 5-minute rounding from 09:30, priced against the budget you stated *before* we show it to you, plotted on a map, with one-tap adaptations that recompute real distances. (3) **ChatGPT does not hear Darija.** We measured `whisper-1` returning "شكرا على المشاهدة" — a YouTube subtitle artefact — on a real Darija recording.

**But be honest about the boundary:** our own `/chat` surface *is* a `gpt-4o-mini` wrapper, and on that surface a request for a city we do not cover produces model-authored stops. The grounded claim applies to the onboarding path.

**Future-scale answer:** The moat is not the model, it is **verified regional supply** — hosts, artisans, cooperatives, opening hours, prices — and a booking relationship. ChatGPT cannot put you in a specific family's kitchen at 12:30 for 250 MAD.

### "Why not Google Maps?"

**MVP:** Google Maps answers *"where is X and how do I get there"*. It does not answer *"I have half a day, 150 dirhams, I do not want to walk much, and I saw a TikTok about crafts"*. We take that sentence — in Darija — and return four ordered stops that fit those constraints. Google also optimises for **distance**; we deliberately optimise for **narrative order** (morning culture, midday food, afternoon discovery, sunset icon), because a distance-optimal Casablanca day is four stops on one street.

**Also:** we hand off *to* Google/Apple Maps for turn-by-turn (`navigationUrl()`). We are not competing on navigation and we say so.

**Future:** Google will never carry a two-person leather workshop with a 30% coin-unlocked discount. Long-tail local supply is not their business.

### "Why not TripAdvisor?"

**MVP:** TripAdvisor is a ranked list plus reviews; the itinerary is the user's job. We do the assembly, the timing, the budget fit and the adaptation. We also carry **no ratings and no reviews at all** — deliberate, because with 36 POIs a rating would be theatre.

**Future:** TripAdvisor's asset is review volume, which is exactly what a regional pilot cannot have. Competing on it is a losing strategy; competing on curated depth and local supply is not.

### "Why not GetYourGuide?"

**MVP:** GetYourGuide sells single bookable activities. We sell a **whole day** in which an activity is one of four stops, and the other three are free or cheap. Our six experiences carry host, capacity, what you'll do, what you'll learn and a price — the same fields — but they are composed into a day rather than sold standalone. **We have no booking and no payments.**

**Future:** the natural relationship is complementary, not competitive: they are a supply and fulfilment partner. Their inventory does not reach a Habous artisan with no website.

### "Why not ask Gemini to generate an itinerary?"

**MVP:** We do ask Gemini — to *understand*, never to *decide*. It returns enum values and a place name in words. It cannot return a stop, a coordinate, an id, an opening hour or a price on that path (`INTENT_PROMPT`, `ANALYZE_PROMPT`). Everything downstream — selection, ordering, timing, cost, distance, adaptation — is deterministic and unit-tested. Ask Gemini for the whole itinerary and you cannot unit-test the answer, you cannot guarantee four stops, you cannot guarantee they are in the same city, and you cannot guarantee the mosque is open when you arrive. We check exactly that (`stopHoursIssue`).

### "What is proprietary about Siyaha?"

**Honest answer, in order of strength:**
1. **The curated Casablanca-Settat dataset** — 36 POIs with OSM-verified coordinates, hand-authored narrative in 3 languages plus a 4-language overlay, curation weights, and 7 hand-picked day templates. This took human time and is the real asset.
2. **The six experiences** — the supply-side content that makes a day about people rather than facades.
3. **The engine's design decisions**: the obligations model, the budget/time repair-not-search, narrative ordering over distance ordering, and the decision to discard OSRM's numbers.
4. **The Darija voice routing logic** — the detection heuristics (`isMostlyArabic`, `looksEuropean` with the two-hits-in-one-language rule, `looksHallucinated`) are ours; MoulSot is not.

**What is NOT proprietary:** the models, the map, the tiles, the routing, the framework. Say this before a jury says it for you.

### "Where is your moat?"

**MVP: there isn't one yet, and pretending otherwise is the fastest way to lose the room.** 36 POIs and 4,000 lines of TypeScript is not a moat. What exists is a **head start on curated regional supply** and a defensible architectural posture.

**Future-scale: the moat is supply plus verification.** A verified network of hosts, artisans and cooperatives in Casablanca-Settat, with real prices and real availability, and a coin economy that gives them repeat traffic. That is a relationship business, not a code business — which is why the engine is deliberately boring and testable, and the interesting work is the dataset.

---

## PHASE 21 — BUSINESS & DEPLOYMENT

### Classification of every business avenue

| Avenue | Status | Evidence |
|---|---|---|
| **B2C free planning app** | **Implemented** — the entire product | the app |
| **Loyalty coins → partner discount** | **Implemented mechanically, not commercially** — `src/lib/wallet/`, `src/config/rewards.ts`. 3 offers, all `partnerStatus: "demo"`. `src/types/wallet.ts` is explicit: *"A rewards ledger, not a wallet: no money, no payment, no settlement. The partner is paid in cash, in person."* |
| **Local merchant / artisan network** | **Mentioned in the project** — the `PartnerStatus`/`PartnerType` (`artisan`, `local_host`, `food`, `guide`, `cooperative`) type system exists and `supportsLocalBusiness` drives the impact figure. **No real partner exists** |
| **Booking / payments** | **Explicitly out of scope** — `docs/MASTER_BRIEF.md` §Out of scope |
| **Affiliate booking commission** | **Reasonable future opportunity** — the data model has price, capacity and `bookingRequired`; there is no integration |
| **Promoted experiences / paid placement** | **Reasonable future opportunity — and a stated risk.** `WEIGHTS.priority` (×5) and `WEIGHTS.curatedRoute` (+34) are exactly the levers a paid-placement scheme would use. There is **no disclosure mechanism** and a jury may ask how a user would know |
| **B2B tourism offices / municipalities** | **Pure speculation** — nothing in the code |
| **Hotels / concierge white-label** | **Pure speculation** |
| **Travel agencies** | **Pure speculation** |
| **Data licensing** | **Pure speculation** |

**There is no pricing page, no subscription code, no payment integration, no analytics, and no B2B surface anywhere in the repository.** If the deck contains revenue projections, they are not backed by the product.

### Operational scaling challenges (ranked)

1. **Catalogue-in-prompt.** The curator and guide send all 36 POIs every call. This is the hard technical blocker to a national dataset. Needs retrieval.
2. **Content production.** Every POI needs a hand-authored story and tip in 3 languages, plus a 4-language overlay, plus a licensed photo. That is the real per-city cost.
3. **No CMS, no ingestion, no admin.** Adding a POI is a code change plus a redeploy.
4. **No auth, no rate limiting, no abuse controls** on unauthenticated endpoints that spend money per request (§15 S2).
5. **No deployment infrastructure at all.** No CI, no Docker, no hosting config.
6. **The dataset ships in the client bundle.**
7. **Partner verification** — the entire `demo` → `confirmed` transition is manual and undefined.
8. **Opening hours are curated and marked `needsVerification`.** They will go stale.

### "How would your architecture behave with 100,000 simultaneous users?"

**Honest answer:** Badly, and predictably, and for reasons that are cheap to fix. The compute is already client-side — `match()`, `schedule()`, all four adapters and every metric run in the browser, so trip generation itself scales for free. What does not scale is: (a) the seven route handlers proxying to Gemini and OpenAI with **no cache, no queue, no rate limit and no auth** — at 100k concurrent users that is a provider rate-limit wall and an unbounded bill; (b) the public OSRM demo server and OpenFreeMap tiles, neither of which is under contract; (c) a single Next.js process. The fixes are conventional: cache curations by profile hash, put an auth/rate-limit gate in front, self-host or contract the tiles and routing, move the dataset out of the bundle. **None of that is done and none of it is hard.**

---

## PHASE 22 — CASABLANCA-SETTAT RELEVANCE

### What is in the dataset, by city

| City | Count | POIs |
|---|---|---|
| **Casablanca** | **22** | Mosquée Hassan II · Quartier Habous · Marché Central · Espace Sacré-Cœur · Ancienne Médina · La Sqala · Musée du Judaïsme Marocain · Fondation Abderrahman Slaoui · Villa des Arts · Place Mohammed V · Boulevard Mohammed V · Corniche Aïn Diab · Cinéma Rialto · Plage Aïn Diab · Phare d'El Hank · Parc de la Ligue Arabe · Marina de Casablanca · Sindibad Park · **+ 4 experiences**: Cook Moroccan with a Local Family, Make Your Own Leather Bag, Meet the Habous Artisans, The Moroccan Tea Ritual |
| **El Jadida** | **6** | Cité Portugaise de Mazagan · Citerne Portugaise (**temporarily_unavailable**) · Bastion de l'Ange · Phare Sidi Bouafi (**availability unknown**) · Plage Deauville · **+ 1 experience**: Throw a Pot by the Ocean |
| **Oualidia** | **5** | Lagune de Oualidia · Plage de Oualidia · Balade en barque sur la lagune (**seasonal**) · Dégustation d'huîtres chez Ostréa · **+ 1 experience**: Oysters at the Lagoon (**seasonal**) |
| **Azemmour** | **1** | Médina et remparts d'Azemmour |
| **Mohammedia** | **1** | Kasbah de Mohammedia |
| **Boulaouane** | **1** | Kasbah de Boulaouane |

### Is the MVP genuinely regional?

**No. It is Casablanca-centric with a coastal extension, and this must not be hidden.**

Hard evidence:
- **61% of POIs (22/36) are Casablanca.** All four workshops/kitchens/tea rituals in Casablanca; only 2 experiences outside it.
- **6 of the 7 base routes are Casablanca**; the seventh (`route-best-of-region`) is labelled city `"Casablanca-Settat"`, which never equals a real destination string, so it can only ever be selected by `pickBaseRouteId` (overlap-based) and **never by `curatedPoiIds`** (which requires an exact city match). Verified in `curatedPoiIds` — `route.city.toLowerCase() !== destination` skips it for every real city.
- **`APP.defaultDestination = "Casablanca"`**, and `destinationPool()` falls back to Casablanca — not the region — with no destination, with the reason spelled out: *"a region-wide pool picks the four best POIs across 200 km of coast, which is a scoring win and a useless day."*
- **A day in Azemmour, Mohammedia or Boulaouane is impossible as a single-city day.** Each has 1 POI; `destinationPool` requires ≥4 and silently widens to the whole region. Verified by running the engine.
- **El Jadida has 6 POIs and one is blocked**, so the engine has essentially no choice: the day it produced in testing included Phare Sidi Bouafi, whose availability and price are both `unknown`.
- The controlled demo is entirely in Casablanca (`docs/DEMO_PATH.md`).

### The honest framing for a jury

> *"The dataset is a Casablanca pilot with a real coastal extension to El Jadida and Oualidia, and three single-POI markers at Azemmour, Mohammedia and Boulaouane. Twenty-two of thirty-six places are in Casablanca. A single-city day genuinely works in Casablanca, El Jadida and Oualidia; it does not yet work in the other three, and the engine widens to the region rather than refusing. That is a content gap, not an architecture gap: the engine is city-agnostic and adding a city is data plus photographs plus three languages of narrative."*

**Do not claim regional coverage. Claim a regional architecture with a Casablanca-weighted pilot.**

---

## PHASE 23 — DEMO SCRIPT RECONSTRUCTION

### Pre-flight (from `docs/JURY_SAFE_RUNBOOK.md`, corrected against the code)

```bash
git status                 # clean
pnpm dev                   # or: pnpm build && pnpm start  (safer — no dev overlay)
pnpm jury:smoke            # 15 CDP checks, ~46 s, expect 15/15   [NOT RUN in this audit]
```
Open `http://localhost:3000` in a normal window. On a projector the app renders as a 390×844 phone on a stage — **say this out loud once**, it is intentional.

Verify before walking on: **`.env.local` has `GEMINI_API_KEY` and `OPENAI_API_KEY`** (it does), the map loads (needs internet), and `VOICE_ENGINE` is set the way you want it (`darija` if the room is Darija-speaking — it removes the detection gamble at the cost of ~20 s).

### THE STRONGEST 90-SECOND PATH

| Time | What the user does | What the jury sees | What actually happens | What can fail | Fallback |
|---|---|---|---|---|---|
| 0–12 s | Home → **"Plan my day"** → in the composer, tap the mic and **speak the Darija sentence** from `docs/HERO_DEMO_SCRIPT.md`: *بغيت نهار كامل فكازا، الماكلة المحلية والصناعة التقليدية، وماشي بزاف ديال المشي* | The mic ring breathes, then a turning notch | `MediaRecorder` → `/api/transcribe` → Whisper (~1 s) → `needsDarijaEngine()` true → **MoulSot (~20 s)** | **The 20 s wait, or a cold HF Space.** This is the biggest risk in the demo | Speak it in French instead, or **type** the sentence — same pipeline from `/api/extract` onward, ~1 s |
| 12–20 s | — | The transcript appears; understanding chips fill in | `/api/extract` → Gemini → `buildDraft` → grounding → confidence 0.84, band HIGH | Gemini down | `localExtract()` keyword pass still resolves `كازا`→Casablanca, `الماكلة`→food, `نهار كامل`→full_day, `ماشي بزاف ديال المشي`→minimal walking |
| 20–30 s | Continue → Continue (leave the defaults) → **Build my trip** | 3-step planner, pre-filled from what was heard | `patchProfile`; defaults applied only on arrival at step 3 | — | — |
| 30–36 s | — | Processing: brand mark draws, four phase headlines | **One** real call: `buildTrip()` → `/api/curate` (~3 s) → `match()` → `/api/route` | Curator times out at 15 s | Engine builds the day alone — identical shape, no per-stop "why you" line |
| 36–55 s | Read the trip | **Meet the Habous Artisans → Cook with a Local Family → Make Your Own Leather Bag → Mosquée Hassan II.** Map with 4 pins and a drawn route. Timeline with times. **"≈510 MAD stays local"** | The engine's composition step put MEET/TASTE/MAKE in and the narrative pass put the icon at sunset. 510 = 80+250+180, Hassan II's 140 deliberately excluded | Tiles blocked | "Map unavailable. Your day is right below." — the timeline is complete |
| 55–70 s | Tap **"Verified places"** → show the receipt → close | The itemised breakdown | `localImpact()` | — | **Do NOT linger on the shield icons** (see §18.4) |
| 70–90 s | **Adapt my day → Less walking** | Route redraws, two legs flip walk→car, metrics count up, **"77% less walking · ~40 min saved"**, then **Undo** restores exactly | `lessWalkingAdapter` converts segments > 1800 m, `calculateMetrics()` re-runs, `changedSegmentIds` drives the animation, `revealRouteMap()` scrolls it into view | On the *experience* day (mostly car already) Less Walking may answer *"This day is already easy on your feet"* | **Rehearse on the exact day you will demo.** If it refuses, use **Spend less** — the experience day is 570 MAD and has plenty to swap |

**Say the line at 55 s:** *"That number is a floor. It is the sum of the curated prices of the three stops in this day whose money reaches a person, taking the low end of any range, and the mosque's 140 dirhams is deliberately not counted."*

### THE STRONGEST 3-MINUTE PATH

Everything above, then:

| Time | Do | Say / show | Risk |
|---|---|---|---|
| 90–110 s | Tap **pin 3** on the map, then a **timeline row** → PlaceSheet | Hours, price, story, tip; for an experience: host, what you'll do, what you'll learn, coins, the partner offer | The tea ritual is the cheapest offer to show |
| 110–130 s | **Start trip** → `/experience` → **"Visited"** on stop 1 | The progress rail advances, a stamp animates, coins are credited | Tap Visited **twice** and show the balance does not move — *"the transaction id is derived from the trip and the POI, so the ledger refuses the duplicate"* |
| 130–150 s | **Profile** tab → passport + wallet sheet | Stamp, balance, transaction history | — |
| 150–165 s | Switch language to **العربية** | Full RTL, same day, same map, nothing reloads | **Do not linger on a metrics card** — `1 h 22` renders as `h 22 1` inside a sentence |
| 165–180 s | Back to `/trip` → **Day check** row → open the sheet | Opening hours vs arrival time, budget vs stated cap, interest match, day length — each with a one-tap fix where an adapter can genuinely act | This is the best "we check our own work" moment in the product |

### What to avoid on stage

1. **`/chat` with a city outside the region** — it will invent stops. If you demo `/chat`, keep it inside Casablanca and let it produce catalogue picks.
2. **The "Listen" button** — it does not exist. Do not follow `docs/DEMO_PATH.md` here.
3. **`Navigate`** — real, but it takes the projector to Google Maps.
4. **`/test-ai`, `/test-openai`** — do not open these.
5. **Claiming live recognition of an arbitrary photo** without rehearsing that exact photo.
6. **Arabic + numbers inside a sentence.**

---

## PHASE 24 — JURY ATTACK SURFACE — 83 QUESTIONS

*(plus 3 more in the ADDENDUM, §A.5 — 86 in total)*

### Product (1–6)
1. Your README says Siyaha, your app says Khotwa, and your storage keys say `siyaha`. What is this product called?
2. You have two entry points that behave completely differently — the planner and the chat. Which one is the product?
3. Why exactly four stops? What happens to someone who has two hours or three days?
4. You cannot edit the generated day — no reorder, no replace-a-stop. Why is that acceptable?
5. What does a returning user get that a first-time user does not?
6. Nothing is persisted server-side. If I clear my browser, what have I lost, and is that acceptable for a travel product?

### User problem (7–11)
7. What evidence do you have that travellers actually rebuild trips from TikTok by hand? Where is the research?
8. Who is the user — an international first-timer, a Moroccan on a weekend, or a diaspora visitor? The Darija feature and the "first-time international visitor" persona point in opposite directions.
9. How many people have used this? What did you learn?
10. What is the frequency of use? A one-day planner is used once per trip.
11. What is the moment a user would pay you, or tell a friend?

### Tourism (12–16)
12. Your opening hours are hand-curated and every one is flagged `needsVerification`. What happens when I turn up at a closed museum?
13. Ramadan, national holidays, Friday prayers — none of that is in your data. How does the day survive them?
14. 17 of 36 POIs have no opening hours at all. What do you do for those?
15. You have no ratings and no reviews. How do I know these are good places?
16. The Citerne Portugaise in your dataset is `temporarily_unavailable`. Who updates that, and how often?

### AI (17–24)
17. Which parts of this are genuinely AI and which parts could be a rules engine? Be specific.
18. Your own `localExtract` keyword table already extracts city, interests, time, budget, pace and walking preference in four languages. What did Gemini add on the sentence you just demoed?
19. What model, what temperature, what token budget — and what does one trip cost you in API spend?
20. You send the entire catalogue in every curator prompt. What happens at 500 POIs? At 5,000?
21. If OpenAI is down, is the product still the product?
22. Where does the model run, and what leaves the user's device?
23. Your processing screen says "optimizing". What is being optimized during that phase?
24. Why two providers, Gemini and OpenAI? What is the actual division of labour?

### Recommendation algorithm (25–33)
25. What is your recommendation engine optimising, mathematically? Write the objective function.
26. You say the itinerary is personalised. Point to the exact line where personalisation happens.
27. Your primary-interest weight is 34 and your curation weight is 34. Doesn't that mean a hand-picked template can override what I actually asked for?
28. A stated interest is worth 34, an experience bonus 7, proximity 14. Who chose those numbers, and against what?
29. Show me two different profiles that produce meaningfully different days — and one pair that produces the same day.
30. Your engine gave me two oyster tastings in one day in Oualidia. Your own prompt forbids two stops that do the same thing. Why doesn't the engine enforce it?
31. With an empty profile your engine produces a 570-dirham day that is 90% car. Is that a good default?
32. `fitToLimit` is a greedy repair, not a search. How far from optimal can it be?
33. There is no exploration, no diversity across sessions, no learning. I regenerate and get the same day. Is that a feature?

### Dataset (34–40)
34. How many POIs, exactly? Your code comment says 25 and your README says 25.
35. Twenty-two of thirty-six are in Casablanca. In what sense is this a Casablanca-Settat product?
36. Azemmour, Mohammedia and Boulaouane have one POI each. What day can you build there?
37. Where did the coordinates come from, and how were they verified?
38. Thirty of your images are CC BY-SA from Wikimedia. Where is the attribution in the UI?
39. Six of your POIs are "experiences" with named hosts and prices. Have you spoken to any of these people?
40. What does it cost you — in hours and in money — to add one new city?

### Technical architecture (41–48)
41. Where does the trip actually get built — client or server?
42. You ship the whole dataset to every browser. What is your plan at scale?
43. Why Next.js if you have no server-side logic beyond key-holding proxies?
44. There is no CI, no Docker, no deployment configuration. How do you ship this?
45. Your API routes always return 200, even on total failure. How does a client tell success from failure?
46. `buildTrip` is not cancellable. What happens if I navigate away mid-generation?
47. You call `/api/route` twice with the same segments per trip. Why?
48. Your test pages `/test-ai` and `/test-openai` are in the production build. Why?

### Grounding & hallucination (49–55)
49. What prevents the LLM from inventing a tourist attraction?
50. **I asked your chat for a day in Istanbul and it gave me four stops with coordinates. Where did those coordinates come from?**
51. Your trip screen says "It never invents a location or a coordinate" right next to those invented coordinates. Explain.
52. Your data model has a `verification` field with three values. Where in the UI is it shown?
53. Why does every stop get a shield icon under a heading that says "Verified places"?
54. If I paste a TikTok about Istanbul into the planner, what stops Siyaha recommending somewhere outside Casablanca-Settat?
55. What happens when the model returns a place you recognise but do not cover?

### Routing (56–59)
56. Why do you call this optimisation?
57. You use a 1.22 detour factor over straight-line distance. What is your actual error against a real walk?
58. You discard OSRM's distances and durations. Why should I believe your numbers instead?
59. Your walking speed constant is 4.6 km/h. For a tourist with a camera, in August, in Casablanca?

### Scalability (60–63)
60. How would this behave with 100,000 simultaneous users?
61. What is your per-user infrastructure cost today?
62. What is the first thing that breaks as you grow?
63. You have no rate limiting on endpoints that spend money per call. What is your exposure?

### Security & privacy (64–67)
64. Your `/api/extract` fetches any URL I give it, server-side, and returns the page title. What stops me pointing it at your internal network?
65. Where do the photos and voice recordings go, and how long are they kept?
66. What personal data do you store, and where?
67. If I paste a link to a page containing instructions for your model, what happens?

### Business model (68–70)
68. How do you make money? Point to the code.
69. Your curation weight is +34 and priority is ×5. If a business paid for placement, would I be able to tell?
70. Your partners are all flagged `demo`. What is the path to a signed one?

### Impact, accessibility, sustainability (71–74)
71. How do you know your local-impact number is accurate?
72. What in that 510 dirhams actually reaches the artisan versus an intermediary?
73. Your only accessibility signal is a 1–5 walking score. What about a wheelchair user, or someone with a stroller?
74. What is your environmental claim? You have no carbon number.

### Competition (75–77)
75. If ChatGPT can generate an itinerary in 10 seconds, what technical value does your platform add?
76. What stops Google shipping this next quarter?
77. What would you have that a competitor could not copy in a weekend?

### Implementation authenticity (78–80)
78. Which part of what you just demoed was hardcoded?
79. If I land on `/trip` with no trip in the store, where does the day come from?
80. Show me the app with the network switched off.

### Demo reliability (81–83)
81. What happens if the Hugging Face Space is cold when you speak?
82. If I hand you my own screenshot right now, what happens?
83. Your demo path document says to press "Listen" on the cultural story. Do it.

---

## PHASE 25 — TOP 20 QUESTIONS MOST LIKELY TO HURT US

---

### Q1. "Your chat built me a day in Istanbul with coordinates. Where did they come from — and how does that square with 'It never invents a location or a coordinate' printed on the same screen?"

- **Why they'd ask:** It is the single provable contradiction between a UI claim and code behaviour, and it takes one prompt to find.
- **Truthful answer:** The guide's system prompt (`src/lib/ai/guide.ts:74`) explicitly authorises "custom" stops when the catalogue does not cover the ask, and `syntheticPoi()` (`curator.ts:83`) turns them into full POI objects with model-supplied coordinates, hours and prices. They are stored as `verification: "unverified"`, `availability: "unknown"`, `coordinateType: "representative"` — **and the UI never reads any of those fields.** The trust line applies to the onboarding path, where the model is never asked for an id and `resolvePoiId` requires two shared significant words against the curated dataset. It does not apply to the chat path.
- **Strength: DANGEROUS.**
- **Evidence:** `src/lib/ai/guide.ts:74`; `src/lib/ai/curator.ts:83,132`; `src/features/trip/trip-summary.tsx:231`; `src/lib/i18n/messages/en.ts:392`; grep: `verification` appears in **zero** `.tsx` files.
- **How to phrase it:** *"You've found a real inconsistency and it is on our fix list before anything ships. We have two paths with two different guarantees. The planner is grounded — the model is never asked for an id, and a place name has to match two significant words against our curated dataset or it resolves to nothing. The guide is deliberately allowed to answer outside our coverage, because refusing is worse than answering, and every stop it authors is flagged unverified in the data. The bug is that the interface does not yet show that flag, and that trust line should be scoped to the planner. The check is written; the label is not."*
- **What NOT to claim:** Do not say the app never invents places. Do not say the guide is grounded. Do not claim a bounding-box check exists.

---

### Q2. "Your own keyword table already extracts city, interests, time, budget and walking preference in four languages. What did the LLM actually add?"

- **Why they'd ask:** `src/lib/intent/local-extract.ts` is 160 lines and visibly does most of the job. It is the sharpest "is this really AI" attack.
- **Truthful answer:** On the sentence we demo, very little — the keyword pass gets the same city, the same interests and the same walking preference. What the model adds is the long tail: phrasing we did not anticipate, constraints in free text ("back before 18:00", "travelling with a toddler"), and a place name resolved from a photo or an OCR'd caption. It also produces a confidence we can act on: a degraded draft is capped at 0.45 and the UI asks more questions.
- **Strength: ACCEPTABLE.**
- **Evidence:** `src/lib/intent/local-extract.ts`; `scoreDraft()` ceiling at `normalize.ts:166`; measured `/api/extract` returning `confidence: 0.843, band: "high"`.
- **How to phrase it:** *"Honestly? On a sentence we anticipated, almost nothing — and that's deliberate. The rules handle the common case so the product works with no key and no network, and the model handles what the rules cannot: an unanticipated phrasing, a constraint in free text, a place name in a photo. The one thing rules cannot do at all is hear Darija, and that is where the AI is not optional."*
- **What NOT to claim:** Do not claim the LLM is essential to intent extraction. It is not, and the fallback proves it.

---

### Q3. "What is your recommendation engine optimising, mathematically?"

- **Why they'd ask:** The standard technical probe. Vagueness here loses the room.
- **Truthful answer:** A weighted linear score per POI, then a constrained greedy selection, then an exact 24-permutation sort. Give the formula from §7.1.
- **Strength: STRONG** — this is the best-prepared answer in the deck.
- **Evidence:** `src/lib/matching/engine.ts:132` (weights), `:210` (`scorePoi`), `:485` (`match`), `:411` (`fitToLimit`), `:318` (`orderNarratively`).
- **How to phrase it:** *"Per POI: curation priority times five, plus thirty-four if it's in a matching curated route, plus thirty-four for a primary category match and twenty for a secondary, plus six for signature, plus seven if it's an experience, plus a fourteen-point exponential gravity well around the anchor with a six-kilometre falloff, plus or minus a budget term, minus ten per walking-difficulty point if you said minimal walking. Then a greedy selection with obligations — the stop you named, every interest you stated, and the kinds of stop the day is made of. Then budget and time repair, swapping one stop at a time and only accepting a swap that keeps every obligation. Then narrative order: with four stops there are twenty-four permutations, so we score all of them against a phase-affinity table and take the best exactly. Sorting is score descending, then id — completely deterministic, no randomness anywhere."*
- **What NOT to claim:** Do not call the selection optimal. It is greedy.

---

### Q4. "How many POIs? And in what sense is this a Casablanca-Settat product?"

- **Why they'd ask:** They will read the README, see 25, and count 36 — or they will notice every screen is Casablanca.
- **Truthful answer:** 36 — 30 places and 6 experiences. The "25" in the README and code comments is stale. 22 of 36 are Casablanca; El Jadida 6, Oualidia 5, and one each in Azemmour, Mohammedia and Boulaouane.
- **Strength: ACCEPTABLE if you volunteer it, WEAK if they find it.**
- **Evidence:** computed from `src/data/pois.ts`; stale comment at `pois.ts:2`.
- **How to phrase it:** *"Thirty-six — thirty places and six experiences. Our README says twenty-five and it's out of date; we added the experience layer after we wrote it. Twenty-two are Casablanca, six El Jadida, five Oualidia, and three single markers at Azemmour, Mohammedia and Boulaouane. A single-city day genuinely works in the first three. It does not yet work in the last three, and rather than refusing, the engine widens the pool to the region. That is a content gap, not an architecture gap — the engine is city-agnostic."*
- **What NOT to claim:** Do not claim regional coverage. Do not claim you can build a day in Boulaouane.

---

### Q5. "How do you know your local-impact number is accurate?"

- **Why they'd ask:** It is the headline social claim.
- **Truthful answer:** It is not an estimate, it is a **floor**, and it is checkable on screen.
- **Strength: STRONG.**
- **Evidence:** `src/features/trip/trip-insights.ts:283`; `ProvenanceSheet` receipt; `local-impact.test.ts`.
- **How to phrase it:** *"It's a floor, not an estimate. A stop only counts if our dataset says two things: the money reaches a person rather than a chain, and we know the actual price. A range counts at its low end. The mosque's hundred and forty dirhams is not counted — that's admission to a monument. And the itemised breakdown is on screen, so you can add it up yourself. If a day has no qualifying stop, we show nothing rather than a zero."*
- **What NOT to claim:** Do not call it economic impact. Do not add multipliers. Do not say "70% stays local" — that number does not exist in the product.

---

### Q6. "Your demo path says press Listen on the cultural story. Do it."

- **Why they'd ask:** They read the docs you handed them.
- **Truthful answer:** The player exists, the type exists, **zero audio files exist**, and the button is gated on the file so it never renders.
- **Strength: WEAK.**
- **Evidence:** `public/audio/` contains only `.gitkeep` + README; measured 0 of 36 POIs with `cultural.audio` or `media.hostAudio`; `cultural-sheet.tsx` `ListenButton` is conditional.
- **How to phrase it:** *"It isn't there. The player is built and the data model has the field, but we have no recordings and the button is gated on the file existing, so it doesn't render. For the host voices we made a deliberate rule that we will never synthesise a voice and attribute it to a real person — it's written into `public/audio/README.md`. That means those recordings need us to go and record actual hosts, and we haven't. Our demo document is out of date on this."*
- **What NOT to claim:** Do not claim narration is implemented.

---

### Q7. "You send your whole catalogue in every prompt. What happens at 5,000 POIs?"

- **Why they'd ask:** The obvious scaling probe once they see `buildCatalog()`.
- **Truthful answer:** It breaks. There is no retrieval layer.
- **Strength: ACCEPTABLE** (the answer is credible, the gap is real).
- **Evidence:** `src/lib/ai/curator.ts` — `buildCatalog(pois)` over `POIS`; same in `guide.ts`.
- **How to phrase it:** *"At thirty-six it's about two thousand tokens and it works. At five thousand it doesn't, and there's no retrieval layer today — that's the honest limit. The fix is standard: geo-filter and embed, hand the model thirty relevant candidates instead of the whole catalogue. The important part is that the engine underneath doesn't care — it's linear in dataset size and it never sees a prompt."*
- **What NOT to claim:** Do not claim the AI layer scales as built.

---

### Q8. "Why do you call this optimisation?"

- **Strength: STRONG** if answered as in §8.4, **DANGEROUS** if you say "we optimise the route".
- **How to phrase it:** *"We don't optimise distance and we don't claim to. There's no TSP here. We optimise narrative order, and with four stops that's twenty-four permutations, so it's exact rather than heuristic. Distance enters as a soft gravity term, not an objective, because a distance-optimal Casablanca day is four stops on one street. The two things that are real constrained optimisations are the budget and time repairs, and both are greedy with obligation checks — the code says so in the comments."*
- **What NOT to claim:** shortest path, TSP, "AI-optimised routing".

---

### Q9. "Your processing screen says 'optimizing'. What is being optimised there?"

- **Why they'd ask:** It is the classic hackathon tell.
- **Truthful answer:** Nothing. The trip is already built and `setTrip(built)` has already fired.
- **Strength: WEAK, recoverable.**
- **Evidence:** `src/features/onboarding/processing-screen.tsx` — `setTrip(built); setPhase("optimizing"); await wait(beat.route)`.
- **How to phrase it:** *"That phase is choreography, and the code is explicit about it. There's exactly one real call — `buildTrip` — and it's started on the first frame. The 'discovering' phase is the one that actually blocks on it; its ceiling is however long generation takes. 'Optimizing' and 'revealing' are about 1.2 seconds of animation after the day is in hand. We compress the whole thing automatically when the backend answers fast, and we cut it to half a second under reduced-motion."*
- **What NOT to claim:** Do not claim four processing stages do four things.

---

### Q10. "Your engine gave me two oyster tastings in one day. Your prompt forbids that. Why doesn't the engine?"

- **Why they'd ask:** Reproducible in one click (Oualidia, coast+food, full day).
- **Truthful answer:** The engine tracks `kind` and `category` diversity, not semantic similarity. `poi-oualidia-oysters` is a `place` and `exp-oualidia-oysters` is a `food_experience`, so both count as "variety".
- **Strength: WEAK.**
- **Evidence:** run of `match()` with `{destination:"Oualidia", interests:["coast_nature","food"]}`; composition loop at `engine.ts:485+`.
- **How to phrase it:** *"Fair catch, and it's reproducible. Our diversity rule is structural — unseen kind, then unseen category — and those two stops are a place and a food experience with different categories, so the engine reads them as variety. It's most visible in Oualidia because we only have five POIs there. The fix is a same-subject exclusion at the data level, which is a tag, not an algorithm change."*

---

### Q11. "I asked for Marrakech in the planner and got Casablanca with no explanation."

- **Truthful answer:** `destinationPool()` widens to the whole region when the named city has fewer than four POIs, and `buildTrip` then sets `destination = stops[0].poi.city`. The traveller is never told.
- **Strength: WEAK.**
- **Evidence:** `engine.ts` — `destinationPool`; `build-trip.ts:190` — `destination: stops[0].poi.city`; reproduced by running the engine.
- **How to phrase it:** *"The engine never refuses a day — that's a deliberate rule, no dead ends. But silently relabelling Marrakech as Casablanca is the wrong way to honour it. The correct behaviour is to say 'we don't cover Marrakech yet, here is Casablanca' — we already have exactly that pattern for places, our coverage candidates, and we should extend it to cities. Interestingly the chat path handles it the other way: it builds a Marrakech day from the model's own knowledge, which is the opposite failure."*

---

### Q12. "Your `/api/extract` fetches any URL I give it, server-side, and hands me back the page title. What stops me pointing it at your internal network?"

- **Truthful answer:** Nothing today. `parseUrl` blocks non-http(s) schemes and hostnames without a dot, and that is all — no private-IP or loopback blocklist, and redirects are followed.
- **Strength: WEAK (honest), DANGEROUS (if denied).**
- **Evidence:** `src/lib/ai/url.ts` — `parseUrl`, `readMetadata` with `redirect: "follow"`.
- **How to phrase it:** *"Today, nothing — it's an SSRF and it's a deployment blocker, not a demo issue, because this runs on a laptop. The mitigations that are there are a three-second timeout, a two-megabyte cap, and only two metadata fields coming back. Before anything is hosted, that needs a private-IP and loopback blocklist and a redirect check. We'd rather tell you than have you find it."*

---

### Q13. "Where does the trip get built, and what happens with 100,000 users?"

- **Strength: STRONG on the first half, ACCEPTABLE on the second.**
- **How to phrase it:** *"In the browser. Selection, scheduling, distances, costs and all four adaptations are pure TypeScript running on the client, so the expensive part scales for free. What doesn't scale is our seven route handlers proxying Gemini and OpenAI with no cache, no queue, no rate limit and no auth. At a hundred thousand concurrent users that's a rate-limit wall and an unbounded bill. Those are conventional fixes — cache curations by profile hash, put an auth gate in front, contract the tiles and routing instead of using public demo servers."*

---

### Q14. "Why is every stop shown under 'Verified places' with a shield?"

- **Truthful answer:** Because the shield is unconditional. `verification` is in the data and read by nothing.
- **Strength: WEAK.** Closely related to Q1 — expect them together.
- **How to phrase it:** *"Because we render it unconditionally, and that's wrong. The field exists and is accurate — sixteen verified, fourteen needing verification, six unverified — and no component reads it. What that panel actually proves is that every coordinate is one we hold, not one generated at request time. That's a narrower claim than the heading makes and the heading should say so."*

---

### Q15. "Have you spoken to any of these hosts? Is 'Cook Moroccan with a Local Family' a real family?"

- **Truthful answer:** No. All six experiences are `partnerStatus: "demo"` — our own curated MVP content, not a commercial agreement. The type system encodes exactly that distinction and the UI prints a disclaimer.
- **Strength: ACCEPTABLE** — the honesty is engineered in.
- **Evidence:** `src/types/poi.ts` — `PartnerStatus`; every experience in `src/data/experiences.ts`; `activity.demoPartner` in `experience-block.tsx`.
- **How to phrase it:** *"No, and the product says so. `PartnerStatus` has exactly two values — demo and confirmed — and every one of our six is demo, with a disclaimer under the offer. We also wrote a rule into the repository that we will not name a host or use their voice without recorded consent. The hosts are described by role, not by name, for that reason."*
- **What NOT to claim:** Do not name a real person. Do not imply a signed partner.

---

### Q16. "Show me the app with the network off."

- **Strength: STRONG** — this is your best live proof, **if you know what breaks.**
- **How to phrase it:** *"Everything except recognition, voice, the guide, weather and the map tiles. The dataset is compiled into the bundle, so the engine still builds a full four-stop day, still fits it to your budget and time, still checks it against opening hours, and all four adaptations still work — they're pure functions. Photos fail honestly: we say we couldn't place it rather than pretending we recognised something. The map is replaced by 'Map unavailable, your day is right below'. What you lose is the enrichment. What you keep is the day."*
- **What NOT to claim:** Do not claim the map or voice works offline. Do not claim it's a PWA that works offline — there is no service worker.

---

### Q17. "What is your cost per trip, and how do you make money?"

- **Truthful answer:** One trip is roughly one Gemini flash-lite call plus one `gpt-4o-mini` call with ~2k tokens of catalogue — cents at most. Revenue: **nothing is implemented.** The coin ledger has no settlement; there is no payment code anywhere.
- **Strength: WEAK on revenue.**
- **How to phrase it:** *"Cents per trip today — one small Gemini call and one gpt-4o-mini call with about two thousand tokens of catalogue, plus free routing and tiles. There is no revenue code in the repository and I'm not going to pretend otherwise. The mechanism we've built toward is the coin ledger: coins are earned by finishing stops and spent to unlock a partner's discount, and the partner is paid in cash, in person. Monetising that means commission on redemption or promoted placement — and if we ever do promoted placement, it has to be disclosed, because our curation weight is exactly the lever that would move."*

---

### Q18. "Your only accessibility signal is a 1-to-5 walking score. What about a wheelchair user?"

- **Truthful answer:** Not supported. `walkingScore` (1–5) and `walkingPreference: "minimal"` are the whole of it. No step-free, no wheelchair, no sensory data.
- **Strength: WEAK.**
- **Evidence:** `src/types/poi.ts` — `WalkingScore`; `scorePoi` walking term; `WALKING_LIMIT` in `trip-insights.ts:115`.
- **How to phrase it:** *"We don't support it. What we have is a one-to-five walking-difficulty score per place, which subtracts ten points per point of difficulty when someone says minimal walking, and a Less Walking adaptation that converts long legs to a car. That helps tired legs, a stroller, and heat. It is not accessibility, and calling it that would be dishonest. Real accessibility is a data problem — step-free access, ramps, accessible toilets — and it's a field in the schema we haven't earned yet."*

---

### Q19. "What is hardcoded in what you just showed me?"

- **Strength: STRONG if you volunteer the list, DANGEROUS if they extract it.**
- **How to phrase it:** *"Four things. One: there's a golden Casablanca day — Habous, Marché Central, Sacré-Cœur, Hassan II — that appears if generation throws, if we hit the twenty-second ceiling, or if you land on the trip tab with an empty store. It's marked internally as a fallback and we never announce it. Two: seven curated day templates, each worth thirty-four points in scoring, because curation knows things the score doesn't. Three: all the constants — price bands, budget caps, walking limits, coin values, the 1.22 street-detour factor — every one has a comment saying why it has that value. Four: the per-stop reason lines are templates in seven languages, replaced by the model's line when the curator ran. Everything else on that screen was computed."*

---

### Q20. "If I hand you my phone with a photo right now, what happens?"

- **Truthful answer:** It genuinely runs. Gemini names a place; `resolvePoiId` decides whether that is one of our 36; if not, we say so and offer coverage alternatives or a manual path.
- **Strength: ACCEPTABLE — real, but unrehearsed.**
- **Evidence:** `src/features/home/analyze.ts` — `recogniseImage`, `failedRecognition`; `ANALYZE_PROMPT`.
- **How to phrase it:** *"It runs for real, and the failure is honest. The model names what it sees in words — never an id. Then our resolver decides whether those words are one of our thirty-six curated places, and it needs two significant words to match, so a bare 'Casablanca' resolves to nothing rather than to the nearest famous thing. If you show me a beach we don't cover, the model is told to name that beach correctly rather than substitute one from our list, and we say 'we don't cover that yet, here's the closest thing we do' — scored at most 0.5 so it can never masquerade as a real match. And if the whole call fails, we say we couldn't place it. We used to fall back to the Hassan II fixture and we deliberately removed that: a demo that lies about what it saw is worse than one that admits it couldn't look."*
- **What NOT to claim:** Do not promise recognition accuracy on an arbitrary photo.

---

## ⚠ ADDENDUM — THE TREE MOVED DURING THIS AUDIT

**At 14:02–14:03 on 2026-08-30, while this report was being written, a parallel session rewrote the generation experience.** The following files changed on disk after §3.E and §12 above were written:

```
 M src/features/onboarding/processing-screen.tsx     (rewritten: 3 phases → 5)
 M src/features/onboarding/generation-panels.tsx
 D src/features/onboarding/generation-visual.tsx      (deleted)
?? src/features/onboarding/generation-stages.tsx      (new, 562 lines)
?? src/features/onboarding/generation-candidates.ts   (new, 240 lines)
 M src/lib/i18n/messages/{ar,de,en,es,fr,it,pt}.ts    (new generation.* keys ×7)
```

**Sections 3.E and 12 above describe the previous implementation. This addendum is authoritative for the generation screen.** Everything else in the report was re-verified against the current tree.

### A.1 Re-run of the quality gates on the changed tree

| Gate | Result |
|---|---|
| Lint | ✅ **PASS** (exit 0) |
| Typecheck | ✅ **PASS** (exit 0) |
| Tests | ✅ **PASS** — **31 files, 363 tests** (up from 30/356). One mid-write run caught the tree between saves and failed 1 test; a clean re-run passes everything |
| Build | ✅ **PASS** — same 27 routes |

New/changed test files: `src/features/onboarding/__tests__/processing-screen.test.tsx` (**4 tests, new**), `screens.test.tsx` 8 → 10, `darija-stt.test.ts` 17 → 18.

### A.2 The new generation screen

Five phases on **one fixed-height work surface** (`STAGE_HEIGHT = 14.5rem`, sized to the tallest stage):

```
profile → scan → match → route → handoff → /trip
```

| Phase | Component | What is shown | Real work behind it |
|---|---|---|---|
| `profile` | `ProfileStage` | The traveller's own preference chips fly into a constellation and connect to a centre | none — the profile is already frozen |
| `scan` | `CandidateStage` | A **stream of real POIs being accepted or rejected**, each rejection with a reason | **this is where `await generation` actually blocks** |
| `match` | `MatchStage` | The four chosen stops with a **match percentage** and up to 3 tags each | none — `setTrip(built)` has already fired |
| `route` | `RouteStage` | Cycling optimisation claims | none |
| `handoff` | — | The surface swells and dissolves | none |

**Tempos** (`TEMPO` in `processing-screen.tsx`):
```
full     1150 + 1750 + 1450 + 1450 + 420  ≈ 6.2 s floor
quick     850 + 1300 + 1150 + 1150 + 360  ≈ 4.8 s
reduced   200 +  260 +  220 +  220 + 120  ≈ 1.0 s
```
`scan` is a **floor, never a ceiling** — it ends when generation resolves, however long that takes. Every other beat is exact.

**The choreography got roughly 2.5× longer.** Previously ~2.46 s at full tempo; now ~6.2 s. And because `setTrip(built)` still fires **before** `match`, the pure-delay tail after the trip is in hand is now **`match + route + handoff` = 3.32 s at full tempo** (was ~1.18 s). Measured `/api/curate` is ~3 s, so on a warm backend the user now waits noticeably longer than the work takes.

### A.3 What the new screen claims, and how defensible each claim is

`src/features/onboarding/generation-candidates.ts` is unusually careful — its header states: *"Everything on the matchmaking screen comes from two things we already have on the client: the curated POI dataset and the traveller's own profile. Nothing here calls a model, nothing here calls the engine, and nothing here fabricates a place."* That is accurate. But three specifics need jury-proofing:

**(1) `reviewedCount()` — "we reviewed N places". TRUE but small.**
Returns `poolFor(destination).length`. For Casablanca that is **22**; for a thin city it falls back to all **36**. It is a real count of a real pool. It is also a small number to say out loud — be ready for *"you reviewed twenty-two places?"*

**(2) The accept/reject stream — DERIVED, NOT A TRACE OF THE ENGINE. This is the sharpest new attack surface.**
`rejectionFor()` applies **hard filters the engine does not have**:

| Shown as rejected because… | `generation-candidates.ts` | What `engine.ts` actually does |
|---|---|---|
| "too far" | hard reject at `haversineMeters > 9_000` | **no distance filter at all** — proximity is a soft `14 × exp(−d/6000)` score term |
| "over budget" | hard reject if `low` budget and `BAND_WEIGHT > 60` | soft penalty `−min(24, w/8)`, and the POI stays rankable |
| "too much walking" | hard reject if `minimal` and `walkingScore ≥ 4` | soft penalty `−(walkingScore−1) × 10` |
| "not your style" | hard reject if no category overlap | **no such filter** — the composition and top-up steps routinely take a stop carrying none of the stated interests |
| "closed" | `permanently_closed` / `temporarily_unavailable` | **matches the engine exactly** (`BLOCKED_STATUSES`) |

So a POI the screen shows being **rejected for being too far** may in fact be sitting in the engine's ranked pool and could even be selected by the top-up step. Only the "closed" reason is a true reproduction of an engine filter.

**Also a real pool drift:** `poolFor()` widens to the whole dataset when the city has **fewer than 6** POIs; the engine's `destinationPool()` widens at **fewer than 4** (`TRIP_STOP_COUNT`). **Oualidia has exactly 5** — so the screen reviews all 36 POIs and reports "36 reviewed" while the engine only ever considered Oualidia's 5. The file's claim that *"the two agree because they read the same fields"* does not hold for a 4- or 5-POI city.

**(3) The per-stop match percentage — A PRESENTATION NUMBER, FLOOR-CLAMPED AT 80.**
`stopMatches()`:
```
score = 78
  + 7 per primary-category interest match,  + 4 per secondary
  + 4 if signature
  + round(6 × exp(−distance_from_day_centroid / 4000))
  − 2 × (walkingScore − 1)   if walkingPreference === "minimal"
  + 3 if the stop costs ≤ budgetCap / 3
  + 2 if verification === "verified"
score = clamp(score, 80, 98)
```
The comment is candid: *"never claims certainty (nothing scores 100) and never insults a stop we actually chose (nothing under 80)."*

**Consequences a jury will find:**
- **Every stop always scores between 80% and 98%.** A 94% and an 83% differ by a handful of bounded terms, and the floor is doing real work — a stop that matched nothing would still print 80%.
- **These are NOT the engine's scores.** The engine's real scores for the same day were 132.2 / 130.8 / 104.8 / 89.8 in the worked example (§7.4). This is a second, re-derived heuristic built for display.
- It is deterministic and it reads the same fields, so it is *directionally* honest — but *"94% match"* on screen is a restatement, not a measurement.

**How to answer it:** *"That percentage is a readable restatement of the same five signals the engine ranks on — interest overlap, curation, proximity, mobility, budget — deliberately banded so it never claims certainty and never prints a number that insults a stop we actually chose. It is not the engine's raw score; the engine's numbers are unbounded and mean nothing to a traveller. If you want the real ranking, it's in `match()`."*
**Do NOT say:** "94% means the day is a 94% match for you."

**(4) `optimisationNotes()` — TRUE, and conditionally shown.**
Each claim is gated on a fact about the trip: *"opening hours checked"* only appears if a stop actually has hours, *"less walking"* only if a car leg was chosen. Two notes (`optOrder`, `optRoute`) are unconditional. **This is the honest one of the four.**

### A.4 Net effect on the report's verdicts

| Section | Change |
|---|---|
| §3.E, §12 | Superseded by this addendum. The `optimizing` criticism now applies to **three** phases (`match`, `route`, `handoff` = 3.32 s of post-completion animation) rather than two |
| §12 classification | `CandidateStage` is **narrative storytelling that asserts a process claim** — a new category, and the riskiest kind. `ProfileStage` and `RouteStage` are aesthetic. `MatchStage` asserts a number |
| §17 | 356 → **363 tests**, 30 → **31 files**. All gates still pass |
| §18.4 (visual prototype only) | **Add: the accept/reject reasons on the scan stage are computed by a stricter, separate ruleset than the engine's, so a "rejected: too far" card does not mean the engine rejected it.** Add: the 80–98% match band |
| §24 / §25 | Add Q84 and Q86 below |
| §32 verdict | Unchanged. The screen is more impressive and adds one new, findable inconsistency |

### A.5 Three new jury questions this change creates

**Q84. "Your screen showed a place being rejected for being too far. Show me that rejection in your engine."**
*Truthful answer:* You cannot — the engine has no distance filter. Proximity is a soft score term. The scan stage applies a stricter display ruleset (9 km hard cut, category-overlap cut, walking cut) that the engine does not have. Only the "closed" rejection reproduces a real engine filter. **Strength: WEAK.**
*How to phrase it:* *"That stream is computed from the same dataset and the same profile, on the client, and every reason shown is genuinely true of that place — it really is nine kilometres away, it really is a four-out-of-five walk. But it is a view computed alongside the selection, not a trace of it: the engine's real behaviour is softer, it penalises rather than excludes. The only reason on that screen that is a true reproduction of an engine filter is 'closed'. We should label it as what it is."*

**Q85. "What does 94% match mean? What would score 40%?"**
*Truthful answer:* Nothing scores 40 — the value is clamped to [80, 98] by construction. **Strength: WEAK.**
*How to phrase it:* as in A.3(3) above. Volunteer the clamp before they find it.

**Q86. "You said you reviewed thirty-six places for a day in Oualidia, but Oualidia has five."**
*Truthful answer:* The display pool widens to the whole dataset below 6 POIs; the engine widens below 4. For Oualidia (exactly 5) the two disagree. **Strength: WEAK.** It is a two-character fix (`>= 6` → `>= TRIP_STOP_COUNT`).

---

## PHASE 26 — CLAIM VERIFICATION

Every claim the interface or the code makes, checked.

| Claim | Where it appears | Evidence | Safe to say? | Caveat you must attach |
|---|---|---|---|---|
| **"AI-powered"** | implied throughout | Gemini for vision + intent; OpenAI for curator + guide; MoulSot for Darija ASR — all real, all optional | ✅ **Yes** | "AI understands the traveller. A deterministic engine decides the day. No AI touches ranking, routing, timing or cost." |
| **"It never invents a location or a coordinate"** | `trip.trustLine`, shown on **every** trip | **False on the curator/guide custom-stop path** — proven live (§5.2) | ❌ **NO** | Scope it: *"On the planner, the model is never asked for an id."* Never say it unscoped |
| **"Verified places"** | `trip.verified`, heading of `ProvenanceSheet`, shield on every stop | `POI.verification` = verified 16 / needs_verification 14 / unverified 6, **read by zero components** | ❌ **NO** | Say "these are coordinates from our dataset, not generated at request time" — a narrower, true claim |
| **"Personalised"** | product framing | `scorePoi` gives 34 pts primary / 20 pts secondary per stated interest; interest obligations; budget & time repair; pace multiplier; walking penalty | ✅ **Yes** | Point at `engine.ts:210`. Note that with an empty profile every traveller gets the same day — it is deterministic |
| **"Optimised"** | processing screen (`route` phase), `optimisationNotes` | Exact over 24 permutations for narrative order; greedy repair for budget/time; **no distance optimisation, no TSP** | ⚠️ **With scoping** | *"We optimise narrative order exactly — 24 permutations — and we repair against budget and time greedily. We do not optimise distance and we say so."* |
| **"Smart routing" / "route intelligence"** | not in the UI; avoid in the deck | haversine × 1.22 + fixed speeds; OSRM used for **geometry only** | ❌ **NO** | The defensible version: *"we verified the public routing server returns driving data for walking profiles — 2,826 m in 5 minutes — so we take its geometry and compute our own numbers."* |
| **"Real-time"** | avoid entirely | Weather is live. **Opening hours are curated and every one is `needsVerification: true`.** No live availability, no live pricing | ❌ **NO** | *"Weather is live. Hours and prices are curated and we flag them as needing verification."* |
| **"Verified places" (data sense)** | ProvenanceSheet | 21 of 36 carry an OSM source; coordinates were read from OSM | ⚠️ | *"Coordinates from OpenStreetMap; hours and prices curated by hand and flagged."* |
| **"Local"** | `trip.impactTitle` "Stays local", `activity.supportsLocal` | `experience.supportsLocalBusiness` on exactly 6 POIs, each with a real price; figure is a floor with an on-screen receipt | ✅ **Yes** | *"A floor, from curated prices, itemised on screen."* Never call it economic impact |
| **"≈N MAD stays local"** | `trip.impactLine` | `localImpact()` — two hard gates, low end of ranges, renders nothing when unsupportable | ✅ **Yes** | The strongest number in the product |
| **"Accessible"** | not claimed in the UI | `walkingScore` 1–5 + `walkingPreference: "minimal"` only | ❌ **NO** | *"We support less walking. That is not accessibility."* |
| **"Sustainable"** | not claimed in the UI | No carbon number, no emissions model anywhere | ❌ **NO** | *"We make a cash claim, not a carbon claim."* |
| **"Adaptive"** | `Adapt my day` | All four adapters recompute real metrics; each refuses honestly | ✅ **Yes** | *"All four are implemented and each either changes the day or tells you why it can't."* |
| **"Multimodal"** | product framing | 5 modalities → one `TripIntentDraft`; 20 tests assert the shape is identical | ✅ **Yes** | — |
| **"Works offline"** | avoid | No service worker. The **Next.js server must be running**. Dataset + engine + adapters are local; map, voice, recognition, chat are not | ⚠️ | *"It runs with every external service dead, on a local server. It is not an offline PWA."* |
| **"Trusted" / "grounded"** | trust line, provenance sheet | True on the planner path; false on the guide path | ⚠️ | Always scope to the planner |
| **"77% less walking · ~40 min saved"** | `less_walking` headline | Computed from real before/after metrics; asserted by `golden-fixtures.test.ts` | ✅ **Yes** | *"On the golden day. On your day it computes whatever is true, including 'this day is already easy on your feet'."* |
| **"N% match"** on a stop (new) | `MatchStage` | `stopMatches()` — **clamped to [80, 98]**, a re-derived display heuristic, not the engine's score | ⚠️ **Scope it** | *"A readable restatement of the same signals, deliberately banded."* Never present it as measured fit |
| **"We reviewed N places"** (new) | `CandidateStage` | `reviewedCount()` = real pool size (22 for Casablanca) | ✅ **Yes** | Note the 6-vs-4 pool drift for Oualidia (§A.3) |
| **Accept/reject reasons** (new) | `CandidateStage` | Each reason is **true of that POI**, but the ruleset is **stricter than the engine's** — only "closed" reproduces a real engine filter | ⚠️ | *"A view computed alongside the selection, not a trace of it."* |
| **"Partner" / host offers** | `ExperienceBlock` | All 6 experiences `partnerStatus: "demo"`; disclaimer rendered | ✅ **Yes, as stated** | Never name a real host. Never imply a signed agreement |
| **"Khotwa Coins" / wallet** | Passport, offers | Real idempotent ledger; **no money, no settlement** | ✅ **Yes** | *"A loyalty ledger. The artisan is paid in cash, in person."* |
| **"25 POIs"** | README, `pois.ts:2`, docs | **36** | ❌ **NO** | Say 36 |
| **"Casablanca-Settat coverage"** | README, brief | 22/36 Casablanca; 3 cities have 1 POI each | ⚠️ | *"A regional architecture with a Casablanca-weighted pilot."* |
| **"Cultural audio / Listen"** | `docs/DEMO_PATH.md` | 0 audio files | ❌ **NO** | Do not demo it |
| **"No conversational assistant"** | `docs/MASTER_BRIEF.md` | `/chat` exists | ❌ **NO** | The brief is stale |

---

## PHASE 27 — NUMBERS TO MEMORISE

**All verified. Nothing below is estimated unless the row says so.**

### The dataset
- **36 POIs** — 30 places + 6 experiences (3 food experiences, 2 workshops, 1 local activity)
- **6 cities**: Casablanca **22** · El Jadida **6** · Oualidia **5** · Azemmour **1** · Mohammedia **1** · Boulaouane **1**
- **6 interest categories** (= 6 POI categories, one union by design)
- Category counts: hidden_gems 26 · culture 25 · coast_nature 16 · food 14 · art_creative 13 · activities 10
- Verification: **16 verified · 14 needs_verification · 6 unverified**
- Availability: 31 open · 2 seasonal · 2 unknown · 1 temporarily unavailable
- Price: **17 free** · 7 in 60–150 · 4 in 0–30 · 3 in 30–60 · 3 in 150–300 · 2 unknown
- **19 of 36** have opening hours · **25 of 36** have an explicit price · **21 of 36** cite OpenStreetMap
- **6 signature** · **16 hero** · **7 base routes** (6 Casablanca + 1 regional)
- **0 audio files** · **0 galleries** · **0 POI videos**
- **3 partner discounts** · **6 `supportsLocalBusiness`**
- **36 POI images** (6.5 MB), **30 with Wikimedia provenance**: 24 EXACT, 5 STRONG_RELATED, 1 GENERIC_FALLBACK; CC BY-SA 4.0 ×20, CC BY 2.0 ×5, CC BY-SA 3.0 ×3, CC0 ×1, CC BY 3.0 ×1

### The trip
- **Exactly 4 stops, 3 segments**, always (`TRIP_STOP_COUNT = 4`)
- Selection pattern: anchor → curator picks → 2 aligned → 1 signature → interest obligations → composition
- **24 permutations** evaluated exactly for narrative order
- Day starts **09:30**, latest start **18:00**, arrivals rounded up to **5 minutes**
- Budget caps: **low 150 · medium 400 · premium ∞ MAD**
- Time budgets: **few_hours 240 · half_day 360 · full_day 540 minutes**
- Pace multipliers: **relaxed 1.25 · balanced 1.0 · explorer 0.8** — places only, never an experience
- Walking comfort threshold **2,600 m** · Less-Walking conversion threshold **1,800 m**
- Street detour factor **1.22** · walking **4.6 km/h** · car **22 km/h** · road detour **1.25** · **+3 min** hail/park · car distance rounded to **500 m**

### The engine weights
- priority **×5** · signature **+6** · hero **+2**
- primary interest **+34** · secondary interest **+20**
- curated route **+34** · curator suggestion **+30** · experiential **+7**
- proximity **+14 × exp(−d/6000)**
- unknown availability **−4** · seasonal **−2** · needs_verification **−2**
- minimal walking **−10 per walking-score point**
- complementary pool depth **6**

### The AI
- **5 input modalities** (text, voice, image, URL, conversation)
- **3 AI providers** + 1 free Space: Gemini · OpenAI · Groq (unset) · MoulSot v0.3
- Models: `gemini-3.5-flash-lite` · `gpt-4o-mini` · `gpt-4o-transcribe` · `whisper-large-v3-turbo`
- Gemini `temperature 0.2`, `responseMimeType: application/json`. OpenAI `json_object`, **no temperature, no max_tokens sent**
- **Up to 2 AI calls per trip** on the planner path (extract + curate); 1 per chat turn
- Confidence bands: **high ≥ 0.80 · medium ≥ 0.50 · low < 0.50**; degraded ceiling **0.45**
- Grounding rule: **2 shared significant words**; coverage candidates capped at **0.5**
- Timeouts (ms): image 8,000 · profile 8,000 · transcription 8,000 · **Darija 45,000** · social 3,000 · curation 15,000 · guide 12,000 · routing 4,000 · weather 2,500 · **whole generation 20,000**
- Upload: **8 MB**, 4 image mimes, 9 audio mimes, downscale to **1600 px**

### Measured latency (live, 2026-08-30, dev server)
- `/api/weather` **0.33 s** · `/api/extract` **0.89 s** · `/api/curate` **2.98 s**
- Voice: Whisper **~1 s**, MoulSot **~20 s** (measured in-repo: 20.1 s vs 0.9 s on the same clip)
- **Trip generation observed ≈3.5–5 s**, hard ceiling **20 s**
- Generation choreography floor **≈6.2 s** full / **4.8 s** quick / **1.0 s** reduced *(after the 2026-08-30 14:02 rewrite)*
- OSRM returned **2,826 m in 5 min** for a walking leg — the reason its numbers are discarded

### The product
- **7 interface languages** (fr default, en, ar RTL, es, de, it, pt); **3 authored content languages** + a 4-language overlay
- **12 pages · 13 API routes** (7 product + 6 diagnostic) · **27 routes in the build**
- **4 adaptations**, all implemented
- Coins: place **20** · local_activity **50** · food_experience **80** · workshop **100** · full-day bonus **100**
- **363 tests across 31 files** — 4 gates all pass
- **32,483 lines of TypeScript** across **218 `.ts`/`.tsx` files** in `src/`; the engine alone is **839 lines**
- **69 commits**, 2 contributors, **3 days** (2026-08-28 → 2026-08-30)
- **0 external UI dependencies beyond 1 button component**; **0 vendor AI SDKs** — plain `fetch`

---

## PHASE 28 — ONE-PAGE TECHNICAL CHEAT SHEET

```
FRONTEND     Next.js 16 App Router · React 19 · TypeScript strict · Tailwind v4 ·
             Zustand (1 store) · Zod · MapLibre GL · motion · vaul · Phosphor.
             Mobile-first PWA shell (manifest, no service worker). 12 pages.

BACKEND      None. 13 Next.js route handlers that exist only to hold API keys.
             No database, no auth, no session, no server-side persistence.
             `server-only` on src/config/env.ts makes leaking a secret a build error.

AI           Gemini gemini-3.5-flash-lite  — image understanding + intent extraction
             OpenAI gpt-4o-mini            — day curator + conversational guide
             OpenAI gpt-4o-transcribe / Groq whisper-large-v3-turbo — voice
             MoulSot v0.3 (Qwen3-ASR, public HF Space, no key) — Moroccan Darija
             Every key optional. Every call bounded. Every failure returns 200.

VISION       One Gemini call → place name in WORDS + labels + OCR + interest hints.
             Never an id, never a coordinate. Grounded locally by resolvePoiId().

SPEECH       Whisper first (~1s, auto-detect) → needsDarijaEngine(text)? → MoulSot (~20s).
             Decided from the AUDIO, not the interface language. Hallucinated
             transcripts (subtitle artefacts, 3× loops) are rejected like empty ones.
             VOICE_ENGINE=darija runs both in parallel and lets MoulSot win.

MAP          MapLibre GL, lazy, no SSR. OpenFreeMap tiles. 4 numbered pins, 1 route
             (walk vs car styled differently). OSRM used for GEOMETRY ONLY —
             its distances/durations are discarded (verified: 2826 m in "5 min").

DATASET      36 curated POIs (30 places + 6 experiences) across 6 Casablanca-Settat
             towns. Coordinates from OSM. Stories hand-authored in EN/FR/AR with an
             ES/DE/IT/PT overlay. 7 curated day templates. Compiled into the bundle.

RECOMMEND    Pure TS, 839 lines, zero randomness. Weighted linear score
             (interest 34/20, curation 34, priority ×5, proximity 14·exp(−d/6000),
             experiential 7, budget/walking/time adjustments) → greedy selection with
             OBLIGATIONS (the stop you named, every interest you stated, the kinds of
             day it is) → budget & time repair → exact 24-permutation narrative sort.

ROUTING      Haversine × 1.22 street-detour factor; car above 2.6 km;
             4.6 km/h walking, 22 km/h car. No TSP. Order is narrative, not shortest.

GROUNDING    Model is never asked for an id. Two-shared-significant-words token match
             against the dataset. Coverage stand-ins capped at 0.5 and labelled.
             Zod on every model output; the confidence band is DERIVED, never accepted.
             ⚠ EXCEPTION: the chat guide and the curator may author "custom" POIs with
             model-supplied coordinates. Flagged unverified in data, NOT in the UI.

DEPLOYMENT   None. No CI, no Docker, no hosting config. `pnpm verify` is the pipeline.

TESTS        363 tests / 31 files (Vitest, node + jsdom projects).
             lint ✅  typecheck ✅  test ✅  build ✅

MAIN INNOVATION      Darija-first voice routing that decides from the recording, feeding
                     a deterministic, fully-tested engine that AI advises but never
                     controls — plus a local-impact figure computed as a defensible floor.

BIGGEST LIMITATION   Two AI postures that contradict each other: the planner cannot
                     invent a place; the chat guide can, and the UI presents both under
                     "Verified places" with a line saying nothing is ever invented.
```

---

## PHASE 29 — THE 30-SECOND TECHNICAL EXPLANATION

> "Khotwa turns loose travel inspiration into one concrete day in Casablanca-Settat. You give it whatever you have — a screenshot, a TikTok link, or a sentence spoken in Darija — and five different input paths all converge on one structured object: what we understood about the day you want.
>
> The AI's job stops there. It hands us enum values and a place name in words; it is never asked for a coordinate or an id. A local resolver decides whether those words are one of our thirty-six curated places, and it needs two significant words to match, so a vague answer resolves to nothing rather than to the nearest famous thing.
>
> Then an eight-hundred-line deterministic engine — pure TypeScript, zero randomness, three hundred and sixty tests — scores every place against what you said, selects four under hard obligations, fits the day to the budget and the hours you actually have, and orders it as a story rather than a shortest path. Same input, same day, every time.
>
> It runs with every external service dead, and the whole thing takes about four seconds."

*(≈30 s at presentation pace. Every clause is verifiable.)*

---

## PHASE 30 — THE 60-SECOND "HOW IT WORKS"

> **Inspiration.** You arrive with whatever inspired you. Five ways in: type it, speak it, drop a screenshot, paste a TikTok or YouTube link, or just talk to the guide.
>
> **Understanding.** Speech goes to Whisper first — about a second. Then we look at what came back, not at what language the app happens to be open in, because in Morocco those disagree constantly: the app opens in French and someone speaks Darija into it. If the transcript is Arabic script, or Latin letters belonging to no European language, we send the same recording to MoulSot, a model fine-tuned on Darija. A photo goes to Gemini, which names what it sees **in words** — never an id, never a coordinate. A link goes through TikTok's official oEmbed, then YouTube's API, then OpenGraph, and its thumbnail becomes a visual signal too.
>
> **Personalisation.** Everything lands as one draft with a confidence we compute ourselves — how well the place grounded against our dataset, how much of the day you actually described, and only a quarter weight on what the model claims about itself. If we are not sure, we ask rather than assert. Anything you tapped always beats anything the model said.
>
> **Matching.** Now the AI stops deciding. Our engine scores every curated place: thirty-four points for a primary interest match, thirty-four for belonging to a hand-picked day, a proximity term that fades over six kilometres, a budget term, a walking term. Then it selects four under obligations — the place you actually named stays in, every interest you stated gets a carrier, and the *kind* of day you got stays that kind of day. If the day is over your budget or your hours, it swaps stops one at a time until it fits, and it will not buy its way under a limit by dropping the thing you asked for.
>
> **Route.** With four stops there are only twenty-four orderings, so we score all of them and take the best outright — morning culture, midday food, afternoon discovery, sunset icon. Distances are haversine with a 1.22 street-detour factor calibrated against real walks. We take the routing server's street geometry for the map and throw away its numbers, because we measured it returning a thirty-minute walk as five minutes.
>
> **Itinerary.** Four stops, timed from nine-thirty, priced, on a map, with a story per stop, and a Day check that tells you what is wrong with the day — including when the mosque closes ten minutes before you would leave.
>
> **Adaptation.** Four one-tap changes, all of which really recompute. Less walking converts long legs to a car and keeps every arrival time, because the sixteen-hundred guided visit is an anchor. And when an adaptation cannot improve your day, it says so instead of pretending."

---

## PHASE 31 — ARCHITECTURE Q&A (24 answers)

**1. Why Next.js if you have no backend?** For the App Router, RSC-rendered `<html lang dir>` from a cookie (so RTL is correct in the first byte), `next/font` self-hosting, and route handlers as key-holders. We use maybe 20% of the framework. A Vite SPA plus a tiny key proxy would also work.

**2. Where does AI run?** Entirely server-side in route handlers. `src/config/env.ts` and `src/lib/ai/index.ts` both import `server-only`, so a client component importing them is a build error.

**3. Where is state stored?** One Zustand store in memory, mirrored to `localStorage` under `siyaha:v1:*` at controlled save points. Nothing server-side.

**4. Is data persisted?** In the user's own browser only: trip, profile, passport, saved places, wallet, locale. "Reset my data" clears all of it. No server storage of any kind.

**5. How are hallucinations controlled?** On the planner path: the model is never asked for an id; place names resolve by two-token overlap against the curated dataset; coverage stand-ins are capped at 0.5 and labelled; every output crosses Zod with `.catch()` per field; the confidence band is re-derived from the number so it cannot be spoofed. On the chat path, deliberately less — the guide may author stops, flagged unverified in the data. **That flag is not yet shown in the UI, and that is a known bug.**

**6. How do you rank POIs?** The weighted linear score in §7.1, sorted score-descending then id-ascending.

**7. How do you optimise routes?** We do not optimise distance. We optimise narrative order exactly over 24 permutations, and we repair against budget and time greedily.

**8. How do you scale?** The compute already scales — the engine runs client-side. The AI layer does not: the curator sends the whole catalogue every call and needs retrieval before a national dataset. The route handlers need caching, auth and rate limiting.

**9. How do you handle failures?** Every external call gets `boundedSignal(ms, outer)` = `AbortSignal.any([caller, timeout])`. Every provider call is wrapped in `orFallback`. Every product route answers 200 with a usable body. A timeout is treated as a signal to use local data, not as an error, and no provider name ever reaches a user.

**10. How do you secure API keys?** `server-only` import on the env module makes client access a build error. Every value is a getter read at call time, so a container injecting secrets after bundle load works, and a test can exercise the no-key path. No `NEXT_PUBLIC_` variable holds a secret.

**11. What happens if an API is unavailable?** §14. Short version: everything degrades, nothing blocks, and a full four-stop day is still produced.

**12. How do you add another city?** Add POI objects with OSM coordinates, drop `public/images/poi/<slug>.webp`, author a story and tip in EN/FR/AR, add the ES/DE/IT/PT overlay, and optionally a base route. **No engine change.** But: a city with fewer than 4 POIs cannot produce a single-city day, and the engine silently widens to the region rather than saying so.

**13. How do you add a recommendation criterion?** Add a field to `POI`, add a term to `scorePoi`, add a weight to `WEIGHTS`. The 16 engine tests plus the 6 golden-route tests will tell you immediately if the golden day moved.

**14. Why two AI providers?** Gemini is multimodal and fast for vision + structured extraction; OpenAI's `gpt-4o-mini` has reliable JSON mode for the curator and the guide, and `gpt-4o-transcribe` reads Darija where `whisper-1` cannot. Both go through plain `fetch` — one module each, no vendor SDK, no version risk.

**15. Why no vendor SDKs?** Two ~40-line modules (`gemini-client.ts`, `openai-client.ts`) replace two dependency trees. `OPENAI_MODEL` can be pointed at anything with JSON mode without touching the client, because neither `temperature` nor `max_tokens` is sent.

**16. How is the trip generated — client or server?** Client. `buildTrip()` is a client function. Route handlers exist only for secrets and third parties.

**17. What is the concurrency model?** `/api/route` batches with `Promise.all` and never returns a short array. `VOICE_ENGINE=darija` runs both ASR engines in parallel. Wiki thumbnails fetch in parallel with a 3 s budget each.

**18. What is cached?** Nothing. Every provider fetch is `cache: "no-store"`. This is the first thing to add.

**19. How is cancellation handled?** `AbortSignal.any([callerSignal, AbortSignal.timeout(ms)])` on every external call; `AbortController` in client effect cleanup. **`buildTrip()` itself is not cancellable** — navigating away leaves an in-flight curate call.

**20. How do you keep the engine and the adapters agreeing?** One module owns the arithmetic. `calculateMetrics()` is the only source of route numbers, `estimateLeg` the only leg estimator, `visitDurationMinutes` the only duration rule — exported from the engine specifically so the adapters call it rather than copying it. The comment records what happened when they were copies: Rainy Day handed an explorer 70 minutes of a 90-minute pottery workshop.

**21. How do you know the golden demo still works?** `src/lib/__tests__/golden-fixtures.test.ts` (18 tests) asserts the fixture's numbers against `docs/DEMO_PATH.md`; `golden-route.test.ts` (6) asserts the four stops **by name**; `experience-composition.test.ts` (14) asserts the hero demo day; `media-assets.test.ts` (5) asserts every referenced local image exists on disk.

**22. How is i18n done and why hand-rolled?** Plain TypeScript message objects per locale with a `MessageKey` union, so a missing key is a **type error**, and `completeness.test.ts` (36 tests) proves all seven locales carry every key. No runtime i18n library, no bundle cost, no async namespace loading. Content translation is a separate overlay keyed by POI id so coordinates exist exactly once.

**23. What is your test strategy?** Two Vitest projects: `logic` (node, `*.test.ts`) for the engine, adapters, AI parsers and i18n; `render` (jsdom) as a mount smoke floor. `server-only` is aliased to a stub so the **real** route handlers are tested, not copies. No E2E in CI — there is no CI — but three CDP smoke suites exist as `pnpm jury:*`.

**24. What would you fix first with one more day?** (1) Scope the trust line and show `verification` in the UI so an AI-authored stop is visibly unverified. (2) A region bounding-box check on `syntheticPoi`. (3) Rate limiting + a private-IP blocklist on `/api/extract`. (4) Remove the `/test-*` pages from the production build. (5) Fix the stale docs. All five are small.

---

## PHASE 32 — FINAL AUDITOR VERDICT

### Scores

| Dimension | Score | Why |
|---|---|---|
| **Problem relevance** | **7/10** | Real, regionally specific, and the Darija angle is genuinely underserved. Loses points because the premise is asserted, not evidenced — no user research anywhere in the repo. |
| **Innovation** | **6/10** | The Darija voice routing is genuinely novel work. The architecture posture is disciplined rather than new. The trip planner itself is a well-executed known idea. |
| **AI relevance** | **7/10** | Two AI usages are essential (Darija ASR, vision). Two are valuable but replaceable. The honest, testable boundary between "AI understands" and "engine decides" is the best AI-engineering decision in the project — and it is undermined by the one path where the boundary is deliberately dropped. |
| **Technical implementation** | **9/10** | Exceptional for three days. 839-line pure engine, 363 tests, four gates green, strict TypeScript, zero `any` in the paths read, `server-only` enforcement, bounded signals everywhere, one arithmetic module shared by engine and adapters, deterministic ordering. The code comments are the best documentation in the project — nearly every constant records why it has that value and what broke before. |
| **UX** | **8/10** | Mobile-first, RTL-correct from the first byte, nothing mandatory, no dead buttons, honest empty and failure states, real motion discipline (reduced-motion respected, composited transforms, indeterminate progress instead of a fake percentage). Loses points for two entry points with different truth guarantees and for post-completion animation. |
| **Demo quality** | **8/10** | Genuinely strong: a Darija sentence → an experience-led day → a 77% adaptation with an animated redraw. The runbook, the CDP smoke suites and the golden fixtures show real demo engineering. Loses points for the 20 s Darija wait, the dead Listen button, and stale demo docs. |
| **Feasibility** | **8/10** | It runs, it is fast, it needs no infrastructure, it degrades to local data. Nothing here is a research bet. |
| **Scalability** | **5/10** | Engine yes, everything else no: catalogue-in-prompt, dataset-in-bundle, no cache, no auth, no rate limit, no CI, no deployment. All conventional, none done. |
| **Tourism impact** | **6/10** | The experience layer and the local-impact figure point at a real problem — money reaching artisans. But no partner is real, no booking exists, and the impact figure describes intent rather than measured outcome. |
| **Hackathon competitiveness** | **8/10** | Technically top-tier for the format. The risk is not quality, it is a jury finding the Istanbul contradiction and reading the whole project through it. |

**Weighted overall: 7.2 / 10**

### Strongest five aspects

1. **The engine is real, pure and provable.** 839 lines, no randomness, no network, 60+ dedicated tests. "AI understands, the engine decides" is not a slogan here — you can point at the file.
2. **Failure engineering.** Every external call bounded; every product route answers 200; a golden fixture as the floor; the whole demo verified with every API and every tile blocked. Rare at any level, let alone in three days.
3. **The Darija voice path.** Choosing the engine from the recording rather than from the menu, with measured evidence in the code, and rejecting confident hallucinated transcripts as if they were empty ones.
4. **Intellectual honesty in the data model.** `PartnerStatus: "demo" | "confirmed"`. `needsVerification: true` by construction on every curated opening hour. `localImpact()` returning `null` rather than a zero. A README forbidding synthesised voices attributed to real people. `failedRecognition()` refusing to fall back to a fixture — *"a demo that lies about what it saw is worse than one that says it could not look."*
5. **The quality bar.** Four gates green, 363 tests, and code comments that record the bug each constant was introduced to fix.

### Weakest five aspects

1. **The trust contradiction.** The guide invents POIs with coordinates; the UI shows them under "Verified places" beside a line saying nothing is ever invented. One prompt finds it.
2. **`POI.verification` is dead in the UI.** Three honest values in the data, read by zero components. The shield is unconditional.
3. **Casablanca-centricity.** 22 of 36 POIs; three cities with one POI each cannot produce a single-city day, and the engine widens silently rather than saying so.
4. **Stale documentation.** At least eleven statements across `MASTER_BRIEF`, `FALLBACKS`, `JURY_SAFE_RUNBOOK` and `DEMO_PATH` are no longer true, including "there is no conversational assistant", "only Less Walking works", "25 POIs" and "press Listen".
5. **No deployment story.** No CI, no container, no hosting config, no auth, no rate limiting on endpoints that spend money per call, and an unguarded SSRF.

### Five things the jury is likely to remember

1. **A sentence in Darija becoming a day** — if MoulSot answers in time. This is the moment.
2. **"77% less walking, ~40 minutes saved"** with the route redrawing and the metrics counting up.
3. **"≈510 MAD stays local"** with the itemised receipt underneath it.
4. **Three of the four stops being people rather than facades** — a family kitchen, a leather workshop, an artisan walk.
5. **Either "they showed me the code and every number was computed" or "they told me nothing was invented and then it invented Istanbul."** Which one depends entirely on whether you get ahead of it.

### Five things you must not claim

1. **"It never invents a location or a coordinate."** Unscoped, this is false. Say *"on the planner path"* every time.
2. **"Verified places."** The shield means nothing today. Say *"coordinates from our dataset, not generated at request time."*
3. **"We cover Casablanca-Settat."** Say *"a regional architecture with a Casablanca-weighted pilot: twenty-two of thirty-six."*
4. **"Real-time" anything except the weather.** Hours and prices are curated and flagged as needing verification.
5. **"Accessible", "sustainable", any carbon number, and any percentage of local impact.** None of it exists in the code.

### Overall jury readiness

# **READY — with two mandatory pre-pitch fixes**

**Why READY:** The engineering genuinely stands up to inspection. Four green gates, 363 tests, an 839-line pure engine you can read aloud, measured evidence in the code for the two hardest decisions (discard OSRM's numbers; route Darija by the recording), a dataset with real provenance, and a demo path that works with the network unplugged. A technical jury that opens this repository will be impressed, and that is not the usual outcome.

**Why not VERY STRONG:** One provable, one-prompt-deep contradiction between what the interface asserts and what the code does — the guide inventing POIs under a shield that says "Verified places" beside a line that says nothing is ever invented. A jury that finds it will re-read every other claim through it, and several of those other claims (the impact figure especially) deserve better than that.

**The two mandatory fixes, both under an hour:**

1. **Scope the trust line and surface `verification`.** Change `trip.trustLine` to name the planner path, and render a visible "unverified — from the guide's own knowledge" state wherever `verification !== "verified"`. Remove the shield from those stops. The data is already correct; only the view is wrong.
2. **Fix the four demo documents** (`DEMO_PATH`, `JURY_SAFE_RUNBOOK`, `FALLBACKS`, `MASTER_BRIEF`) or stop reading from them. Specifically: 36 not 25, all four adaptations work, no audio files exist so do not press Listen, the 20 s ceiling is 20 s not 10 s, image failure no longer falls back to Hassan II, and there *is* a conversational assistant.

**Two strong optional fixes:** remove `/test-ai`, `/test-openai`, `/test-ai-darija` from the production build; and add a region bounding-box check to `syntheticPoi()` so a custom stop cannot land 3,000 km away.

**And one rehearsal note:** run the exact demo day and confirm Less Walking does not answer *"this day is already easy on your feet"*. The experience-led hero day is mostly car already.

---

*End of report. Compiled 2026-08-30 against commit `cd79d3c` plus the uncommitted generation-screen rewrite of 14:02–14:03. All four quality gates green at time of writing. Every quantitative claim in this document was computed by executing the project's own code or measured against its running server; nothing was estimated except where explicitly labelled.*
