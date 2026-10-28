# Fallbacks

> External services enrich the experience. They do not own it.

Every row must be true before the demo. No infinite spinners. No blank screens. No raw
error dumps.

| Dependency | Timeout | On failure | Owner |
|---|---|---|---|
| Gemini — image analysis | `TIMEOUTS.imageAnalysisMs` (8s) | Skip recognition, keep the user's manual selections; if the image was the only signal, fall through to the golden demo profile | AI/Data |
| Gemini — profile extraction | `TIMEOUTS.profileExtractionMs` (8s) | `parseTripProfile()` returns an empty profile; the engine builds from onboarding choices alone | AI/Data |
| Groq / Whisper — voice | `TIMEOUTS.transcriptionMs` (8s) | Voice button shows a short error, manual preferences still work; never blocks the CTA | AI/Data |
| Social URL metadata | `TIMEOUTS.socialContextMs` (3s) | Ignore the URL entirely and continue silently. Never blocks generation | AI/Data |
| Routing provider | `TIMEOUTS.routingSegmentMs` (4s/segment) | `haversineMeters` + `FALLBACK_SPEED`, `geometry: null`, `source: "fallback"`; the map draws straight lines | Trip/Map |
| Routing **numbers** | n/a | Never used — see below | Lead |
| Weather | `TIMEOUTS.weatherMs` (2.5s) | Omit the weather chip from the trip header. No placeholder, no error | Trip/Map |
| Remote images | n/a | `POIMedia.fallbackImage` — always a local asset that exists | UI |
| Hero video | n/a | Show `heroImage`. Video never blocks a screen | UI |
| Cultural audio | n/a | The written story is always there; hide the Listen button | UI |
| Geolocation | n/a | Never requested on launch. Denial is a no-op — the day still works | UI |
| MapLibre tiles | n/a | Timeline is fully usable on its own; the trip is never map-only | Trip/Map |
| `localStorage` | n/a | Guarded reads and writes; private mode degrades to in-memory | Lead |
| Whole generation | `TIMEOUTS.tripGenerationMs` (10s) | Show the trip anyway, built locally. `Trip.isFallback = true` | Lead |

## The routing provider is used for geometry only

Verified against the live endpoint: the public OSRM demo server answers with **driving**
data for every profile. It returns 2,826 m / **5 min** for the Habous → Marché Central
leg, which is a 30-minute walk. Trusting its durations would print a five-minute label on
a half-hour walk and would silently destroy the Less Walking before/after numbers.

So both `buildTrip()` and the map take the provider's **geometry** and discard its
distances and durations. All numbers come from `calculateMetrics()` over locally
estimated legs. A routing outage therefore changes how the route *looks* (straight lines
instead of streets) and never what the day *says*.

Consequence to accept: leg distances are straight-line and read roughly 20% short against
street reality. Correcting that belongs inside `engine.schedule()`, where the arrival
times are derived from the same numbers — changing it in only one place would make the
timeline contradict itself.

## Rules

1. **Every external call takes an `AbortSignal`** and the caller enforces the timeout from
   `src/config/app.ts`. A provider that can hang forever is a bug.
2. **A timeout is not an error.** It is the signal to switch to local data. The user sees
   a trip, not a message about a provider.
3. **Never surface a provider name to the user.** No "Gemini failed", no stack traces.
4. **`Trip.isFallback`** records that we degraded — for our own QA, not for the jury.
5. **The golden fixtures are the floor.** With every service dead, `GOLDEN_TRIP` and
   `GOLDEN_LESS_WALKING` still render the complete Casablanca demo.

## Emergency path

If recognition fails on the jury's own screenshot, the app resolves to the golden
Casablanca profile and continues. It never announces a demo mode.
