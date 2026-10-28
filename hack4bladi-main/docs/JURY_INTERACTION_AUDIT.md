# Jury Interaction Audit

Method: source read of every handler in `src/`, plus a real headless Chrome at 390×844 driven
over CDP (`scripts/jury/driver.mjs`). Every control on all seven screens was enumerated at four
scroll positions and hit-tested with `document.elementFromPoint` — a control counts as reachable
only when its own centre is the topmost element there. Dates: 2026-08-29.

> **Concurrency warning.** Another Claude session was editing this repository throughout the
> audit (icon-library migration, Home/Passport rewrites). It twice left the tree in a state where
> **every route returned 500**: `layout.tsx` used `IconProvider` with no import, and
> `passport-screen.tsx` kept importing `lucide-react` after the dependency was removed. Both were
> repaired (the second one concurrently by that session). That session then committed the whole
> working tree — its own UI resync and these fixes together — as `2da666d`. Every number below
> was re-measured against that commit. **Re-run `pnpm jury:smoke` after any further edits.**

## Canonical flow

**PASS.** Home → inspiration → onboarding → processing → trip → start trip → experience → story
→ adapt (less walking) → undo → continue. Run end-to-end repeatedly with fresh storage, in EN and
AR, and with every `/api/*` call and every map tile blocked. Click → `/trip` measured at ~4.4 s
including the deliberate 2.4 s processing floor.

## Click inventory summary

Enumerated across `/`, `/onboarding`, `/trip`, `/experience`, `/explore`, `/saved`, `/passport`
at scroll 0 / 350 / 700 / bottom, on the final tree.

| | Before | After |
|---|---|---|
| Total interactive controls | 93 | **119** |
| Safe (reachable, fires the right action) | 82 | **119** |
| Dead (looks live, does nothing) | 26 | **0** |
| Misleading (does less than it claims) | 3 | **0** |
| Blocked (another element takes the tap) | 11 | **0** |
| Partial | 3 | 3 (Adapt: 1 of 4 modes is real, and says so) |
| Disabled (correctly) | 1 | 1 (`Visited` on a stop already visited) |
| Uncaught console errors, all screens | 0 | **0** |

The count rose because 25 Explore cards and 4 map pins became real controls.

**The 26 dead surfaces** were the 25 Explore POI cards (bare `<article>`, no handler anywhere)
and the Profile screen's "Help & support" row.

**The 3 misleading** were the place-sheet heart (local `useState`, lost on close), "Reset my data"
(cleared the trip in memory but not in storage, and never touched the stamps its own copy
promised to clear), and the Saved empty state's "places you keep from Explore" with no producer.

**The 11 blocked** had three root causes: the Next.js dev overlay portal sitting exactly on the
**Home tab** on all five tabbed screens; the `/trip` map's callout, "Navigate", "View stop" and
recenter button plus two pins landing under the sticky action bar and tab bar at scroll 0; and
the `/experience` "Next stop" row under its sticky footer. See *Remaining unsafe interactions*
for what is left of the third cause.

## Redirect problems fixed

| From | Was | Now |
|---|---|---|
| `/trip` map back arrow | `router.back()` — on a directly-opened `/trip` this walked the jury **out of the application** (verified: landed on `about:blank`) | `router.push("/")`, matching every other back control in the product |
| `/passport` "Reset my data" | Cleared the trip in memory but not in `localStorage`; the old day walked back in on the next reload | `resetAll()` clears trip, profile, stamps and saved places in state *and* storage |

Every other transition was audited and left alone: `Home → /onboarding` (six entry points),
`/onboarding → /trip` (in-place processing, URL unchanged, so Back from `/trip` lands on the
onboarding step, not on a re-run), `/trip → /experience`, `/experience → /trip`, all four tabs,
`/passport → /saved|/explore|/onboarding?new`. No redirect loops, no `useEffect` ping-pong: the
only automatic navigation in the product is `ProcessingScreen.onReady`, which is guarded by a
`cancelled` flag and fires once.

## Dead ends fixed

- **Explore's 25 POI cards.** Photo, name, city, category — and no handler at all. They now open
  the existing place sheet (photo, story, opening hours, price, Save, Navigate) with one extra
  CTA, **"Build a day around this"**, which patches the profile with that POI as the inspiration
  and enters onboarding. Verified end-to-end: tapping *Lagune de Oualidia* builds a real
  four-stop Oualidia day.
