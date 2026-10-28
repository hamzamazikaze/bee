# API Review

Findings against the five route handlers in `src/app/api/`, ranked by severity. The
contract itself is written down in `docs/openapi.yaml`.

Read this with `docs/FALLBACKS.md` open: most of what looks like a missing error path in
this API is a deliberate degradation path, and is correct. The findings below are the
places where that principle is *stated* but not *implemented*, or where it has been
stretched to cover something it was never meant to cover.

No source file was changed. Every fix below is described, not applied.

---

## H1 — `/api/analyze` responses are read at the wrong level, so image recognition never runs

**`src/features/home/analyze.ts:59-60` against `src/app/api/analyze/route.ts:45-49`**

The handler answers:

```json
{ "ok": true, "degraded": false, "result": { "detectedPlace": "Hassan II Mosque", … } }
```

The client reads:

```ts
const data = (await response.json()) as Partial<ImageAnalysisResult> | null;
if (!data || typeof data !== "object" || !data.detectedPlace) return GOLDEN_RECOGNITION;
```

`detectedPlace` lives under `result`, not at the top level. `data.detectedPlace` is
therefore `undefined` on **every** response, the guard always trips, and `recogniseImage()`
returns `GOLDEN_RECOGNITION` for every photo the traveller uploads — Hassan II Mosque,
Casablanca, `usedFallback: true` — whether Gemini answered correctly, timed out, or was
never configured at all.

`recogniseImage` is live: `src/features/home/inspiration-composer.tsx:61` calls it on the
real upload path.

What makes this expensive is that it is invisible on stage. The emergency path from
FALLBACKS.md is convincing by design, so a demo of the golden Casablanca screenshot looks
exactly like working recognition. Any *other* photo also looks like working recognition —
of Hassan II Mosque.

**Fix** (one line): read the envelope.

```ts
const body = (await response.json()) as { ok?: boolean; result?: Partial<ImageAnalysisResult> } | null;
const data = body?.result;
if (!body || body.ok === false || !data?.detectedPlace) return GOLDEN_RECOGNITION;
```

Worth a test that feeds `recogniseImage` a stubbed `{ok:true,degraded:false,result:{…}}`
and asserts `usedFallback === false` — the current suite cannot tell the two paths apart.

---

## H2 — Upload rejections are HTTP 200, so the client cannot tell "too big" from "provider down"

**`src/app/api/analyze/route.ts:18-24`, `src/app/api/transcribe/route.ts:18`**

An 80 MB file and a `video/mp4` wearing a photo's name are correctly refused at the trust
boundary — and then reported as `200 {ok:false, reason:"too_large"}`. The callers only
check `response.ok` (`analyze.ts:57`, `analyze.ts:110`), which is `true`, so a refused
upload is indistinguishable from a degraded model and the traveller is told nothing.

This is the FALLBACKS rule ("a timeout is not an error") applied one step too far. A
timeout is not an error. An 80 MB upload is.

The app already has the strings for this — `UploadIssue` is `"imageTooLarge" |
"unsupportedFile"` at `analyze.ts:6` — and the client-side `validateImage()` at
`analyze.ts:9-14` catches the common case first. So the user-visible impact today is
small; the design problem is that the API is relying on the client to validate.

**Fix:** keep the body shape, correct the status — `413` for `too_large`, `415` for
`unsupported_type`, `400` for `missing_file` / `unreadable_body`. Leave the provider
paths (`unavailable`, timeout, unparseable output) at `200`. Then `!response.ok` on the
client means "your file was refused" and the two cases separate cleanly.

---

## H3 — `/api/extract` has no caller

**`src/app/api/extract/route.ts` (whole file)**

Nothing in `src/` fetches `/api/extract`. The only references are documentation:
`docs/ARCHITECTURE.md:78,91`, `docs/BUILD_ORDER.md:22`, `docs/WORKER_BOUNDARIES.md:81`.

It is the most elaborate endpoint in the app — concurrent Gemini extraction and social
enrichment, source coercion, a fallback profile — and it is dead code. The architecture
doc describes an onboarding flow that routes through it; the app does not.

Note also that `docs/IMPLEMENTATION_AUDIT.md:24` cites `/api/extract` answering
`{ok:true,degraded:true}` with no API key as evidence that the no-key path passes. That
is evidence about an endpoint nothing calls.

**Fix:** decide, don't drift. Either wire the onboarding hand-off to it as
`ARCHITECTURE.md` says, or delete the route and the `ExtractProfileInput` plumbing and
correct the three docs. Leaving a dead endpoint that the audit doc treats as live is the
worst of the three options.

---

## M4 — Five endpoints, five different response envelopes

