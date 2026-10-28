# Generation flow — visual audit

Captured against the running dev server (`localhost:3000`) in headless Chromium via
Playwright, driving the real app. No source file was modified for this audit; latency was
simulated at the browser layer (request interception), never in application code.

- **Primary viewport:** 390 × 844 @2x, `isMobile`, touch
- **Also checked:** 375 × 812, 430 × 932
- **Locales:** en, ar (RTL)
- **Motion:** default and `prefers-reduced-motion: reduce`
- **Date:** 2026-08-30

---

## Screenshots captured

| File | State |
|---|---|
| `01-before-generation.png` | Onboarding step 3, "Build my trip" in view |
| `02-profile-stage.png` | Phase 1 — preference chips forming the profile |
| `03-candidate-scan.png` | Phase 2 — candidate stream, ~950 ms in |
| `04-match-stage.png` | Phase 3 — four stops scored with reason tags |
| `05-route-building.png` | Phase 4 — route drawing, ~500 ms in |
| `06-ready.png` | The "ready" beat |
| `07-trip-first-frame.png` | `/trip`, ~900 ms after arrival |
| `08a-handoff-start.png` | Handoff, first frame |
| `08b-handoff-middle.png` | Handoff, +160 ms |
| `08c-handoff-trip.png` | Handoff, first frame on `/trip` |
| `09-slow-generation.png` | 10 s simulated `/api/curate` latency, ~7.5 s in |
| `09b-slow-generation-later.png` | Same run, ~10 s in (past one full pass of the pool) |
| `10-partial-data.png` | Empty profile — no interests, no place, no transcript |
| `10b-partial-data-match.png` | Empty profile, scoring stage |
| `11a-arabic-before.png` | Arabic, before generation |
| `11-arabic-rtl.png` | Arabic, candidate stream |
| `11b-arabic-match.png` | Arabic, stream with Arabic POI names |
| `11c-arabic-route.png` | Arabic, route stage |
| `12-reduced-motion.png` | `prefers-reduced-motion: reduce`, scan phase |
| `12b-reduced-motion-later.png` | Reduced motion, later frame |
| `13-375x812-scan.png` / `13-375x812-route.png` | Small phone |
| `14-430x932-scan.png` / `14-430x932-route.png` | Large phone |

**Video:** not captured. Playwright video would have recorded the run, but the handoff is
~160 ms end to end (see CRIT-1), so sequential frames carry the evidence better.

---

## Overall verdict

```
Visual polish:                6/10
Motion quality:               4/10
Perceived intelligence:       6/10
Trust:                        5/10
Mobile-native feel:           6/10
Originality:                  7/10
Generation → trip continuity: 3/10
Demo readiness:               5/10
```

The concept is right and the *matching* stage is genuinely strong. But three of the four
stages have a concrete defect visible in a still frame, and the two moments the brief
called out as most important — the "ready" beat and the handoff into `/trip` — currently
do not exist as perceivable states.

---

## Top 5 strengths

1. **The scoring stage (`04`) reads as real work.** Four real place names, four different
   scores, reason tags, one emphasised row, and a truthful summary line underneath
   ("4 experiences · 5 h 39 · built around your preferences"). This is the screen that
   sells the product.
2. **The candidate names are real and specific.** "Meet the Habous Artisans", "Cook
   Moroccan with a Local Family", "Corniche Aïn Diab" — nothing reads as lorem or as a
   generic "Searching…". "22 places reviewed" is a defensible number.
3. **Slow-backend behaviour is healthy** (`09`, `09b`). At 7.5 s and 10 s the stream is
   still moving through distinct, real places. Nothing freezes, nothing visibly loops.
4. **Arabic RTL mirrors correctly** (`11`, `11b`). Verdict circles move to the right, text
   right-aligns, progress dots reverse, and POI names come through in Arabic from
   `localizedName`. No structural RTL breakage.
5. **The dark palette and restraint are right.** One accent colour, no gradients, no
   glassmorphism, no purple. It does not look like a template.

---

## Top 10 visual problems

### CRIT-1 — There is no "ready" moment

```
Severity: CRITICAL
Screen:   06-ready.png, 08a, 08b
```
**Problem:** By the time the headline swaps to "Your route is ready", the whole screen is
already at roughly 15 % opacity. `06-ready.png` is a near-black frame with ghost text. 160 ms
later the app is already on `/trip` (`08b`). The most important emotional beat in the flow
is never legible.

**Why it matters:** The brief's single most important evaluation was whether the ending
feels like *"your personalized trip is ready"* rather than *"the loader finished."* Right
now it reads as neither — it reads as the screen being switched off. The status footer also
still says "Build your route" at that moment, so nothing on screen says "done" except a
small tick.

**Suggested direction:** Give the ready state its own hold — headline and route fully
opaque, summary line promoted, *then* begin the dissolve. The fade and the phase change
must not start on the same frame.

