# Khotwa / Siyaha — Motion & Workflow Audit

Audited against the running app (`localhost:3000`, Chromium 390×844 / 320 / 375 / 430,
`prefers-reduced-motion` both ways), the full `src/` tree, and `docs/DEMO_PATH.md`.

Stack in place: **Motion v13** (`motion/react`), **vaul** (drawers), **native `<dialog>`**
(one sheet), Tailwind v4 utilities, one CSS keyframe (`pin-in`), one CSS press utility
(`pressable`). **No new animation library is needed and none is proposed.**

---

## 1. The flows that actually exist

| Brief | In the repo | Reality |
|---|---|---|
| A — First entry | `/` `HomeScreen` — video hero, search pill, 6 category tiles, 2 preset cards | Exists. The search pill is the most prominent control on the app. |
| B — Text | `InspirationComposer.launch()` → `understand({source:"text"})` → chips card at step 1 | Exists **only from `/onboarding?new`**. From the home search pill it does **not** run (see FF-1). |
| C — Image / screenshot | `handleFile` → `/api/analyze` → `RecognitionReveal` (full-bleed) | Exists, and is the best moment in the product. Also accepts paste + drag-drop (undiscoverable). |
| D — Voice | `VoiceCapture` → `/api/transcribe` → `understand({source:"audio"})` | Exists. States are `idle / recording / working / failed / unavailable`, expressed as an icon swap + a text line. |
| E — URL | `readSocialUrl` → `understand({source:"url"})` → reveal if a thumbnail came back, else the chips card | Exists. TikTok and Instagram are two rows opening one identical field. |
| F — Trip result | `/trip` — hero, metrics, `TripBrief`, `TripMap`, `TripTimeline`, `PlaceSheet`, `AdaptSheet` | Exists. Buried: the first itinerary row sits at y≈953 of a 844px viewport. |
| G — Exploration | `/explore`, `/explore/[category]`, `PlaceSheet`, `/saved`, `/passport` | Exists. Context is preserved (scroll survives sheet open/close). |
| — | `/experience` (running day), `/passport`, wallet | Exist; not in the brief but part of the demo. |

**Measured**: route transitions 58–96 ms. Understanding round trip ≈ 1.0 s. Processing
screen 2.5 s (`PROCESSING_MIN_MS = 2400`). No horizontal overflow at 320/375/390/430.
No page-level console errors (three 404s are missing preset images).

---

## 2. Workflow audit

| Flow / Screen | Current behaviour | Problem | User impact | Recommendation | Priority |
|---|---|---|---|---|---|
| Home → search pill | Stores the text as `transcript`, sets `sources:["text"]`, pushes `/onboarding`; `initialStep()` sees a source and **jumps to step 2** | The typed sentence is never sent to the understanding layer, and the screen that would show what was understood is skipped by the act of typing | The product's core promise is invisible from its most prominent input. "0 of 3 chosen" after a sentence naming food and art | Route to `/onboarding?new&analyze`, prefill, auto-run `understand`, land on the chips card | **P0** |
| Composer → analysing | The whole composer unmounts; a small card appears at the top of an empty screen; a bar tweens `width 12%→88%` over a fixed 2.4 s | Input destroyed (M4 violation), fake progress (§11 violation), the bar never completes, ~700px of empty black, layout collapse | The one moment that should read "your inspiration is becoming something useful" reads as "the app lost my text" | Keep the composer in place, dim it, show the input inside the processing card, replace the fake bar with an honest indeterminate sweep | **P0** |
| `/trip` reveal | Eyebrow, title, 144px hero, "At a glance", "Day check" (2 warnings), "The route", then the map at y=554 (354 tall, ~140px visible above the sticky footer), then the timeline at y=953 | The itinerary — the deliverable — is below the fold. The timeline's staggered entrance plays entirely off-screen. `Day check` opens with two warnings before the day has been seen | The jury sees numbers and warnings, not a trip. The result reveal is spent on invisible content | Compact the pre-map block (~200px), collapse `Day check` to its headline by default | **P0** |
| Adapt → Less walking | Sheet closes, banner + metrics update at scrollTop 0; the map is a 90px sliver, the timeline is off-screen | `docs/DEMO_PATH.md` names the route redraw as the animation. It plays where nobody can see it | The demo climax is a text banner | Scroll the map into view as the adaptation lands | **P0** |
| Timeline ↔ map | Tapping a row selects **and** opens `PlaceSheet`. Tapping a pin selects only | You cannot select a stop to see it on the map. The map never moves to the selection; the timeline never scrolls to a tapped pin | The two halves of the day feel unrelated (M6 failure) | Pin tap → scroll that row into view; row select → ease the map to that stop | **P1** |
| Composer idle | Textarea + mic in one card, then 4 separate rows, then the CTA | Reads as unrelated buttons, not one input object. TikTok and Instagram are the same control twice. Paste/drop is supported but unadvertised | Choice paralysis at the product's front door | Merge the two link rows; animate row expansion; hint paste/drop | **P1** |
| CTA "Launch AI analysis" | With an empty composer it silently skips to step 2 | The button names an action it does not perform | Confusion on the very first tap | Change the label when there is nothing to analyse | **P1** |
| Voice | Icon swap + a text line; no level, no listening state, no processing state on the button itself | The single most "magic" input has the least feedback | Users do not know it is listening | Add a listening ring (scale/opacity only) and a busy state on the button | **P1** |
| Onboarding step 2/3 | Chips and image tiles, instant | Fine. Step 3 pre-fills three defaults on arrival with no acknowledgement | Mild — a user may not notice choices were made for them | Leave. Note only | P3 |
| Back navigation | `/trip` back → `router.push("/")`; sheets close with Escape/scrim; scroll survives | Correct and deliberate | — | Keep | — |
| Bottom nav | `transition-colors` only | No press acknowledgement anywhere in the tab bar | Taps feel unregistered on a phone | Add press feedback | **P1** |