| Endpoint | Success | Failure |
|---|---|---|
| `/api/analyze` | `{ok,degraded,result}` 200 | same shape, 200 |
| `/api/extract` | `{ok,degraded,profile}` 200 | same shape, 200 |
| `/api/transcribe` | `{ok,degraded,text,detectedLocale}` 200 | same shape, 200 |
| `/api/route` | `{segments}` 200 | `{error}` 400 |
| `/api/weather` | bare `WeatherSummary` 200 | `204`, empty |

There is no shared error type, so there is no shared fetch wrapper, and each of the four
call sites re-implements its own guard — which is how H1 happened.

**Fix, scoped to what pays for itself:** give the three AI endpoints one envelope
(`{ok, degraded, reason?, data}`) since they already almost share one, and a single
`readAiResponse<T>()` helper on the client. Leave `/api/route` and `/api/weather` alone —
their shapes fit their consumers and changing them buys nothing.

---

## M5 — `/api/weather` accepts any input and forwards it

**`src/app/api/weather/route.ts:30-39`**

`number()` turns any non-numeric `lat`/`lng` into Casablanca's centre, so
`?lat=banana` silently returns Casablanca weather labelled with whatever `city` string was
passed. Finite-but-impossible values (`?lat=999`) are not caught at all and go straight
into the Open-Meteo URL.

`/api/route` already has exactly the right validation eight lines into its own file
(`src/app/api/route/route.ts:12-15`). The bounds exist; this endpoint just doesn't use
them.

`city` is also echoed back verbatim into the response (`:39` → `:59`) with no length cap —
it lands in the trip header chip.

**Fix:** reuse `CoordinatesSchema`; on a parse failure return `204`, which is already this
endpoint's answer for everything else. Cap `city` at a sane length.

---

## M6 — Nothing rate-limits the two endpoints that spend money

**`src/app/api/analyze/route.ts`, `src/app/api/extract/route.ts`**

Both accept up to 8 MB of user-supplied bytes (`UPLOAD.maxBytes`) and forward them to a
billed Gemini key, with no throttle, no origin check and no per-caller accounting.

For a hackathon behind a demo URL this is fine and should stay fine — do not build an
auth layer for it. It becomes a real problem the day the URL is shared publicly. If it
ships past the demo, the cheapest honest mitigation is a per-IP token bucket in
`middleware.ts`; that is a ~20-line change, not a platform.

---

## L7 — `/api/route` fans out uncached upstream calls on every trip change

**`src/lib/routing/osrm.ts:115-116`, `src/features/trip/use-trip-data.ts:44`**

`calculateRoute` is `Promise.all` over the segments — up to 9 separate OSRM requests, each
`cache: "no-store"`, with no dedupe between them and no memo across calls. The trip
re-routes whenever `signature` changes, re-fetching geometry that has not moved.

At three segments and one traveller this costs nothing, which is the right call for now.
A `Map` keyed on `from|to|mode` inside the module would remove most of it if the demo ever
runs on a bad connection.

---

## L8 — `/api/transcribe`'s docstring names a field the app doesn't send

`src/app/api/transcribe/route.ts:8` documents `multipart/form-data with 'file'`. The app's
own client sends `audio` (`src/features/home/analyze.ts:104`). It works only because
`readAudioUpload` accepts either (`src/lib/ai/upload.ts:84`). Fix the comment.

---

## L9 — `WeatherCondition.wind` is unreachable

`toCondition()` (`src/app/api/weather/route.ts:15-20`) maps every WMO code to `sunny`,
`cloudy`, `rain` or `unknown`. `wind` is in the union and has a label in three languages
(`:26`) that can never render. Either map the WMO wind codes (winds are 39-49 in some
tables, but they overlap the fog range this function assigns to `cloudy` — check before
changing) or drop `wind` from `WeatherCondition`.

---

## L10 — `/api/extract` mutates a profile it did not create

`src/app/api/extract/route.ts:95` — `profile.social = social` writes into either the
model's parsed profile or `fallbackProfile()`'s return value. Nothing aliases either
today, so this is safe; it is simply the one place in the file that mutates instead of
composing. `{ ...profile, social }` costs nothing.

---

## What not to do

This is a hackathon build with a demo on a clock, and the API is small on purpose. Three
things would be a poor use of the remaining time:

- **Versioning, HATEOAS, RFC 9457 problem details.** Five internal endpoints with one
  first-party client. The envelope in M4 is worth it because it prevents H1 recurring;
  everything beyond that is ceremony.
- **Generating a typed client from `docs/openapi.yaml`.** The domain types in `src/types/`
  are already the contract, and they are hand-owned per `docs/CONTRACTS.md`. A generated
  client would compete with them.
- **Auth.** Fix H1, H2 and H3 first. M6 is a note for the day this goes public, not a task
  for today.
