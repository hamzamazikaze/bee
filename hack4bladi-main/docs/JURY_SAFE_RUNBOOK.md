# Jury-safe runbook — Khotwa

Everything below was executed on 2026-08-29 against this tree. Nothing here is aspirational.

## Before the demo

```bash
cd /Users/abdelkbirnainiaa/Work/Siyaha_hackathon
git status                 # expect a clean-enough tree; nothing half-written
pnpm install               # only if package.json moved
pnpm dev                   # http://localhost:3000
pnpm jury:smoke            # 15 checks, ~46 s, must print 15/15
```

Production mode is the safer stage if you have five spare minutes:

```bash
pnpm build && pnpm start   # same URL, no dev overlay, no hot-reload hiccup
```

**Open `http://localhost:3000` in a normal window.** On a desktop screen the app renders as a
390×844 phone on a stage — that is the intended look, not a layout bug.

### Env keys

**None are required.** With no `.env.local` the product runs entirely on local data:

| Key | Missing → what happens |
|---|---|
| `GEMINI_API_KEY` | Screenshot recognition always answers "Hassan II Mosque, Casablanca". The reveal still plays. Do not claim live recognition without this key. |
| `GROQ_API_KEY` | The mic records, then shows "we could not hear that". The CTA is never blocked. |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Falls back to OpenFreeMap dark tiles (needs internet). |

Weather (Open-Meteo) and routing (public OSRM) need no key. All of them are optional:
**verified with every `/api/*` call and every map tile blocked, the full demo still runs** —
trip builds with 4 stops, the map swaps to "Map unavailable — your day is right below",
Start trip / story / Adapt all work.

## Golden demo sequence

Exact taps, in order. Every step below was run end-to-end in this tree.

1. **`/`** — tap the **"Culture in Casablanca"** card in *Popular*.
   (Equivalent openings: type in the search pill and hit the mint button; tap a category icon;
   tap the **Inspiration** tab for the full composer with the screenshot upload.)
2. **Onboarding step 2** — leave the two pre-selected vibes, tap **Continue**.
3. **Onboarding step 3** — leave Half day · Medium · Balanced, tap **Build my trip**.
4. **Processing** — ~2.5 s, three stages, then it lands on `/trip` by itself.
5. **`/trip`** — read the metrics, **scroll down once** so the whole map is visible,
   tap **pin 3** on the map (the callout, the timeline and the map all follow it),
   tap a **timeline row** for the place detail, then **back** inside the sheet.
6. **Adapt my day** → **Less walking** → the numbers rewrite and the banner appears →
   **Undo** restores them exactly.
7. **Start trip** → `/experience`.
8. **Read the story** → the cultural sheet → **Close**.
9. **Visited** → the stop is stamped and the next one becomes current.
10. **Profile** tab → the passport with the stamp.

## Safe recovery

| If | Do this |
|---|---|
| Screenshot analysis stalls or looks wrong | Tap **Try another**, or just tap **Build a day around this** — the reveal always offers a way forward. Or restart from a Popular card (step 1 above). |
| The trip build hangs | It cannot: there is a 10 s ceiling and it shows the Casablanca day anyway. Wait. |
| The map is blank or grey | The day is complete without it — scroll to the timeline and carry on. Tap the mint **recenter** button to re-fit. |
| Someone refreshes the browser | Nothing is lost. `/trip` and `/experience` both come back with the same day, the same adaptation and the same stamps. |
| Someone taps around and gets lost | Any screen: the **Trip** tab always returns to a complete day (it seeds the Casablanca day if the store is empty). |
| The whole thing looks wrong | `Profile → Reset my data → Reset my data` clears trip, preferences, stamps and saved places, then start again at step 1. |
| Browser Back / Forward | Safe at every step of the flow; verified there and back again. |
| A sheet will not close | Tap **Close**, the X, or the dimmed area; Escape works too. Browser Back also closes it and leaves nothing behind. |

## Avoid during the demo

Only things that are genuinely partial. Nothing here is hidden — say it plainly if asked.

- **Adapt → Less time / Spend less / Rainy day.** Only **Less walking** rewrites the day.
  The other three answer honestly ("nothing to improve here") rather than faking a result.
- **Speak (the mic).** Without `GROQ_API_KEY` it records and then reports it could not hear you.
- **Claiming live screenshot recognition** without `GEMINI_API_KEY` — any image comes back as
  Hassan II Mosque. Demo the flow, not the model.
- **Navigate** (on the map callout, the place sheet and in experience mode). It is real and it
  works — it hands off to Google/Apple Maps in a new tab, which takes the projector off the
  product. Fine to mention, better not to tap.
- **Arabic + numbers.** RTL layout and translations are solid; units and ranges inside a
  sentence still read left-to-right (`1 h 22` renders as `h 22 1`). Switch to Arabic to show the
  layout, don't linger on a metrics card.
