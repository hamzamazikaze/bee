# Shared Domain Contracts

Everything here is **Lead-owned**. Workers import; they do not redefine, widen or
duplicate. If a contract is wrong, raise it with the Lead — do not fork it locally.

## Where things live

| File | Contains |
|---|---|
| `src/types/common.ts` | `Locale`, `LocalizedText`, `Coordinates`, `ConfidenceMap`, `Weekday`, `ClockTime`, `MadRange` |
| `src/types/profile.ts` | `InputSource`, `SocialPlatform`, `Interest`, `BudgetLevel`, `TripPace`, `TimeAvailable`, `WalkingPreference`, `SocialContext`, `TripProfile` |
| `src/types/poi.ts` | `POI`, `POICategory`, `POIMedia`, `OpeningHours`, `POIAvailability`, `CulturalContent`, `PriceRange`, `CoordinateType`, `VerificationStatus`, `AvailabilityStatus`, `IndoorOutdoor`, `WalkingScore` |
| `src/types/trip.ts` | `Trip`, `TripStop`, `RouteSegment`, `RouteMetrics`, `TravelMode`, `VisitState`, `BaseRoute`, `TRIP_STOP_COUNT` |
| `src/types/adaptation.ts` | `AdaptationType`, `AdaptationRequest`, `AdaptationResult`, `AdaptationDelta` |
| `src/types/experience.ts` | `PassportStamp`, `Passport`, `ProcessingStep`, `ProcessingState`, `WeatherSummary` |

Import from the specific file or from `@/types`. Both work.

## Decisions baked into the types

**`POICategory` is `Interest`.** The six onboarding interests and the six POI categories
are one union. Matching an interest to a category is `===`. Do not introduce a mapping
table.

**Every `TripProfile` field is nullable.** Nothing is mandatory. A profile with only
`interests` is valid and must produce a trip.

**`TripStop.poi` is denormalised.** The full `POI` travels inside the stop so no renderer
ever needs a lookup table or a loading state.

**Segments reference stop ids, not POI ids.** `RouteSegment.fromStopId → toStopId`.
A trip is always `TRIP_STOP_COUNT` stops and `TRIP_STOP_COUNT - 1` segments, in order.

**`RouteSegment.geometry: null` is legal** and means "draw a straight line". The map must
render a trip whose every segment has null geometry — that is the routing-failure path.

**`LocalizedText` is for *content*** (POI stories, tips, adaptation headlines). Product UI
strings live in `src/lib/i18n/messages/*`. Do not mix the two.

## Provider contracts

| File | Interface | Implemented by |
|---|---|---|
| `src/lib/ai/types.ts` | `AIProvider`, `TranscriptionProvider`, `SocialContextProvider` | AI/Data |
| `src/lib/routing/types.ts` | `RoutingProvider` | Trip/Map |
| `src/lib/matching/types.ts` | `TripEngine` | AI/Data |
| `src/lib/adaptation/types.ts` | `Adapter` | Trip/Map |
| `src/lib/storage/index.ts` | `storage` (implemented) | Lead |

Rules for every provider:

- Accept an optional `AbortSignal`; the caller enforces the timeout from `TIMEOUTS`.
- Normalise into the shared domain types. A React component must never see a provider's
  raw response shape.
- Never throw for an expected failure. Return the fallback, or `null` where the contract
  allows it.
- Model IDs and base URLs come from `src/config/env.ts`, never from business logic.

## Shared implementations you must reuse

**`src/lib/routing/metrics.ts` — Lead-owned, used by both the trip engine and the
adaptation engine.** `calculateMetrics(stops, segments)` is the *only* place route
numbers are computed. If the trip engine and the Less Walking adapter each do their own
arithmetic, the before/after headline on stage will be wrong. `haversineMeters`,
`estimateDurationMinutes` and `estimateCostMad` live here too.

**`src/lib/validation/trip-profile.ts`** — `parseTripProfile()` is the only sanctioned way
to accept model output. It never throws; unparseable JSON yields an empty profile and the
user still gets a trip from what they picked by hand.

**`src/lib/storage/index.ts`** — the only module that touches `localStorage`. Reads are
guarded and versioned (`siyaha:v1:`). Do not call `localStorage` anywhere else.

**`src/lib/store/index.ts`** — the one Zustand store. Add a slice by extending `AppState`,
never by creating a second store.

## Golden fixtures

`src/data/fixtures/**` (Lead-owned) holds the demo safety net: `GOLDEN_POIS`,
`GOLDEN_PROFILE`, `GOLDEN_TRIP`, `GOLDEN_LESS_WALKING`. Use `cloneGoldenTrip()` /
`cloneGoldenLessWalking()` when you need to mutate.

These are **not** the curated dataset. The 25 researched POIs go in `src/data/pois.ts`
(AI/Data worker). Fixtures exist so every worker can build against real-shaped data on
hour one, and so the demo survives total provider failure.

`src/lib/__tests__/golden-fixtures.test.ts` locks the numbers the presenter says out loud.
If you change a fixture, that test tells you what you just broke.
