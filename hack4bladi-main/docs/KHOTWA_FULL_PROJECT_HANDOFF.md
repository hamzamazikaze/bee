# KHOTWA — FULL CURRENT PROJECT HANDOFF

> **Single source of truth.** Every number, count, model name and behaviour in this document
> was read from the current working tree or produced by running the current code on
> 2026-08-30. Nothing was carried over from an earlier report. Where a previous claim did
> not survive verification, this document says so.
>
> - Branch `main` · HEAD `2da666d` · working tree **dirty** (51 modified, 42 untracked)
> - Gates: typecheck PASS · lint PASS (1 warning) · tests **239/239** · build PASS
> - Jury: smoke **15/15** · voice **12/12** · wallet **22/22**
> - Tree fingerprint identical before and after the audit — **no concurrent edits**
> - **No production source file was modified by this audit.**

---

## Executive Summary

Khotwa is a **Smart Tourism** mobile web app (Next.js 16 / React 19 PWA-shaped, 430 px
column) for the **Casablanca-Settat** region of Morocco. It turns a scrap of inspiration —
a screenshot, a spoken sentence in Darija, a typed line, or a pasted TikTok/YouTube link —
into **exactly four coherent stops** for one day, and rewards the traveller with a loyalty
currency (**Khotwa Coins**) for actually completing them.

The architecture the whole product rests on, and which the code genuinely enforces:

```
AI UNDERSTANDS  →  USER CONFIRMS  →  LOCAL ENGINE DECIDES  →  GEO SERVICES VERIFY
```

**Verified:** there is **zero** LLM involvement after `TripProfile` exists. The only network
calls downstream of confirmation are `/api/route` (OSRM, geometry only) and `/api/weather`
(open-meteo, one optional chip). Trip selection, ordering, scheduling and all four
adaptations are pure local TypeScript. This is checkable in one command:
`grep -rn "lib/ai\|gemini" src/lib/matching src/lib/adaptation src/features/trip` → no hits.

### What Khotwa currently is

It is a **combination**, and the parts are not equally mature:

| Facet | Status | Evidence |
|---|---|---|
| Multimodal travel inspiration engine | **IMPLEMENTED** | 4 modalities, one endpoint, one output type |
| AI understanding layer | **IMPLEMENTED** | `/api/extract`, Zod-bounded, degraded-not-broken |
| Deterministic itinerary engine | **IMPLEMENTED** | `src/lib/matching/engine.ts`, pure, 4 stops guaranteed |
| Local experience platform | **PARTIAL** | 6 curated experiences, all `partnerStatus: "demo"` |
| Loyalty / rewards product | **IMPLEMENTED (mechanics)** / **DEMO (partners)** | full ledger + discounts, but no real partner has signed |

### Implemented / Partial / Demo / Future

**IMPLEMENTED — real code, real tests, works with no keys**
- Four-modality understanding → one `TripIntentDraft` → Zod → `TripProfile`
- Deterministic 4-stop engine with narrative ordering, curated-route weighting, composition
- Scheduling with a single shared visit-duration rule that protects booked appointments
- All four Adapt My Day modes (none is a no-op)
- Wallet: earning, idempotent credit, discounts, redemption, persistence
- Passport / Saved / Visited, all persisted separately
- EN / FR / AR with runtime RTL; 334/334 AR key parity
- MapLibre map ↔ timeline synchronisation, external navigation hand-off
- Zellige ornament fallback system, deterministic per slug

**PARTIAL**
- **Media**: 36 records declare a hero image; **only 6 exist on disk**. The other 30 render
  a zellige ornament. Honest and deliberate — but it is 30 records without a photograph.
- **Instagram**: recognised as a platform, but Instagram serves no OpenGraph to us, so it
  degrades to `platform_only` (URL + platform name, no title, no thumbnail).
- **Voice**: MoulSot is real and reachable, but cold-start latency is unbounded up to 45 s.
- **Local experience composition**: real for Casablanca and El Jadida; thin elsewhere.

**DEMO / PROTOTYPE**
- All 6 experiences are `partnerStatus: "demo"`, `verification: "unverified"`. Nobody has
  signed anything. The type system makes this explicit and the UI must not overstate it.
- `/test-ai` and `/test-ai-darija` are engineering laboratories shipped in the build.
- The golden Casablanca trip fixture is the floor the `/trip` screen lands on when the
  store is empty.

**FUTURE IDEA — not implemented, do not claim**
- Booking, payment, settlement of any kind
- Real-time partner inventory or capacity
- Turn-by-turn navigation (we hand off to Apple/Google Maps)
- Offline mode (no service worker exists)
- Multi-day trips, group trips, user accounts

---

## Product Proposition

**Target traveller.** A visitor with one day in the Casablanca-Settat region who has already
seen something that made them want to come — a reel, a photo, a friend's story — and who
does not want to assemble an itinerary out of eleven browser tabs. Secondary: a
Darija/Arabic-speaking domestic traveller, who is the reason MoulSot exists.

**Promise.** *"Show us what inspired you. Confirm what we understood. Get four stops that
actually fit your day — and get something back for finishing them."*

**Current differentiation, as the code actually supports it:**

1. **Four inputs, one pipeline.** A screenshot, Darija speech, typed text and a TikTok link
   all converge on the same `TripIntentDraft`. Downstream code cannot tell them apart.
2. **The AI never decides.** The model returns free text and enum values; a local resolver
   turns "Hassan II Mosque" into `poi-hassan-ii`. The model is never asked for an id, a
   coordinate, a price or an itinerary — and could not use one if it returned it.
3. **Darija-first speech.** MoulSot (Qwen3-ASR fine-tuned on Darija) leads for Arabic,
   Whisper leads for EN/FR. This is a real differentiator: Whisper is weak on Darija.
4. **A day is not four monuments.** The engine can compose DISCOVER → MEET → MAKE → TASTE,
   mixing an icon with a neighbourhood walk, a workshop and a meal.
5. **Value routed to local people.** Coins are earned for completing stops and spent to
   unlock a local partner's discount. The partner is paid in cash, in person, as always.

---

## User Journey

### The main path

```
HOME  /
  ├─ free-text field + mic (voice) + "starting points": TikTok/IG link · photo · place
  ├─ mood cards (arches / sunset / lunch) → preset interests
  └─ popular cards (culture / atlantic / Local Food Trail) → preset interests
        │
        ▼  (any input) → understanding
  POST /api/analyze   (image)          ─┐
  POST /api/transcribe (voice)  ──┐     │
  POST /api/extract    (text/url/transcript) ──┴──► TripIntentDraft
        │
        ▼
CONFIRMATION
  ├─ image / link → full-bleed RecognitionReveal ("we think this is …", candidates)
  └─ text / voice → "HERE IS WHAT WE UNDERSTOOD" chip card inside onboarding step 1
        │
        ▼
ONBOARDING  /onboarding   (3 steps, nothing is mandatory, every chip deselectable)
  1. Inspiration  — composer / what we understood
  2. Your Vibe    — interests (max 3)
  3. Your Day     — time · budget · pace · walking
        │  ["Build my trip"]
        ▼
PROCESSING  (min 2.4 s, hard ceiling 10 s)
  match() → schedule() → localSegments() → /api/route (geometry only) → calculateMetrics()
        │
        ▼
TRIP  /trip
  TripBrief (the day read against your stated limits) · TripMetrics · TripMap · TripTimeline
  ├─ tap a stop → PlaceSheet (story, tip, save ♥, Navigate →)
  ├─ Adapt my day → AdaptSheet (4 modes, applied locally, Undo restores)
  └─ ["Start trip"]
        ▼
EXPERIENCE  /experience   (mode: "guiding")
  current stop, cultural story sheet, ["Visited"] per stop
  ├─ Visited → passport stamp + coins credited (idempotent) + RewardToast
  └─ all four visited → +100 day bonus
        │
        ▼
PROFILE / PASSPORT  /passport → WalletSheet → unlock a partner offer
```

### Secondary screens

| Route | Screen | What it is |
|---|---|---|
| `/explore` | ExploreScreen | Six category tiles + curated shelves over the 36 records |
| `/explore/[category]` | CategoryScreen | SSG, one per interest (6 static pages) |
| `/saved` | SavedScreen | Places hearted from PlaceSheet / Explore, persisted |
| `/passport` | PassportScreen | Stamps + Khotwa Wallet entry point |
| `/test-ai`, `/test-ai-darija` | Dev laboratories | **Shipped in the production build** |

### Route transitions and state changes

| Transition | State change |
|---|---|
| Home input → `/onboarding` | `patchProfile(draftToProfile(draft))`, `sources` gains one entry |
| `/onboarding` step 3 reached | Defaults `half_day` / `medium` / `balanced` applied **once**, only if still null |
| "Build my trip" | `setTrip(trip)`, `storage.saveTrip`, `push("/trip")` |
| "Start trip" | `mode: "planning" → "guiding"`, `activeStopId = stops[0].id` |
| "Visited" | `visitState → "visited"`, next stop → `"current"`, stamp + coin credit, `lastReward` set |
| Adapt applied | `tripBeforeAdaptation = trip`, `trip = result.trip`, `adaptation = result` |
| Undo | `trip = tripBeforeAdaptation`, `adaptation = null` |
| Unlock offer | `wallet.balance -= minimumCoins`, `redeemed += offer`, persisted |

The bottom tab bar is present on every screen (`BottomNav`), and jury smoke TEST 8 verifies
every destination resolves.

---

## Routes

**28 routes build cleanly.**

| Route | Rendering | Notes |
|---|---|---|
| `/` | Static | Home |
| `/onboarding` | Static | `Suspense` boundary for `useSearchParams` |
| `/trip` | Static | Client screen; falls back to golden fixture |
| `/experience` | Static | Guiding mode |
| `/explore` | Static | |
| `/explore/[category]` | **SSG ×6** | culture, food, coast_nature, hidden_gems, art_creative, activities |
| `/saved`, `/passport` | Static | |
| `/manifest.webmanifest` | Static | |
| `/test-ai`, `/test-ai-darija` | Static | **Dev laboratories, not gated** |
| `/api/analyze` | Dynamic | Image → analysis + draft |
| `/api/extract` | Dynamic | **The one understanding endpoint** |
| `/api/transcribe` | Dynamic | MoulSot → Groq (or reverse by locale) |
| `/api/route` | Dynamic | OSRM batch, Zod-validated |
| `/api/weather` | Dynamic | open-meteo, 204 on any failure |
| `/api/test-ai/{status,intent,audio,translate}` | Dynamic | **Dev, ungated, spends the Gemini key** |

---

## Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.3.3 |
| Runtime | React / React DOM | 19.2.8 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) | ^4 |
| State | Zustand | ^5.0.15 |
| Validation | Zod | ^4.4.3 |
| Map | MapLibre GL | ^6.6.0 |
| Motion | `motion` (Framer successor) | ^13.1.1 |
| Icons | `@phosphor-icons/react` | ^2.1.10 |
| Sheets | `vaul` | ^1.1.2 |
| Tests | Vitest + Testing Library + jsdom | ^4.1.11 |
| Package manager | pnpm | 11.10.0 |

No vendor AI SDK: every model call is plain `fetch`. That is deliberate — no version risk on
demo morning.

**External services:** Gemini (generativelanguage v1beta), MoulSot HF Space (Gradio),
Groq Whisper, TikTok oEmbed, YouTube Data API v3 (optional), OSRM public demo,
open-meteo, OpenFreeMap tiles. **Every one of them is optional.** The app builds a complete
four-stop day with zero keys and zero network.

---

## Design / Motion

**Brand.** Khotwa ("step"). Charter palette on a page black (`#0d0d0d`), theme colour
`#52d68a` (mint), with `plum` and `surface`/`surface-muted` grounds. The app renders as a
430 px device on a stage (`#app-viewport`). Pointed-arch clip (`archClip`) is the recurring
frame; zellige geometry is the recurring texture.

**Motion — `src/components/motion.ts`, the single source.**

| Property | Value |
|---|---|
| Primitive | `RISE` — `opacity 0→1`, `y 12→0` |
| Duration | `0.34 s` |
| Easing | `easeOut` |
| Stagger | `0.06 s` per index |
| **Stagger cap** | **6** — an Explore shelf of 21 cards would otherwise take ~1.7 s |
| Base offset | caller-supplied `base` |

**`prefers-reduced-motion`** is handled **at the source**, not per component: `PageShell`
wraps every screen in `<MotionConfig reducedMotion="user">`, which neutralises all of it.
This is the correct place for it — no component can forget.

**Screens using shared motion:** Home, Explore, Category screen, Onboarding, Trip timeline,
Experience screen, RecognitionReveal. Verified: `trip-timeline`, `experience-screen` and
`recognition-reveal` had independently converged on the same 0.32–0.35 s rise, and
`motion.ts` is that agreement written down.

---

## Multimodal Understanding

### The unified architecture — verified REAL

```
                 ┌──────────── IMAGE ────────────┐
  camera/upload → validateImage → base64 →  POST /api/analyze
                                                 │ Gemini vision (ANALYZE_PROMPT)
                                                 │ → free text + labels + OCR + hints
                                                 │ → resolvePoiId() locally
                                                 ▼
                 ┌──────────── VOICE ────────────┐
  MediaRecorder → POST /api/transcribe           │
                    MoulSot ⇄ Groq               │
                    → transcript ────────────────┤
                                                 │
                 ┌──────────── TEXT ─────────────┤
  textarea (≤200) ───────────────────────────────┤
                                                 │
                 ┌──────────── URL ──────────────┤
  paste → extractUrlMetadata() ──────────────────┤
          TikTok oEmbed / YouTube API / OpenGraph│
          + fetchRemoteImage(thumbnail) ─────────┤
                                                 ▼
                                        POST /api/extract
                                     GeminiIntentProvider (INTENT_PROMPT)
                                                 │
                                          buildDraft()
                                    ├ pickEnum / pickInterests / pickBoolean
                                    ├ resolvePoiId + resolvePoiCandidates
                                    └ scoreDraft()  ← grounding · coverage · self-report
                                                 │
                                        parseTripIntentDraft()  ← ZOD
                                                 │
                                          mergeKnown()  ← a tap always wins
                                                 ▼
                                        ► TripIntentDraft ◄
                                                 │
                                     USER CONFIRMS (reveal / chip card)
                                                 │
                                          draftToProfile()
                                                 ▼
                                          ► TripProfile ◄
                                                 │
                                     match() → schedule()   [NO MODEL]
```

**All four modalities produce `TripIntentDraft`. Confirmed by reading the code, not the
comments:** `src/lib/intent/normalize.ts:buildDraft()` is the single constructor, and
`src/app/api/extract/route.ts` is the single endpoint. `src/lib/intent/sources.ts` provides
the no-key local adapters (`draftFromLocalText`, `draftFromUrlMetadata`,
`draftFromImageAnalysis`) so the shape is identical even with no model at all.