---

### CRIT-2 — The route line renders broken

```
Severity: CRITICAL
Screen:   05-route-building.png, 13-375x812-route.png, 11c-arabic-route.png
```
**Problem:** The route draws as two disconnected strokes with stop 3 orphaned entirely: a
curve from 1 to 2 that overshoots past 2, a gap, then a floating stub into 4. It reproduces
at 390 px and 375 px, in English and Arabic, at different points in the animation — so it is
not a mid-draw frame, it is a rendering defect. The likely cause is the dash-based
`pathLength` animation running inside an SVG with `preserveAspectRatio="none"`: the stroke
dash pattern is computed in square user units and then non-uniformly stretched.

**Why it matters:** The route drawing itself is the payoff of the whole sequence and the
one thing meant to carry into `/trip`. A broken line makes the system look like it failed to
compute the day it just claimed to have optimised.

**Suggested direction:** Draw the path in a real coordinate space (uniform aspect, or
absolute pixel geometry) rather than a stretched unit box.

---

### CRIT-3 — Long preference chips are clipped off the card

```
Severity: CRITICAL
Screen:   02-profile-stage.png
```
**Problem:** "Local & Hidden Gems" renders as **"cal & Hidden Gems"** — the chip is
positioned at 10 % of the surface width, centred on that point, and the overflow is clipped
by the card. The very first thing the user sees on the new screen is one of their own
choices cut in half.

**Why it matters:** This is the "we understood you" moment, and it visibly fails to render
the user's own words. It will occur for any locale whose interest labels are long — which
is most of them (German, Portuguese).

**Suggested direction:** Constrain seats to keep chips inside the card, or lay the cluster
out from measured chip widths instead of fixed percentage anchors.

---

### HIGH-4 — Rejections are essentially never visible

```
Severity: HIGH
Screen:   03, 09, 09b, 11, 11b (five independent samples)
```
**Problem:** Every sampled frame of the scan stage shows only green ticks. Not one captured
frame — across two runs, two locales and three timings — shows a rejected candidate or a
rejection reason. The feed emits two accepts for every reject, and the reject often lands on
a row that is dimmed or still entering.

**Why it matters:** Selectivity is the entire trust argument of this redesign. Without a
visible ✗ and a reason, the stage is just a list loading with checkmarks — which is exactly
the "excessive green checkmarks" pattern the brief flagged as generic-AI. A reviewer looking
only at these screenshots will not see the feature at all.

**Suggested direction:** Raise the reject frequency and guarantee at least one rejection in
the first visible window; give the rejected row more visual presence, not less.

---

### HIGH-5 — The scan stage's information hierarchy is inverted

```
Severity: HIGH
Screen:   03-candidate-scan.png, 11-arabic-rtl.png
```
**Problem:** The row currently being evaluated enters at the bottom, blurred and near
transparent, and only becomes fully legible after its verdict has already landed and it has
moved up. In `03` the bottom row is illegible. The thin "scanner line" sits between rows 3
and 4 and reads as an arbitrary rule rather than a scan head.

**Why it matters:** The eye is drawn to the brightest thing, which is a row whose decision
is already made. The act of judging — the thing worth watching — is the least visible thing
on the card.

---

### HIGH-6 — The scan stage starts empty and stays empty for over a second

```
Severity: HIGH
Screen:   11-arabic-rtl.png, 12-reduced-motion.png
```
**Problem:** The stream fills from the bottom at one row per 340 ms, so for the first ~1 s
of the phase the 212 px card is 80 % empty. Under reduced motion this is catastrophic: the
stepper runs at 900 ms per row while the reduced-motion phase lasts ~260 ms, so the user
sees exactly **one** dimmed candidate and no verdict at all before the phase ends (`12`).

**Why it matters:** The phase whose whole job is "we are doing a lot of work" opens on an
empty box. Under reduced motion the feature effectively does not run.

**Suggested direction:** Pre-fill the window with already-judged rows so the card is full on
the first frame; tie the stepper interval to the active tempo rather than a fixed constant.

---

### HIGH-7 — Reason tags repeat across all four scored rows

```
Severity: HIGH
Screen:   04-match-stage.png
```
**Problem:** "Nearby" and "Easy on foot" appear on all four rows. Rows 1 and 3 carry
literally identical tag sets ("Culture & Heritage · Nearby · Easy on foot").

**Why it matters:** The tags are the evidence behind the score. When they are identical they
read as decoration generated from a template, which converts the strongest screen in the
flow into the most suspicious one.

**Suggested direction:** Prefer whichever facts *differentiate* a stop from the others in the
same day, rather than emitting a fixed priority order.

---

### MED-8 — The score emphasis is arbitrary and fights the reading order