- **The place-sheet heart.** It was `useState(false)` — it filled in, the sheet closed, the
  choice was gone. It is now a persisted `savedPoiIds` slice in the store.
- **`/saved`.** Its empty state promised "places you keep from Explore land here" with no way to
  keep anything. It now renders a **Places you kept** section above the visited places, and both
  open the same place sheet.
- **Profile → "Help & support".** A settings row with no href and no handler, styled like the two
  real rows above it. Removed — there is no help screen to send anyone to.

## Double-click risks fixed

None needed fixing; all were verified safe rather than assumed.

| Action | Rapid-tap result |
|---|---|
| Start trip ×4 | One navigation, `history.length` unchanged — the App Router coalesces identical pushes |
| Build my trip | `setBuilding(true)` is idempotent; `ProcessingScreen` runs its effect once and navigates once |
| Less walking ×3 | Guarded by `pending`; one adaptation, one snapshot, one banner |
| Undo ×3 | Guarded by `tripBeforeAdaptation`; the second call is a no-op |
| Read the story ×3 | One `dialog[open]`; `showModal()` is idempotent |
| Visited | Idempotent by `poiId` — no duplicate stamp; the button also disables itself |
| Popular preset / map pin / timeline row | Pure state writes, no mutation to duplicate |

## Route guards

Two, both pre-existing and both kept after review. No new redirect logic was added — the brief's
"one navigation decision, once" rule is already satisfied.

| Route | Problem | Expected state | Fallback | Why |
|---|---|---|---|---|
| `/trip` | Jury opens the Trip tab before building anything | a trip in the store | seeds the golden Casablanca day once hydrated | The tab must never be a dead screen, and this is the same day the fallback ladder already produces — no hidden state a later screen can trip over |
| `/experience` | Landed on directly | a trip **and** `mode === "experience"` | `startTrip()` when a trip exists; an honest "No day yet → Plan my day" when it does not | Deliberately *not* seeded: a running day with nothing behind it is the logically impossible state the brief warns about |

Added: `/experience` now waits for `hydrated` before deciding. It previously rendered the empty
state on the first client paint, so a refresh could flash "No day yet" over a running day.

Added: `/trip` resolves the stop before opening the place sheet, so a stale `activeStopId` can no
longer open a sheet on nothing.

## Back / Forward results

| Step | Back | Forward |
|---|---|---|
| Recognition reveal | leaves onboarding to `/` — the reveal unmounts, no orphan overlay | returns to a clean composer |
| Onboarding step 2 / 3 | header back steps 3→2→1→`/` | fine |
| Processing | `/` — the build is cancelled, no navigation fires afterwards | re-enters onboarding at the right step |
| `/trip` | `/onboarding` at step 2, trip intact | `/trip` |
| `/experience` | `/trip`, four stops intact | `/experience`, running day intact |
| Story sheet open | closes the sheet **and** leaves the page; `dialog[open] = 0`, no vaul overlay, `body` pointer-events normal, the next screen's CTA hit-tests OK | fine |
| Adapt sheet open | same — nothing orphaned | fine |

`history.length` after the full canonical flow: **5** for five real steps. No pollution.

## Refresh results

| Screen | Result |
|---|---|
| Home | RECOVERS |
| Onboarding step 2 / 3 | RESETS SAFELY — returns to the step the profile justifies (step 2 once a source exists); nothing is lost that was not already in the profile |
| Processing | RESETS SAFELY — back to the onboarding step; the build simply re-runs |
| `/trip` | RECOVERS — same day, same metrics |
| `/experience`, stop 1 active | RECOVERS |
| `/experience`, after visiting stop 1 | RECOVERS — visit state and stamps survive |
| Adapt result | RECOVERS — the adapted day is what is persisted; Undo survives only in memory, which is correct (a refresh is not an undo) |

## Direct-route results

Fresh `localStorage`, typed straight into the address bar.

| Route | Verdict | Behaviour |
|---|---|---|
| `/` | VALID | |
| `/onboarding` | VALID | step 1, full composer, back → `/` |
| `/trip` | VALID | seeds the golden day; every control reachable |
| `/experience` | VALID | "No day yet" + "Plan my day" → `/`. Deliberately not seeded |
| `/explore` | VALID | 25 POIs, all cards now open a real sheet |
| `/saved` | VALID | honest empty state → Explore, which is now a real producer |
| `/passport` | VALID | profile, stamps count, rows to Saved / Explore / preferences, locale, reset |
| `/nope` | VALID | 404 inside the app shell with one way home |