### Per-modality verdict

| Modality | With Gemini key | Without any key | Verdict |
|---|---|---|---|
| **TEXT** | Gemini intent extraction, full enum + constraint capture | Local keyword pass — city, interests, time, budget, walking; confidence capped at **0.45** | **REAL** |
| **VOICE** | MoulSot/Groq → transcript → same Gemini path | Transcript still returned by MoulSot (needs no key); local keyword pass after | **REAL** |
| **IMAGE** | Gemini vision → place words + OCR + labels → local grounding | `EMPTY_ANALYSIS`, `degraded: true`; UI falls to the golden Casablanca profile | **REAL** (with key) / **DEGRADED** (without) |
| **URL — TikTok** | oEmbed (no key) → title/author/thumbnail → thumbnail analysed as an image | oEmbed still works; text metadata only | **REAL** |
| **URL — YouTube** | Data API v3 with key; OpenGraph without | OpenGraph (head streamed past 256 KB of script) | **REAL** |
| **URL — generic** | OpenGraph under two user agents | Same — no key needed | **REAL** |
| **URL — Instagram** | Platform detected; Instagram serves us no OG | `provider: "platform_only"` | **PARTIAL** |

---

## Voice / Darija

### The production path

```
Browser MediaRecorder (audio/webm;codecs=opus, or audio/mp4 on Safari)
  → FormData { audio, locale }
  → POST /api/transcribe
      readAudioUpload()  — MIME stripped of codec params, ≤ 8 MB, non-empty
      engines = prefersDarija(locale) ? [MoulSot, Groq] : [Groq, MoulSot]
      first engine returning non-empty text wins
  → { ok, degraded, text, detectedLocale, provider }
  → understand({ source: "audio", transcript, known })
  → POST /api/extract  → TripIntentDraft
```

### MoulSot integration — `src/lib/ai/darija-stt.ts`

**Space:** `https://atlasia-moulsot-v0-3.hf.space` (`atlasia/MoulSot.v0.3`, Qwen3-ASR
fine-tuned on Moroccan Darija). **No API key.**

The three-call Gradio protocol, ported from a proven prior implementation:

1. `POST /gradio_api/upload` — `FormData{ files }`, filename chosen from MIME
   (`.webm` / `.m4a` / `.wav` / `.mp3`) → returns `["/tmp/…/audio.webm"]`
2. `POST /gradio_api/call/transcribe` — `{ data: [{ path, meta:{_type:"gradio.FileData"} },
   "Auto (Darija / Arabic)"] }` → returns `{ event_id }`
3. `GET /gradio_api/call/transcribe/<event_id>` — SSE frames

**SSE parsing** (`parseSSE`, exported and transport-free so it is unit-testable against real
captured frames — **17 tests** in `src/lib/ai/__tests__/darija-stt.test.ts`):
- frames split on `\n\n`; `event:` and `data:` read by regex
- `event: error` → throws with the reason
- `event: complete` **or** `generating` → captured as the result (last one wins)
- result JSON-parsed; an array takes `[0]`; trimmed
- no result at all → throws "unexpected response"

**Timeout:** `TIMEOUTS.darijaTranscriptionMs = 45_000 ms`. Deliberately long, because a
sleeping HF Space can take a minute to wake — but hard-bounded, because "the one thing we
may never do is freeze the recorder."

**Arabic Unicode:** transcripts are passed through as-is (`String(...).trim()`). The
resolver's `normalise()` preserves the Arabic block (`؀-ۿ`) explicitly, so
`مسجد الحسن الثاني` grounds to `poi-hassan-ii` — **verified: score 0.9.**

**Cold start.** Probed live during this audit: the Space answered `200` in **1.16 s**. That
is the landing page, not a transcription — a genuinely cold model can still take tens of
seconds. Budget for it on stage.

**Groq fallback:** present (`src/lib/ai/groq.ts`, `whisper-large-v3-turbo`), used only when
`GROQ_API_KEY` is set. Leads for EN/FR.

**Manual/degraded fallback:** if both engines fail, the route answers **200** with
`{ ok: true, degraded: true, text: "" }`. `VoiceCapture` shows one line
(`home.voiceFailed`) and the CTA is never blocked. The traveller types or taps instead.

### Is Gemini Transcribe still used in PRODUCTION?

**No.** `gemini-3.5-transcribe` appears **only** in `src/app/api/test-ai/_gemini.ts`, which
is imported exclusively by the `/api/test-ai/*` laboratory routes. Nothing in the production
flow imports it. Production speech is MoulSot + Groq only.

### Language behaviour

| Locale | First engine | Second | Notes |
|---|---|---|---|
| `ar` (Darija/Arabic) | **MoulSot** | Groq | `prefersDarija()` returns true |
| `undefined` | **MoulSot** | Groq | Unknown locale is treated as possibly-Darija |
| `fr` | Groq | MoulSot | Whisper is better and faster on French |
| `en` | Groq | MoulSot | Same |

This is engine *ordering*, not language *detection* — an honest MVP choice, documented as
such in the source.

**Expected latency:** warm MoulSot ≈ 2–6 s; cold ≈ up to the 45 s ceiling. Groq Whisper
≈ 1–3 s (8 s ceiling). Add ~1–2 s for the subsequent `/api/extract` Gemini call.

---

## Image

**Endpoint:** `POST /api/analyze?locale=<en|fr|ar>` — accepts `multipart/form-data` with
`file`, or JSON `{ image: { base64, mimeType } }`.

**Model:** `serverEnv.gemini.model` — default **`gemini-3.5-flash-lite`**.

**Prompt (`ANALYZE_PROMPT`)** asks for exactly:
```json
{"destination","country","detectedPlace","labels","ocrText","interestHints","activityHints","confidence"}
```
with these binding rules, verified in `src/lib/ai/gemini.ts`:
- `destination` limited to six regional towns
- `detectedPlace` **preferably from `CURATED_PLACE_NAMES`**, otherwise a plain description
- `labels`: 3–6 visual clues
- **`ocrText`**: any legible text — captions, signs, overlaid titles (this is the OCR path)
- `interestHints`: from the six-interest vocabulary, max 3
- `confidence`: 0..1, honest
- **"Never invent coordinates, ids, opening hours or prices. Never return an itinerary."**

**Local POI grounding — the important part.** The model is *never asked for an id*. The
route does `detectedPoiId: resolvePoiId(detectedPlace)` locally. `resolve-poi.ts` matches on
**token overlap**, not substrings, requiring **two shared significant words** (or every word
of a one-word name), with stopwords removed and Arabic preserved.

**Verified live during this audit:**

| Model says | Resolves to | Candidate score |
|---|---|---|
| `"Hassan II Mosque"` | `poi-hassan-ii` | 0.80 |
| `"hassan ii"` | `poi-hassan-ii` | 0.80 |
| `"مسجد الحسن الثاني"` | `poi-hassan-ii` | 0.90 |
| `"La Mosquée Hassan II de Casablanca"` | `poi-hassan-ii` | 0.96 |
| `"Marche Central"` | `poi-marche-central` | 0.90 |
| `"Sacre Coeur"` | `poi-sacre-coeur` | 0.80 |
| `"Grande Mosquée"` | **null** | — (correctly refuses) |
| `"Eiffel Tower"` | **null** | — |
| `"the beach"` | **null** | — |
| `"Habous"` (alone) | **null** | — *(see P2-1)* |

**So: `image → Gemini → candidate place → local POI ID` is REAL.** The Hassan II example
works in all four of its written forms.

**Confidence.** `readConfidence()` returns the model's own `detectedPlace`/`destination`
number, or **null** when no model answered. The reveal only prints a match score when a
real model produced it: *"A confidence invented for the fallback path would be fake data
on stage."*

**Fallback (`goldenRecognition`).** If the call fails, the response is not `ok`, or
`detectedPlace` is absent, the composer silently resolves to the golden Casablanca profile
(Hassan II) with `confidence: null, usedFallback: true`. The jury is never told a provider
was down. This is `docs/FALLBACKS.md`'s emergency path and it is why an image upload can
never dead-end the demo.

---

## URL

`src/lib/ai/url.ts` — the chain, in order:

| Platform | Branch | Key needed | Verdict |
|---|---|---|---|
| TikTok | `https://www.tiktok.com/oembed?url=…` (official, public) | No | **REAL** |
| YouTube | Data API v3 `videos.list?part=snippet` | Optional | **REAL** (API) |
| YouTube | OpenGraph fallback | No | **REAL** |
| Instagram | OpenGraph attempt → `platform_only` | No | **PARTIAL** |
| Facebook | OpenGraph attempt | No | **PARTIAL** |
| Generic | OpenGraph, two user agents | No | **REAL** |
| Unparseable | `provider: "invalid_url"` | — | Cue to ask, not to guess |

**Thumbnail → visual signal.** `fetchRemoteImage()` pulls the oEmbed/OG thumbnail and hands
it to the multimodal provider as `input.image`, with `placeProvenance: "url_thumbnail"`.
That is how a pasted TikTok link becomes a *visual* signal rather than a caption.

**Two user agents, deliberately.** Social platforms serve OG tags to `facebookexternalhit`
and an empty JS shell to everyone else; Wikipedia 403s a UA claiming to be someone else's
crawler. So: crawler-UA first for social hosts, browser-UA first for everything else.

**`readHead()`** streams only as far as `</head>` (hard cap 2 MB), then cancels the reader.
A flat byte cap had been wrong — YouTube's head alone runs past 256 KB of inline script,
so its ordinary `og:title` sat beyond the cut and every YouTube link came back empty.

### URL security audit

| Control | Status | Detail |
|---|---|---|
| Scheme allowlist | ✅ **SAFE** | Only `http`/`https`. A bare string is only prefixed `https://` when it has **no** scheme — so `mailto:x@example.com` is rejected rather than turned into a fetchable URL. |
| Hostname sanity | ⚠️ weak | Only requires a `.` in the hostname |
| **Private-IP / SSRF blocking** | ❌ **MISSING** | `http://192.168.1.1/`, `http://169.254.169.254/` (cloud metadata) and `http://localhost:8080/` all parse and **will be fetched** by `readMetadata()` |
| **Redirect handling** | ❌ **`redirect: "follow"`, unvalidated** | A public URL that 302s to `169.254.169.254` is followed |
| Body size limit | ✅ | `MAX_HEAD_BYTES = 2 MB`, reader cancelled |
| Timeout | ✅ | `TIMEOUTS.socialContextMs = 3 s`, `AbortSignal.any` |
| Thumbnail fetch | ✅ mostly | **https only**, MIME allowlist, `content-length` + actual-byte check against 8 MB — but **no private-IP check and follows redirects** |
| Response exposure | ✅ **SAFE** | Only `title`/`description`/`author`/`publisher`/`thumbnailUrl` are extracted. A fetched page's body is never returned to the client. |

**Assessment:** this is a **blind, metadata-only SSRF** — an attacker can make the server
issue GETs to internal addresses but sees back at most an OG title. On localhost for a
demo this is **DEMO ACCEPTABLE**. On any deployed host it is **NEEDS HARDENING** and is
listed as **P1-1**.

---

## TripIntentDraft / Confirmation / TripProfile

### `TripIntentDraft` — the exact schema (`src/types/intent.ts`)

```ts
interface TripIntentDraft {
  source: "image" | "audio" | "text" | "url";
  destination: {
    region: string | null;
    city: string | null;
    detectedPlace: string | null;
    detectedPoiId: string | null;   // ONLY ever a curated id, resolved locally
    confidence: number;             // 0..1
  };
  candidates: PoiCandidate[];       // ranked local matches, max 5, never invented
  interests: Interest[];            // max 3
  timeAvailable: "few_hours" | "half_day" | "full_day" | null;
  budgetLevel: "low" | "medium" | "premium" | null;
  pace: "relaxed" | "balanced" | "explorer" | null;
  mobility: { avoidLongWalks: boolean | null };   // null = input said nothing
  constraints: string[];            // max 6, e.g. "back before 18:00"
  evidence: {
    transcript, ocrText, urlTitle, urlDescription,
    urlAuthor, urlThumbnailUrl: string | null;
    visualClues: string[];          // max 8
    provider: string | null;        // e.g. "tiktok_oembed+gemini" — dev trace only
  };
  confidence: number;               // 0..1 overall
  band: "high" | "medium" | "low";  // DERIVED, never accepted from outside
  uncertainFields: DraftField[];    // what the UI should ask about
  provenance: Partial<Record<DraftField, FieldProvenance>>;
  degraded: boolean;                // true = no model answered
  locale: "en" | "fr" | "ar";
  createdAt: string;                // ISO 8601
}
```

**Confidence bands:** `high ≥ 0.80` · `medium 0.50–0.79` · `low < 0.50`.
`shouldPreselect(draft)` is true only for `high`.

**Scoring (`scoreDraft`)** blends three things with different weights:

| Input | Place-oriented (image/url) | Text-oriented (text/voice) |
|---|---|---|
| **grounding** (did it resolve to a curated POI?) | 0.60 | 0.25 |
| **coverage** (how much of the day was described) | 0.15 | 0.60 |
| **model self-report** | 0.25 | 0.25 |

Coverage is *weighted*, not counted: `interests` and `timeAvailable` are worth 2 each,
`budgetLevel`/`pace`/`mobility` 1 each — because interests and time are what actually change
the itinerary. **Ceiling on the degraded path: 0.45**, so a no-key draft can never claim
more than "low".

### Precedence — VERIFIED IMPLEMENTED

The stated rule is:
```
explicit manual choice  >  explicit voice statement  >  strong image/social inference  >  defaults
```

This is enforced in **two places, in the right order**:

1. **`mergeKnown(draft, known)`** — `src/lib/intent/normalize.ts:306`. Every field the
   traveller has already chosen overwrites the model's answer and is stamped
   `provenance: "manual"`. Called at the end of `GeminiIntentProvider.extractIntent()`
   ("A tap always outranks the model. This is the last word on precedence.") **and** on
   the no-model fallback branch of `/api/extract`.

2. **`draftToProfile(draft, { base, edits })`** — `src/lib/intent/confirm.ts:44`.
   `edits` (what the traveller just changed on the confirmation screen) is spread **last**
   and always wins. Every draft field uses `?? base.<field>`, so a field the draft is
   unsure about **never clears** a value the traveller already had.

**A bug that was fixed and is verified fixed in this tree:** `/api/extract` no longer passes
`known` a second time as `edits`. Doing so let a caller that sends its whole current profile
— which is exactly what the composer does — spread a full set of `null`s back over
everything the model had just understood. The comment at `route.ts:166` documents it.