---

## 3. Motion inventory

| Component | Existing motion | Verdict | Proposed | Purpose |
|---|---|---|---|---|
| `components/motion.ts` `rise()` | y 12→0, opacity, 0.34 s ease-out, stagger 60 ms capped at 6 | **KEEP** | Add a reduced-motion branch (no delay, no y) | It is already the product's one agreement |
| `PageShell` `MotionConfig reducedMotion="user"` | Motion strips transforms only | **IMPROVE** | Opacity + delay must also go; the file comment claims it is neutralised, and it is not | §16 compliance |
| Composer "analysing" bar | `width 12%→88%`, 2.4 s | **REPLACE** | Indeterminate transform sweep, honest, no fake percentage | §11 |
| Composer "analysing" card | Replaces the whole screen | **REPLACE** | In-place transformation of the composer | M4 |
| `RecognitionReveal` | Fade 0.32 s + copy rise 0.34 s @0.12 delay | **KEEP** | — | The signature moment already works |
| `ProcessingState` radial | Ring pulse 3.2 s ∞, centre pulse 2.2 s ∞, 5 nodes fading in to 1.18 s | **IMPROVE** | Compress node reveal to ≤0.9 s so it completes inside the 2.4 s window; carry the user's inspiration | Continuity, and finishing what it starts |
| `ProcessingState` checklist | `transition-colors 500ms` | **KEEP** | — | Calm and honest |
| `TripTimeline` rows | y 12→0, 0.35 s, stagger 80 ms | **IMPROVE** | Use `rise()`; it currently plays off-screen | One entrance, seen |
| `TripMetrics` `useCountUp` | 700 ms cubic ease-out, reduced-motion aware | **KEEP** | — | Exemplary |
| Map pins `animate-pin-in` | scale 0.3→1, 420 ms, staggered 90 ms, once | **KEEP** | — | Correct: once on reveal, never on adapt |
| Map active pin | `transition-[width,height]` 200 ms | **IMPROVE** | Animating width/height is layout work; use transform scale | §17 |
| Map route redraw | opacity 0 → setData → opacity 1, 220 ms, gated on a real mode change | **KEEP** | Make it visible (scroll) | The one motion that carries the demo |
| `BottomSheet` (native dialog) | spring 320/32 | **KEEP** | — | — |
| `vaul` `PlaceSheet` / `AdaptSheet` | Library default | **KEEP** | — | Two sheet systems is a smell, not a bug — leave for after the demo |
| `RewardToast` | y 14, 0.28 s, `AnimatePresence` | **KEEP** | — | Restrained, correct |
| `Splash` | 900 ms hold + 420 ms fade, once per session, skipped under reduced motion | **KEEP** | — | — |
| `Button` | `active:scale-[0.985]`, `transition-… duration-200` | **IMPROVE** | Align with `pressable` (0.97 + opacity, 120 ms) | Two press languages in one product |
| `pressable` | 120 ms, scale 0.97 + opacity, reduced-motion aware | **KEEP / EXTEND** | Applied on 17 elements; missing on the composer rows, nav tabs, adapt tiles, "Fix it", sheet buttons | Every tap must be acknowledged |
| Source-row expansion | none | **MISSING** | Height + opacity reveal, chevron rotate | The row must own what it opened |
| Voice button | none beyond an icon swap | **MISSING** | Listening ring, busy state | The state must be unmistakable |
| Bottom nav | `transition-colors` | **MISSING** | Press feedback | — |
| Tailwind bare `transition` | ~40 sites, default 150 ms `ease-in-out` | **IMPROVE** | Motion tokens | One vocabulary |
| `explore` shelf stagger | `rise(index)` inside horizontal carousels | **IMPROVE** | Cap at what is visible (~2 cards) | Staggering off-screen cards buys nothing |

