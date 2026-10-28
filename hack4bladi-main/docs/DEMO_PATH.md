# Golden Demo Path

The single most important flow in the repository. It must work with Gemini down, routing
down, weather down and social metadata down — on hotel Wi-Fi, on a projector.

Fixtures: `src/data/fixtures/**`. Invariants: `src/lib/__tests__/golden-fixtures.test.ts`.
**Edit the numbers here first, then the fixtures, then run the test.**

## The day

> **Two days live in this document.** What follows is the **golden fixture**
> (`src/data/fixtures/golden-trip.ts`) — the floor shown when generation fails or times
> out. It is unchanged and still all-walking.
>
> The day the engine now **generates** for culture + food is different, because every day
> is guaranteed a human stop (`ensureExperience` in `src/lib/matching/engine.ts`):
>
> | # | Stop | Kind |
> |---|---|---|
> | 1 | Quartier Habous | place |
> | 2 | Marché Central | place |
> | 3 | Cook Moroccan with a Local Family | food_experience |
> | 4 | Mosquée Hassan II | place |
>
> 4.2 km walking · one leg already by car · 390 MAD against the 400 medium cap ·
> **250 MAD of it reaches a local household** · Less Walking gives
> **58% less walking · ~21 min saved**. That is what the jury sees on stage; the numbers
> below are the fallback's.

Casablanca, four stops, all walking.

| # | Stop | Arrive | Duration | Coordinates |
|---|---|---|---|---|
| 1 | Quartier Habous | 09:30 | 75 min | 33.57746, −7.60639 |
| 2 | Marché Central | 11:30 | 75 min | 33.59483, −7.61201 |
| 3 | Espace Sacré-Cœur | 14:00 | 60 min | 33.59134, −7.62449 |
| 4 | Mosquée Hassan II | 15:40 | 90 min | 33.60847, −7.63260 |

Hassan II is anchored to the **16:00 guided visit** and the day ends into the sunset.
That anchor does not move — not for pace, not for adaptation.

## Fallback route metrics

| Segment | Mode | Distance | Duration |
|---|---|---|---|
| Habous → Marché Central | walk | 2.4 km | 30 min |
| Marché Central → Sacré-Cœur | walk | 1.5 km | 19 min |
| Sacré-Cœur → Hassan II | walk | 2.5 km | 33 min |

Totals: **6.4 km walking · 82 min moving · 300 min at stops · ~190 MAD** in known
admissions (Habous free, Marché Central free, Sacré-Cœur 40–60, Hassan II 140), plus food
and shopping.

If live routing answers, use the real response. If it does not, use exactly these.

## Adapt My Day → Less Walking

Same four stops, same order, **same arrival times** — the 16:00 anchor holds. Two long
walking segments become car; the saving is 40 minutes of *movement*, not 40 minutes off
the end of the day.

| Segment | Before | After |
|---|---|---|
| Habous → Marché Central | walk 2.4 km / 30 min | **car 3.0 km / 11 min** |
| Marché Central → Sacré-Cœur | walk 1.5 km / 19 min | walk 1.5 km / 19 min |
| Sacré-Cœur → Hassan II | walk 2.5 km / 33 min | **car 3.0 km / 12 min** |

| | Before | After |
|---|---|---|
| Walking | 6.4 km | **1.5 km** |
| Car | 0 | 6.0 km |
| Moving | 82 min | **42 min** |

**Headline: “77% less walking · ~40 min saved.”**

Animation: current route visible → user taps Less Walking → old route fades → new route
draws → segment 1 and 3 icons flip walk→car → timeline updates → metrics count up. Fast.
`changedSegmentIds` on the `AdaptationResult` tells the map exactly what to animate.

## 90-second run sheet

| Time | On screen |
|---|---|
| 0–10s | Home. Inspiration composer. Drop a Casablanca screenshot. |
| 10–20s | Recognition: place detected, tags extracted. No AI speech. |
| 20–30s | Onboarding: pick 2–3 interests, then time / budget / pace. |
| 30–40s | Processing: analyzing → matching → optimizing. |
| 40–55s | Reveal: map + timeline, 4 numbered pins, route drawn. |
| 55–70s | Start Trip → Experience Mode → open Hassan II cultural story, Listen. |
| 70–90s | Adapt My Day → **Less Walking** → route redraws, metrics animate to **58% / ~21 min** (the generated day; the fixture's own numbers are 77% / 40 min). |

## Rules for the demo

- The screenshot is **not** hardcoded. The app accepts reasonable tourism images
  generically. An emergency golden fallback exists and activates transparently — no
  visible "demo mode" is ever shown to the jury.
- Golden audio (EN/FR/AR, 30–60s) is prepared for all four stops. Never runtime TTS.
- Tier-1 media = these four POIs. Nothing else gets premium assets until the core works.
- After the controlled demo the jury may click freely. Free exploration must not crash,
  even where it is less polished.

## Pre-demo checklist

1. `pnpm verify` passes on `main`.
2. Airplane mode: Home → onboarding → trip → Start Trip → Less Walking, all render.
3. Four POI hero images and four audio clips load from `/public`.
4. Arabic switch flips the layout to RTL without breaking the map or the timeline.
5. Backup screen recording of the full 90 seconds exists.
