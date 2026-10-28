# Implementation Audit

Repository audited against `SIYAHA_APP_MASTER_QA.md`, which is the canonical
specification and overrides every earlier interpretation of the product.

**Method.** Per Q134 and Q136, nothing is graded from source code alone. Every P0 item
below was exercised in a **real GPU-backed Chrome** driven over the Chrome DevTools
Protocol against a clean `pnpm build` + `pnpm start`, clicking the actual buttons and
reading the resulting DOM, `localStorage` and network traffic. A component existing, a
route returning 200, or a button being present was never accepted as evidence.

Audit date: 2026-08-28. Commit at audit start: `4b7cc61`. All P0 items now PASS.

---

## Verdict summary

| # | P0 feature (Q128) | Before | After | Evidence |
|---|---|---|---|---|
| 1 | Home | PASS | PASS | 13 interactive elements, 7 images, **0 broken** |
| 2 | Inspiration composer | PASS | PASS | file input + drop + paste; "Paste a link", "Speak", "Just explore" all present |
| 3 | 3-step onboarding | PASS | PASS | Clicked through: STEP 1→2→3, "2 of 3 chosen", nothing mandatory |
| 4 | Vibe cards (6 distinct) | PASS | PASS | 6 tiles with images, **0 broken** — previously unverified |
| 5 | AI / fallback understanding | PASS | PASS | `/api/extract` returns `{ok:true,degraded:true}` with **no API key**; no infinite loader |
| 6 | 25-POI dataset | PASS | PASS | 25 POIs; golden 4 re-exported from fixtures so ids/coords cannot drift |
| 7 | Deterministic matching | PASS | PASS | Engine returns 4 stops for any profile, incl. empty; 21 unit tests |
| 8 | Exactly 4 stops | PASS | PASS | Generated trip had exactly 4 stops / 3 segments |
| 9 | **Golden Casablanca trip** | **BROKEN** | **PASS** | See finding **F1** |
| 10 | **Map renders** | **BROKEN** | **PASS** | See finding **F2** — was blank with 0 pins |
| 11 | 4 numbered pins | **BROKEN** | **PASS** | Pins 1–4 visible after F2 fix |
| 12 | Route line | **BROKEN** | **PASS** | Dashed walking line drawn after F2 fix |
| 13 | Timeline | PASS | PASS | Time, photo, name, duration, transport leg, state all render |
| 14 | Map ↔ timeline sync | PASS | PASS | Shared `activeStopId`; pins are clickable buttons |
| 15 | Start Trip | PASS | PASS | → `/experience`, stop 1 becomes `current` |
| 16 | Experience Mode | PARTIAL | PASS | See finding **F3** — Adapt was unreachable after Start Trip |
| 17 | Cultural story | PASS | PASS | Dialog opens with the real Habous story text |
| 18 | Navigate | PASS | PASS | `https://www.google.com/maps/dir/?api=1&destination=33.57746,-7.60639` |
| 19 | Visited | PASS | PASS | `1:visited,2:current`; Passport stamp "Quartier Habous" persisted |
| 20 | **Less Walking** | MOCK-ONLY | **PASS** | See finding **F1** — worked on the fixture, not on a generated trip |
| 21 | Before/after metrics | PASS | PASS | 6400→1500 m, 0→6000 m car, 82→42 min, "77% less walking · ~40 min saved" |
| 22 | Responsive mobile | PASS | PASS | 430px column renders correctly |
| 23 | Laptop projection | **BROKEN** | **PASS** | See finding **F4** |
| 24 | Reliable fallbacks | PASS | PASS | All routes 200 and degrade with zero API keys |
| 25 | No crashes | PASS | PASS | 0 console errors after fixes |

---

## Findings

### F2 — The map was blank. P0 BLOCKER (Q137). *Fixed — `c283bea`*

**Observed.** In real GPU-backed Chrome, `/trip` rendered a map container, a canvas and a
WebGL context, but **zero markers, zero tiles and zero route line**. It reported no error.

**Why it was invisible.** `map.on("error")` ignores everything after `loaded = true`, and
both the marker and route effects are gated on a `ready` flag set at the *end* of the
`load` handler. `load` never fired, so the failure was completely silent.

**Root cause.** Turbopack does not emit MapLibre's bundled tile-parsing worker. Its URL
resolved to the HTML page, so the worker died with *"non-JavaScript MIME type text/html"*
and no tile was ever parsed.

**The trap underneath it.** Copying `maplibre-gl-worker.mjs` to `public/` alone is not
enough — it opens with `import {...} from "./maplibre-gl-shared.mjs"`, so that sibling
404s to the HTML page and produces the identical MIME error one level down. Both files
must ship, side by side.

**Fix.** `setWorkerUrl("/maplibre-gl-worker.mjs")`, both files copied by
`scripts/sync-map-worker.mjs` on `predev`/`prebuild` so they cannot drift from the
installed version. Readiness is now marked *before* layer setup, so a paint-spec problem
costs the route line rather than the four pins, and layer failures are logged.

**Evidence after fix.** 6 `.pbf` tile requests, pins 1–4 visible, dashed route drawn.

> **Method note.** An early "canvas is 1 distinct colour" reading was a false signal:
> `readPixels` returns blank when `preserveDrawingBuffer` is false, which is MapLibre's
> default. Compositor screenshots are the reliable check; that mistake is recorded here so
> it is not repeated.

### F1 — The golden route was never produced by the real flow. *Fixed*

