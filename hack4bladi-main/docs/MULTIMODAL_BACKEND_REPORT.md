# Multimodal understanding backend — report

One layer, four inputs, one output. Image / voice / text / URL → `TripIntentDraft` →
user confirms → `TripProfile` → the existing engine, untouched.

Verified live on `localhost:3000` with a real `GEMINI_API_KEY`, 2026-08-29.

## Status

| Path | Status | Evidence |
|---|---|---|
| Image | **REAL** | `hassan-ii.webp` → "Mosquée Hassan II", `poi-hassan-ii`, Casablanca/Morocco, conf 0.99 → draft 0.884, band **high** |
| Voice | **REAL** | Groq Whisper unchanged; FR sentence → city Casablanca, `[culture, food]`, `half_day`, `medium`, `avoidLongWalks:true`, 0.843, band **high** |
| Text | **REAL** | Same via `/api/extract`, and works with **no keys** via the local keyword pass |
| TikTok URL | **REAL** | Official oEmbed: real title, author, thumbnail; thumbnail fetched + analysed |
| YouTube URL | **REAL (OpenGraph)** | No `YOUTUBE_API_KEY` set here, so the documented fallback ran: real title + `maxresdefault.jpg`. API branch is coded and unit-tested |
| Generic URL | **REAL** | Wikipedia → title → grounded to `poi-hassan-ii`, `[culture]`, 0.753, band medium |
| Confirmation | **PASS** | `draftToProfile` → `walkingPreference: minimal`; manual choices always win |
| Fallback | **PASS** | No key / timeout / dead platform / bad JSON all → 200 + usable draft, capped below HIGH |
| Tests | **177/177** | lint 0 errors · typecheck ✓ · build ✓ |
| Jury smoke | **15/15** | 64.4s, no regression |

## What was added

- `src/types/intent.ts` — `TripIntentDraft` (reuses every existing enum; no parallel vocabulary)
- `src/lib/intent/` — Zod schema + bands, normalizer/scorer, local keyword extractor (en/fr/ar),
  modality adapters, `draftToProfile`
- `src/lib/ai/url.ts` — provider chain: TikTok oEmbed → YouTube Data API → OpenGraph, plus a
  bounded thumbnail fetcher
- `src/lib/ai/intent.ts` — `IntentExtractionProvider` + Gemini implementation (one prompt for all
  four modalities)
- `/api/extract` rewritten as the single understanding endpoint (it had **no caller** before);
  `/api/analyze` now returns a draft too
- UI: existing `RecognitionReveal` extended (place / understood-day / dead-end states + candidate
  alternatives), onboarding's "what we understood" card shows the chips, step 3 gained the mobility
  control. No new screens.

## Bugs found and fixed along the way

1. **`gemini-2.5-flash` is dead** — the repo's default model returns 404 *"no longer available to
   new users"*, so **every** Gemini call silently degraded. Default is now `gemini-3.5-flash-lite`
   (~0.9 s warm). `gemini-3.6-flash` works but spends ~600 thinking tokens / ~14 s — past the 8 s
   budget.
2. **`serverEnv` snapshotted `process.env` at import** — now lazy getters.
3. **OpenGraph read only 256 KB** — YouTube's `<head>` is bigger, so every YouTube link came back
   empty. Now streams to `</head>`.
4. **Wikipedia 403s the `facebookexternalhit` UA** — now tries both crawler and browser identities.
5. **`mailto:` was rewritten into an HTTP fetch** with embedded credentials. Rejected now.
6. **`/api/extract` applied `known` twice** — a caller sending its whole (empty) profile blanked
   everything the model had understood. Regression test added.
7. `"budget"` alone matched **low**, so "medium budget" read as low.

## Notes

- The model never authors a POI id, coordinate or itinerary — `resolvePoiId` grounds free text
  against the curated dataset, and invented ids are dropped.
- Confidence is mostly earned, not self-reported: grounding + coverage carry 75%, the model's own
  score 25%. Degraded drafts are capped below HIGH so we never claim certainty we lack.
- Dev-only `trace` in the response (source, providers, band, candidates, provenance). No secrets.
- `metascraper` was skipped: the repo already had an OG extractor, and this avoids a cheerio
  dependency tree the morning of a demo.
- Downstream engine, matching, routing and MapLibre untouched.

---

# Darija voice integration (MoulSot v0.3)

The proven Checkmate pipeline moved into Siyaha. Whisper is no longer the primary Darija
engine.

```
Voice → MoulSot (Darija/Arabic) → Arabic transcript → Gemini → TripProfile → local engine
```

## Verification

| Check | Result | Evidence |
|---|---|---|
| Darija STT provider | **PASS** | Live Space, real `sample.wav` → `اللهم صل وسلم وبارك فيك` in 7.8 s |
| SSE parser | **PASS** | Real completion frame, partials, `error` frame, malformed, heartbeat-only, bare string |
| `/api/transcribe` with real audio | **PASS** | `{"text":"اللهم صل وسلم وبارك فيك","provider":"moulsot"}` |
| Browser voice recording | **NOT VERIFIED** | A headless run cannot supply a microphone. Recorder → Blob → POST is unchanged; everything after the Blob is verified with a real audio file |
| Gemini TripProfile extraction | **PASS** | Darija demo sentence → Casablanca · culture+food · full_day · minimal (live Gemini) |
| Fallback | **PASS** | Space 503 → Groq; both down → `degraded:true`, empty text, 200. Never hangs |
| Local matching after AI | **PASS** | 4 stops: Habous → Marché Central → Sacré-Cœur → Hassan II |
| Tests | **PASS** | 194/194 (17 new) |
| Build | **PASS** | `pnpm verify` green; jury smoke 15/15 |

## Full-flow check

`pnpm jury:voice` — 12/12. Drives the real UI: transcript → confirmation card → Your Vibe
prefilled (Culture & Heritage, Food) → Your Day prefilled (Full day, Keep it short) →
Build my trip → 4 stops carrying `walkingPreference: minimal`, `timeAvailable: full_day`.

## Engine order

- `locale === "ar"` → MoulSot first, Groq second
- English / French → Groq first, MoulSot second

Not language detection — just which engine leads, from the locale the app is already in.
`TIMEOUTS.darijaTranscriptionMs` is 20 s because the public Space can be cold.

## Bug the browser run caught

Step 3's defaults (Half day · Medium · Balanced) were written into the profile **on mount**,
before the traveller had said anything. The understanding layer then read them as
deliberate choices and refused to overrule them — so "نهار كامل" (full day) came back as
Half day. Defaults are now applied when the traveller reaches step 3. A default is not a
choice.

This is exactly the failure a 200 response hides: `/api/extract` was returning `full_day`
correctly the whole time.

## Notes

- Transcript is never translated — Gemini reads Arabic/Darija directly, and the original is
  kept as evidence.
- Exactly two network calls per voice input: one transcription, one Gemini extraction. Image
  + voice together still aggregate into a single extraction call.
- Darija vocabulary added to the no-key keyword fallback (`كازا`, `نهار كامل`, `الماكلة`,
  `نمشي بزاف`), so the demo survives with no keys at all.
- The brief's `culture_heritage` / `walkingPreference:"low"` map to this repo's existing
  enums `culture` / `minimal`. No parallel vocabulary was introduced.
