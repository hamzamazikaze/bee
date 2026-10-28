# KHOTWA LOCAL EXPERIENCE + WALLET

Four stops, but the definition of "stop" widened: **SEE → MEET → MAKE → TASTE**.

## Experience types

`ExperienceKind` on `POI`, optional: `place | local_activity | workshop | food_experience`.
Absent means `place`, so all 25 existing POIs are untouched and nothing downstream had to
change to read them. Experiential stops carry an optional `ExperienceMeta` (host, price,
includes, skills, reward, discount, partner status, partner type).

## New experiences — 6 curated MVP entries

| id | kind | duration | price | offer |
|---|---|---|---|---|
| `exp-cooking-mi-naima` — Cook Moroccan with a Local Family | food_experience | 105 min | 250 MAD | 10% for 300 coins |
| `exp-leather-bag` — Make Your Own Leather Bag | workshop | 75 min | 180 MAD | 10% for 200 coins |
| `exp-habous-artisans` — Meet the Habous Artisans | local_activity | 60 min | 80 MAD | — |
| `exp-tea-ritual` — The Moroccan Tea Ritual | food_experience | 45 min | 60 MAD | 20 MAD for 120 coins |
| `exp-pottery-eljadida` — Throw a Pot by the Ocean | workshop | 90 min | 140–200 MAD | — |
| `exp-oualidia-oysters` — Oysters at the Lagoon | food_experience | 60 min | 120 MAD | — |

**Data honesty.** All six are `partnerStatus: "demo"`, `verification: "unverified"`,
`coordinateType: "representative"` — anchored on the real neighbourhood, never a fabricated
address. Hosts we have not met are described by role ("Local leather artisan"), never given
an invented name — **all six now follow that rule**. The cooking entry carried a named host
until image/link research (30 Aug 2026) found no reliable evidence of a Casablanca workshop
under that name; it is now "a local family". Flipping a partner to real is three fields, no
code — the `id` and `slug` keep their original `mi-naima` spelling as stable keys.

## Hero 4-stop composition

`route-casablanca-experience`, reached from the **Local Food Trail** card on Home:

```
Meet the Habous Artisans  09:30 +60   local_activity   MEET
Cook with a local family  10:40 +105  food_experience  TASTE
Make Your Own Leather Bag 12:40 +75   workshop         MAKE
Mosquée Hassan II         14:10 +90   place            SEE
```

The narrative pass puts the mosque at the end (sunset affinity) rather than the start — the
engine's valid route, as the brief allows.

## Matching changes

- `WEIGHTS.experiential: 7` — a nudge, not a lever. Large enough to surface experiences,
  small enough that it never drags a traveller across town.
- Composition slot fills remaining stops preferring, in order: an unchosen **curated**
  member → a missing **MAKE/TASTE** kind → any missing kind → a missing category → best
  remaining. Every step is a `??` chain, so a city with no experiences produces exactly the
  day it always did.
- **Curation outranks composition.** Without this the signature Casablanca day lost
  Sacré-Cœur to whichever experience carried an unseen kind.
- The signature slot prefers a *curated* signature POI, or the hero route lost its icon to a
  medina it had not chosen.

## Scheduling changes

Pace stretches a visit; it does not shorten an appointment. Experiential stops keep their
real duration under every pace — the 105-minute cooking class is 105 minutes for a relaxed
and an explorer traveller alike. Verified: no next stop starts before the previous finishes.

"Why this stop" for experiential stops is deterministic and per-kind. No extra LLM call.

The rule is now one exported function, `visitDurationMinutes(poi, pace)` in the engine, and
`@/lib/adaptation/shared`'s `visitMinutes` calls it rather than keeping a copy. **Adapt My
Day upholds the same invariant**: Less Time trims ordinary stops toward 0.65x but does not
touch a booked experience, and Rainy Day / Spend Less give a swapped-in experience its full
duration. Pinned by `src/lib/adaptation/__tests__/experience-schedules.test.ts`, which
sweeps all four adaptations for shortened appointments and overlapping stops.

## Wallet