**Defaults are not choices — verified fixed.** In `onboarding-flow.tsx:90`, the step-3
defaults (`half_day` / `medium` / `balanced`) are applied **only when the traveller actually
reaches step 3**, guarded by a `defaulted` ref, and only where the value is still `null`.
Written on mount (as it once was), those defaults landed in the profile before the traveller
said anything, and the understanding layer then read them as deliberate choices and refused
to overrule them — a Darija sentence saying "نهار كامل" (a full day) came back as **Half
day** for exactly that reason.

**This is verified live, not just by reading:** `pnpm jury:voice` asserts
`Your Day prefilled (Full day + Keep it short)` from Darija speech. **12/12 PASS.**

### Confirmation surfaces

| Input | Surface | What it shows |
|---|---|---|
| Image / URL | `RecognitionReveal` (full-bleed) | The image, the recognised place, the match score **only if a real model produced one**, ranked alternative candidates, understood chips |
| Text / Voice | "HERE IS WHAT WE UNDERSTOOD" card in onboarding step 1 | The original transcript (Arabic preserved) + chips |

**Prefilled:** destination, detectedPlace/PoiId, interests, time, budget, pace, walking.
**Editable:** all of it — steps 2 and 3 are ordinary chip groups, and
`OptionGroup` makes **every chip deselectable** (`value === option.value ? null : option.value`).
Nothing is mandatory. Interests cap at `MAX_INTERESTS = 3`.

**Chips never invent copy** — `draft-summary.ts` maps draft fields onto the *same*
`onboarding.*` message keys the traveller will see one step later when they go to change it.

### `TripProfile` — what reaches the engine

`draftToProfile()` is **the only bridge**. Nothing downstream ever sees a `TripIntentDraft`:
`match()` and `schedule()` take a `TripProfile` and only a `TripProfile`.

```ts
TripProfile {
  destination, detectedPlace, detectedPoiId,
  interests: Interest[],
  timeAvailable, budgetLevel, pace, walkingPreference,
  locale,
  confidence: Partial<Record<field, number>>,
  sources: InputSource[],          // "image" | "voice" | "text" | "social_url"
  transcript: string | null,       // the original words, kept as evidence
  social: SocialContext | null,
  createdAt                        // when the traveller CONFIRMED, not when the model answered
}
```