```
Severity: MEDIUM
Screen:   04-match-stage.png
```
**Problem:** Scores span 85–98 and the "best fit" ring goes to 98 % over a 97 % — a
one-point difference carrying a full tint and ring. Worse, the rows are in the day's
chronological order but read as a ranking, so the list looks mis-sorted: the highlighted row
is second.

**Why it matters:** A ranked-looking list that is not ranked undermines the claim that the
system ordered anything carefully.

---

### MED-9 — A 44 px void sits between the work surface and the status bar

```
Severity: MEDIUM
Screen:   02, 03, 05, 09, 10, 12 (every generation frame)
```
**Problem:** The reserved height for the summary line is empty for the first two phases, so
the composition shows a card, a gap wider than any other gap on the screen, then the status
bar. Combined with a low-contrast "DID YOU KNOW?" block at the bottom, the screen reads
bottom-loose.

**Why it matters:** It is the difference between "composed" and "laid out". On a premium
mobile product the rhythm should not have one unexplained double gap.

---

### MED-10 — Secondary content is redundant or truncated mid-sentence

```
Severity: MEDIUM
Screen:   02, 04, 05
```
**Problem:** "DID YOU KNOW?" is clamped mid-word with an ellipsis ("…from the Hassan II
Mosque t…") on every frame; in Arabic it overflows its 60 px box to three lines. Once the
trip lands, the block becomes "FIRST FIND / Espace Sacré-Cœur" — which duplicates the first
row of the card directly above it.

---

## Generic-AI-aesthetic check

| Pattern | Present? |
|---|---|
| Excessive rounded cards | Borderline — three stacked 16 px cards + pill + chips |
| Floating pills everywhere | **Yes.** 6 chips + inspiration pill + 12 tag pills across the flow |
| Purposeless gradients | No |
| Random glowing nodes | **Yes.** Centre node glow (`02`) and four glowing route discs (`05`) |
| Generic radar/scanner motif | Avoided (the old radar was removed) |
| Glassmorphism | No |
| Arbitrary percentages | Partly — scores are derived, but 85–98 clustering reads arbitrary |
| Excessive green checkmarks | **Yes** — see HIGH-4; ticks are all the user ever sees |
| Fake technical language | No — copy stays human |
| Equal visual weight everywhere | No — hierarchy is generally good |

## Mobile-native feel

**Partly.** The type scale, the dark ground, the single accent and the absence of chrome do
read as an app rather than a web page. What breaks the illusion is motion quality, not
layout: a native product would not ship a clipped label, a broken route line, or an ending
that fades out before it can be read. It currently feels like a well-designed web prototype.

---

## Generation → trip continuity — **3/10**

**Compare `06-ready.png` → `07-trip-first-frame.png`.**

What holds up: the stop order and numbering are consistent, the mint discs on the generation
card use the same treatment as `/trip`'s map pins, and "Espace Sacré-Cœur" is stop 1 in both.

What does not:

- The final generation frame is already invisible (CRIT-1), so there is nothing for `/trip`
  to continue *from*.
- `/trip` opens on a stats header — eyebrow, city, `4 STOPS / ~4.2 km / ~54 min`, budget,
  a warning row — so the first thing the eye lands on after the dissolve is a metrics table,
  not the route that was just drawn. The route is pushed below that block.
- The generation route is a fixed decorative zigzag; it bears no relation to the real
  geometry on `/trip`, so even with a perfect transition the shapes would not match.

**Caveat:** the map tiles did not render in this sandbox (remote tile host unreachable), so
`/trip`'s map area is black in `07` and `08c`. The four numbered pins could not be verified
visually. WebGL itself is available, so this is a capture-environment limitation, not a
confirmed product defect — but it does mean the strongest continuity evidence is missing
from these screenshots.

---

## Three highest-priority fixes

1. **Give the ready beat real time and let the route survive into `/trip`.** (CRIT-1) —
   the single change with the largest effect on how the whole flow is judged.
2. **Fix the route line rendering.** (CRIT-2) — the payoff frame currently shows a broken
   path with an orphaned stop, in every locale and viewport.
3. **Make rejection visible, and stop the chip from clipping.** (CRIT-3 + HIGH-4) — one is
   the user's own words rendered wrong, the other is the entire trust premise going unseen.

*(Not implemented — per instruction, this pass is evidence only.)*

---

## Notes

- Two files changed on disk during this session from outside this work —
  `SIYAHA_JURY_INTELLIGENCE.md` and `src/app/trip/page.tsx` (which gained a "no trip → empty
  state" branch). `/trip` is therefore in flux; `07` reflects the version live at capture time.
- `07`/`08b` also show a pre-existing `/trip` layout collision: the day-glance sentence
  ("You've asked for a half day filled with culture and…") is overlapped by the sticky action
  bar and bottom nav. Outside the scope of this redesign, but a reviewer will see it.
