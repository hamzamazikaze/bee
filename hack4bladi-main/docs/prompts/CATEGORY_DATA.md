# Siyaha Category Data Enrichment Brief

## 1. Purpose

This document instructs future data and research work on the Siyaha / Khotwa dataset.

It is **derived from the current implementation**, not from assumptions. Every path, field
name, category id and count below was read out of this repository on **2026-08-29** and
verified programmatically (see [Appendix A](#appendix-a--how-these-numbers-were-produced)).

It does not propose a schema. The schema already exists, in TypeScript, and the enrichment
must fit it with **zero transformation** — a new record is a TypeScript object literal
appended to an existing array.

Scope of this document: **data and images only.** No UI, no animation, no routing, no
recommendation-engine change.

---

## 2. Existing Data Architecture

There is **no database and no API for POIs.** The dataset is TypeScript compiled into the
bundle. `POIS` is a plain array. This is deliberate — the demo must run with every network
call blocked — and it is why "adding data" means "adding an object literal".

### 2.1 Type definitions

| File | Owns |
|---|---|
| `src/types/common.ts` | `Locale = "en" \| "fr" \| "ar"`, `LocalizedText = Record<Locale, string>`, `Coordinates {lat,lng}`, `ClockTime` (`"HH:mm"`), `Weekday` (`0`=Sunday…`6`), `MadRange = [number, number]` |
| `src/types/poi.ts` | `POI`, `POICategory`, `ExperienceKind`, `ExperienceMeta`, `ExperienceHost`, `ExperiencePrice`, `ExperienceDiscount`, `PartnerStatus`, `PartnerType`, `POIMedia`, `CulturalContent`, `OpeningHours`, `TimeWindow`, `POIAvailability`, `POISource`, `PriceRange`, `WalkingScore`, `CoordinateType`, `VerificationStatus`, `AvailabilityStatus`, `IndoorOutdoor` |
| `src/types/profile.ts` | `Interest` and `INTERESTS` — the six category ids |
| `src/types/trip.ts` | `BaseRoute` (curated day templates) |

`POICategory` is **defined as** `Interest` (`src/types/poi.ts`): one union, six values, used
for interests, POI categories and the Explore shelves alike.

```ts
type Interest = "culture" | "food" | "coast_nature" | "hidden_gems" | "art_creative" | "activities";
```

There are no other category values anywhere in the product. `home.category.*` in the i18n
catalogs holds short display labels for the same six ids; `onboarding.interest.*` holds the
long form.

### 2.2 Data files

| File | Contents |
|---|---|
| `src/data/pois.ts` | The barrel. `POIS = [...GOLDEN_DATASET_POIS, ...CASABLANCA_POIS, ...COAST_POIS, ...EXPERIENCES]`, plus `getPoiById(id)` and `getPoisByCity(city)` |
| `src/data/fixtures/golden-pois.ts` | The four demo POIs. **The same objects** are re-exported into `POIS`, so ids and coordinates cannot drift |
| `src/data/pois-casablanca.ts` | Casablanca places |
| `src/data/pois-coast.ts` | Coastal places (El Jadida, Azemmour, Oualidia, Mohammedia, Boulaouane) |
| `src/data/experiences.ts` | The six curated experiences — everything with a `kind` |
| `src/data/poi-utils.ts` | `REGION`, `OSM`, `PLACEHOLDER`, `CATEGORY_IMAGE`, `media()`, `hours()`, `poiName()` |
| `src/data/base-routes.ts` | Seven `BaseRoute` day templates, referencing POIs by id |

**Places and experiences live in one array.** The engine treats them identically — a stop
with coordinates, a duration and a price. `kind` is the only thing that separates them.

### 2.3 Constructors you must use

```ts
// src/data/poi-utils.ts
REGION = "Casablanca-Settat"
OSM: POISource[] = [{ name: "OpenStreetMap", url: "https://www.openstreetmap.org/" }]

media(slug, category?) -> { heroImage: `/images/poi/${slug}.webp`, fallbackImage: CATEGORY_IMAGE[category] ?? PLACEHOLDER }
hours(open, close, { closed?: Weekday[], needsVerification?: boolean }) -> OpeningHours
poiName(poi, locale) -> poi.localizedName?.[locale] ?? poi.name
```

`CATEGORY_IMAGE` (the fallback ladder, all six files exist):

| Category | Fallback file |
|---|---|
| `culture` | `/images/vibes/culture.webp` |
| `food` | `/images/vibes/food.webp` |
| `coast_nature` | `/images/vibes/coast.webp` |
| `hidden_gems` | `/images/vibes/hidden-gems.webp` |
| `art_creative` | `/images/vibes/art.webp` |
| `activities` | `/images/vibes/adventure.webp` |

### 2.4 Image representation

`POIMedia` is `{ heroImage, fallbackImage, gallery?, heroVideo?, credit? }`.

`heroImage` is **derived from the slug**. Dropping `public/images/poi/<slug>.webp` on disk
is the entire act of "adding a photo" — no code change anywhere. Until that file exists the
browser 404s it and `MediaCard` (`src/components/media-card.tsx`) falls through to
`fallbackImage`, then to `/images/placeholder.svg`.

**That fall-through is the visual problem this brief exists to fix**, not a bug.

### 2.5 Localization

Two separate systems, do not confuse them:

- **Content** (POI stories, tips, host display names, route titles) — `LocalizedText`
  objects inside the data. `LocalizedText` is `Record<Locale,string>`: **all three locales
  required**. `localizedName` and `host.displayName` are `Partial<...>` and are read through
  a fallback.
- **UI strings** — `src/lib/i18n/messages/{en,fr,ar}.ts`, keyed by dotted path. Not part of
  this brief except where a new record needs a new label (it should not).

`useLocalized()` (`src/lib/i18n/use-translation.ts`) resolves a partial:
`text[locale] ?? text.en ?? first non-empty ?? ""`.

### 2.6 Host structure

```ts
interface ExperienceHost {
  name: string;                          // shown as-is when we have a real name, else a neutral role
  displayName?: Partial<LocalizedText>;  // en / fr / ar
}
```

Rendered in three places, all of which already read `displayName`:

| File | Line | Expression |
|---|---|---|
| `src/features/explore/category-screen.tsx` | 41 | `localized(host.displayName) \|\| host.name` |
| `src/features/trip/experience-block.tsx` | 39 | `localized(meta.host.displayName) ?? meta.host.name` |
| `src/features/wallet/wallet-sheet.tsx` | 80 | `localized(poi.experience?.host?.displayName) ?? …name` |

> **Code note, not a data task.** The two `??` call sites are latent bugs: `useLocalized()`
> returns `""` — never `undefined` — when `displayName` is absent, so `??` never falls back
> and the host row would render **empty** rather than showing `host.name`. It is invisible
> today only because all six experiences carry a complete `displayName`. Any new experience
> that omits it will surface it. **The correct data-side answer is: never omit it.**

### 2.7 Coordinates

`coordinates: { lat, lng }` plus `coordinateType: "exact" | "representative"`.
`"representative"` means the record is anchored on the real neighbourhood it belongs to —
used for experiences whose exact venue we have not confirmed. It is **not** a licence to
approximate: the anchor must still be a real place.

### 2.8 Sources

```ts
interface POISource { name: string; url?: string }
poi.sources?: POISource[]
```

`OSM` from `poi-utils.ts` is the shared constant for coordinates read off OpenStreetMap.

### 2.9 Consumers (do not break these)

`src/features/explore/categories.ts` · `explore-screen.tsx` · `category-screen.tsx` ·
`poi-card.tsx` · `src/features/onboarding/build-trip.ts` · `src/features/saved/saved-screen.tsx` ·
`src/features/wallet/wallet-sheet.tsx` · `src/features/trip/place-sheet.tsx` ·
`experience-block.tsx` · `src/lib/adaptation/rainy-day.ts` · `spend-less.ts` ·
`src/lib/ai/resolve-poi.ts` · `src/lib/store/index.ts` · `src/lib/matching/engine.ts`.

The `/api/*` routes (`analyze`, `extract`, `transcribe`, `route`, `weather`) do **not** serve
POI data. They handle AI understanding, routing and weather.

### 2.10 Existing validation — new records must keep these green

| Test | Enforces |
|---|---|
| `src/data/pois.test.ts` | unique ids and slugs · `region === "Casablanca-Settat"` · lat ∈ (32.5, 34.0), lng ∈ (−9.2, −7.2) · **4–6 tags** · `cultural.story[locale].length > 80` and `cultural.tip[locale].length > 20` **for all three locales** · `fallbackImage` starts with `/images/` · `priority ∈ [1,5]` · every base-route `poiId` resolves · six pilot towns covered |
| `src/data/__tests__/media-assets.test.ts` | every POI `fallbackImage`, every golden `heroImage`, every interest tile and Home card image exists on disk |
| `src/lib/__tests__/golden-fixtures.test.ts` | the golden day's numbers |
| `src/lib/matching/__tests__/*`, `engine.test.ts` | composition and the golden route |

Run: `pnpm test` · `pnpm typecheck` · `pnpm lint` · `pnpm jury:smoke` (needs `pnpm dev`).

---

## 3. Current Dataset Audit

**Verified 2026-08-29 against `POIS` at runtime**, not by grepping.

| Category | Places | Experiences | Total | Dedicated image | Fallback image |
|---|---:|---:|---:|---:|---:|
| `culture` | 21 | 4 | 25 | 5 | 20 |
| `hidden_gems` | 21 | 5 | 26 | 4 | 22 |
| `coast_nature` | 15 | 1 | 16 | 2 | 14 |
| `food` | 11 | 3 | 14 | 4 | 10 |
| `art_creative` | 10 | 3 | 13 | 2 | 11 |
| `activities` | 9 | 1 | 10 | 1 | 9 |

Categories overlap — a record carries 1–3 of them, so the column sums exceed the totals.

**Global totals**

| | |
|---|---:|
| Records in `POIS` | **36** |
| Places (`kind` absent or `"place"`) | **30** |
| Experiences (`kind` set) | **6** |
| Ids unique / slugs unique | yes / yes |
| Records whose `heroImage` resolves on disk | **6** |
| Records falling back to a category image | **30** |
| Cities | Casablanca, El Jadida, Azemmour, Oualidia, Mohammedia, Boulaouane |
| `coordinateType` | `exact` 13 · `representative` 23 |
| `verification` | `verified` 16 · `needs_verification` 14 · `unverified` 6 |
| `availability.status` | `open` 31 · `seasonal` 2 · `unknown` 2 · `temporarily_unavailable` 1 |
| Records with **no** `sources` | **15** |
| Records with `openingHours: null` | **17** |
| `priceRange: "unknown"` | 2 (`poi-phare-sidi-bouafi`, `poi-kasbah-boulaouane`) |
| `cultural.story` / `cultural.tip` incomplete | **0** — all 36 complete in EN/FR/AR |
| `cultural.audio` present | 0 |
| Coordinates outside the region bbox | 0 |

> **Discrepancy with the brief that commissioned this document.** It listed
> culture 19/4, hidden_gems 18/5, art_creative 10/3, coast_nature 11/1, food 9/3,
> activities 6/1, and "around 31 POIs". Those figures came from an earlier reading against
> a stale dev-server module graph. **The dataset is larger than assumed: 36 records, and
> every shelf holds more than reported.** All priorities below are re-derived from the
> verified numbers.

---

## 4. Image Coverage Audit

### 4.1 What ships today

```
public/images/poi/     6 files  ancienne-medina · corniche-ain-diab · habous ·
                                hassan-ii · marche-central · sacre-coeur   (+ .gitkeep)
public/images/vibes/   6 files  adventure · art · coast · culture · food · hidden-gems
public/images/popular/ 3 files  atlantic-escape · culture-casablanca · local-food-trail
public/images/         hero.webp · hero-arch.svg · placeholder.svg
```

**6 dedicated images for 36 records.** 30 records — 83 % of the dataset, and **all six
experiences** — render one of six generic category photographs.

### 4.2 Duplicate clusters (records sharing one effective image)

| Effective image | Records | Ids |
|---|---:|---|
| `/images/vibes/culture.webp` | **8** | `poi-musee-judaisme-marocain`, `poi-place-mohammed-v`, `poi-boulevard-mohammed-v`, `poi-cite-portugaise`, `poi-citerne-portugaise`, `poi-bastion-de-lange`, `poi-kasbah-mohammedia`, `poi-kasbah-boulaouane` |
| `/images/vibes/coast.webp` | **7** | `poi-plage-ain-diab`, `poi-phare-el-hank`, `poi-parc-ligue-arabe`, `poi-phare-sidi-bouafi`, `poi-plage-deauville`, `poi-oualidia-lagune`, `poi-oualidia-plage` |
| `/images/vibes/food.webp` | **5** | `poi-la-sqala`, `poi-oualidia-oysters`, `exp-cooking-mi-naima`, `exp-tea-ritual`, `exp-oualidia-oysters` |
| `/images/vibes/art.webp` | **5** | `poi-fondation-slaoui`, `poi-villa-des-arts`, `poi-cinema-rialto`, `exp-leather-bag`, `exp-pottery-eljadida` |
| `/images/vibes/adventure.webp` | **3** | `poi-marina-casablanca`, `poi-sindibad-park`, `poi-oualidia-boat-trip` |
| `/images/vibes/hidden-gems.webp` | **2** | `poi-azemmour-medina`, `exp-habous-artisans` |

### 4.3 Where this is visible to a jury

Confirmed by screenshot on the running app:

- **`/explore/food`** — the *Experiences & activities* shelf renders `exp-cooking-mi-naima`,
  `exp-oualidia-oysters` and `exp-tea-ritual` as three consecutive rows carrying **the same
  market photograph**. Three different things, one picture, stacked vertically.
- **`/explore/art_creative`** — `exp-leather-bag` and `exp-pottery-eljadida` both render the
  same cathedral photograph, two rows apart.
- **`/explore/coast_nature`** — the *Places* grid puts two `coast.webp` cards side by side in
  the same row, which reads as a rendering bug rather than as two beaches.

### 4.4 Frontend image contract

From `src/components/media-card.tsx` and its call sites:

| Surface | `ratio` | Rendered box | `sizes` |
|---|---|---|---|
| Category / Explore grid card | `hero` = **4:5** | ~190 px wide | `190px` |
| Explore shelf card (`size="lg"`) | `hero` = 4:5 | ~300 px | `300px` |
| Experience row thumbnail | `square` = 1:1 | 72 px | `72px` |
| Category screen header | `fill` | 390 × 208 px (≈ 1.9:1 crop) | `430px` |
| Editorial lead-in / Home cards | `landscape` = 16:10 | full column | `430px` |

**One master per record satisfies all of them: a 4:5 portrait, 1200 × 1500, WebP.**
The square thumb and the 1.9:1 header are centre-crops of it, so the subject must survive a
centre crop in both directions. Keep the file well under ~250 KB.

Filename is **exactly the record's `slug`**: `public/images/poi/<slug>.webp`. Nothing else.

### 4.5 Dead field worth knowing

`BaseRoute.heroImage` (`src/types/trip.ts:80`) is populated in `src/data/base-routes.ts` but
**read by no component**. Five of the seven values point at `.jpg` files that do not exist
(`hassan-ii.jpg`, `marche-central.jpg`, `corniche-ain-diab.jpg`, `sacre-coeur.jpg`,
`cite-portugaise-mazagan.jpg`); `media-assets.test.ts` does not cover this field. Harmless
today, a blank hero the first time a screen renders it. Out of scope here — flagged so the
enrichment does not copy the pattern.

---

## 5. Demo-Critical Records

The canonical demo is defined in `docs/DEMO_PATH.md` and `docs/JURY_SAFE_RUNBOOK.md`, and
fixed in `src/data/fixtures/golden-trip.ts`.

### 5.1 The golden four-stop day — image state: healthy

| # | Id | Name | Image | Issue |
|---|---|---|---|---|
| 1 | `poi-habous` | Quartier Habous | `habous.webp` **dedicated** | no `sources` |
| 2 | `poi-marche-central` | Marché Central | `marche-central.webp` **dedicated** | no `sources` |
| 3 | `poi-sacre-coeur` | Espace Sacré-Cœur | `sacre-coeur.webp` **dedicated** | no `sources` |
| 4 | `poi-hassan-ii` | Mosquée Hassan II | `hassan-ii.webp` **dedicated** | no `sources` |

All four have complete `cultural.story` / `cultural.tip` in EN/FR/AR, `exact` coordinates and
`verified` status. **Do not touch these records** beyond adding sources.

### 5.2 The experience day — image state: broken

`route-casablanca-experience` in `src/data/base-routes.ts` is the route that demonstrates
what the product is actually for (SEE → MEET → MAKE → TASTE). It is reachable from Home's
*Local Food Trail* card.

| Id | Category | Current image | Problem | Image needed | Localization | Data |
|---|---|---|---|---|---|---|
| `poi-hassan-ii` | culture | `hassan-ii.webp` | — | — | complete | add `sources` |
| `exp-habous-artisans` | hidden_gems | `vibes/hidden-gems.webp` (shared ×2) | generic | a Habous workshop doorway / artisan at a bench | complete | no `sources`; `skills: []` |
| `exp-leather-bag` | art_creative | `vibes/art.webp` (shared ×5) | **shows a cathedral for a leather workshop** | hands stitching leather, Moroccan workshop | complete | no `sources` |
| `exp-cooking-mi-naima` | food | `vibes/food.webp` (shared ×5) | generic market | a home kitchen / tajine being cooked | complete | no `sources`; host de-named, see §5.4 |

**This is the single highest-impact image gap in the repository:** the route that proves the
product's thesis is the one whose three distinctive stops all wear borrowed clothes.

### 5.3 Home / Explore first impressions

The Home *Popular* cards use their own art (`public/images/popular/`, all present). The six
category tiles now open `/explore/<category>`, whose header borrows the top-priority record's
photo — so **every shelf header is currently one of the six vibes images** except `culture`,
`food` and `coast_nature`, which land on a dedicated file by luck of sorting.

### 5.4 `exp-cooking-mi-naima` — RESOLVED (30 Aug 2026)

This record used to carry the dataset's one named host, `مي نعيمة` / "Mi Naima". Image and
link research (`Siyaha_Image_Research_Links.pdf`, 30 Aug 2026) found **no reliable evidence
of a Casablanca cooking workshop operating under that name** — no listing, no bookable page,
no traceable source. A name a juror cannot resolve is worse than no name.

It was therefore de-named, matching the other five records:

| Field | Before | After |
|---|---|---|
| `name` | Cook Moroccan with مي نعيمة | Cook Moroccan with a Local Family |
| `localizedName.fr` / `.ar` | …avec مي نعيمة / …مع مي نعيمة | …avec une famille locale / …مع عائلة محلية |
| `host.name` | مي نعيمة | Local family |
| `host.displayName` | Mi Naima ×3 | A local family / Une famille locale / عائلة محلية |

`id` and `slug` deliberately keep the `mi-naima` spelling — they are stable keys referenced by
`base-routes.ts`, three test suites and the `media()` slug lookup, and are never shown to a
user. `partnerStatus: "demo"` and `verification: "unverified"` are unchanged.

**The standing rule:** no record names a host. A name goes in only when a real, contactable
person has agreed — at which point add `sources` and flip `partnerStatus` to `"confirmed"`.
If a real cooking partner is ever signed, the verified lead from the same research pass is
the Airbnb family experience (listing `6154355`), *not* a revival of this name.

---

## 6. Data Enrichment Priorities

### P0 — Images

30 records without a photograph, 6 duplicate clusters, and the demo experience route fully
generic. **Nothing else in this document matters as much.** Volume of records does not
improve the product while two adjacent cards look identical.

### P1 — `activities` experiences

9 places, **1 experience** (`exp-pottery-eljadida`, and it is primarily `art_creative`).
Target **+4** genuinely participatory experiences.

### P2 — `coast_nature` experiences

15 places, **1 experience** (`exp-oualidia-oysters`, primarily `food`). 200 km of Atlantic
with effectively nothing to *do*. Target **+3**.

### P3 — `food` experiences

11 places, 3 experiences — the healthiest experiential shelf. Target **+2**, and only if they
add a distinct verb (tasting, market walk, bakery, tea).

### P4 — `art_creative`

10 places, 3 experiences. Target **+2**, weighted to craft the region is actually known for.

### P5 — `hidden_gems`

26 records already. **Do not add.** Improve images and sources instead.

### P6 — `culture`

25 records already, the strongest shelf. **Do not add.** Sources and images only.

> Net record target: **+11 experiences, 0–2 places.** Anything beyond that is volume for its
> own sake and will be rejected.

---

## 7. Image Acquisition Specification

Rules for every image:

1. Filename is `public/images/poi/<slug>.webp` — the record's own `slug`, exactly. No code
   change accompanies it.
2. 4:5 portrait, 1200 × 1500, WebP, under ~250 KB, subject surviving a centre crop to 1:1
   and to 1.9:1.
3. Licence must permit reuse (Wikimedia Commons, Unsplash, Pexels, or an owner's explicit
   permission). Record the source URL and licence for every file.
4. **The photograph must depict that record.** A generic Moroccan market for three different
   food experiences is the defect being fixed, not an acceptable shortcut.
5. Where a specific venue cannot be photographed honestly, prefer a true photograph of the
   **activity** (hands throwing a pot, oysters being opened) over a false photograph of the
   place.
6. If a record has an existing `credit` need, populate `media.credit`.

### P0 image backlog — demo-critical first

| Record id | Record | Current image | Problem | Image needed | Priority |
|---|---|---|---|---|---|
| `exp-leather-bag` | Make Your Own Leather Bag | `vibes/art.webp` ×5 | cathedral shown for a leather workshop | hands stitching/cutting leather in a Moroccan workshop | **P0** |
| `exp-cooking-mi-naima` | Cook Moroccan with … | `vibes/food.webp` ×5 | generic market | home kitchen, tajine, prepared dish | **P0** |
| `exp-habous-artisans` | Meet the Habous Artisans | `vibes/hidden-gems.webp` ×2 | generic arch | Habous artisan at work / workshop doorway | **P0** |
| `exp-tea-ritual` | The Moroccan Tea Ritual | `vibes/food.webp` ×5 | same as two others on one shelf | mint tea poured from height, glasses | **P0** |
| `exp-oualidia-oysters` | Oysters at the Lagoon | `vibes/food.webp` ×5 | same as two others on one shelf | Oualidia oyster beds / opened oysters | **P0** |
| `exp-pottery-eljadida` | Throw a Pot by the Ocean | `vibes/art.webp` ×5 | duplicate with `exp-leather-bag` | potter's wheel, El Jadida pottery | **P0** |

### P1 image backlog — signature and high-priority places

| Record id | City | Current | Priority flags | Image needed |
|---|---|---|---|---|
| `poi-cite-portugaise` | El Jadida | `vibes/culture.webp` ×8 | `signature`, `hero`, priority 5 | the Portuguese cistern city ramparts |
| `poi-oualidia-lagune` | Oualidia | `vibes/coast.webp` ×7 | `signature`, `hero`, priority 5 | the lagoon from the dune ridge |
| `poi-citerne-portugaise` | El Jadida | `vibes/culture.webp` ×8 | `signature`, `hero`, priority 4 | the cistern's reflecting floor |
| `poi-plage-ain-diab` | Casablanca | `vibes/coast.webp` ×7 | `hero`, priority 4 | the beach and corniche |
| `poi-azemmour-medina` | Azemmour | `vibes/hidden-gems.webp` ×2 | `hero`, priority 4 | painted medina walls on the Oum Er-Rbia |
| `poi-oualidia-oysters` | Oualidia | `vibes/food.webp` ×5 | `hero`, priority 4 | oyster farm on the lagoon |
| `poi-boulevard-mohammed-v` | Casablanca | `vibes/culture.webp` ×8 | priority 4 | art-deco frontages |
| `poi-kasbah-boulaouane` | Boulaouane | `vibes/culture.webp` ×8 | `hero` | the kasbah above the Oum Er-Rbia |

### P2 image backlog — break the remaining clusters

Everything left in `culture.webp` (8), `coast.webp` (7), `art.webp` (5) and
`adventure.webp` (3). Target: **no effective image shared by more than two records**, and
**never two on the same shelf**.

---

## 8. Experience Data Requirements

The exact fields, from `src/types/poi.ts`. **Do not invent fields.**

### 8.1 `POI` — required for every record

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `poi-<slug>` for a place, `exp-<slug>` for an experience. Must be unique |
| `slug` | `string` | kebab-case. **This is also the image filename** |
| `name` | `string` | canonical name |
| `localizedName` | `Partial<LocalizedText>` | optional; `poiName()` falls back to `name`. Existing records supply `fr` + `ar` only — that is correct, not a gap |
| `city` | `string` | one of the six pilot towns unless justified |
| `region` | `string` | always `REGION` (`"Casablanca-Settat"`) |
| `coordinates` | `{lat,lng}` | real, verified |
| `coordinateType` | `"exact" \| "representative"` | |
| `categories` | `POICategory[]` | 1–3, **most-defining first** — `categories[0]` picks the shelf hero and captions the card |
| `kind` | `"place" \| "local_activity" \| "workshop" \| "food_experience"` | **omit entirely for a place** |
| `experience` | `ExperienceMeta` | present only when `kind` is not `"place"` |
| `tags` | `string[]` | **exactly 4–6** — enforced by `pois.test.ts` |
| `openingHours` | `OpeningHours \| null` | use `hours()`; `null` only when genuinely not applicable |
| `baseDurationMinutes` | `number` | the real length; the scheduler spends it |
| `priceRange` | `"free"\|"0_30"\|"30_60"\|"60_150"\|"150_300"\|"300_plus"\|"unknown"` | must agree with `approxPriceMad` |
| `approxPriceMad` | `[min,max] \| null` | known fixed admission only |
| `indoorOutdoor` | `"indoor" \| "outdoor" \| "mixed"` | |
| `walkingScore` | `1..5` | 1 very easy … 5 significant walking |
| `cultural.story` | `LocalizedText` | **all three locales, each > 80 characters** — enforced |
| `cultural.tip` | `LocalizedText` | **all three locales, each > 20 characters** — enforced |
| `cultural.audio` | `Partial<Record<Locale,string>>` | optional, currently unused |
| `media` | `POIMedia` | `media(slug, categories[0])` |
| `hero` | `boolean` | eligible as a regional hero card |
| `signature` | `boolean` | must-see; fills the signature slot in the 2+1+1 pattern |
| `priority` | `1..5` | curation weight — enforced |
| `verification` | `"verified" \| "needs_verification" \| "unverified"` | |
| `availability` | `{ status, note?, checkedAt? }` | |
| `sources` | `POISource[]` | **required for every new record** (see §11) |
| `baseRouteIds` | `string[]` | optional |

### 8.2 `ExperienceMeta` — required when `kind` is set

| Field | Type | Notes |
|---|---|---|
| `host` | `{ name, displayName? }` | see §9 — `displayName` is **mandatory for new records** |
| `capacity` | `number?` | |
| `bookingRequired` | `boolean?` | |
| `price` | `{ amount? \| min?/max?, currency: "MAD" }` | |
| `includes` | `LocalizedText[]` | 2–4, what the traveller actually does |
| `skills` | `LocalizedText[]` | 2–3, what they walk away knowing |
| `rewardCoins` | `number?` | overrides the per-kind default in `src/config/rewards.ts` |
| `discount` | `{ percent? \| amountMAD?, minimumCoins }` | percentage or flat, **never both** |
| `partnerStatus` | `"demo" \| "confirmed"` | **`"demo"` unless the partner has actually agreed** |
| `partnerType` | `"artisan"\|"local_host"\|"food"\|"guide"\|"cooperative"` | |
| `supportsLocalBusiness` | `boolean?` | |

### 8.3 Template

```ts
{
  id: "exp-<slug>",
  slug: "<slug>",
  name: "Canonical name in English",
  localizedName: { fr: "…", ar: "…" },
  city: "Oualidia",
  region: REGION,
  coordinates: { lat: 32.7333, lng: -9.0333 },
  coordinateType: "representative",
  categories: ["coast_nature", "activities"],
  kind: "local_activity",
  experience: {
    host: {
      name: "Local surf instructor",
      displayName: { en: "Local surf instructor", fr: "Moniteur de surf local", ar: "مدرّب أمواج محلي" },
    },
    capacity: 6,
    bookingRequired: true,
    price: { amount: 250, currency: "MAD" },
    includes: [{ en: "…", fr: "…", ar: "…" }],
    skills: [{ en: "…", fr: "…", ar: "…" }],
    partnerStatus: "demo",
    partnerType: "guide",
    supportsLocalBusiness: true,
  },
  tags: ["surf", "atlantic", "beginner", "lagoon"],       // 4–6, enforced
  openingHours: hours("09:00", "18:00"),
  baseDurationMinutes: 120,
  priceRange: "150_300",
  approxPriceMad: [250, 250],
  indoorOutdoor: "outdoor",
  walkingScore: 2,
  cultural: {
    story: { en: "> 80 chars", fr: "> 80 chars", ar: "> 80 chars" },
    tip:   { en: "> 20 chars", fr: "> 20 chars", ar: "> 20 chars" },
  },
  media: media("<slug>", "coast_nature"),
  hero: false,
  signature: false,
  priority: 3,
  verification: "unverified",
  availability: { status: "open" },
  sources: [{ name: "…", url: "https://…" }],
}
```

---

## 9. Host Localization Requirements

### 9.1 Current state — better than assumed

**All six experiences carry a complete `host.displayName` in EN/FR/AR, and none names a real
person** (see §5.4). There is no missing-data gap here. Verified:

| Experience | `host.name` | `displayName` |
|---|---|---|
| `exp-cooking-mi-naima` | Local family | en/fr/ar ✓ |
| `exp-leather-bag` | Local leather artisan | en/fr/ar ✓ |
| `exp-habous-artisans` | Local guide | en/fr/ar ✓ |
| `exp-tea-ritual` | Local host | en/fr/ar ✓ |
| `exp-pottery-eljadida` | Local ceramicist | en/fr/ar ✓ |
| `exp-oualidia-oysters` | Oyster farming cooperative | en/fr/ar ✓ |

### 9.2 The `مع Local ceramicist` symptom — cause and status

The mixed-language string appeared on the category shelf's experience rows. **The cause was
rendering, not data**: `ExperienceRow` read `host.name` directly instead of resolving
`displayName`. Fixed in `src/features/explore/category-screen.tsx:41`
(`localized(host.displayName) || host.name`), verified by screenshot in Arabic — the rows now
read `مع خزّاف محلي`, `مع حرفي جلد محلي`, `مع مرشد من الحي`.

**The remaining risk is forward-looking**: see the code note in §2.6. Two other call sites use
`??`, which cannot fall back because `useLocalized()` returns `""`. A new experience without
`displayName` will render an empty host line there.

### 9.3 The rule for new data

**`host.displayName` with all three locales is mandatory on every new experience.** No
exceptions, including when `host.name` is already an English role.

| `host.name` | `en` | `fr` | `ar` |
|---|---|---|---|
| Local ceramicist | Local ceramicist | Céramiste local | خزّاف محلي |
| Local leather artisan | Local leather artisan | Artisan maroquinier | حرفي جلد محلي |
| Local cook | Local cook | Cuisinière locale | طبّاخة محلية |
| Surf instructor | Surf instructor | Moniteur de surf | مدرّب أمواج |
| Local guide | Local guide | Guide local | مرشد محلي |
| Fishing cooperative | Fishing cooperative | Coopérative de pêche | تعاونية الصيد |

Arabic must be natural Arabic. Never `ورشة Leather Bag`. Never an English word inside French
copy where a French one exists. Proper nouns (Oualidia, El Jadida, Habous) keep their
commonly recognised form in all three.

---

## 10. Geographic Verification Rules

1. Every record needs real `lat`/`lng`, verified against a map source, not plausible-looking.
2. Coordinates must satisfy the existing test: **lat ∈ (32.5, 34.0), lng ∈ (−9.2, −7.2)**.
   A record outside it fails `pois.test.ts` and does not belong in this pilot region.
3. `region` is always `"Casablanca-Settat"`.
4. `coordinateType: "exact"` only for a venue you can point at. An experience whose venue is
   unconfirmed is `"representative"`, anchored on the **real neighbourhood** it belongs to —
   `src/data/experiences.ts` anchors the artisan workshops on the real Habous coordinates.
5. Capture for every candidate: latitude, longitude, city/locality, and the source used to
   establish them.
6. **A record whose location cannot be established confidently is rejected**, not
   approximated.

---

## 11. Source Verification Rules

Every new factual record carries `sources: POISource[]` with at least one entry.

Priority of source:
1. the official venue / provider page;
2. official tourism or public-institution sites (Ministry of Tourism, commune, CRT);
3. the provider's official social profile, when that is the only presence they maintain;
4. OpenStreetMap / Google Maps listings — for **location** verification (use the `OSM`
   constant when coordinates came from OSM);
5. established travel or cultural publications;
6. secondary sources only to corroborate.

Never fabricate a source. Never state as fact anything a source does not support. **A useful
experience that cannot be verified is excluded, not softened.**

15 existing records carry no sources — the four golden POIs, five Casablanca places and all
six experiences. Backfilling those is part of the work, ranked after P0 images.

---

## 12. Fact vs Product Copy

`cultural.story` and `cultural.tip` are product copy and may be warm and concrete. They may
not carry unsupported claims.

Reject: "the best pottery workshop in Casablanca" · "the oldest artisan in the city" ·
"Casablanca's most famous hidden café" · "a must-see".

Prefer: what the visitor does · what the place is · why it is interesting · the atmosphere ·
practical characteristics. The existing records are the reference for tone.

No ratings, no review counts, no popularity ranks — the product has none and must not imply
them.

---

## 13. Experience Quality Bar

A record earns `kind` (rather than being a place) only if it answers all seven:

| | |
|---|---|
| **WHAT** | The verb. What does the traveller actually do? Encoded in `experience.includes` |
| **WHERE** | Real coordinates + `coordinateType` |
| **WHO** | `host` — a real name only with a source, otherwise a localized role |
| **WHY** | `cultural.story` — what makes it distinct |
| **HOW LONG** | `baseDurationMinutes`, the true length |
| **HOW MUCH** | `price` + `priceRange` + `approxPriceMad`. **Never invented.** Unknown → `priceRange: "unknown"`, omit `approxPriceMad`, omit `experience.price` |
| **SOURCE** | at least one verifiable `POISource` |

A POI renamed as an activity is not an experience. If the traveller only looks at it, it is a
place.

---

## 14. Candidate Research Backlog

Research directions only. **These are slots to fill with verified findings, not entries to
generate.**

| Priority | Category | Needed | Research direction |
|---|---|---:|---|
| P1 | `activities` | 4 experiences | surf schools and lessons (Dar Bouazza, Oualidia, Sidi Rahal, Bouznika) · guided medina or art-deco walks in Casablanca · horse riding on the coast if a real, licensed operator exists · kayak / paddle on the Oualidia lagoon · participatory sport or leisure with a verifiable provider |
| P2 | `coast_nature` | 3 experiences | Oualidia lagoon boat or birdwatching outings · guided coastal walks (Sidi Abderrahmane, Dar Bouazza cliffs) · Oum Er-Rbia estuary at Azemmour · a fishing-port visitor experience at Mohammedia or El Jadida with a real cooperative |
| P3 | `food` | 2 experiences | a market-to-table walk anchored on Marché Central or Habous · a bakery / *ferran* visit · an El Jadida or Oualidia seafood tasting distinct from `exp-oualidia-oysters` |
| P4 | `art_creative` | 2 experiences | a real Casablanca ceramics or zellige atelier · art-deco heritage walk with a licensed guide · a working artisan cooperative in Habous distinct from `exp-habous-artisans` |
| P5 | `hidden_gems` | **0** | images and sources only |
| P6 | `culture` | **0** | images and sources only |
| P0 | — | 6 + 8 images | the §7 backlog |
| P0 | — | 15 backfills | `sources` for the records listed in §11 |

For every candidate the researcher must return **either** a complete record **or** a rejection
with the reason. A half-verified candidate goes in the "uncertain" list, never into `POIS`.

---

## 15. Acceptance Criteria

- [ ] no invented human host names — roles unless a source establishes the person
- [ ] no invented coordinates; every one verified against a named source
- [ ] every new record carries at least one real `sources` entry
- [ ] every new experience carries `host.displayName` in EN, FR **and** AR
- [ ] the Arabic UI shows no untranslated English host role
- [ ] `cultural.story` > 80 chars and `cultural.tip` > 20 chars in all three locales
- [ ] `tags.length` between 4 and 6
- [ ] `priority` between 1 and 5; `priceRange` agrees with `approxPriceMad`
- [ ] every demo-critical record (§5) has a dedicated image
- [ ] no effective image shared by more than two records, and never by two on one shelf
- [ ] every `heroImage` path resolves — `public/images/poi/<slug>.webp` exists
- [ ] records are valid `POI` object literals; `pnpm typecheck` passes
- [ ] `pnpm test` passes, including `pois.test.ts` and `media-assets.test.ts`
- [ ] `pnpm lint` clean
- [ ] `pnpm jury:smoke` still 15/15
- [ ] no UI, routing, MapLibre or recommendation-engine change in the same diff

---

## Appendix A — how these numbers were produced

Not by grep. A throwaway Vitest file in the `logic` project imported the real modules and
walked `POIS`, checking image paths against `public/` with `existsSync`. To reproduce, drop
this at `src/data/__inventory.test.ts`, run
`pnpm vitest run src/data/__inventory.test.ts --project logic`, then delete it.

```ts
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { test } from "vitest";
import { POIS } from "@/data/pois";
import { BASE_ROUTES } from "@/data/base-routes";

const CATS = ["culture","food","coast_nature","hidden_gems","art_creative","activities"] as const;
const on = (p: string) => existsSync(`public${p}`);
const isExp = (p: (typeof POIS)[number]) => (p.kind ?? "place") !== "place";

test("inventory", () => {
  const out: string[] = [];
  out.push(`records ${POIS.length} places ${POIS.filter(p=>!isExp(p)).length} exp ${POIS.filter(isExp).length}`);
  for (const c of CATS) {
    const inC = POIS.filter((p) => p.categories.includes(c));
    out.push(`${c} ${inC.filter(p=>!isExp(p)).length}/${inC.filter(isExp).length} ded ${inC.filter(p=>on(p.media.heroImage)).length}`);
  }
  out.push(`poi files: ${readdirSync("public/images/poi").join(", ")}`);
  const cluster = new Map<string, string[]>();
  for (const p of POIS.filter((p) => !on(p.media.heroImage))) {
    cluster.set(p.media.fallbackImage, [...(cluster.get(p.media.fallbackImage) ?? []), p.id]);
  }
  for (const [img, ids] of cluster) out.push(`${img} x${ids.length}: ${ids.join(", ")}`);
  for (const p of POIS.filter(isExp)) {
    const dn = p.experience?.host?.displayName;
    out.push(`${p.id} host=${p.experience?.host?.name} displayName=${dn ? Object.keys(dn).join("/") : "MISSING"} src=${p.sources?.length ?? 0}`);
  }
  for (const r of BASE_ROUTES) out.push(`${r.id} hero=${r.heroImage} exists=${on(r.heroImage)}`);
  writeFileSync("/tmp/inventory.txt", out.join("\n"));
});
```

---
---

# Ready-to-run Research Prompt

*Everything below this line is a standalone prompt. Give it, together with §2, §8, §9, §10,
§11 and §14 of this document, to a research agent with web access. It assumes no prior
knowledge of Siyaha.*

---

You are curating the pilot dataset for **Siyaha / Khotwa**, a Moroccan travel application
covering **one region only: Casablanca-Settat** (Casablanca, Mohammedia, El Jadida,
Azemmour, Oualidia, Settat, Berrechid, Boulaouane). Anything outside that region is out of
scope, no matter how good.

The dataset is **TypeScript compiled into the app**, not a database. A new record is an
object literal appended to an array. It must match the `POI` interface exactly — the schema
is given to you above; do not invent fields, do not rename fields, do not propose a
different structure.

## What the app needs from you

The dataset currently holds 36 records, and its weakness is **not volume**. It is:

1. **Images.** Only 6 of 36 records have their own photograph. The other 30 fall back to one
   of six generic category images, so three different food experiences render the same
   market photo, one under another.
2. **Experiences.** Two shelves are effectively empty of things to *do*: `activities` has 1
   experience for 9 places, `coast_nature` has 1 for 15.
3. **Sources.** 15 records carry none.

So: **prioritise image diversity and demo credibility over record count.** A shelf of five
well-photographed, well-sourced records beats a shelf of fifteen that look identical.

## Your deliverables

### A. Verified records — target 11 experiences, at most 2 places

| Priority | Category | Needed | Directions |
|---|---|---:|---|
| P1 | `activities` | 4 | surf schools and lessons (Dar Bouazza, Bouznika, Sidi Rahal, Oualidia) · guided medina or art-deco walking tours in Casablanca · kayak / paddle on the Oualidia lagoon · horse riding on the coast · any participatory sport or leisure run by a verifiable provider |
| P2 | `coast_nature` | 3 | Oualidia lagoon boat trips and birdwatching · guided coastal walks (Sidi Abderrahmane, Dar Bouazza) · the Oum Er-Rbia estuary at Azemmour · a fishing-port visitor experience with a real cooperative at Mohammedia or El Jadida |
| P3 | `food` | 2 | a market-to-table walk anchored on Marché Central or Habous · a bakery / *ferran* visit · an El Jadida or Oualidia seafood tasting that is **not** oyster tasting (that record exists) |
| P4 | `art_creative` | 2 | a real Casablanca ceramics or zellige atelier · an art-deco heritage walk with a licensed guide · a working Habous artisan cooperative distinct from the existing artisan walk |

Do **not** add to `culture` or `hidden_gems`. They hold 25 and 26 records already.

An **experience** is something a traveller *does* with someone: a workshop, a lesson, a
guided activity, a tasting, a cooperative visit. A **place** is somewhere they look at. If
the traveller only looks, it is a place — do not dress it up with a `kind`.

### B. Image targets — this is the highest-priority deliverable

For each of these existing records, and for every record you propose, return a photo brief
and **two candidate image URLs with a reusable licence** (Wikimedia Commons, Unsplash,
Pexels, or an owner's explicit permission), plus the licence name and the source page.

Existing records that need an image most:

`exp-leather-bag` · `exp-cooking-mi-naima` · `exp-habous-artisans` · `exp-tea-ritual` ·
`exp-oualidia-oysters` · `exp-pottery-eljadida` · `poi-cite-portugaise` ·
`poi-oualidia-lagune` · `poi-citerne-portugaise` · `poi-plage-ain-diab` ·
`poi-azemmour-medina` · `poi-oualidia-oysters` · `poi-boulevard-mohammed-v` ·
`poi-kasbah-boulaouane`

Image requirements: **4:5 portrait, 1200 × 1500, WebP, under ~250 KB**, subject surviving a
centre crop to both 1:1 and 1.9:1. The file must be named exactly `<slug>.webp`. The photo
must depict **that specific record** — a generic Moroccan market standing in for three
different food experiences is the defect being fixed. Where the venue cannot be
photographed honestly, a true photograph of the **activity** beats a false photograph of the
place.

**Do not download anything.** Return URLs, licences and briefs.

### C. Source backfill

Find at least one authoritative source for each of: `poi-hassan-ii`, `poi-habous`,
`poi-marche-central`, `poi-sacre-coeur`, `poi-plage-ain-diab`, `poi-phare-el-hank`,
`poi-parc-ligue-arabe`, `poi-marina-casablanca`, `poi-sindibad-park`.

### D. Uncertain candidates — a separate list

Anything you found that is promising but could not verify. Give the candidate, what you
could not establish, and what evidence would settle it. **Never** put an unverified
candidate in deliverable A.

## Rules you must not break

1. **Never invent a human name.** If you cannot source who runs an experience, the host is a
   **role**: `Local ceramicist`, `Local cook`, `Surf instructor`, `Fishing cooperative`.
   Never `Fatima Benali`, `Youssef Amrani`, `Chef Karim`. A real name requires a source that
   explicitly establishes that this person provides this experience.
2. **`host.displayName` is mandatory** on every experience, in all three locales:
   `{ en: "Local ceramicist", fr: "Céramiste local", ar: "خزّاف محلي" }`.
3. **Never invent coordinates.** Verify each against a named map source. They must fall
   inside lat 32.5–34.0, lng −9.2 to −7.2, or the record is rejected. Use
   `coordinateType: "exact"` only for a venue you can point at; otherwise
   `"representative"`, anchored on the real neighbourhood.
4. **Never invent a price.** Unknown price → `priceRange: "unknown"`, omit `approxPriceMad`
   and omit `experience.price`. `priceRange` must always agree with `approxPriceMad`.
5. **Never invent a partner relationship.** Every new experience is
   `partnerStatus: "demo"` and `verification: "unverified"`.
6. **Every factual record needs at least one real source**, in `sources: [{ name, url }]`.
   Prefer, in order: the official venue page · official tourism or public-institution sites ·
   the provider's official social profile · OpenStreetMap / Google Maps for location ·
   established travel or cultural publications.
7. **All three locales, always.** `cultural.story` needs > 80 characters and `cultural.tip`
   > 20 characters in **each** of `en`, `fr`, `ar`. Arabic must be natural Arabic, never
   mechanically mixed with English (`ورشة Leather Bag` is unacceptable). No unnecessary
   English inside French copy. Place names keep their commonly recognised form.
8. **`tags` must number exactly 4 to 6.** A test enforces it.
9. **`categories` leads with the most-defining one** — `categories[0]` selects the shelf
   header image and captions the card.
10. **No superlatives you cannot source.** No "the best", "the oldest", "the most famous",
    "a must-see". No ratings, no review counts, no popularity ranks — the product has none.
11. **`baseDurationMinutes` is the true length** of the activity. The scheduler spends it: a
    105-minute cooking class occupies 105 minutes of the traveller's day.
12. **If it cannot be verified, exclude it** — into deliverable D, never into A.

## Output format

For each accepted record, emit the TypeScript object literal exactly as specified in §8.3 of
the brief, using the `REGION`, `media()` and `hours()` helpers, and state which file it
belongs in (`src/data/experiences.ts` for anything with a `kind`,
`src/data/pois-casablanca.ts` or `src/data/pois-coast.ts` for a place).

Then, as a separate table: `slug` · photo brief · candidate image URL 1 · candidate image
URL 2 · licence · source page.

Then, as a third section: the uncertain candidates from deliverable D.