`src/lib/wallet` — pure functions; the store persists. localStorage key `siyaha:v1:wallet`.
A loyalty ledger, not money: unlocking spends coins and tells the traveller what to say at
the door. They still pay the host, in cash, in person.

Surface: **Profile → Khotwa Wallet** (a sheet, not a fifth tab) — balance, available offers,
transaction history. A restrained `RewardToast` in Experience mode.

## Reward rules

Centralised in `src/config/rewards.ts`: place 20 · local activity 50 · workshop 100 ·
food experience 80 · full day +100. A curated experience may override with
`experience.rewardCoins`.

## Discount model

Percentage **or** flat MAD, each with its own `minimumCoins`. `discountedPriceMad` never
returns a negative price — a partner offering 500 MAD off a 200 MAD workshop gives a free
workshop, not a refund.

## Duplicate prevention

Transaction ids are **derived, not generated**: `visit:<tripId>:<poiId>`,
`bonus:<tripId>`, `redeem:<poiId>`. Applying an id the ledger already holds returns the
wallet unchanged. No counters, no flags, nothing to get out of step. Verified in the browser:
tapping Visited again leaves the balance at 350.

## EN / FR / AR

All wallet and experience labels, every experience title, story, tip, "what you'll do" and
"you'll learn" line. RTL unaffected; Western numerals preserved.

## Results

- **Tests: 239/239** (20 files) — 19 wallet, 15 composition/scheduling, 4 localisation,
  7 adaptation-schedule invariants added. Each of the two bugs above was confirmed to
  fail its new test before the fix landed.
- **Build: PASS.** `pnpm lint` 0 errors (1 pre-existing warning in `inspiration-composer.tsx`),
  `pnpm typecheck` ✓, `pnpm build` ✓ (28 routes).
- **`pnpm jury:wallet`: 22/22** — real UI: experience day → finish all four → 350 coins →
  re-tap earns nothing → refresh persists → unlock 10% → 350→230 → cannot unlock twice.
- **`pnpm jury:smoke`: 15/15** in 49.3s — no regression. (The two failures this report
  originally recorded came from another session's in-flight Explore work; that work has
  since landed and the suite is green again.)

## Bugs this phase found and fixed

### 1. The geographic anchor moved

Adding six experiences to the pool moved `centroid(pool)` — the geographic anchor — which
shifted every proximity score and silently reshuffled a day nobody had touched. The
Casablanca preset day went from 5.1 km of walking to 2.5 km with no leg long enough for
Less Walking to convert, so the demo headline stopped applying. The anchor is now the
centroid of **places only**: it is a claim about where a city is, and it must not move
because we curated four workshops in one neighbourhood.

### 2. Adapt My Day could shorten an appointment

Requirement 25 says an adaptation must not turn a 90-minute workshop into a 20-minute one.
Two paths did exactly that, both because the duration rule existed in two places:

- **Less Time** trimmed *every* stop to `base × 0.65`. The 105-minute cooking class
  became 70 minutes and the leather workshop 50 — an appointment the traveller could not
  keep, printed as though they could. Booked experiences are now exempt from the trim.
- **`shared.visitMinutes`** still applied the pace multiplier unconditionally. Its comment
  called it "the engine's own rule", but the engine had stopped doing that when experiences
  landed. So Rainy Day swapping in the 90-minute pottery workshop handed an explorer 70
  minutes of it. It now calls the engine's function instead of copying it.

You can leave a mosque early. You cannot leave a cooking class early — the tajine is not
done and the host is still teaching.

## Remaining limitations

- No booking. `bookingRequired` is displayed, not actioned.
- Redemption unlocks an offer; there is no settlement, no QR, no partner-side verification.
  The traveller shows the unlocked offer and pays the host directly, in cash.
- Coordinates for all six experiences are `representative` — anchored on the real
  neighbourhood, not surveyed. All six are `partnerStatus: "demo"`, never presented as a
  confirmed commercial partnership.
- Adapt My Day now respects booked durations under all four adaptations, but it does not
  reason about the rest of the experience metadata: Spend Less can still swap an experience
  out of the day for a cheaper plain POI, losing that stop's coins and offer. It is a
  cheaper day, honestly priced — just a less experiential one.
- The wallet has no server. Clearing site data clears the coins.