Less Walking's headline numbers were **MOCK-ONLY**: they appeared only when landing on
`/trip` with an empty store, which loads the fixture. Walking the actual product path
produced a different, mostly-car day on which the demo cannot be performed.

Clicking Culture + Food + Full day + Medium + Balanced generated:

```
Ancienne Médina → Marché Central → Mosquée Hassan II → Corniche Aïn Diab
walking 1011 m · car 5893 m · movement 29 min
```

With only 1 km of walking there is nothing for Less Walking to save, so
**"77% less walking · ~40 min saved" could not appear in the 90-second demo** — breaking
non-negotiables #6 and #11 and five lines of the Q69 golden checklist.

The deeper cause was a contradiction inside the engine: `WALKING_COMFORT_METERS = 1800`
classified two of the three golden legs as CAR, while the specification's own golden day
(Q56) walks all three.

| Golden leg | Straight-line | Engine verdict at 1800 m | Spec (Q56) |
|---|---|---|---|
| Habous → Marché Central | 2000 m | CAR | **walk** 2.4 km / 30 min |
| Marché Central → Sacré-Cœur | 1219 m | walk | walk 1.5 km / 19 min |
| Sacré-Cœur → Hassan II | 2048 m | CAR | **walk** 2.5 km / 33 min |

### F3 — Adapt My Day was unreachable after Start Trip. *Fixed*

Q68 states that once the trip starts, the primary action **becomes** Adapt My Day.
`AdaptSheet` was mounted only in `src/app/trip/page.tsx`. Verified by clicking: no control
matching "adapt" existed anywhere in Experience Mode, so the demo could not adapt the day
once it was running.

### F4 — Desktop presented as a broken strip. *Fixed — `4b7cc61`*

At 1440px the 430px column was ivory-on-ivory with no edge or backdrop, reading as a
broken layout rather than the mobile experience projected on a laptop (Q135 "Responsive").

---

## P1 / P2 status (not blocking, recorded honestly)

| Item | Priority | State |
|---|---|---|
| Gemini / Groq providers | P1 | Written and wired; **never exercised against a real key** — none supplied. Fallback path proven. |
| EN / FR / AR + RTL | P1 | PASS — verified live, FR renders throughout |
| Cultural stories (golden 4) | P1 | PASS — EN/FR/AR present |
| **Cultural audio** | P1 | **MISSING** — `public/audio/` empty, no `audio` field on any POI, Listen hidden everywhere |
| Passport | P1 | PASS — stamp persisted through a real Visited click |
| Weather | P1 | PASS — live, degrades to hidden chip |
| Popular cards | P1 | PASS |
| **PWA service worker** | P1 | **MISSING** — manifest ships, no offline resilience (Q121) |
| **Hero video** | P1 | **MISSING** — zero video files |
| Share Card | P2 | Not built — correct, P0 came first (non-negotiable #18) |
| Explore | P2 | Not built — correct |
| Other 3 adaptations | P2 | Placeholders returning `applied:false` — correct per Q77 |


---

## Final golden-flow integration check

Clicked end to end in real GPU-backed Chrome against `pnpm build` + `pnpm start`, from a
cleared `localStorage`. No step was simulated.

| Step | Result |
|---|---|
| Home → Just explore | → `/onboarding`, prefilled to Your Vibe |
| Culture + Food | "2 of 3 chosen" |
| Full day / Medium / Balanced → Build my trip | → `/trip` |
| **Generated route** | **Quartier Habous → Marché Central → Espace Sacré-Cœur → Mosquée Hassan II** |
| Generated metrics | walking **6426 m**, car 0, movement 84 min, 300 min at stops, 180–200 MAD |
| Segment modes | `walking, walking, walking` |
| Map | tiles render, 4 numbered pins, dashed walking route |
| Start Trip | → `/experience`, stop 1 `current` |
| Cultural story | opens with the real Habous text |
| Navigate | `https://www.google.com/maps/dir/?api=1&destination=33.57746,-7.60639` |
| Visited | `1:visited, 2:current`; Passport stamp "Quartier Habous" persisted |
| **Adapt My Day in Experience** | opens (was absent before — F3) |
| **Less Walking** | walking **6426 → 1487 m**, car 0 → 6000 m, movement **84 → 42 min** |
| Segment modes after | `car, walking, car` |
| **Headline** | **"77% less walking · ~42 min saved"** with Undo |

`pnpm verify`: **PASS** — lint clean, typecheck clean, **82 tests**, production build green.

Map stability: 6 consecutive cold loads, first tiles in ~200 ms each. One earlier failure
was the first request after a server restart, not a defect.

### Two honest deviations

1. **"~42 min saved", not "~40".** That is the real number the engine computes (84 → 42),
   not a hardcoded string. The fixture path still shows exactly 40. The specification
   writes "~40 min", so this is inside its own tolerance.
2. **`engine.test.ts` "never returns a base route raw" was rewritten, not deleted.** Its
   original assertion — that the result never equals a template — cannot coexist with
   non-negotiable #6, which requires exactly the four curated Casablanca stops. It now
   asserts what Q52 is actually protecting: a different vibe yields a different day, and
   closing a curated stop makes the engine substitute. That is a stronger guarantee than
   string inequality, but it *is* a changed test and is flagged here deliberately.

### Still outstanding (P1, not blocking P0)

- **Cultural audio** — no files; Listen stays hidden.
- **PWA service worker** — manifest only, no offline resilience.
- **Hero video** — none.
- **Gemini / Groq** — wired but never exercised against a real key.