---

## 4. Flow friction report — the ten that matter

### FF-1 · The home search never reaches the AI
**Evidence** `home-screen.tsx:37-48` patches `transcript` + `sources:["text"]` and pushes
`/onboarding`; `steps.ts:17` `initialStep()` returns 2 because a source exists; nothing
calls `understand()`. Verified: a sentence naming street food and art produced "0 of 3 chosen".
**Consequence** The product's thesis is unobservable from its front door.
**Change** Send it through the composer with auto-analysis.
**Improvement** Every text path produces the same interpretation and the same confirmation.
**Complexity** LOW · **Demo risk** LOW

### FF-2 · The analysing state destroys the user's input
**Evidence** `inspiration-composer.tsx:282-310` — an early return replaces the whole
composer; `reading === "text"` renders no preview at all.
**Consequence** M4 broken at the exact moment it matters; a screen of empty black.
**Change** Keep the composer mounted and transform it in place.
**Improvement** "Your inspiration is becoming something useful" becomes literal.
**Complexity** MEDIUM · **Demo risk** LOW

### FF-3 · Fake progress
**Evidence** `inspiration-composer.tsx:299-305` — `width: "12%" → "88%"` over a fixed 2.4 s
with no relation to the request, which finishes in ≈1.0 s. It also animates `width`.
**Consequence** Violates §11 and §17 at once, and the bar visibly stalls.
**Change** Indeterminate transform sweep.
**Complexity** LOW · **Demo risk** LOW

### FF-4 · The itinerary is below the fold on the itinerary screen
**Evidence** Measured: map top 554, first timeline row 953, viewport 844, footer+nav ≈150.
**Consequence** The result reveal and its stagger play where nobody looks.
**Change** Compact the pre-map block; collapse `Day check` to its headline.
**Complexity** MEDIUM · **Demo risk** MEDIUM
### FF-5 · The demo climax animates off-screen
**Evidence** After Less Walking, `scrollTop` is 0; `map-canvas.tsx:316-351` fades and
redraws the route inside a ~90px visible sliver.
**Change** Bring the map into view as the adaptation lands.
**Complexity** LOW · **Demo risk** LOW

### FF-6 · Map and timeline are linked in state but not in space
**Evidence** `map-canvas.tsx:305-312` only restyles the pin; `trip/page.tsx:141-152` never
scrolls. `timelineAnchorId()` exists and is unused.
**Change** Pin tap scrolls its row into view; selection eases the map.
**Complexity** LOW · **Demo risk** LOW

### FF-7 · Reduced motion still animates and still delays
**Evidence** With `prefers-reduced-motion: reduce`, timeline opacities at 400 ms are
`[0.24, 0, 0, 0]`. Motion's `reducedMotion="user"` strips transforms, not opacity or delay.
The comment in `motion.ts` asserts the opposite.
**Change** Branch `rise()` and the timeline on the media query.
**Complexity** LOW · **Demo risk** LOW

