# Hero demo — the 90 seconds, and why this input

## The input to use

Speak (or type) this, in Darija:

> بغيت نهار كامل فكازا، الماكلة المحلية والصناعة التقليدية، وماشي بزاف ديال المشي

"I want a full day in Casa — local food and traditional crafts, and not too much walking."

## Why not the culture + food sentence

`الثقافة والماكلة` (culture + food) resolves to `interests: ["culture", "food"]`, and the
engine answers that with the **curated signature day**: Quartier Habous → Marché Central →
Espace Sacré-Cœur → Mosquée Hassan II. Four monuments, no human stop.

**No longer true.** Every generated day is now guaranteed a human stop, so that profile
returns Habous → Marché Central → Cook Moroccan with a Local Family → Hassan II. The sentence below
is still the better opening — it produces three people rather than one — but the culture +
food day is no longer the counter-example it was written as.

That day is still the Less Walking demo (~58% less walking, ~21 min saved), and
`src/lib/matching/__tests__/golden-route.test.ts` asserts its four stops by name.

The sentence above resolves to `interests: ["food", "hidden_gems"]` — `الماكلة` hits the
Darija food list, `المحلية` hits `محلي` in hidden gems — which selects
`route-casablanca-experience` instead.

## The day it produces

| # | Stop | Kind | Arc | Price |
|---|---|---|---|---|
| 1 | Meet the Habous Artisans | `local_activity` | MEET | 80 MAD |
| 2 | Cook Moroccan with a Local Family | `food_experience` | TASTE | 250 MAD |
| 3 | Make Your Own Leather Bag | `workshop` | MAKE | 180 MAD |
| 4 | Mosquée Hassan II | `place` | SEE, at the end of the day | 140 MAD |

Three of the four stops are people rather than places. The narrative pass puts the icon
last on purpose — Hassan II at the sunset slot.

## Local impact, verbatim

**≈510 MAD** — 80 + 250 + 180. Summed by `localImpact()` from the stops whose dataset entry
carries `experience.supportsLocalBusiness` **and** a real price, taking the low end of any
range. Hassan II's 140 MAD is not counted: it is admission to a monument, not money in a
local person's hand. The number is a floor, not an estimate.

## Verifying it before you walk on stage

```
pnpm test src/lib/matching/__tests__/experience-composition.test.ts
```

`"reaches the hero composition on the experience route"` asserts this exact day.