## Chaos test

**PASS.** Three sequences, each from a fresh browser:

- **A — tab-masher:** Home → Trip → Profile → Back → Back → Inspiration → Back → refresh → Trip.
- **B — sheet and route churn:** `/trip` → View stop → `/explore` → open a card → Save → `/saved`
  → open the saved card → Back → Trip tab → Start trip.
- **C — out of order:** Start trip → jump to stop 3 → Visited → Adapt → Rainy day (rejected) →
  Close → Read the story → browser Back → switch to Arabic → `/passport` → refresh.

After each: no broken or empty screen, `dialog[open] + [data-vaul-overlay] = 0`, every tab bar
link still its own topmost element, `localStorage` trip parses with 4 stops, zero console errors,
and `/trip` still renders the complete day.

## E2E smoke

**PASS — 15/15 in ~46 s** (`pnpm jury:smoke`, `scripts/jury/smoke.mjs`), stable over three
consecutive runs (46.4 s / 46.2 s / 46.0 s).

No new dependency: the repo already drove headless Chrome over CDP (`scripts/cdp-shot.mjs`), so
the suite reuses that transport through a small shared driver. Selectors are accessible names and
`aria-label`s only — no `nth-child`, no generated class names, no pixel positions. Two
`data-testid`s were considered and neither was needed.

Covered: fresh Home · demo entry point → onboarding · onboarding → processing → trip · 4 valid
stops with coordinates, arrival times and 3 segments · Start trip → experience · story open/close
with no orphan overlay · Less walking + Undo (asserted against the persisted metrics, not the
text) · every bottom-nav destination plus `/explore` and `/saved` · Back/Forward across the core
path · refresh on `/trip` · refresh on `/experience` · pin ↔ callout ↔ timeline agree on one stop
and all four pins hit-test clean · no core CTA blocked · no uncaught console error · Arabic
navigation.

## Failure injection

Every `/api/*` request and every map tile rejected at `window.fetch`:

- Home renders, a preset reaches onboarding, **the trip still builds with 4 stops**.
- The map shows "Map unavailable — your day is right below" instead of a blank box.
- The weather chip simply does not appear.
- Start trip, the story sheet and Adapt all work.
- **Zero console errors.**

## Remaining unsafe interactions

None that are unsafe. Three that are worth knowing:

1. **Content scrolls under the sticky action bar at rest (P2).** On `/trip` the map's lower half —
   including its callout and recenter button — sits behind the footer + tab bar until you scroll
   once; same for the "Next stop" row on `/experience`. The chrome is ~95 % opaque, so the tap
   always does the visible thing (it never fires the hidden control), and one scroll frees
   everything. Fixing it properly means moving the map above the result card, which is a layout
   decision, not an interaction bug.
2. **Navigate leaves the product.** By design: `window.open` to Google Maps, or Apple Maps on a
   Mac or iPhone — which launches the desktop Maps app. Correct product behaviour, poor stage
   behaviour. Listed in the runbook's "avoid" section.
3. **Map attribution links are 10 px tall** at the map's bottom edge. Legally required, and
   deliberately out of the way; hard to hit by accident and behind the fold on `/trip`.

## Features jury should avoid

See `docs/JURY_SAFE_RUNBOOK.md` — Adapt's three placeholder modes, the mic without
`GROQ_API_KEY`, any claim of live screenshot recognition without `GEMINI_API_KEY`, tapping
Navigate on stage, and lingering on Arabic numerals inside a sentence.

## Jury safety score

**93 / 100.**

- Canonical flow: 100 % reliable across repeated runs, both locales, and a full network outage.
- P0 interaction defects: **0** (two app-wide 500s were found and repaired during the audit).
- P1 defects on the hero path: **0**.
- Dead clickable controls on primary screens: **0** (was 26).
- Blocked controls anywhere, at any scroll position: **0** (was 9).
- Deductions: −4 for content resting under the sticky chrome on `/trip` and `/experience` at
  scroll 0; −3 for Adapt being 1 real mode of 4 and recognition being canned without a key.