### FF-8 · Half the interactive surface has no press feedback
**Evidence** `pressable` on 17 elements; absent from `SourceRow`, the file-picker label,
`BottomNav`, `LocaleSwitch`, the adapt tiles, "Fix it", `PlaceSheet`'s round buttons and CTA,
`Undo`. `Button` uses a different, weaker press.
**Change** One press language, applied everywhere.
**Complexity** LOW · **Demo risk** LOW

### FF-9 · Voice has five states and one visual
**Evidence** `voice-capture.tsx:58-85` — variant swap and a text line.
**Change** Listening ring + busy state on the button itself.
**Complexity** LOW · **Demo risk** LOW

### FF-10 · The composer is a list, not an instrument
**Evidence** Two rows (`tiktok`, `instagram`) render the identical `linkField` and call the
identical `submitLink`; `readSocialUrl` does not branch on platform. Expansion is an
unanimated layout jump; the chevron never turns. Paste and drop work and are unadvertised.
**Change** Animate the disclosure; rotate the chevron; hint paste. (Merging the two link
rows is recommended but held back — the platform names carry demo value.)
**Complexity** LOW · **Demo risk** LOW

---

## 5. What is already right — do not touch

`useCountUp`. `pin-in` firing once and never on adaptation. The route fade gated on a real
mode change. `RecognitionReveal`. `RewardToast`'s restraint. The `rise()` stagger cap at six.
The golden-fixture floor on `/trip`. The `app-anchored` overlay pinning. Scroll survival
across sheets. Deterministic back on `/trip`.

---

## 6. What was implemented

Five batches. `pnpm lint`, `pnpm typecheck` and `pnpm test` after each; `pnpm verify`
(including `next build`) at the end. Verified in Chromium at 320 / 375 / 390 / 430, with
`prefers-reduced-motion` both ways, over the full `docs/DEMO_PATH.md` run.

### Phase 1 — workflow blockers

**`home-screen.tsx`** · Search pill routes to `/onboarding?new&analyze` instead of
`/onboarding`, and no longer marks a source. **Before**: the sentence was stored and the
wizard skipped to step 2 — "street food and art" arrived at *0 of 3 chosen*. **After**:
"Ancienne Médina · in Casablanca · Food · Art & Creative · Culture & Heritage · Half day ·
Keep it short". **Why better**: every modality now proves it was understood before the
traveller is asked for anything else.

**`onboarding-flow.tsx`** · Reads `?analyze` and passes `autoStart` to the composer.