`createEmptyProfile(locale)` in `src/lib/validation/trip-profile.ts` is the floor — an
entirely empty profile still produces a complete four-stop day (verified: the "EMPTY
profile" probe case returns 4 valid stops).

---

## Dataset

**Computed from the current source on 2026-08-30. Do not reuse older counts.**

### TOTAL: **36 records**

```
GOLDEN_DATASET_POIS   4   (fixtures — ids/coords cannot drift from the demo)
CASABLANCA_POIS      14
COAST_POIS           12
EXPERIENCES           6
                    ───
                     36
```

### By city
| City | Count |
|---|---|
| Casablanca | 22 |
| El Jadida | 6 |
| Oualidia | 5 |
| Azemmour | 1 |
| Mohammedia | 1 |
| Boulaouane | 1 |

All 36 are `region: "Casablanca-Settat"`.

### By kind (`ExperienceKind`)
| Kind | Count |
|---|---|
| `place` | **30** |
| `food_experience` | **3** |
| `workshop` | **2** |
| `local_activity` | **1** |
| **experiential total** | **6** |

### By category (a record can carry several)
| Category | Count |
|---|---|
| hidden_gems | 26 |
| culture | 25 |
| coast_nature | 16 |
| food | 14 |
| art_creative | 13 |
| activities | 10 |

### Other distributions
| Field | Distribution |
|---|---|
| `signature` | **6** — `poi-hassan-ii`, `poi-ancienne-medina`, `poi-corniche-ain-diab`, `poi-cite-portugaise`, `poi-citerne-portugaise`, `poi-oualidia-lagune` |
| `hero` | 16 |
| `verification` | verified 16 · needs_verification 14 · unverified 6 |
| `availability` | open 31 · unknown 2 · seasonal 2 · temporarily_unavailable 1 |
| `indoorOutdoor` | outdoor 21 · indoor 9 · mixed 6 |
| `priceRange` | free 17 · 60_150 7 · 0_30 4 · 30_60 3 · 150_300 3 · unknown 2 |
| `openingHours` present | 19 of 36 |
| `cultural.audio` present | **0** — no pre-generated narration ships |
| `media.heroVideo` set | **0** |

### Media — the important finding

| Metric | Value |
|---|---|
| Records declaring a `heroImage` | 36 |
| **Distinct** `heroImage` paths | **36** (no record shares another's hero path) |
| **`heroImage` files that actually exist on disk** | **6** |
| **Records that therefore render the Zellige fallback** | **30** |

The six real photographs in `public/images/poi/`:
`hassan-ii.webp` · `habous.webp` · `marche-central.webp` · `sacre-coeur.webp` ·
`ancienne-medina.webp` · `corniche-ain-diab.webp`

Six category fallbacks exist in `public/images/vibes/` (culture, food, art, coast,
adventure, hidden-gems) and are used for **Passport stamps** (`stamp.imageUrl =
poi.media.fallbackImage`) — but **not** for POI cards, because `MediaCard` diverts to
`ZelligeTile` once the record's own `heroImage` 404s, deliberately skipping the shared
category photo.

Three videos ship (`hero.mp4`, `corniche.mp4`, `habous.mp4`) but **no POI sets
`media.heroVideo`** — they are used as ambient/mood video in the shell, not per record.

---

## Local Experiences

All six live in `src/data/experiences.ts`. **Every one is `partnerStatus: "demo"` and
`verification: "unverified"`.** The type system makes this explicit:

```ts
type PartnerStatus =
  | "demo"       // Our own curated MVP content. Not a commercial agreement.
  | "confirmed"  // A partner who has agreed. Only set this when that is actually true.
```

**No record is `confirmed`. Do not claim a partnership.** A test enforces the discipline:
*"does not invent a person for a partner we have not met"* (`wallet.test.ts:77`).

### 1. `exp-cooking-mi-naima` — the flagship

| Field | Value |
|---|---|
| EN | *Cook Moroccan with مي نعيمة* |
| FR | *Cuisine marocaine avec مي نعيمة* |
| AR | *ورشة الطبخ المغربي مع مي نعيمة* |
| City | Casablanca |
| Kind | `food_experience` |
| Host | **مي نعيمة** (`displayName`: en/fr "Mi Naima", ar "مي نعيمة") · `local_host` |
| Duration | **105 min** |
| Price | 250 MAD (`approxPriceMad [250,250]`, `priceRange "150_300"`) |
| Reward | 80 coins (per-kind `food_experience`, no override) |
| **Discount** | **10%**, unlocked for **300 coins** |
| Environment | `indoor`, `walkingScore 1` |
| Booking | **required**, capacity 8 |
| Categories | food, culture, hidden_gems |
| Status | `open` · **demo / unverified** |
| Media | `/images/poi/cooking-mi-naima.webp` → **missing → Zellige (food motif)** |

### 2. `exp-leather-bag`

| Field | Value |
|---|---|
| EN | *Make Your Own Leather Bag* |
| FR | *Créez votre sac en cuir marocain* |
| AR | *اصنع حقيبتك الجلدية المغربية* |
| City | Casablanca · Kind | `workshop` |
| Host | *A local leather artisan* / *Un artisan maroquinier local* / *حرفي جلد محلي* · `artisan` |
| Duration | **75 min** |
| Price | 180 MAD (`150_300`) |
| Reward | **100 coins** (workshop rate) |
| **Discount** | **10%**, unlocked for **200 coins** |
| Environment | `indoor`, walk 1 · Booking **required**, capacity 6 |
| Categories | art_creative, culture, hidden_gems |
| Status | `open` · **demo / unverified** · Media **missing → Zellige (art motif)** |

### 3. `exp-habous-artisans`

| Field | Value |
|---|---|
| EN | *Meet the Habous Artisans* · FR *À la rencontre des artisans des Habous* · AR *لقاء حرفيي الأحباس* |
| City | Casablanca · Kind | `local_activity` |
| Host | *A neighbourhood guide* / *Un guide du quartier* / *مرشد من الحي* · `guide` |
| Duration | 60 min · Price 80 MAD (`60_150`) · Reward **50 coins** |
| Discount | **none** |
| Environment | `mixed`, walk 2 · Booking **not required**, capacity 10 |
| Categories | hidden_gems, culture, art_creative |
| Status | `open` · **demo / unverified** · Media **missing → Zellige (hidden_gems motif)** |

### 4. `exp-tea-ritual`

| Field | Value |
|---|---|
| EN | *The Moroccan Tea Ritual* · FR *Le rituel du thé marocain* · AR *طقوس الشاي المغربي* |
| City | Casablanca · Kind `food_experience` |
| Host | *A local host* / *Un hôte local* / *مضيف محلي* · `food` |
| Duration | 45 min · Price 60 MAD (`30_60`) · Reward **80 coins** |
| **Discount** | **20 MAD flat**, unlocked for **120 coins** |
| Environment | `indoor`, walk 1 · Booking not required, capacity 12 |
| Status | `open` · **demo / unverified** · Media **missing → Zellige (food motif)** |

### 5. `exp-pottery-eljadida`

| Field | Value |
|---|---|
| EN | *Throw a Pot by the Ocean* · FR *Tournez votre poterie face à l'océan* · AR *اصنع فخارك أمام المحيط* |
| City | **El Jadida** · Kind `workshop` |
| Host | *A local ceramicist* / *Un céramiste local* / *خزّاف محلي* · `artisan` |
| Duration | **90 min** · Price **140–200 MAD** (`150_300`) · Reward **100 coins** |
| Discount | **none** |
| Environment | `mixed`, walk 1 · Booking **required**, capacity 6 |
| Status | `open` · **demo / unverified** · Media **missing → Zellige (art motif)** |

### 6. `exp-oualidia-oysters`

| Field | Value |
|---|---|
| EN | *Oysters at the Lagoon* · FR *Dégustation d'huîtres à la lagune* · AR *تذوق المحار في البحيرة* |
| City | **Oualidia** · Kind `food_experience` |
| Host | *An oyster-farming cooperative* / *Une coopérative ostréicole* / *تعاونية لتربية المحار* · `cooperative` |
| Duration | 60 min · Price 120 MAD (`60_150`) · Reward **80 coins** |
| Discount | **none** |
| Environment | **`outdoor`**, walk 2 · Booking not required, capacity 15 |
| Status | **`seasonal`** · **demo / unverified** · Media **missing → Zellige (food motif)** |

### Confirmed/verified vs. curated MVP

| Class | Records |
|---|---|
| **Confirmed partnership** | **NONE** |
| **Curated MVP / demo content** | **All 6** |

Three of the six carry a named human role but only **one** carries a real personal name
(**مي نعيمة**). The rest use neutral roles precisely so the product does not invent people.
**Say "curated MVP content" to the jury. Never say "partner".**

---

## Four-Stop Engine

`src/lib/matching/engine.ts` — pure, synchronous, no network, no model.

### Selection, exactly as the code runs

**0. Filter.** `permanently_closed` and `temporarily_unavailable` are removed outright.

**1. Destination pool.** `destinationPool()` normalises the city name (NFD, diacritics
stripped) and matches bidirectional substrings. Falls back to `APP.defaultDestination`
("Casablanca") when there is no destination, and widens to the whole region **only** if the
named city has fewer than 4 POIs — *"a region-wide pool picks the four best POIs across
200 km of coast, which is a scoring win and a useless day."*

**2. Anchor.** The detected POI's coordinates if present, otherwise the centroid of the
pool's **places only**. Experiences are deliberately excluded from the centroid — curating
four workshops in one neighbourhood must not redefine where a city *is*.

**3. Curated route boost.** `curatedPoiIds()` picks **exactly one** route (never the union):
`route.city === destination` **and** every stated interest is in `route.interests`. Ties
break on summed curation priority. *Boosting all matching routes together simply restores
the original ranking — which is how this weight first came to do nothing.*

**4. Score every POI:**

| Signal | Weight |
|---|---|
| `priority × 5` | 5–25 |
| **curated route membership** | **+34** |
| `signature` | +6 |
| `hero` | +2 |
| **primary interest** (category index 0) | **+34** |
| **secondary interest** (index > 0) | **+20** |
| **experiential** (kind ≠ place) | **+7** *(deliberately small)* |
| budget fit | +12 / +8 / −24 … |
| walking `minimal` | `−(walkingScore−1) × 10` |
| walking `plenty` | `+(walkingScore−1) × 4` |
| `few_hours` | `−max(0, duration−60)/10` |
| **proximity** | `14 × exp(−metres / 6000)` |
| availability `unknown` / `seasonal` | −4 / −2 |
| `needs_verification` | −2 |

Sorted **score desc, then id asc** — equal scores never flip.

**5. Fill the four slots — the 2 + 1 + 1 pattern:**

```
slot 1,2  ranked[0], ranked[1]                      — strongly aligned
slot 3    curated signature ?? any signature ?? best remaining
          (claimed BEFORE the complementary slot — letting "complementary" run first
           consumed the signature POI and gave Casablanca two medinas and no Sacré-Cœur)
slot 4    curated remainder
          ?? MAKE or TASTE the day is missing, from the top-6 contenders
          ?? any unseen kind, from the top-6 contenders
          ?? an unseen category, from the top-6 contenders
          ?? best remaining
```

**6. Guarantee.** Two top-up loops — first the ranked pool, then the whole available region —
then `chosen.slice(0, TRIP_STOP_COUNT)`.

**Does it still guarantee EXACTLY 4 stops? YES.** Verified three ways:
- `experience-composition.test.ts`: *"still returns exactly four unique stops for every
  interest"* and *"for every city, including ones with no experiences"*
- 12 probe profiles run during this audit: **all returned exactly 4**, including the entirely
  empty profile
- `pnpm jury:smoke` TEST 4 and `pnpm jury:voice` both assert `stops === 4` on a live browser

**7. Narrative ordering.** `orderNarratively()` evaluates **all 24 permutations** exhaustively
(4 stops, so this is cheap and exact — no heuristic) against `PHASE_AFFINITY`:

| Category | morning | midday | afternoon | sunset |
|---|---|---|---|---|
| culture | 4 | 0 | 2 | 1 |
| food | −1 | **5** | 0 | −2 |
| coast_nature | 0 | 0 | 1 | **5** |
| hidden_gems | 2 | 0 | 4 | 0 |
| art_creative | 1 | 0 | 4 | 0 |
| activities | 0 | 1 | 3 | 2 |

Plus: sunset slot rewards `signature` (+3) and penalises `indoor` (−2); morning slot
penalises a POI that never opens before 11:00 (−4).

---

## Discover / Meet / Make / Taste

**Verdict: REAL ENGINE BEHAVIOUR, reinforced by a curated hero route.**

Not inferred from prompts — verified by running `match()` on the current dataset and by a
live browser run.

### The evidence

**Live, through the real UI** — `pnpm jury:wallet`, **22/22 PASS**:
```
exactly 4 stops — Meet the Habous Artisans → Cook Moroccan with مي نعيمة
                → Make Your Own Leather Bag → Mosquée Hassan II
day mixes places and experiences — local_activity, food_experience, workshop, place
has a hands-on workshop ✓   has a food experience ✓   has an iconic place ✓
workshop keeps its full duration — 75 min (base 75) ✓
```

**In the engine, from six different interest profiles** (probe run during this audit):

| Profile | Kinds produced |
|---|---|
| food + hidden_gems + art_creative | `local_activity, food_experience, workshop, place` ← **all four roles** |
| hidden_gems alone | `local_activity, food_experience, workshop, place` ← **all four roles** |
| food alone | `place, food_experience, workshop` |
| art_creative alone | `local_activity, place, workshop` |
| **empty profile** | `place, food_experience, workshop` |
| El Jadida + culture | `place, workshop` |
| Oualidia + coast + food | `place, food_experience` |

### The honest classification

| Aspect | Verdict |
|---|---|
| The engine can compose a mixed day **without any curated route** | **REAL** — `experience-composition.test.ts`: *"puts at least one experience in a day nobody curated"*, *"does not hand back four stops of the same kind"* |
| The **full four-role** DISCOVER→MEET→MAKE→TASTE day | **CURATED HERO ROUTE + real composition** — `route-casablanca-experience` names the four ids, and the +34 curated weight carries them; but the engine still scores each one and would substitute a closed, off-budget or badly-placed stop |
| Outside Casablanca | **PARTIAL** — El Jadida reaches 2 roles, Oualidia 2. There are not enough experiences elsewhere. |

**The `experiential` weight is only +7**, and that is deliberate and documented:
*"a bonus large enough to guarantee that outcome would also drag a traveller across the city
for a workshop they never asked for. Composition is expressed in the selection, where it can
be traded against geography."* The composition rule in slot 4 is what does the real work.

**What to tell the jury:** *"The engine composes a mixed day on its own, and for our flagship
Casablanca day we curated the four stops so the story lands every time."* That is true.
Claiming the four-role day emerges anywhere in the region without curation would not be.

---

## Curated Routes

**Seven routes in `src/data/base-routes.ts`.** *"These are foundations, not itineraries. The
trip engine personalises from them and must never return one raw."*

| id | City | Interests | POI ids | Composition |
|---|---|---|---|---|
| `route-casablanca-experience` | Casablanca | food, hidden_gems, art_creative | hassan-ii · exp-habous-artisans · exp-leather-bag · exp-cooking-mi-naima | **place + activity + workshop + food** ← the hero |
| `route-casablanca-signature` | Casablanca | culture, food, art_creative | habous · marche-central · sacre-coeur · hassan-ii | 4 places |
| `route-culture-heritage` | Casablanca | culture, art_creative, hidden_gems | ancienne-medina · boulevard-mohammed-v · place-mohammed-v · sacre-coeur · hassan-ii (5) | 4–5 places |
| `route-food-local-life` | Casablanca | food, culture, hidden_gems | marche-central · ancienne-medina · la-sqala · habous | 4 places |
| `route-coast-sunset` | Casablanca | coast_nature, food, activities | la-sqala · marina · corniche-ain-diab · plage-ain-diab | 4 places |
| `route-hidden-gems` | Casablanca | hidden_gems, art_creative, culture | fondation-slaoui · sacre-coeur · cinema-rialto · villa-des-arts · musee-judaisme (5) | 5 places |
| `route-best-of-region` | **Casablanca-Settat** | culture, coast_nature, hidden_gems | hassan-ii · azemmour-medina · cite-portugaise · oualidia-lagune · oualidia-oysters (5) | 5 places |

### When a route overrides matching

It **never overrides** — it **weights**. Membership adds **+34**, comparable to a primary
interest match (+34). The engine still scores every POI and can substitute a curated stop
that is closed, off-budget or badly placed. That is Q52's requirement ("never return a
template raw") satisfied by a weight rather than a shortcut.

There are **two** places curation is given priority over pure ranking, both documented:
1. The signature slot prefers a **curated** signature POI over any other signature POI —
   otherwise a food traveller's signature slot took a medina and the curated day lost its icon.
2. Slot 4 takes a remaining **curated** POI before composition — otherwise the signature
   Casablanca route lost Sacré-Cœur to whichever experience carried an unseen kind
   ("novelty quietly overruling a deliberate choice").

### The key question: does Casablanca still prefer four traditional places?

**YES — and this is correct, deliberate behaviour, not a bug.** Verified by running the
engine:

| Interests | Route chosen | Result |
|---|---|---|
| **culture + food** | `route-casablanca-signature` | Habous → Marché Central → Sacré-Cœur → **Hassan II** · **4 places, 0 experiences** |
| culture + food + **minimal walking** | `route-casablanca-signature` | **identical day** |
| **food + hidden_gems + art_creative** | `route-casablanca-experience` | artisans → cooking → leather → **Hassan II** · **3 experiences + 1 icon** |

The mechanism is a single deliberate line in `base-routes.ts`: `route-casablanca-experience`
**does not declare `"culture"`** in its interests, precisely so it *cannot* displace the
signature day for a culture+food traveller. The signature day is the **Less Walking demo**
and it stays exactly as it was.

**One observation worth knowing on stage:** adding **minimal walking** to culture+food does
**not** change which four stops are selected — the +34 curated weight dominates the walking
penalty. Less Walking still works, but it works by **converting legs to car**, not by
choosing different places. Demo it on `/trip` (77% less walking, ~42 min saved), not by
re-running onboarding.

---

## Scheduling

### The single shared visit-duration rule — the fix, verified

```ts
// src/lib/matching/engine.ts:505 — EXPORTED, and the only implementation
export function visitDurationMinutes(poi: POI, pace: TripPace | null): number {
  if (kindOf(poi) !== "place") return poi.baseDurationMinutes;   // ← appointments are fixed
  const multiplier = PACE_DURATION_MULTIPLIER[pace ?? "balanced"];
  return Math.max(15, Math.round((poi.baseDurationMinutes * multiplier) / 5) * 5);
}
```

**Pace stretches a visit; it does not shorten an appointment.**
*"A monument is as long as you want it to be… A 105-minute cooking class is 105 minutes for
everybody — applying the multiplier scheduled the next stop while the traveller was still
making the tajine, and the timeline said so."*

`src/lib/adaptation/shared.ts:visitMinutes()` **calls** this function rather than copying it.
That is the fix: *"When the rule lived here as an inline branch and in @/lib/adaptation/shared
as a copy, the copy was the old rule: Rainy Day could swap in the 90-minute pottery workshop
and hand an explorer 70 minutes of it. One function, so the two can never disagree again."*

`PACE_DURATION_MULTIPLIER`: `relaxed 1.25` · `balanced 1.0` · `explorer 0.8`.

### Verification of the two required guarantees

**"A 105-minute cooking workshop cannot become 70 minutes" — CONFIRMED.**

| Check | Result |
|---|---|
| Probe: explorer pace (0.8×) on the experience day | `exp-cooking-mi-naima` = **105 min** (the *place*, Hassan II, correctly dropped 90→70) |
| `experience-schedules.test.ts` | *"gives every experience its full booked duration at every pace"* ✅ |
| | *"leaves the cooking class its 105 minutes when the day is made shorter"* ✅ |
| | *"never shortens an experiential stop, whichever adaptation runs"* ✅ |
| | *"agrees with the adapters' own helper — one rule, not two copies"* ✅ |
| `experience-composition.test.ts` | *"gives the 105-minute cooking class its full time"*, *"does not let pace shrink a booked experience"* ✅ |
| **Live** — `pnpm jury:wallet` | *"workshop keeps its full duration — 75 min (base 75)"* ✅ |

**"Leather/pottery workshops cannot be shortened by pace or adaptation" — CONFIRMED.**
`less-time.ts` explicitly guards: `if (isExperience(stop.poi)) return stop;` — with the
reason in the source: *"You can leave a mosque early; you cannot leave a cooking class early,
because the tajine is not done and the host is still teaching. Trimming by TRIM_FACTOR turned
the 105-minute class into 70 minutes and the leather workshop into 50 — an appointment the
traveller could not keep, printed as though they could."*

### The rest of scheduling

| Element | Behaviour |
|---|---|
| **Start time** | `09:30` default. With a live clock: rounded up to the next 30 min, capped at `18:00`. |
| **Arrival** | `ceil((cursor + legMinutes) / 5) * 5` — 5-minute grain |
| **Transport time** | `estimateLeg()` — haversine × street-detour factor; walk vs. car decided at `WALKING_COMFORT_METERS = 2600 m` |
| **Speeds** | walking 4.6 km/h · car 22 km/h |
| **Clock** | `toClock()` **clamps at 23:30, never wraps** — an overrunning day shows 23:30, never 01:15. The adapters use an identical `toClock`, "matching the engine, so the two can never disagree." |
| **Opening hours** | **Supported but only as an ordering signal**: `earliestOpenMinutes()` penalises a morning slot for a POI that never opens before 11:00 (−4). There is **no hard feasibility check** — the schedule does not refuse to place a stop outside its hours. 19 of 36 records carry hours. |
| **Workshop durations** | Verbatim `baseDurationMinutes`: cooking 105 · pottery 90 · leather 75 · oysters 60 · artisans 60 · tea 45 |
| **Reason line** | Experiential stops get a kind-specific line (`KIND_REASONS`); places get a slot line (`SLOT_REASONS`). Both deterministic and localised — *"the day is already decided by the time this runs, so there is nothing for a model to add."* |

**No two stops overlap** — enforced and tested (`experience-schedules.test.ts`: *"never
overlaps two stops, whichever adaptation runs"*).

---

## Routing + Map

### Routing

| Aspect | Detail |
|---|---|
| Provider | **OSRM**, public demo server `https://router.project-osrm.org` (`ROUTING_BASE_URL`) |
| Key | None required |
| Endpoint | `POST /api/route` — batched, Zod-validated (lat −90..90, lng −180..180, mode enum, 1..9 segments) |
| Profiles | `walking → foot`, `car → driving` |
| Timeout | `TIMEOUTS.routingSegmentMs = 4000 ms` per segment |
| **Fallback** | `fallbackSegment()` — haversine + average speed, `geometry: null`, `source: "fallback"`. **Never throws, never returns a short array.** |
| Walk/car decision | Made **locally** by `estimateLeg()` against `WALKING_COMFORT_METERS`, not by the provider |

**Critically: OSRM's distances and durations are discarded.** Only **geometry** is used.
The reason is in the source: *"the public OSRM server answers with driving data for every
profile, so trusting them would put a 5-minute label on a half-hour walk."* All headline
numbers come from `calculateMetrics()` over the local estimates — *"or the before/after
headline on stage would lie."*

### Map

| Aspect | Detail |
|---|---|
| Library | **MapLibre GL** ^6.6.0 |
| Style | `https://tiles.openfreemap.org/styles/dark` (`NEXT_PUBLIC_MAP_STYLE_URL`) |
| Default | centre `33.5899, −7.6039`, zoom 12, `fitPadding: 64` |
| Worker | `setWorkerUrl("/maplibre-gl-worker.mjs")` — Turbopack does not emit MapLibre's bundled worker, so `scripts/sync-map-worker.mjs` copies it into `public/` on `predev`/`prebuild` |
| Pins | Custom `HTMLButtonElement` markers, kept in a `Map<stopId, element>` ref |
| Route line | GeoJSON `LineString`; **`geometry: null` is legal and means "straight line"** — the routing-failure path. Failing to add the line *"can never cost us the four markers."* |
| Sync | `activeStopId` flows both ways: tap a pin → `onSelectStop` → timeline scrolls; tap a timeline row → pin highlights. **Jury smoke TEST 12 verifies this live.** |
| `fitBounds` | `LngLatBounds` over all four stops with padding |
| `PlaceSheet` | `vaul` bottom sheet — story, tip, save ♥, Navigate → |
| **External navigation** | `navigationUrl()` — Apple Maps for iPhone/iPad/Mac (`daddr` + `dirflg=d\|w`), Google Maps for everything else (`api=1&destination=&travelmode=`). 3 unit tests. |

---

## Adapt My Day

All four modes are **implemented and reachable** from `AdaptSheet` via `ADAPTATION_TYPES`.
Every adapter is wrapped once in `adapt()` so a throw can never reach the stage — the day the
user is looking at is returned unchanged instead.

### Classification — verified by running each adapter on two real days

| Mode | Verdict | Algorithm |
|---|---|---|
| **Less Walking** | **REAL** | Any `walking` segment > `LESS_WALKING_SEGMENT_METERS` (1800 m) → car. Deliberately **lower** than the 2600 m planning threshold: *"one number cannot be both 'how far we are happy to walk when planning' and 'how far is too far once the traveller says their feet hurt'. Sharing them made Less Walking a no-op."* Car segment = distance × 1.25 road detour, rounded to 500 m, + 3 min hailing/parking. |
| **Less Time** | **REAL** | Two levers. (1) Trim each **place** visit to `max(25, round(base × 0.65 / 5) × 5)` — **experiences are skipped entirely**. (2) Long walks → car. Then `reschedule()`. Refuses below 20 min saved. |
| **Spend Less** | **REAL** | Finds the single priciest stop by `poiCeilingMad`, replaces it with the highest-priority same-city candidate that **shares a category** and is ≥ 20 MAD cheaper. Rebuilds segments and re-times. Refuses below 20 MAD saved. |
| **Rainy Day** | **REAL** | Swaps only `outdoor` stops (leaves `mixed` alone — a covered market already works in the rain) for `indoor` POIs in the same city, preferring a shared category, with a **60 MAD price guard**: *"Without this it swapped a free medina walk for a 250 MAD cooking class and called it a rainy-day plan — the traveller asked for a roof, not a spending decision."* |

**None is a no-op.** Measured on the two demo days:

| Day | less_walking | less_time | spend_less | rainy_day |
|---|---|---|---|---|
| **Signature culture** (4 places) | ✅ *77% less walking · ~42 min saved* | ✅ *2 h 22 shorter · done by 13:40* | ✅ *60 MAD less* | ✅ *1 of 4 moved indoors* |
| **Experience day** (3 experiences) | ⏸ *"already easy on your feet"* | ✅ *30 min shorter · done by 15:10* | ✅ *250 MAD less* | ⏸ *"every stop already works in the rain"* |

The two "not applied" results are **correct refusals with an honest reason**, not failures —
the experience day genuinely has almost no walking and its stops are indoor/mixed.

**Experiential stops retain valid duration under every adaptation — CONFIRMED.** Probe:
`exp-cooking-mi-naima` stayed at 105 min and `exp-leather-bag` at 75 min through every mode
that touched the day. Enforced by `visitMinutes()` → `visitDurationMinutes()` and by
`less-time.ts`'s explicit `isExperience` guard. Tested in `experience-schedules.test.ts`.

### ⚠️ Can Spend Less still replace an experience and lose the coins/offer?

**YES. This is confirmed, reproducible, and is the highest-value P1 in this document.**

Measured this session on the experience day:

```
BEFORE  artisans(50c) → cooking مي نعيمة(80c, 10% off @300) → leather(100c) → Hassan II(20c)
Spend Less applied=true
        "250 MAD less · Ancienne Médina instead"
AFTER   artisans(50c) → Ancienne Médina(20c) → leather(100c) → Hassan II(20c)
        LOST: exp-cooking-mi-naima     GAINED: poi-ancienne-medina
        experiences: 3 → 2
```

**What the traveller loses:** 60 coins of earning potential, and the **only 10%-off partner
offer in the day**. The flagship stop — the one with a named local host — is the very stop
Spend Less targets, because it is the most expensive.

`candidatesFor()` in `shared.ts` filters on city, not-already-used and availability. It has
**no `kind` filter and no reward/offer awareness.** `sharesCategory` is satisfied because
both carry `food`/`culture`.

**Do not press Spend Less on the experience day in front of a jury.** It works correctly as a
cost optimiser and tells the truth about the money — but it quietly reverses the product's
own thesis on stage.

---

## Wallet / Coins / Discounts

### State

```ts
interface Wallet {
  balance: number;
  lifetimeEarned: number;              // only ever increases
  transactions: WalletTransaction[];   // the ledger — the record
  redeemed: RedeemedOffer[];           // { poiId, coinsSpent, timestamp }
}
```
Persisted at `localStorage["siyaha:v1:wallet"]`, guarded on read, guarded on write
(quota/private mode failures are swallowed — *"persistence is a convenience, never a
requirement"*).

### Earning rules — from `src/config/rewards.ts`, current values

| Event | Coins | Transaction type |
|---|---|---|
| Visit a **place** | **20** | `visit_reward` |
| Complete a **local_activity** | **50** | `activity_reward` |
| Complete a **workshop** | **100** | `activity_reward` |
| Complete a **food_experience** | **80** | `activity_reward` |
| **Finish all four stops** | **+100** | `trip_bonus` |
| Unlock an offer | **−`minimumCoins`** | `discount_redemption` |

`ExperienceMeta.rewardCoins` can override the per-kind default. **No current record uses it** —
every one takes the per-kind rate.

**Live arithmetic check** (`pnpm jury:wallet`, on the real experience day):
`50 + 80 + 100 + 20 + 100 = 350` — asserted and **PASS**, with **5 transactions** (4 stops +
bonus). After unlocking the leather-bag offer: `350 − 120 = 230`. *(The wallet flow unlocks
the offer whose `minimumCoins` the balance can cover.)*

`MAX_REASONABLE_BALANCE = 1_000_000` guards a corrupt or hand-edited stored value.

---

## Duplicate Reward Prevention

**Verified: a traveller cannot farm coins by pressing "Visited" repeatedly.**

The design rests on two rules, both in `src/lib/wallet/index.ts`:

**1. A transaction id is derived, never generated.**
```
visit:<tripId>:<poiId>     bonus:<tripId>     redeem:<poiId>
```
The same string every time. There are **no counters and no flags** to get out of step —
the ledger *is* the record.

**2. Credit is refused, not thrown.**
```ts
export function applyTransaction(wallet, transaction) {
  if (hasTransaction(wallet, transaction.id)) return wallet;   // duplicate → unchanged
  const balance = wallet.balance + transaction.amount;
  if (balance < 0 || balance > MAX_REASONABLE_BALANCE) return wallet;
  return { balance, lifetimeEarned: …, transactions: [...], redeemed: … };
}
```
*"Marking a stop visited must never fail because of the reward system."*

**Visited ids and passport stamps** are separately de-duplicated: `markVisited` checks
`passport.stamps.some(s => s.poiId === visited.poiId)` before adding a stamp, so a POI
visited on two different days is stamped once — while the *coins* correctly credit twice
(different `tripId` → different transaction id). There is a test for exactly this:
*"does not confuse the same stop on two different days."*

**Refresh behaviour.** The wallet is written to `localStorage` on every change and reloaded
by `hydrate()`. Because ids are derived from persisted `tripId` + `poiId`, a refresh cannot
re-mint anything — the reloaded ledger already contains the ids.

**Verified by tests — `src/lib/wallet/wallet.test.ts` (19 tests):**
- *"credits a visit once and only once"*
- *"pays the day bonus once per trip"*
- **_"cannot be farmed by replaying a whole day"_**
- *"builds a stable id from the trip and the POI"*
- *"refuses a transaction that would drive the balance negative"*
- *"does not confuse the same stop on two different days"*

**Verified live — `pnpm jury:wallet`:**
- *"one transaction per stop plus the bonus — 5 transactions"* ✅
- **_"re-marking visited earns nothing — 350 → 350"_** ✅
- *"balance survives a refresh — 350"* ✅

---

## Discounts

| Capability | Status |
|---|---|
| **Percentage** discount | ✅ `{ percent: 10, minimumCoins: 300 }` — cooking, leather |
| **Fixed MAD** discount | ✅ `{ amountMAD: 20, minimumCoins: 120 }` — tea ritual |
| Both at once | ❌ by type contract — *"percentage or flat, never both"* |
| Minimum coins | ✅ `discount.minimumCoins`, checked by `canRedeem()` |
| Unlocking | ✅ `redeem()` → debit + `redeemed[]` entry |
| Persistence | ✅ `storage.saveWallet()` on success |
| **Double-redemption prevention** | ✅ **two independent guards** |

**The two guards:**
1. `isRedeemed(wallet, poiId)` → `canRedeem` returns `"already_redeemed"`
2. `redemptionTransactionId(poiId) = "redeem:<poiId>"` — a derived id `applyTransaction`
   already holds

**Price arithmetic** — `discountedPriceMad()` is clamped: *"a partner offering 500 MAD off a
200 MAD workshop gets a free workshop, not a refund"* (`Math.max(0, …)`).

**Failure modes** are returned, never thrown: `"no_offer" | "already_redeemed" |
"insufficient_balance"`, each with its own localised message.

**Live — `pnpm jury:wallet`:** *"coins deducted on unlock — 350 → 230"*, *"offer marked
unlocked"*, **_"the same offer cannot be unlocked twice"_** ✅

### ⚠️ Framing — this must be said correctly on stage

> **Khotwa Coins are a LOYALTY LEDGER.**
>
> **NOT banking. NOT crypto. NOT payment settlement.**

The source states it plainly (`src/config/rewards.ts`): *"A rewards ledger, not a wallet: no
money, no payment, no settlement. Coins are earned by finishing what you set out to do that
day, and spent to unlock a partner's offer. The partner is paid in cash, in person, as they
always were."*

The UI says the same thing to the traveller — `wallet.unlockedBody`:
*"Show this at the door — you settle with the host directly."* (localised EN/FR/AR).

Unlocking **unlocks**; it does not pay. Nobody is charged. Nothing is settled.

---

## Passport / Saved / Visited

Four distinct concepts, four distinct stores, four distinct persistence keys.

| Concept | What it is | Shape | Storage key | Written when |
|---|---|---|---|---|
| **Visited** | Per-stop state **within the current trip** | `TripStop.visitState: "upcoming" \| "current" \| "visited"` — lives inside `Trip` | `siyaha:v1:trip` | "Visited" tapped in `/experience` |
| **Passport** | A permanent, cross-trip record of places you have *been* | `{ stamps: [{ poiId, poiName, city, visitedAt, tripId, imageUrl }], updatedAt }` | `siyaha:v1:passport` | On first visit of that `poiId` (de-duplicated) |
| **Saved** | Places you *want* — an intent list, not a history | `string[]` of POI ids | `siyaha:v1:saved` | ♥ toggled on `PlaceSheet` / Explore |
| **Wallet** | The rewards ledger | `{ balance, lifetimeEarned, transactions[], redeemed[] }` | `siyaha:v1:wallet` | Any credit, bonus or redemption |

**The distinctions that matter:**
- **Visited is trip-scoped and resets with a new trip. Passport is forever.**
- **Passport is a place you *went*. Saved is a place you *want*.** *"The heart on a place
  sheet used to be local component state: it filled in, then the sheet closed and the choice
  was gone, while the Saved screen promised 'places you keep from Explore land here'."*
- **Passport de-duplicates by `poiId`; the Wallet de-duplicates by `(tripId, poiId)`.**
  Visit Hassan II on two different days → **one** stamp, **two** credits. Correct, and tested.

`resetAll()` clears trip, profile, stamps, saved and wallet. **Locale survives** — the one
thing a "reset my data" should not undo.

**One cosmetic note:** `stamp.imageUrl` is `poi.media.fallbackImage` — the shared *category*
photo, not the POI's own hero. So a Passport of six culture stamps shows the same photograph
six times. `ZelligeTile` does not apply here (the fallback always resolves). Listed as P2-3.

---

## Local Economic Impact

This is the product's thesis, and it is worth being precise about which parts are real.

**Implemented in code:**
- `ExperienceMeta.supportsLocalBusiness: boolean` — **all 6 experiences set it `true`**
- `PartnerType`: `artisan` · `local_host` · `food` · `guide` · `cooperative` — the taxonomy
  of who receives the value. Current spread: 2 artisan, 1 local_host, 1 food, 1 guide,
  1 cooperative.
- Coin rates deliberately favour human contact: a **workshop pays 5× a monument**
  (100 vs. 20), a food experience 4×, a local activity 2.5×.
- Discounts route the traveller to a **specific named local business**, paid **directly, in
  cash, in person**. Khotwa takes no cut and processes no money.
- The engine's slot-4 composition actively **prefers** MAKE and TASTE stops the day is
  missing — attention is steered toward local actors by construction, not by copy.

**Not implemented — do not claim:**
- No measurement of economic impact. No MAD-routed-to-locals figure exists anywhere.
- No revenue share, no commission, no settlement, no partner payout.
- No partner has agreed to anything. All six are `partnerStatus: "demo"`.
- No partner-side interface, inventory or capacity system.

**The defensible claim:** *"The mechanism that directs attention and spending toward local
artisans, hosts and cooperatives is built and working. The partnerships themselves are our
next step."*

---

## Media / Zellige

### The system

| Layer | Source | Count |
|---|---|---|
| Real POI photography | `public/images/poi/*.webp` | **6** |
| Category fallbacks | `public/images/vibes/*.webp` | 6 (culture, food, art, coast, adventure, hidden-gems) |
| Preset/popular cards | `public/images/popular/*.webp` | 3 |
| Videos | `public/videos/*.mp4` | 3 — `hero`, `corniche`, `habous` (ambient; **no POI sets `heroVideo`**) |
| Last resort | `public/images/placeholder.svg` | 1 |
| **Ornament** | `ZelligeTile` (generated SVG) | **used by 30 records** |

### `MediaCard` — one image element in the whole product

```
src → (404) → ZelligeTile (if ornamentSeed set)
            → fallbackSrc → LAST_RESORT
```

Failure is tracked as a **set of failed URLs**, not an index: *"a new `src` is simply not in
the set yet, so the fallback chain resets itself without an effect."*

The ornament is reached **only once `src` itself has failed**, and it **replaces the shared
category photo rather than following it** — so there is no flash of a borrowed image,
because the chain never advances to it.

Also handled: `unoptimized` for blob/data URLs (an uploaded screenshot) and for SVGs — the
Next optimizer cannot improve either and would 400 on the blob.

### `ZelligeTile` — `src/components/zellige-tile.tsx`

**Why it exists, in the file's own words:** *"A borrowed photograph is a small lie: it shows
a market that is not this market. An ornament is honest — it is visibly decoration, it never
claims to be the place — and it is already the product's own language."*

**Deterministic, two axes, no randomness:**
- The **motif** comes from the **category**, so one shelf reads as one family
- **Ground, tone, stroke weight, density and rotation** come from an **FNV-1a hash of the
  slug**, so no two records match and *"the same record draws the same tile on every render
  and on every machine"*

**The six motifs**, each a real zellige construction in a 60×60 tile:

| Category | Motif |
|---|---|
| `culture` | the **khatim** — the eight-point star zellige is known by |
| `food` | interlaced squares on a grid — a tiled floor, a market table |
| `coast_nature` | open waves — *"the one motif that is not closed geometry, because a coast is not"* |
| `hidden_gems` | a lattice with a held centre — *"the moucharabieh you look through, not at"* |
| `art_creative` | the pointed arch repeated — the product's own frame, from `archClip` |
| `activities` | a path crossing a field — *"the only motif that reads as movement"* |

Variation pools: 3 grounds (`bg-surface`, `bg-plum`, `bg-surface-muted`), 3 tones
(`text-primary/25–35`), 3 weights (1 / 1.25 / 1.5), 3 densities (0.85 / 1 / 1.2),
4 rotations (0° / 15° / 30° / 45°) — **324 distinct combinations** across 30 records.

**`useId()` for the pattern id** — and the reason is load-bearing: *"Explore renders the same
POI in more than one shelf, and two `<pattern id="zellige-x">` in one document is invalid
HTML — the second `url(#…)` silently resolves to the first."* Per-**instance**, not per-seed.
Stable across hydration.

**Accessibility:** the wrapper is `aria-hidden`, the `<svg>` is `focusable="false"`. It is
decoration and is announced as nothing. The card's real `alt` text sits on the `Image`
element it replaced.

**Self-retiring:** *"dropping `public/images/poi/<slug>.webp` on disk removes it with no code
change."*

### Count of records currently using the Zellige fallback

# **30 of 36.**

Only these six have a real photograph: `poi-hassan-ii`, `poi-habous`, `poi-marche-central`,
`poi-sacre-coeur`, `poi-ancienne-medina`, `poi-corniche-ain-diab`.

**Every stop of the signature Casablanca day has a real photo. Every experience does not.**

---

## Localization

### Supported languages: **EN · FR · AR**

**Key parity, measured this session by flattening all three message trees:**

| Locale | Keys | Gap |
|---|---|---|
| **EN** (source of truth) | **334** | — |
| **AR** | **334** | **0 missing · 0 untranslated** |
| **FR** | **332** | 2 missing |

The two FR gaps are `common.appName` ("Khotwa") and `common.mad` ("MAD") — **brand and
currency invariants, correctly not translated.** `t()` falls back to EN, so nothing breaks.

Ten FR values are identical to EN, and all ten are legitimately identical French words:
*Inspiration, Culture, Budget, Premium, Distance, Casablanca-Settat*, etc.

**Zero AR strings are untranslated.** That is unusually complete.

### RTL

`direction(locale)` returns `"rtl"` for `ar`. Applied by `StoreHydration`:
```ts
document.documentElement.lang = locale;
document.documentElement.dir  = direction(locale);
```
`src/app/layout.tsx` ships `lang="en" dir="ltr"` as the SSR default and the client corrects
it on hydration. Tailwind `rtl:` variants are used at 9 sites (chevrons, arrows).

**Verified live:** `pnpm jury:smoke` TEST 15 — *"Arabic mode does not break navigation"* ✅

### Localised content

| Content | EN | FR | AR |
|---|---|---|---|
| UI strings | ✅ 334 | ✅ 332 | ✅ 334 |
| Wallet strings (23 keys) | ✅ | ✅ | ✅ |
| Experience names | ✅ | ✅ | ✅ |
| **Arabic host names** | ✅ | `مي نعيمة` kept in Arabic script inside the FR name — correct, a person's name is not translated | ✅ |
| POI cultural story + tip | ✅ | ✅ | ✅ |
| Adaptation headlines | ✅ | ✅ | ✅ |
| Slot / kind reasons | ✅ | ✅ | ✅ |

**Numbers and units.** Interpolated (`{count}`, `{price}`) into localised templates —
`ar: "{count} عملة"`, `"{price} درهم"`. Western digits are used throughout in AR (not
Eastern Arabic numerals). That is a defensible modern-Moroccan convention, not a gap.

### Existing localization gaps (reporting only — no new languages recommended)

1. `common.appName` and `common.mad` absent from FR (intentional, falls back).
2. `cultural.audio` is typed `Partial<Record<Locale, string>>` but **no POI ships any audio**
   for any locale — the narration feature is unpopulated in all three languages.
3. `<html>` ships `lang="en" dir="ltr"` from the server and is corrected client-side, so an
   Arabic user sees one frame of LTR before hydration.
4. `LOCALE_LABEL` is complete; no gap.

---

## State / Persistence

**Zustand store** — `src/lib/store/index.ts`, one flat store, no slices.

```
hydrated · locale · profile · trip · processing · mode · activeStopId
adaptation · tripBeforeAdaptation · passport · savedPoiIds · wallet · lastReward
```

**Actions:** `hydrate` · `setLocale` · `patchProfile` · `resetProfile` · `resetAll` ·
`setTrip` · `setProcessing` · `setActiveStop` · `startTrip` · `endTrip` · `applyAdaptation` ·
`revertAdaptation` · `markVisited` · `toggleSaved` · `redeem` · `clearReward`

**Persistence is explicit, not middleware.** `src/lib/storage/index.ts` is *"the only place in
the app that touches localStorage."* Every read is guarded by a shape guard and returns
`null` on corruption — never throws. Writes swallow quota/private-mode errors.

**Shape guards** are deliberately shallow — *"this is our own data, only corruption matters."*
`isTrip` notably asserts `stops.length === TRIP_STOP_COUNT`, so a stored trip that is not
four stops is discarded rather than rendered.

### ⚠️ Legacy `siyaha:*` storage names — still present

```ts
const STORAGE_VERSION = "v1";
const PREFIX = `siyaha:${STORAGE_VERSION}:`;
```

**All six keys still carry the pre-rebrand `siyaha:` namespace:**
`siyaha:v1:trip` · `siyaha:v1:passport` · `siyaha:v1:profile` · `siyaha:v1:locale` ·
`siyaha:v1:saved` · `siyaha:v1:wallet`

Also: `package.json` still declares `"name": "siyaha"`, and one source comment in
`src/lib/routing/navigation.ts` still reads *"Siyaha has no turn-by-turn"*.

**Functionally harmless** — but note that **all three jury scripts read these key names
directly** (e.g. `localStorage.getItem('siyaha:v1:wallet')`). Renaming the prefix without
updating `scripts/jury/*.mjs` would break the wallet and smoke runs. Listed as **P2-2**.

---

## PWA

| Element | Status |
|---|---|
| **Manifest** | ✅ `src/app/manifest.ts` → `/manifest.webmanifest`. `name: "Khotwa — Smart Tourism"`, `short_name: "Khotwa"`, `display: "standalone"`, `orientation: "portrait"`, `background_color: "#0d0d0d"`, `theme_color: "#52d68a"` |
| **Icons** | ⚠️ **SVG only** — `/icons/khotwa.svg` at `sizes: "any"` for both `any` and `maskable` purposes. **No PNG 192×192 or 512×512.** iOS in particular does not reliably accept an SVG-only icon set for home-screen install. |
| **Service worker** | ❌ **None.** No `public/sw.js`, no `next-pwa`, no registration anywhere. |
| **Offline behaviour** | ❌ **None.** The app does not work offline. |
| **Installability** | ⚠️ Partial — manifest + HTTPS would satisfy Chrome; the SVG-only icons and missing SW weaken it. |

**What *is* resilient without network** (which is what actually matters for the demo):
the full 36-record dataset, all seven curated routes, the matching engine, the scheduler, all
four adaptations, the wallet, and the golden trip fixture are **all bundled client-side**.
A complete four-stop day is produced with **zero network calls**. Only the map tiles, the OSRM
geometry, the weather chip and the AI understanding need the internet — and every one of them
has a documented fallback.

**So: Khotwa is a mobile-shaped web app with a manifest, not a true offline PWA.** Say the
former.

---

## Security

| # | Surface | Finding | Classification |
|---|---|---|---|
| 1 | **Gemini key** | Server-only (`import "server-only"` in `config/env.ts` — importing it client-side is a **build error**). Read via getter, never snapshotted. Never in a response. Redacted from `/test-ai` error strings by `redact()`, which also strips `key=` from any URL. | ✅ **SAFE** |
| 2 | **Groq key** | Same pattern, same file. | ✅ **SAFE** |
| 3 | **NEXT_PUBLIC secrets** | Only two exist: `NEXT_PUBLIC_MAP_STYLE_URL` and `NEXT_PUBLIC_APP_URL`. **Neither is a secret.** | ✅ **SAFE** |
| 4 | **`.env` hygiene** | `.gitignore` has `.env*` with `!.env.example`. `.env.example` contains only empty keys. `.env.local` exists locally and is ignored. | ✅ **SAFE** |
| 5 | **MoulSot** | No key at all — a public HF Space. Audio is uploaded to a **third party**. Bounded at 45 s. Nothing else is sent. | ⚠️ **DEMO ACCEPTABLE** — but note publicly that voice audio leaves your infrastructure. |
| 6 | **SSRF — private IPs** | ❌ **No blocking.** `readMetadata()` will fetch `http://169.254.169.254/`, `http://192.168.x.x/`, `http://localhost:*`. Blind (only OG title/description returned), bounded (3 s, 2 MB). | 🔴 **NEEDS HARDENING** |
| 7 | **SSRF — redirects** | ❌ `redirect: "follow"` with no post-redirect revalidation, in both `readMetadata()` and `fetchRemoteImage()`. A public URL that 302s to metadata is followed. | 🔴 **NEEDS HARDENING** |
| 8 | **URL scheme** | ✅ `http`/`https` only. `mailto:` correctly rejected rather than prefixed into a fetchable URL. `fetchRemoteImage` is **https-only**. | ✅ **SAFE** |
| 9 | **Upload size** | ✅ 8 MB, checked on `File.size` **and** on decoded base64 length **and** on actual received bytes for remote images. | ✅ **SAFE** |
| 10 | **MIME** | ✅ Allowlists — images `jpeg/png/webp/heic`, audio `webm/mp4/mpeg/wav`. Codec params stripped. Remote thumbnails re-checked against the same list. | ✅ **SAFE** |
| 11 | **Zod on API schemas** | ✅ `/api/route` fully validated (rejects 400). ✅ `/api/extract` and `/api/analyze` validate the **model's** output via `tripIntentDraftSchema`, which `.catch()`es every field and **never throws** — an invalid draft becomes an empty draft. ⚠️ Their **request** bodies are hand-parsed (`asString`, typeof checks) rather than Zod-validated — adequate, since every field is treated as untrusted, but less uniform. | ✅ **SAFE** |
| 12 | **Text limits** | ✅ Composer `MAX_TEXT = 200`. Draft caps: interests 3, constraints 6, candidates 5, visualClues 8. YouTube description sliced to 1200. Page head capped at 2 MB. | ✅ **SAFE** |
| 13 | **`/test-ai` exposure** | ❌ `/test-ai`, `/test-ai-darija` and `/api/test-ai/{status,intent,audio,translate}` are in the **production build**, with **no `NODE_ENV` guard, no auth and no middleware**. `/api/test-ai/audio` accepts **20 MB** uploads (2.5× the production limit) and spends the Gemini key. Anyone reaching a deployed URL can drain the quota. | 🔴 **NEEDS HARDENING** (localhost demo: **DEMO ACCEPTABLE**) |
| 14 | **Timeouts** | ✅ Every external call bounded: image 8 s, extraction 8 s, transcription 8 s, **Darija 45 s**, social 3 s, routing 4 s, weather 2.5 s, generation ceiling 10 s. Built on `AbortSignal.timeout` + `AbortSignal.any` — no leaked timers. | ✅ **SAFE** |
| 15 | **Rate limiting** | ❌ **None anywhere.** No middleware, no per-IP counter, no quota guard on any route. | 🔴 **NEEDS HARDENING** (deploy) / ⚠️ **DEMO ACCEPTABLE** (localhost) |
| 16 | **Dev trace leakage** | ✅ `/api/extract` returns `trace` **only when `NODE_ENV !== "production"`**, and the trace carries no key, no header and no raw provider response. | ✅ **SAFE** |
| 17 | **Prompt injection** | ⚠️ A crafted OG title or transcript reaches the Gemini prompt. Blast radius is genuinely small: the model can only return enum values and free text, every enum is re-validated locally, and **the model can never return a POI id, coordinate, price or itinerary** — grounding is local. Worst case: a wrong city or interest, which the traveller then corrects on the confirmation screen. | ⚠️ **DEMO ACCEPTABLE** — the architecture is the mitigation |

**P0 security issues: none.** Nothing here can corrupt data, leak a key, or crash the demo.

---

## Fallback Matrix

Read from the current code. Every row is what actually happens.

| Failure | Current behaviour | Traveller sees |
|---|---|---|
| **Image AI fails / no key** | `/api/analyze` returns **200** `{ ok, degraded:true, result: EMPTY_ANALYSIS, draft }`. Composer's `goldenRecognition()` resolves to the golden Casablanca profile with `confidence: null`. | The reveal, with **no match score** (never a fake number). Flow continues. |
| **MoulSot fails / cold / times out** | `orFallback` → `null` → next engine (Groq) is tried. | Nothing, if Groq answers. |
| **Groq fails / no key** | `orFallback` → `null` → next engine (MoulSot) is tried. | Nothing, if MoulSot answers. |
| **Both STT engines fail** | `/api/transcribe` returns **200** `{ ok:true, degraded:true, text:"" }`. | One line: *"Voice didn't work — type it instead."* **CTA never blocked.** |
| **Gemini extraction fails / no key** | `/api/extract` falls to `draftFromLocalText()` / `draftFromUrlMetadata()` — local keyword pass, `degraded: true`, **confidence capped at 0.45**. | Fewer prefilled chips; they confirm more by hand. |
| **TikTok oEmbed fails** | `attempt()` → `null` → OpenGraph branch → `base(url)` (`platform_only`). | The link is accepted; understanding leans on whatever text exists. |
| **YouTube API fails / no key** | Falls to OpenGraph, streaming past 256 KB of head script. | Usually still gets title + thumbnail. |
| **Generic URL fails** | Two user agents tried, then `base(url)` → `provider: "platform_only"`. | Link accepted, no enrichment. |
| **Unparseable URL** | `provider: "invalid_url"` — *"the caller's cue to ask rather than to guess."* | Inline invalid-link state. |
| **Routing (OSRM) fails** | `fallbackSegment()` — haversine + average speed, **`geometry: null`**. Never a short array. | Map draws **straight lines** between pins. A supported look. |
| **Weather fails** | `/api/weather` returns **204**. | The chip is simply **absent**. No placeholder, no error. |
| **Missing photo (30 of 36)** | `MediaCard` `onError` → `ZelligeTile(slug, category)`. | A deterministic zellige ornament. Never a broken image, never a borrowed photo. |
| **Audio narration missing** | `cultural.audio` is optional and **unset on all 36**. | No audio control is rendered. |
| **Trip generation throws** | `build-trip.ts` falls to `cloneGoldenTrip()` **carrying the user's own profile**. | A complete Casablanca day. |
| **Store empty on `/trip`** | Page falls to `cloneGoldenTrip()`. | The full golden day — a jury clicking around after the demo never sees an empty screen. |
| **Adapter throws** | `adapt()` catches → `noChange(type, trip)`. | The day is returned unchanged with an honest reason line. |
| **`localStorage` unavailable** | `available()` returns false; every read → `null`, every write → no-op. | Everything works; nothing survives a refresh. |
| **Corrupt stored trip** | `isTrip()` guard rejects (including wrong stop count). | Treated as no trip → golden fallback. |
| **Model returns garbage JSON** | `parseJsonLoosely` strips fences and brace-scans; then `parseTripIntentDraft` `.catch()`es every field. **Never throws.** | An empty draft — they confirm by hand. |
| **MapLibre route layer fails** | Caught; markers added regardless. | Four pins, no line — *"losing the route line is a smaller problem."* |

**The invariant that holds everywhere: no error screen, ever.** Every route answers 200 (or
204 for weather). Every failure is a degradation with a defined visual.

---

## Testing

### `pnpm verify` = `lint && typecheck && test && build`

### Results — run against this exact tree, this session

| Command | Result | Detail |
|---|---|---|
| `pnpm typecheck` | ✅ **PASS** | `next typegen && tsc --noEmit`. **The previously-reported `'city' does not exist in type 'TripProfile'` error in `experience-schedules.test.ts` DOES NOT EXIST in the current tree.** |
| `pnpm lint` | ✅ **PASS** | 0 errors, **1 warning**: `inspiration-composer.tsx:149` — `useEffect` missing dep `handleFile` (`react-hooks/exhaustive-deps`) |
| `pnpm test` | ✅ **239/239** | 20 files, 2.05 s |
| `pnpm build` | ✅ **PASS** | 28 routes, compiled in 620 ms, 6 SSG category pages |
| `pnpm jury:smoke` | ✅ **15/15** | 48.2 s, real Chrome at 390×844 |
| `pnpm jury:voice` | ✅ **12/12** | Darija → 4 stops |
| `pnpm jury:wallet` | ✅ **22/22** | Experience day → coins → offer |

### Unit / integration suite — 239 tests in 20 files

| File | Tests | Validates |
|---|---|---|
| `lib/ai/__tests__/understanding.test.ts` | 23 | The understanding layer end to end |
| `lib/intent/__tests__/normalization.test.ts` | 23 | Enum picking, clamping, scoring, `mergeKnown` precedence |
| `lib/ai/__tests__/url-chain.test.ts` | 21 | TikTok / YouTube / OpenGraph branches, `parseUrl`, head streaming |
| `lib/intent/__tests__/modalities.test.ts` | 20 | All four modalities produce the same draft shape |
| `lib/wallet/wallet.test.ts` | 19 | Earning, idempotency, **anti-farming**, discounts, redemption |
| `lib/__tests__/golden-fixtures.test.ts` | 18 | The golden day cannot drift |
| `lib/ai/__tests__/darija-stt.test.ts` | 17 | **`parseSSE` against real captured Gradio frames**, `prefersDarija` |
| `lib/matching/engine.test.ts` | 16 | Scoring, 4-stop guarantee, narrative ordering |
| `lib/matching/__tests__/experience-composition.test.ts` | 14 | **DISCOVER→MEET→MAKE→TASTE**, workshop durations |
| `lib/adaptation/__tests__/less-walking.test.ts` | 9 | Segment conversion, delta arithmetic |
| `data/pois.test.ts` | 8 | Dataset integrity |
| `features/__tests__/screens.test.tsx` | 8 | Screens render |
| `lib/adaptation/__tests__/experience-schedules.test.ts` | 7 | **"An appointment is not a suggestion"** — the 105-min fix |
| `lib/matching/__tests__/golden-route.test.ts` | 6 | The controlled demo route |
| `data/__tests__/media-assets.test.ts` | 5 | Media paths |
| `features/onboarding/__tests__/build-trip.test.ts` | 5 | Generation + fallback |
| `lib/i18n/wallet-i18n.test.ts` | 4 | Wallet strings in all three locales |
| `lib/routing/__tests__/navigation.test.ts` | 3 | Apple vs. Google hand-off |
| `features/onboarding/__tests__/steps.test.ts` | 3 | Progressive profiling |
| `lib/ai/ai.test.ts` | 10 | Provider contracts |

### Jury scripts — `scripts/jury/*.mjs`, real Chrome via `driver.mjs`

**`pnpm jury:smoke` — 15 assertions, 48.2 s.** Selectors are **accessible names, never
`nth-child` or generated classes** — *"the point is to catch a broken product, not a
re-styled one."*

1 Fresh Home loads · 2 Demo entry reaches onboarding · 3 Onboarding → processing → trip ·
4 **Four valid stops** · 5 Start trip → experience · 6 Story sheet opens/closes ·
7 **Less walking applies and Undo restores** · 8 **Every bottom-nav destination resolves** ·
9 Browser Back does not break the path · 10 Refresh on `/trip` recovers ·
11 Refresh on `/experience` recovers the running day · 12 **Map pins ↔ selected stop stay
synchronized** · 13 **No core CTA is blocked by another element** (real hit-test) ·
14 **No uncaught console error during the hero flow** · 15 **Arabic mode does not break
navigation**

**`pnpm jury:voice` — 12 assertions.** Injects the Darija transcript at the point
MediaRecorder would have produced it (a headless run cannot supply a microphone), then
verifies everything downstream: confirmation card, understood chips, prefilled profile,
**original Arabic kept as evidence**, Your Vibe / Your Day prefill, and a locally built
four-stop day with real coordinates and times.

**`pnpm jury:wallet` — 22 assertions.** Generate the experience day → verify the
four-role composition → workshop keeps its duration → finish the day → coins land once →
**re-mark earns nothing** → refresh → balance survives → unlock an offer → coins deducted →
**cannot unlock twice** → no console errors.

---

## P0 / P1 / P2

**A fresh list. Bugs already fixed are not repeated** — the `TripProfile.city` typecheck
error, the pace-shrinks-a-workshop bug, the onboarding-defaults-as-manual-choices bug, the
`known`-as-`edits` null-spreading bug, the three placeholder adapters, the Less Walking
no-op, and the duplicate `<pattern id>` collision are all **verified fixed in this tree**.

### P0 — crash / security / demo failure / data corruption

**None.**

All gates are green, all three jury flows pass on a real browser, no unhandled path can
throw to the user, and no key can leak. There is nothing in this repository that will break
the demo.

### P1 — jury-visible, or a core product weakness

**P1-1 · Spend Less removes the flagship experience and its offer**
`src/lib/adaptation/spend-less.ts` · `candidatesFor()` in `shared.ts`
Reproduced this session: on the experience day it replaces **Cook Moroccan with مي نعيمة**
with Ancienne Médina, dropping 60 coins and **the only 10%-off partner offer in the day**.
`candidatesFor()` has no `kind` filter and no reward/offer awareness; the flagship stop is
targeted precisely *because* it is the most expensive.
→ *Fix:* prefer a same-`kind` replacement, or refuse to swap out a stop carrying a discount
when a cheaper non-experience alternative would break the composition.
→ *Until then:* **do not press Spend Less on the experience day in front of a jury.**

**P1-2 · 30 of 36 records have no photograph**
Only 6 hero images exist on disk. Every experience — including مي نعيمة, the emotional
centre of the pitch — renders as a zellige ornament. The ornament is well-built and honest,
but a jury scrolling Explore sees mostly geometry.
→ *Fix:* six images. `exp-cooking-mi-naima`, `exp-leather-bag`, `exp-habous-artisans` at
minimum. Drop `public/images/poi/<slug>.webp` on disk — **no code change needed**, the tile
retires itself.

**P1-3 · `/test-ai*` ships in the production build, ungated**
Two pages and four API routes, no `NODE_ENV` guard, no auth, no middleware.
`/api/test-ai/audio` accepts **20 MB** (vs. 8 MB in production) and spends the Gemini key.
On localhost this is harmless. On any deployed URL, anyone can drain the quota.
→ *Fix (30 seconds):* `if (process.env.NODE_ENV === "production") notFound();` in both
layouts and a 404 in `_gemini.ts`.

**P1-4 · No SSRF protection on URL fetching**
`readMetadata()` and `fetchRemoteImage()` will fetch private and link-local addresses and
follow redirects into them, unvalidated. Blind and bounded (3 s, 2 MB, OG fields only), so
the blast radius is small — but it is a real finding on a deployed host.
→ *Fix:* resolve the hostname and reject private/loopback/link-local ranges before fetching;
re-check after each redirect (or `redirect: "manual"` and validate each hop).

**P1-5 · No rate limiting on any AI route**
`/api/extract`, `/api/analyze`, `/api/transcribe` and all `/api/test-ai/*` are unmetered.
→ *Fix (deploy-time):* a per-IP counter in middleware, or platform-level throttling.

### P2 — polish / future

**P2-1 · `"Habous"` alone does not ground.** The POI is `"Quartier Habous"` (2 tokens), and
`resolvePoiId` requires 2 shared significant words — so a one-word "Habous" scores 1 and is
correctly-but-unhelpfully refused. Adding a `localizedName` alias or an alias list would fix
it. Low impact: the engine reaches Habous anyway via interests + curation.

**P2-2 · Legacy `siyaha:*` storage prefix.** All six localStorage keys, plus
`package.json:name`, still say `siyaha`. Harmless — but **all three jury scripts read those
key names directly**, so renaming without updating `scripts/jury/*.mjs` breaks the wallet and
smoke runs.

**P2-3 · Passport stamps use the shared category photo.** `stamp.imageUrl =
poi.media.fallbackImage`, so six culture stamps show the same image six times. `ZelligeTile`
does not apply here. Using `media.heroImage` with the same ornament fallback would fix it.

**P2-4 · Oualidia can produce a conceptual duplicate.** A coast+food Oualidia day returned
both `poi-oualidia-oysters` ("Dégustation d'huîtres — Ostréa", a place) **and**
`exp-oualidia-oysters` ("Oysters at the Lagoon", a food_experience) — two oyster stops in
four. The engine's diversity rules operate on `kind` and `category`, not on subject.

**P2-5 · Rainy Day can turn a free stop into a paid one.** The 60 MAD tolerance is measured
against the *original* stop's ceiling, so a free medina walk (0 MAD) can be replaced by the
60 MAD tea ritual — exactly at the boundary. Working as written, but worth a second look.

**P2-6 · PWA icons are SVG-only.** No PNG 192/512. Weakens installability, especially on iOS.

**P2-7 · No service worker.** No offline mode. (The dataset and engine are bundled, so a
day still builds offline — but the app shell will not load.)

**P2-8 · Lint warning.** `inspiration-composer.tsx:149` — `useEffect` missing dep
`handleFile`.

**P2-9 · Opening hours are advisory only.** 19 of 36 records carry hours; the scheduler uses
them as an ordering penalty but never as a hard feasibility check, so a stop can be scheduled
outside its opening window.

**P2-10 · No POI ships `cultural.audio`.** The narration field is typed and plumbed but
unpopulated in all three locales.

---

## Safe To Demo

Everything below was executed or verified during this audit.

| Feature | Confidence | Note |
|---|---|---|
| **Text input → 4-stop day** | 🟢 **Very high** | Works with zero keys. `jury:smoke` 15/15. |
| **Darija voice → Casablanca day** | 🟢 **High** | `jury:voice` 12/12 live. MoulSot answered in 1.16 s during this audit. |
| **Arabic transcript kept as evidence** | 🟢 **Very high** | Asserted live. |
| **Image upload** | 🟢 **High** | With a key: real recognition. Without: silent golden fallback, no fake score. Cannot dead-end. |
| **TikTok link** | 🟢 **High** | Official public oEmbed, no key, plus thumbnail→vision. |
| **YouTube link** | 🟢 **High** | API with key, OpenGraph without. Head-streaming fix verified. |
| **Generic URL** | 🟢 **High** | Two-UA OpenGraph. |
| **Local experiences in a day** | 🟢 **Very high** | `jury:wallet`: 4 roles in one day, live. |
| **مي نعيمة cooking (105 min)** | 🟢 **Very high** | Duration protected at every pace and under every adaptation. Multiple tests + live. |
| **Leather workshop (75 min)** | 🟢 **Very high** | *"workshop keeps its full duration — 75 min (base 75)"*, live. |
| **Wallet: coins land** | 🟢 **Very high** | `50+80+100+20+100 = 350`, asserted live. |
| **Wallet: cannot farm** | 🟢 **Very high** | *"re-marking visited earns nothing"*, live. |
| **Wallet: survives refresh** | 🟢 **Very high** | Live. |
| **Discounts: unlock + cannot unlock twice** | 🟢 **Very high** | `350 → 230`, live. |
| **Explore + 6 category pages** | 🟢 **High** | SSG, prerendered. |
| **Passport stamps** | 🟢 **High** | De-duplicated per POI. |
| **Adapt — Less Walking** (signature day) | 🟢 **Very high** | *77% less walking · ~42 min saved*. Undo verified live. |
| **Adapt — Less Time** (either day) | 🟢 **High** | Experiences untouched. |
| **Adapt — Rainy Day** (signature day) | 🟢 **High** | *1 of 4 moved indoors*. |
| **Arabic UI + RTL** | 🟢 **High** | 334/334 parity. `jury:smoke` TEST 15. |
| **Map ↔ timeline sync** | 🟢 **High** | `jury:smoke` TEST 12. |
| **Refresh / Back mid-demo** | 🟢 **Very high** | TESTS 9, 10, 11. |
| **External Navigate →** | 🟢 **High** | Pure URL construction, 3 tests. Opens the OS map app. |
| **Zellige ornaments** | 🟢 **High** | Deterministic, honest, accessible. Reframe as a design choice, which it is. |

---

## Do Not Demo / Use Carefully

| Feature | Risk | What to do |
|---|---|---|
| 🔴 **Spend Less on the experience day** | **Removes مي نعيمة and the only partner offer** (P1-1). Reverses the thesis live. | **Do not press it on that day.** Demo Spend Less on the signature culture day instead — there it swaps in *Meet the Habous Artisans* and reads beautifully. |
| 🟠 **MoulSot cold start** | Up to 45 s if the Space has slept. Bounded, never hangs — but 45 s of silence on stage is fatal. | **Warm it 2 minutes before** by recording one throwaway phrase. Have a typed Darija sentence ready as the instant backup. |
| 🟠 **Instagram links** | Instagram serves us no OpenGraph → `platform_only`, no title, no thumbnail. Weakest of the four URL paths. | **Use TikTok or YouTube.** If asked about Instagram, say it is recognised but that Instagram does not expose public metadata to us. |
| 🟠 **Explore / any experience card** | 30 of 36 records show a zellige ornament, not a photo. | Lead with the signature Casablanca day — **all four of its stops have real photographs**. If Explore comes up, frame the ornament as the deliberate design choice it is. |
| 🟠 **Any partnership language** | All six experiences are `partnerStatus: "demo"`, `verification: "unverified"`. **No one has signed anything.** | Say **"curated MVP content"**. Never "our partner". |
| 🟠 **`/test-ai`, `/test-ai-darija`** | Engineering laboratories, in the build, ungated (P1-3). | Do not navigate there. They are not part of the product. |
| 🟠 **Rainy Day on the experience day** | Correctly refuses (*"every stop already works in the rain"*) — but a refusal can read as "broken". | Demo Rainy Day on the **signature** day, where it moves 1 of 4 indoors. |
| 🟡 **Less Walking on the experience day** | Correctly refuses (*"already easy on your feet"*). | Demo it on the **signature** day: 77% less walking. |
| 🟡 **Changing walking preference in onboarding** | For culture+food Casablanca it does **not** change which four stops are picked — the curated weight dominates. | Demo Less Walking from `/trip`, not by re-running onboarding. |
| 🟡 **Offline / "it's a PWA"** | No service worker. The shell will not load offline. | Say **"mobile web app with a manifest"**, and that the **engine and dataset run entirely client-side** — which is the impressive and true part. |
| 🟡 **Oualidia days** | Can surface two oyster stops (P2-4). | Stay in Casablanca. |
| 🟡 **Any claim of booking or payment** | Nothing is booked, charged or settled anywhere in the code. | Coins **unlock**; the traveller **pays the host directly, in cash**. |

---

## Strongest Jury Route

**This is the actual output of the current engine, produced this session — not invented.**

Reach it from Home → **"Local Food Trail"** → Continue → **Build my trip**.
Profile: Casablanca · `food` + `hidden_gems` (+ `art_creative`) · full day.
Curated route selected: **`route-casablanca-experience`**.

---

### 🕘 STOP 1 — 09:30 · **Meet the Habous Artisans** (`exp-habous-artisans`)

| | |
|---|---|
| **Kind** | `local_activity` — **MEET** |
| **Duration** | 60 min · **Reward 50 coins** |
| **Host** | *A neighbourhood guide* · `guide` |
| **Price** | 80 MAD · walk 2 · `mixed` · no booking needed |
| **Why the engine chose it** | Primary `hidden_gems` match (+34), curated-route member (+34), experiential (+7), close to the anchor. The narrative pass put it first: `hidden_gems` has strong morning affinity and it is not a food stop. |

> **The story:** *You don't start at the monument. You start in the neighbourhood, with the
> people who make things.*

---

### 🕥 STOP 2 — 10:40 · **Cook Moroccan with مي نعيمة** (`exp-cooking-mi-naima`)

| | |
|---|---|
| **Kind** | `food_experience` — **TASTE** |
| **Duration** | **105 min, immovable at every pace and under every adaptation** · **Reward 80 coins** |
| **Host** | **مي نعيمة** — the only named person in the dataset · `local_host` |
| **Price** | 250 MAD · **10% off, unlocked for 300 coins** · booking required, capacity 8 |
| **Why the engine chose it** | Primary `food` match (+34), curated member (+34), experiential (+7). `food` has the highest midday affinity (5) of any category, so the narrative pass placed it at noon **on its own**. |

> **The story:** *A real person, in a real kitchen, and the clock respects her. Pace makes a
> monument shorter; it does not make a cooking class shorter.*

**This is the emotional centre of the pitch. Land here.**

---

### 🕧 STOP 3 — 12:40 · **Make Your Own Leather Bag** (`exp-leather-bag`)

| | |
|---|---|
| **Kind** | `workshop` — **MAKE** |
| **Duration** | **75 min, immovable** · **Reward 100 coins — the highest single reward in the product** |
| **Host** | *A local leather artisan* · `artisan` |
| **Price** | 180 MAD · **10% off, unlocked for 200 coins** · booking required, capacity 6 |
| **Why the engine chose it** | Primary `art_creative` match, curated member, experiential. `art_creative` has afternoon affinity 4. Slot 4's composition rule explicitly seeks a **MAKE** stop the day is missing. |

> **The story:** *You leave with something you made. That's why it pays five times what
> looking at a monument pays.*

---

### 🕝 STOP 4 — 14:10 · **Mosquée Hassan II** (`poi-hassan-ii`)

| | |
|---|---|
| **Kind** | `place` — **DISCOVER** |
| **Duration** | 90 min (balanced) · **Reward 20 coins** |
| **Price** | 140 MAD · `signature: true` · **has a real photograph** |
| **Why the engine chose it** | The **signature slot**, claimed *before* the complementary slot precisely so it cannot be lost to a novel kind. It is a curated signature POI, which outranks any other signature POI. The narrative pass gives the sunset slot +3 for `signature`. |

> **The story:** *The icon is still there — but it's the fourth thing you do, not the only
> thing. You arrive having already met the city.*

---

### Does it support DISCOVER → MEET → MAKE → TASTE?

**Yes — all four roles, in one day, produced by the engine.**

The engine's chosen *order* is **MEET → TASTE → MAKE → DISCOVER**, because the narrative pass
optimises for the light and the meal (food at noon, signature at the end), not for the
acronym. **Do not fight it.** Tell it in the order it happens:

> *"You meet the artisans. You cook with مي نعيمة. You make a bag with your own hands.
> And then, at the end of the day, you see the mosque — as someone who has actually met
> Casablanca, not as someone who photographed it.*
>
> *Four stops. 250 coins earned along the way, plus 100 for finishing — 350 total. Enough to
> unlock مي نعيمة's 10% discount, which you pay her directly, in cash, at her door."*

**Total:** 5 h 45 m of activity · 1.5 km walking + 5.2 km by car · 34 min moving ·
650 MAD · **350 Khotwa Coins**.

---

## Product Strategy Assessment

The proposition, evaluated **clause by clause against the code**:

> *"Khotwa transforms inspiration into a personalized regional day. It understands image,
> voice, text or social links. The user confirms what was understood. A deterministic local
> engine creates exactly four coherent stops. The experience can mix iconic places with local
> people, workshops, food and cultural activities. Completing experiences earns Khotwa Coins,
> which can unlock local partner discounts. The goal is not only to optimize where tourists
> go, but to direct attention and economic value toward local actors."*

### ✅ What is REAL

| Clause | Evidence |
|---|---|
| *"transforms inspiration into a personalized regional day"* | Four entry points, one pipeline, verified end-to-end in a real browser |
| *"understands image, voice, text or social links"* | All four produce `TripIntentDraft`; all four tested; **voice includes genuine Darija ASR** |
| *"The user confirms what was understood"* | Two confirmation surfaces; `mergeKnown` + `draftToProfile` enforce manual-wins precedence; the defaults-as-choices bug is fixed and verified |
| *"A deterministic local engine"* | **Zero LLM calls after `TripProfile`** — grep-verifiable. Pure, synchronous, no network. |
| *"exactly four coherent stops"* | Guaranteed by two top-up loops; verified across 12 profiles + every test + 2 live browser runs |
| *"can mix iconic places with local people, workshops, food"* | `jury:wallet`, live: `local_activity, food_experience, workshop, place` in one day |
| *"Completing experiences earns Khotwa Coins"* | Full ledger, derived ids, provably un-farmable, persists across refresh |
| *"which can unlock local partner discounts"* | Percentage **and** flat MAD, minimum-coin gates, double-redemption blocked, all localised |
| *"direct attention… toward local actors"* | Coin rates favour humans 5:1; slot-4 composition actively seeks MAKE/TASTE; the map of who benefits (`PartnerType`) exists |

### 🟡 What is PARTIAL

- **"regional"** — Casablanca is deeply covered (22 records, 6 routes, all 6 roles). El Jadida
  reaches 2 roles, Oualidia 2, and Azemmour / Mohammedia / Boulaouane have **one record each**.
  It is a **Casablanca product with a regional frame**, not yet a regional product.
- **"understands… social links"** — TikTok, YouTube and generic URLs are real; **Instagram is
  platform-detection only**.
- **"economic value"** — the *mechanism* is real; **no value has moved**, and nothing measures it.
- **"local partner"** — the word *partner* is the weak point. See below.

### 🟠 What is DEMO CONTENT

- **All six experiences.** `partnerStatus: "demo"`, `verification: "unverified"`, every one.
- **Thirty of thirty-six photographs** — zellige ornaments, not images of the place.
- **`/test-ai*`** — engineering laboratories that happen to be in the build.
- **The golden Casablanca trip** — a fixture used as the floor when the store is empty.

### 🔴 What is NOT IMPLEMENTED

Booking · payment · settlement · commission · partner-side anything · impact measurement ·
offline mode · turn-by-turn · multi-day · groups · accounts.

### ✅ What to confidently tell the jury

1. **"Four kinds of input, one understanding layer, one output type."** True, tested,
   demonstrable in 90 seconds.
2. **"The AI understands. It never decides."** The strongest technical claim in the product,
   and it is *architecturally enforced* — the model cannot return an id, a coordinate, a
   price or an itinerary, and grounding is local. This is a real answer to hallucination.
3. **"It works with no API keys at all."** Every external service degrades to a defined
   fallback. There is no error screen anywhere in the product.
4. **"Darija-first, because Whisper is weak on Darija."** MoulSot leads for Arabic. This is
   real differentiation for a Moroccan product, and it is running.
5. **"A booked appointment is not a suggestion."** The 105-minute cooking class stays 105
   minutes at every pace and under every adaptation. Seven tests and a live browser assertion
   defend it. This is the kind of detail that separates a demo from a product.
6. **"Coins cannot be farmed."** Derived transaction ids, no counters, no flags. Provable in
   one live tap.
7. **"A workshop pays five times what a monument pays."** The economics of the thesis are
   written into `src/config/rewards.ts`.

### ❌ What NOT to claim

1. **Do not say "partner."** Say *"curated MVP content"*. Nobody has signed. Six records say
   `demo` and one test exists specifically to stop us inventing people.
2. **Do not say "payment", "booking", or "wallet" in the financial sense.** It is a **loyalty
   ledger**. Coins unlock; the traveller pays the host directly, in cash.
3. **Do not say "regional coverage."** Say *"Casablanca-deep, regionally framed"* — three
   towns have a single record each.
4. **Do not say "offline PWA."** No service worker. Say the **engine and dataset run entirely
   client-side**, which is both true and more impressive.
5. **Do not claim Instagram understanding.** Detected, not understood.
6. **Do not quote an economic-impact number.** None is computed.
7. **Do not claim the four-role day emerges anywhere unaided.** It emerges in Casablanca,
   and the flagship day is curated. Say so — it is a *stronger* answer, because it shows you
   know the difference.

---

## Important File Map

### The spine
| File | Role |
|---|---|
| `src/lib/intent/normalize.ts` | **`buildDraft()` — the single draft constructor.** Every modality funnels here. |
| `src/lib/intent/schema.ts` | Zod boundary. `parseTripIntentDraft` never throws. |
| `src/lib/intent/confirm.ts` | **`draftToProfile()` — the only bridge** from understood to confirmed. |
| `src/lib/intent/sources.ts` | No-key local adapters — same shape, honest confidence. |
| `src/app/api/extract/route.ts` | **The one understanding endpoint.** |
| `src/lib/matching/engine.ts` | **`match()` + `schedule()` + `visitDurationMinutes()`.** The deterministic engine. |
| `src/lib/adaptation/index.ts` | Adapter registry, wrapped so nothing throws to the stage. |
| `src/lib/wallet/index.ts` | Ledger arithmetic. Derived ids, refused duplicates. |
| `src/lib/store/index.ts` | The Zustand store. `markVisited` is the coin/stamp junction. |
| `src/lib/storage/index.ts` | **The only file that touches `localStorage`.** |

### Data
| File | Role |
|---|---|
| `src/data/pois.ts` | The 36-record barrel |
| `src/data/experiences.ts` | The six curated experiences |
| `src/data/pois-casablanca.ts` · `pois-coast.ts` | 14 + 12 places |
| `src/data/fixtures/golden-*.ts` | The four golden POIs, profile and trip |
| `src/data/base-routes.ts` | The seven curated routes |
| `src/config/rewards.ts` | The coin economy, in one place |
| `src/config/app.ts` | Timeouts, thresholds, pace multipliers, map |
| `src/config/env.ts` | **Server-only** secrets. Getters, never snapshots. |

### AI
| File | Role |
|---|---|
| `src/lib/ai/gemini-client.ts` | The **one** place this app talks to Gemini |
| `src/lib/ai/intent.ts` | `INTENT_PROMPT` + `GeminiIntentProvider` |
| `src/lib/ai/gemini.ts` | `ANALYZE_PROMPT` + image analysis |
| `src/lib/ai/darija-stt.ts` | **MoulSot Gradio protocol + `parseSSE`** |
| `src/lib/ai/resolve-poi.ts` | **Grounding.** Token overlap, never a substring. |
| `src/lib/ai/url.ts` | TikTok / YouTube / OpenGraph chain |
| `src/lib/ai/upload.ts` | The upload trust boundary |
| `src/lib/ai/http.ts` | `boundedSignal`, `orFallback`, `parseJsonLoosely` |

### UI
| File | Role |
|---|---|
| `src/features/home/inspiration-composer.tsx` | **The primary input of the product** |
| `src/features/home/analyze.ts` | Client-side calls + `goldenRecognition` |
| `src/features/home/recognition-reveal.tsx` | Image/URL confirmation surface |
| `src/features/onboarding/onboarding-flow.tsx` | 3 steps; **the defaults fix lives at line ~90** |
| `src/features/onboarding/build-trip.ts` | engine → routing → metrics, with golden fallback |
| `src/features/trip/trip-timeline.tsx` · `adapt-sheet.tsx` · `place-sheet.tsx` | The trip screen |
| `src/features/map/map-canvas.tsx` | MapLibre; worker URL fix at line 131 |
| `src/features/wallet/wallet-sheet.tsx` · `reward-toast.tsx` | The wallet UI |
| `src/components/media-card.tsx` | **The one image element in the product** |
| `src/components/zellige-tile.tsx` | The ornament that stands in for 30 photographs |
| `src/components/motion.ts` | The single motion vocabulary |

### Verification
| File | Role |
|---|---|
| `scripts/jury/smoke.mjs` | 15 assertions, real Chrome, accessible-name selectors |
| `scripts/jury/voice-flow.mjs` | Darija → 4 stops |
| `scripts/jury/wallet-flow.mjs` | Experience day → coins → offer |
| `src/lib/adaptation/__tests__/experience-schedules.test.ts` | *"An appointment is not a suggestion"* |
| `src/lib/matching/__tests__/experience-composition.test.ts` | DISCOVER→MEET→MAKE→TASTE |
| `src/lib/wallet/wallet.test.ts` | *"cannot be farmed by replaying a whole day"* |

---

## Five Decisions Needed Next

Only five. In order of leverage before the pitch.

### 1. Decide what Spend Less is allowed to do to an experience day — **before you demo it**
It currently removes مي نعيمة and the day's only partner offer (P1-1, reproduced this
session). Two acceptable outcomes: **(a)** a ten-minute fix — prefer a same-`kind`
replacement in `candidatesFor()`, or refuse to swap out a stop carrying a discount; or
**(b)** demo Spend Less only on the signature culture day, where it reads beautifully.
**Do not leave this undecided and find out on stage.**

### 2. Ship three photographs
`exp-cooking-mi-naima`, `exp-leather-bag`, `exp-habous-artisans`. Drop three `.webp` files
into `public/images/poi/` — **no code change**; the zellige tile retires itself. These are
the three stops in your strongest route and the emotional centre of the pitch. This is the
single highest visual-return action available, measured in minutes.

### 3. Fix the exact wording of the partnership and money claims, and rehearse it
All six experiences are `demo`/`unverified` and nothing is ever charged. Agree the two
sentences now: **"curated MVP content, not signed partnerships"** and **"a loyalty ledger —
coins unlock an offer, the traveller pays the host directly in cash."** A jury will ask. An
imprecise answer costs more credibility than the missing partnerships do.

### 4. Gate `/test-ai*` and decide the deployment posture
One line in two layouts (`if (process.env.NODE_ENV === "production") notFound()`). Then
decide: **localhost-only demo** — you are done, and P1-4 (SSRF) and P1-5 (rate limiting)
can wait. **Any public URL** — those two become mandatory before you share the link.

### 5. Choose the one demo path and rehearse it end to end, twice
**Home → "Local Food Trail" → Continue → Build my trip → the four-role day → Start trip →
Visited ×4 → 350 coins → Profile → Wallet → unlock مي نعيمة's 10%.** Then, if there is time,
the Darija voice input as the opener. Warm MoulSot two minutes before you go on. Everything
in that path is verified green in a real browser this session — `jury:wallet` 22/22 and
`jury:voice` 12/12 walk exactly these steps. **Do not improvise off it**, and in particular
do not press Spend Less on that day (see decision 1).

---

*Compiled 2026-08-30 from branch `main` @ `2da666d`. Every gate re-run, every count
recomputed from source, every behavioural claim reproduced by executing the current code.
No production source file was modified.*
