# Build Order — 12 hours

Wall-clock hours from the foundation commit. The ordering follows the dependency graph,
not the phase numbers: the AI/Data worker's `pois.ts` unblocks everyone, so it lands
first.

## Phase 0 — Foundation ✅ (Lead, done)

Next.js 16 app, domain contracts, provider interfaces, config/env, design tokens, i18n
with RTL, storage, store, golden fixtures, test foundation, docs. `pnpm verify` green.

## Phase 1 — Parallel, hours 0–5

Three workers, three worktrees, no shared files.

**AI/Data — the critical path.**
| Hour | Deliverable |
|---|---|
| 0–1.5 | `src/data/pois.ts` — 25 curated POIs, verified coordinates, caveats honoured. **Ship this first and tell the Lead**; the other two workers want real data. |
| 1.5–2 | `src/data/base-routes.ts` — the 5 templates |
| 2–3.5 | `TripEngine.match` + `.schedule` — deterministic, always 4 stops, narrative order |
| 3.5–5 | Gemini provider, `/api/extract`, `/api/analyze`, Groq `/api/transcribe` |

**Trip/Map**
| Hour | Deliverable |
|---|---|
| 0–1.5 | MapLibre mounted, numbered pins, fits the 4 golden stops |
| 1.5–2.5 | Route drawing (real geometry and null-geometry straight lines) |
| 2.5–3.5 | `TripTimeline` + map↔timeline selection sync |
| 3.5–4.5 | Routing provider + `/api/route` + fallback |
| 4.5–5 | Less Walking adapter + `AdaptSheet` + before/after animation |

**UI**
| Hour | Deliverable |
|---|---|
| 0–1 | Shared primitives, `PageShell`, the visual language |
| 1–2.5 | Home + Inspiration Composer |
| 2.5–4 | The 3 onboarding screens + processing screen |
| 4–5 | Experience Mode chrome + cultural detail sheet |

## Phase 2 — hour 5: merge AI/Data

Data and the engine land first — everything downstream is more real afterwards.

## Phase 3 — hour 6: merge Trip/Map

Map, timeline and adaptation on top of real POIs.

## Phase 4 — hour 7: merge UI

Screens last, so they wrap something that already works.

## Phase 5 — hours 7–8.5: wire it together (Lead)

Real generation flow end to end, `/experience` mounting `TripMap` + `TripTimeline`,
Start Trip transition, Visited → passport stamp, Less Walking on a generated (not
fixture) trip.

## Phase 6 — hours 8.5–10: golden demo QA (Lead + human)

Run `docs/DEMO_PATH.md` top to bottom. Then run it in **airplane mode**. Then let someone
who has not seen it click freely for two minutes and fix whatever they break.

## Phase 7 — hours 10–11: media, i18n, polish

Tier-1 images and the four audio clips, French and Arabic passes, RTL check, PWA service
worker, weather chip, Passport, Popular cards.

## Phase 8 — hours 11–12: deploy and back up

Vercel deploy, production smoke test on a real phone, **record the 90-second demo as a
backup video**, tag the commit.

## Rules

- **P0 before P1 before P2.** A polished Explore screen with a broken Less Walking loses.
- **Timebox.** If something is not working after 45 minutes, ship the fallback and move
  on. The fallback is a feature here, not a defeat.
- **The demo path is sacred.** Any change that touches it gets re-tested against
  `docs/DEMO_PATH.md` before it is called done.
- **Media last.** Do not produce premium assets for 25 POIs while the core is unproven.