**`inspiration-composer.tsx`** · `launch()` split into `readText()`, which the auto-start
effect calls once (ref-guarded against React's double-invoke). The analysing state no
longer unmounts the composer: the same bordered card stays in place holding the traveller's
own sentence, photo or link, with the state line and the sweep inside it. **Why better**:
M4 — the input is the context; destroying it reads as losing it.

**`globals.css` `analysing-track` / `analysing-bar`** · Replaces `width: 12% → 88%` over a
fixed 2.4 s. **Before**: a fake percentage on a layout-animating property that visibly
stalled, since the request finishes in ≈1.0 s. **After**: an indeterminate transform sweep;
under reduced motion the track simply fills. **Why better**: §11 and §17 both.

### Phase 3 — core transitions

**`trip-map.tsx` `revealRouteMap()` + `ROUTE_MAP_ID`**, called by `adapt-sheet.tsx` and by
`trip-brief.tsx`'s "Fix it". **Before**: Less Walking redrew the route inside a ~90 px
sliver at `scrollTop 0`. **After**: the map scrolls to centre; all four pins, the redraw
and the "77% less walking" banner are on screen together. **Why better**: the effect of an
action has to be where the action left the reader.

**`trip-timeline.tsx` `revealTimelineStop()`**, wired to the map's `onSelectStop` on
`/trip`. **Before**: a pin tap restyled the pin. **After**: it brings that stop's row into
view. **Why better**: M6 — causality between the two halves of the day.

**`map-canvas.tsx`** · A pin outside the frame eases into it (never when already visible).
The active pin grows by `transform: scale` on a fixed 36 px box instead of animating
`width`/`height`. Markers gained a third element so the entrance's `fill-mode` cannot pin
every marker at its selected size.

**`trip-timeline.tsx`, `explore-screen.tsx`, `category-screen.tsx`** · `riseInView` instead
of `rise` for anything below the fold. **Before**: the /trip cascade played and finished at
y≈953 of an 844 px viewport. **After**: it plays once, when scrolled to.

**`trip/page.tsx`** · "At a glance" heading removed, hero 144 → 128 px, header wrapped in
`rise(0)`. **`trip-brief.tsx`** · at most two rows at rest, whatever the day is.

### Phase 2 / 5 — feedback and micro-interactions

**`globals.css`** · Motion tokens (`--ease-out`, `--duration-fast|ui|navigation|emphasis`),
and `--default-transition-duration` / `--default-transition-timing-function` re-pointed so
the ~40 bare `transition` utilities use the product's curve rather than Tailwind's 150 ms
ease-in-out. `pressable` rewritten against the tokens and widened to cover colour.

**`button.tsx`** · `pressable` replaces `active:scale-[0.985]`. One press language.

`pressable` added to: bottom-nav tabs, locale switch, the header back control, composer
source rows and file picker, adapt tiles, "Fix it", "Show more", Undo, place-sheet round
controls, the home search submit, the bottom-sheet close.

**`inspiration-composer.tsx`** · `Disclosure` (height + opacity, 200 ms) and a chevron that
turns to face what it opened. CTA reads "Continue" when there is nothing to analyse. The
`tiktok` and `instagram` rows merged into one "From TikTok or Instagram" — they opened the
same field and called the same `submitLink`; `readSocialUrl` never branched on platform.
New key `home.fromSocial` in en / fr / ar.

**`voice-capture.tsx`** · A breathing ring behind the button while recording, a turning
notch while transcribing, and a status line for both. Reduced motion holds a steady halo.

### Phase 4 — the signature moment

**`processing-screen.tsx` / `processing-state.tsx`** · The screen carries the traveller's
own words (the detected place, else their sentence). Checklist beats 950/1800 → 750/1550;
node reveal `0.3 + i × 0.22` → `0.24 + i × 0.15`, so the entrance completes at ~1.0 s of a
2.4 s screen instead of 1.78 s.

### Phase 6 — accessibility and performance

**`motion.ts`** · `prefersReducedMotion()`, and both `rise` and `riseInView` return nothing
when it is true. **Before**: timeline opacity `[0.24, 0, 0, 0]` at 400 ms with reduced
motion on — `MotionConfig reducedMotion="user"` strips transforms, not opacity or delay,
and the file's own comment claimed otherwise. **After**: `[1, 1, 1, 1]`. Both new CSS
animations carry explicit reduced-motion resting states. Every animated property in the new
work is `transform` or `opacity`.

## 7. The motion system, as it now stands

| Token | Value | For |
|---|---|---|
| `--duration-fast` / `DURATION.fast` | 120 ms | a control acknowledging a tap (M1) |
| `--duration-ui` / `DURATION.ui` | 200 ms | a component changing state in place (M2) |
| `--duration-navigation` / `DURATION.navigation` | 340 ms | content arriving from somewhere (M3) |
| `--duration-emphasis` / `DURATION.emphasis` | 500 ms | the few moments meant to be noticed |
| `--ease-out` / `EASE_OUT` | `cubic-bezier(0.16, 1, 0.3, 1)` | anything settling into place |
| `--default-transition-*` | 160 ms, `--ease-out` | every bare Tailwind `transition` |

Rules: springs only where something physical moves (the two bottom sheets, and nowhere
else). Stagger capped at what the reader can see. One continuous animation in the product —
the listening ring — and it stops when listening does. Anything below the fold enters on
`whileInView`, once. `transform` and `opacity` only.

## 8. Still open

- The generated day can still be over budget or run past the stated time at the reveal.
  That is the matching engine, not motion; `Day check` reports it honestly and offers the
  fix, which is the right behaviour but not a good first impression.
- Two overlay systems (vaul and native `<dialog>`). Behaviourally fine; converge after the
  demo.
- The `/trip` first timeline row still sits just below the fold. Closing that gap means
  moving the hero or the map, which is an information-architecture decision, not a motion
  one.
- The composer's paste and drag-drop support remains unadvertised.
