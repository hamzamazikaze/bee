# SIYAHA — SMART TOURISM MVP
## Master Product Q&A / Source of Truth
### Casablanca-Settat Regional Hackathon — 28–29 August 2026

> **Purpose of this document**
>
> This file is the canonical product specification for the Siyaha Smart Tourism MVP.
> It consolidates the product, UX, AI, data, mapping, adaptation, visual, architecture, fallback, demo, and implementation decisions already made.
>
> If another document, prompt, branch, or implementation conflicts with this file, **this file wins unless the human explicitly says otherwise**.
>
> The MVP goal is not to build a giant tourism platform. The goal is to build **one beautiful, reliable, demoable core journey** that visibly proves the concept.

---

# 1. HACKATHON CONTEXT

## Q1. What is the project?
**A.** Siyaha is a Smart Tourism mobile-first web application that transforms fragmented travel inspiration into a personalized, culturally rich, geographically coherent trip.

The long-term vision is broader Morocco travel, but the hackathon MVP is strictly focused on the **Casablanca-Settat region**.

## Q2. What is the hackathon context?
**A.**
- Regional Hackathon
- Smart Tourism track
- Casablanca-Settat
- Venue: Centre d'accueil Al Fida
- Dates: 28–29 August 2026
- Objective: deliver a **working, demoable digital prototype**
- Build philosophy: **show, do not tell**
- Prefer one reliable end-to-end flow over many unfinished features

## Q3. What is the product’s core promise?
**A.**

> **See it. Plan it. Experience Morocco.**

The underlying mechanism is:

**Social inspiration → AI understanding → personalized itinerary → smart map → real cultural experience → live adaptation**

## Q4. What is the main concept in one sentence?
**A.**

A traveler gives us whatever inspired them, such as a screenshot, social link, voice note, or interests, and the application silently understands the context and turns it into a 4-stop personalized travel experience.

## Q5. What is the core product philosophy?
**A.**

> **Give us whatever you have. We understand the rest.**

Nothing is mandatory.

The user can provide:
- image
- screenshot
- social URL
- voice
- preferences
- destination
- or almost nothing

The system progressively infers or asks only what is missing.

---

# 2. THE PROBLEM

## Q6. What user problem are we solving?
**A.**

Tourism discovery and tourism planning are fragmented.

A traveler may:
1. discover a place on TikTok or Instagram
2. take a screenshot
3. forget its exact name
4. search Google
5. open Maps
6. search restaurants
7. compare distances
8. estimate time
9. check whether it fits their budget
10. manually build an itinerary
11. learn almost nothing about the cultural story
12. restart planning if tired, late, or affected by weather

Siyaha compresses this fragmented journey into one intelligent experience.

## Q7. Why is this different from a normal itinerary generator?
**A.**

Because the product starts from **real inspiration**, not only a text prompt.

The journey may start from:
- a social screenshot
- a Reels/TikTok link
- a voice note
- a place photo
- a quick vibe selection

The product then produces a trip that is:
- contextual
- curated
- geographically coherent
- culturally enriched
- adaptable

---

# 3. TARGET USER

## Q8. Who is the primary persona?
**A.**

A first-time international visitor to Morocco, especially a social-first or Gen-Z traveler.

Typical behavior:
- discovers destinations through TikTok, Instagram, Reels, YouTube Shorts, Facebook
- wants fast decisions
- does not want to research for hours
- values strong visuals
- wants authentic local experiences
- may know very little about Casablanca-Settat
- may have limited time
- may care about walking, cost, or pace

## Q9. Are Moroccan domestic travelers supported?
**A.**

Yes conceptually, but they are not the primary MVP optimization target.

Future audiences include:
- Moroccan domestic tourists
- couples
- families
- friends
- expats
- digital nomads

---

# 4. PRODUCT MODEL

## Q10. What is the simplest system model?
**A.**

**INPUT → UNDERSTANDING → DECISION ENGINE → OUTPUT → EXPERIENCE**

Where:

### Input
Anything the user gives us.

### Understanding
AI extracts useful structured information.

### Decision Engine
Local deterministic logic chooses the trip.

### Output
A 4-stop itinerary with map + timeline.

### Experience
Navigation, cultural stories, audio, progress, adaptation.

## Q11. Is Siyaha a chatbot?
**A.**

No.

This is a critical non-negotiable.

The AI should mostly stay invisible.

The UI communicates through:
- cards
- detected places
- selected interests
- progress states
- map
- timeline
- route
- metrics
- stories
- audio
- adaptation

No “AI assistant persona” is needed.

## Q12. Can the user use voice?
**A.**

Yes.

Voice is an **input method**, not a conversational assistant.

Example:

> “I’m in Casablanca for one day, I love architecture and food, and I don’t want to walk too much.”

The system extracts:
- destination
- time
- interests
- walking preference
- possibly pace/budget

Then the UI continues normally.

---

# 5. INPUTS

## Q13. What inputs does the product accept?
**A.**
- screenshot
- photo
- social URL
- voice
- manual vibe/interests
- time
- budget
- pace

Nothing is mandatory.

## Q14. What if the user uploads only a screenshot?
**A.**

The AI analyzes the screenshot and tries to infer:
- likely place
- likely city
- visual category
- context

Then onboarding asks only for missing information.

## Q15. What if the user pastes only a social link?
**A.**

The system may attempt lightweight metadata enrichment.

If metadata is unavailable, blocked, or slow, the app must continue.

Social scraping must **never** be a hard dependency.

## Q16. What if social metadata fails?
**A.**

Ignore it gracefully.

Do not block the user.

Continue with:
- image
- voice
- manual choices
- default regional exploration

## Q17. What if the user gives no inspiration input?
**A.**

They can choose:

> **Just Explore**

Then the product continues through the visual onboarding.

---

# 6. ONBOARDING

## Q18. How many onboarding screens are allowed?
**A.**

Maximum **3 screens**.

The experience should feel like storytelling, not a form.

## Q19. What is onboarding Screen 1?
**A.**

### Inspiration

Primary question:

> **What inspired you?**

Actions:
- upload screenshot/image
- Paste Link
- Voice
- Just Explore

Image/screenshot is the strongest visual CTA.

## Q20. What is onboarding Screen 2?
**A.**

### Your Vibe

Exactly six main categories:

1. Culture & Heritage
2. Food
3. Coast & Nature
4. Local & Hidden Gems
5. Art & Creative
6. Activities & Adventure

User selects a maximum of **2–3**.

Each category should be:
- visual
- image-led
- short label
- minimal copy
- no long explanation

## Q21. What is onboarding Screen 3?
**A.**

### Your Day

Contains:
- Time
- Budget
- Pace

No dropdown-heavy forms.

## Q22. What are the budget choices?
**A.**
- Low
- Medium
- Premium

## Q23. What are the pace choices?
**A.**
- Relaxed
- Balanced
- Explorer

## Q24. What are the time choices?
**A.**

Compact visual choices such as:
- A few hours
- Half day
- Full day

The exact wording can be short and polished.

## Q25. What is the main onboarding CTA?
**A.**

> **Build My Trip**

## Q26. What is progressive profiling?
**A.**

If AI already extracted a value, do not ask the user unnecessarily.

Example:
- image clearly indicates Casablanca → prefill destination
- voice says “one full day” → prefill time
- voice says “I love architecture” → preselect Culture & Heritage

The app should feel intelligent before it feels complicated.

---

# 7. AI ROLE

## Q27. What is the core AI rule?
**A.**

> **AI understands. Local engine decides. Geo services verify.**

This is one of the most important architecture rules.

## Q28. What is AI allowed to do?
**A.**
- analyze image
- understand text
- transcribe/understand voice
- infer destination
- infer detected place
- infer interests
- infer time constraints
- infer budget/pace when clearly stated
- structure messy input
- optionally use safe social metadata

## Q29. What is AI NOT allowed to do?
**A.**
- freely invent POIs
- invent coordinates
- hallucinate opening hours
- create random routes from scratch
- override curated destination data
- become a chatbot
- control every user interaction
- be a single point of failure

## Q30. What structured object should AI produce?
**A.**

Something conceptually similar to:

```json
{
  "destination": "Casablanca",
  "detectedPlace": "Hassan II Mosque",
  "interests": ["culture", "food", "architecture"],
  "timeAvailable": "full_day",
  "budgetLevel": "medium",
  "pace": "balanced",
  "walkingPreference": "normal",
  "confidence": {
    "destination": 0.97,
    "interests": 0.91
  },
  "sources": ["image", "voice"]
}
```

This object is the input to the local trip engine.

---

# 8. AI PROVIDERS

## Q31. What runtime AI provider should be used?
**A.**

Primary:
- Gemini free-tier-compatible multimodal API

Voice fallback:
- Groq Whisper

## Q32. Can Claude Code subscription be used as runtime AI?
**A.**

No assumption should be made that Claude Code subscription provides runtime application API credits.

Claude Code is mainly a **build-time development tool** here.

## Q33. Can ChatGPT Plus be used as runtime API?
**A.**

No.

ChatGPT Plus is not treated as application API credit.

## Q34. Should model IDs be hardcoded everywhere?
**A.**

No.

Use configuration/environment abstraction.

Example environment variables:

```env
GEMINI_API_KEY=
GEMINI_MODEL=
GROQ_API_KEY=
ROUTING_API_KEY=
ROUTING_BASE_URL=
NEXT_PUBLIC_MAP_STYLE_URL=
NEXT_PUBLIC_APP_URL=
```

---

# 9. TRIP ENGINE

## Q35. Who decides the trip?
**A.**

The deterministic local trip engine.

AI does not freely compose the final itinerary.

## Q36. How many stops does every MVP trip contain?
**A.**

Exactly **4 stops**.

Do not vary the stop count in the MVP.

## Q37. What factors does the matching engine consider?
**A.**
- destination
- interests
- time available
- budget
- walking preference
- proximity
- category diversity
- hero relevance
- signature/must-see relevance
- availability
- route coherence

## Q38. What is the recommended 4-stop composition?
**A.**
- 2 strongly aligned stops
- 1 complementary stop
- 1 signature/must-see stop

This creates personalization without producing a repetitive day.

## Q39. How should stops be ordered?
**A.**

Not only by shortest distance.

Consider:
- geography
- opening hours
- visit duration
- time of day
- activity type
- food timing
- sunset timing
- narrative flow

The trip should feel like a designed day.

## Q40. How does pace influence the trip?
**A.**

The trip always stays at 4 stops.

Pace adjusts visit duration slightly:

- Relaxed → longer
- Balanced → default
- Explorer → shorter

Do not increase stop count.

---

# 10. DATASET

## Q41. How large is the MVP dataset?
**A.**

Approximately **25 curated POIs**.

## Q42. What geographic areas should the dataset cover?
**A.**
- Casablanca
- El Jadida
- Azemmour
- Oualidia
- Mohammedia
- Boulaouane

## Q43. What are the 25 main POIs?
**A.**

### Casablanca
1. Hassan II Mosque
2. Quartier Habous
3. Marché Central
4. Ancienne Médina
5. La Sqala
6. Espace Sacré-Cœur
7. Musée du Judaïsme Marocain
8. Fondation Slaoui
9. Villa des Arts
10. Place Mohammed V
11. Boulevard Mohammed V / Art Deco Walk
12. Corniche Aïn Diab
13. Cinéma Rialto

### El Jadida
14. Cité Portugaise de Mazagan
15. Bastion de l’Ange
16. Citerne Portugaise
17. Phare Sidi Bouafi
18. Plage El Jadida / Deauville

### Azemmour
19. Médina & remparts d’Azemmour

### Oualidia
20. Lagune de Oualidia
21. Plage de Oualidia
22. Lagoon Boat Trip
23. Oyster Tasting

### Mohammedia
24. Kasbah de Mohammedia

### Boulaouane
25. Kasbah de Boulaouane

---

# 11. POI DATA MODEL

## Q44. What fields should every POI support?
**A.**

At minimum:

```ts
id
slug
name
localizedName
city
region
lat
lng
coordinateType
categories
tags
openingHours
baseDurationMinutes
priceRange
indoorOutdoor
walkingScore
culturalStory
culturalTip
media
hero
priority
verificationStatus
availabilityStatus
baseRouteCompatibility
```

## Q45. What is `coordinateType`?
**A.**

It distinguishes:
- `exact`
- `representative`

This matters for large areas such as:
- Corniche
- lagoon
- boulevard
- medina zones

Do not present representative anchors as exact entrances.

## Q46. What is the walking score?
**A.**

Internal numeric score:

1. very easy
2. easy
3. moderate
4. active
5. significant walking

UI may convert it to human language.

## Q47. What price bands are used?
**A.**
- Free
- 0–30 MAD
- 30–60 MAD
- 60–150 MAD
- 150–300 MAD
- 300+ MAD
- Unknown / needs verification

## Q48. Do we need live opening-hours APIs?
**A.**

No.

For the MVP use curated/preloaded hours and verification states.

Do not make the app dependent on live opening-hours services.

---

# 12. DATA CAVEATS

## Q49. What POIs require caution?
**A.**

### Citerne Portugaise
Do not treat as available by default.
Use something such as:
`temporarily_unavailable`

### Musée du Judaïsme Marocain
Operational details may need verification.

### Cinéma Rialto
Current schedule/tickets may need verification.

### Villa des Arts
Admission details may need verification.

### Bastion de l’Ange
Access details may need verification.

### Phare Sidi Bouafi
Interior access may need verification.

### Kasbah de Boulaouane
Access/hours/price may need verification.

### Kasbah de Mohammedia
Coordinate should be treated carefully if the map source is ambiguous.

---

# 13. HERO POIs

## Q50. Which POIs are the strongest regional hero places?
**A.**
1. Hassan II Mosque
2. Cité Portugaise de Mazagan
3. Oualidia Lagoon
4. Espace Sacré-Cœur
5. Azemmour Medina / ramparts
6. Habous
7. Marché Central
8. Kasbah de Boulaouane

---

# 14. FIVE BASE ROUTES

## Q51. What curated base routes exist?
**A.**

### Route 1 — Culture & Heritage
Sacré-Cœur  
→ Place Mohammed V  
→ Old Medina  
→ Hassan II

### Route 2 — Food & Local Life
Habous  
→ Marché Central  
→ Old Medina  
→ La Sqala

### Route 3 — Coast & Sunset
Oualidia Beach  
→ Lagoon Boat Trip  
→ Oyster Tasting  
→ Lagoon Sunset

### Route 4 — Hidden Gems
Villa des Arts  
→ Sacré-Cœur  
→ Fondation Slaoui  
→ Cinema Rialto

### Route 5 — Best of the Region
Hassan II  
→ Azemmour Medina  
→ Mazagan  
→ Oualidia Lagoon

## Q52. Should the app simply return one of the five fixed routes?
**A.**

No.

They are curated route templates/foundations.

The local engine should still match user preferences and produce a personalized trip.

---

# 15. GOLDEN DEMO ROUTE

## Q53. What is the exact controlled jury demo route?
**A.**

Casablanca only:

1. Quartier Habous
2. Marché Central
3. Espace Sacré-Cœur
4. Mosquée Hassan II

This route is the **golden path**.

It must work even if external APIs fail.

## Q54. What is the fallback schedule?
**A.**

### Stop 1 — Habous
- arrival ~09:30
- visit ~75 min

### Stop 2 — Marché Central
- arrival ~11:30
- visit ~75 min

### Stop 3 — Sacré-Cœur
- arrival ~14:00
- visit ~60 min

### Stop 4 — Hassan II Mosque
- arrival ~15:40
- target guided tour around 16:00
- total experience ~90 min

These are demo/fallback planning values.

## Q55. What are the fallback coordinates?
**A.**

### Habous
`33.57746, -7.60639`

### Marché Central
`33.59483, -7.61201`

### Espace Sacré-Cœur
`33.59134, -7.62449`

### Hassan II Mosque
`33.60847, -7.63260`

---

# 16. GOLDEN ROUTE METRICS

## Q56. What are the original fallback route metrics?
**A.**

### Habous → Marché Central
- Walk
- ~2.4 km
- ~30 min

### Marché Central → Sacré-Cœur
- Walk
- ~1.5 km
- ~18–20 min

### Sacré-Cœur → Hassan II
- Walk
- ~2.5 km
- ~31–35 min

### Total
- ~6.4 km walking
- ~80–85 min movement
- ~5h activities

Known fixed admission reference:
- roughly 190 MAD + food/shopping

These are fallback/demo estimates.

---

# 17. GENERATION SCREEN

## Q57. What does the user see while the trip is generated?
**A.**

Three subtle processing states:

1. Analyzing inspiration
2. Matching experiences
3. Optimizing route

No chatbot response.

No long AI explanation.

## Q58. How long may generation take?
**A.**

Target maximum perceived wait:
**7–10 seconds**

If an external dependency is too slow:
use fallback.

Never show infinite loading.

---

# 18. MAP + TIMELINE

## Q59. What is the primary trip result layout?
**A.**

> **Map + Timeline**

The map gives geographic understanding.

The timeline gives narrative understanding.

## Q60. What map technology should be used?
**A.**

Map renderer:
- MapLibre GL JS

Tile/style provider:
- configurable free-compatible source such as OpenFreeMap

Routing:
- provider abstraction

## Q61. What map visual style should we target?
**A.**
- clean
- calm
- premium
- Apple Maps-like visual simplicity
- minimal clutter
- custom route line
- custom numbered pins

## Q62. What should map pins display?
**A.**

Default:
- numbers 1–4

On selection:
- photo
- name
- category
- duration
- “View stop”

Do not overcrowd markers.

## Q63. How should the map and timeline synchronize?
**A.**

Tap timeline stop:
→ focus corresponding map marker

Tap map marker:
→ activate corresponding timeline stop

No complex auto-scroll is required.

## Q64. What does each timeline card show?
**A.**
- time
- photo
- place name
- duration
- transport mode to next stop
- state: Upcoming / Current / Visited

## Q65. What is in the trip header?
**A.**
- destination
- subtle weather
- duration
- primary vibe
- small visual/local identity

Map remains the dominant element.

---

# 19. WEATHER

## Q66. Is weather core functionality?
**A.**

No.

Weather is contextual enrichment.

Example:
> Casablanca · 24°C · Sunny

If weather API fails:
hide/degrade gracefully.

---

# 20. START TRIP

## Q67. What is the primary CTA before the trip begins?
**A.**

> **Start Trip**

## Q68. What happens after Start Trip?
**A.**

The app moves from **Planning Mode** to **Experience Mode**.

The primary action then becomes:

> **Adapt My Day**

---

# 21. EXPERIENCE MODE

## Q69. What should Experience Mode contain?
**A.**
- next stop
- visible map
- route preview
- transport mode
- distance
- duration
- progress through stops
- View Story
- Listen
- Navigate
- Visited

## Q70. What does progress look like?
**A.**

Conceptually:

`1 ✓ → 2 Current → 3 → 4`

Simple and visually clear.

---

# 22. NAVIGATION

## Q71. Do we build turn-by-turn navigation?
**A.**

No.

Inside Siyaha:
- show route overview
- distance
- duration
- walking/car

Then:

> **Navigate**

opens:
- Google Maps
- Apple Maps where appropriate

---

# 23. CULTURAL EXPERIENCE

## Q72. What is the cultural layer?
**A.**

Every important POI can have:

- hero photo/video
- 3–4 line cultural story
- one local/cultural tip
- Listen
- Visited

The content should feel concise, authentic, and useful.

Not encyclopedic.

## Q73. Why is the cultural layer important?
**A.**

Because Siyaha should not only optimize logistics.

It should help the visitor **experience and understand the destination**.

That is one of the strongest differences versus generic routing tools.

---

# 24. AUDIO

## Q74. Is runtime TTS required?
**A.**

No.

For MVP, prefer prepared audio.

Primary demo POIs:
1. Habous
2. Marché Central
3. Sacré-Cœur
4. Hassan II

Languages:
- EN
- FR
- AR

Suggested length:
30–60 seconds each.

---

# 25. VIDEO

## Q75. Do we need video for every place?
**A.**

No.

Only 2–3 hero locations if time permits.

Prepared beforehand.

Approximate length:
10–15 sec.

Always provide an image fallback.

---

# 26. ADAPT MY DAY

## Q76. What is Adapt My Day?
**A.**

A bottom sheet that demonstrates that the trip can respond to changing user needs.

Visible options:
- Less Walking
- Less Time
- Spend Less
- Rainy Day

## Q77. Which adaptation must really work?
**A.**

Only:

> **Less Walking**

must be fully implemented and polished for the MVP.

The other three may be visible but secondary.

---

# 27. LESS WALKING

## Q78. What should Less Walking do?
**A.**
- preserve the same POIs when possible
- preserve narrative order when sensible
- switch long walking segments to car
- optionally reorder only if clearly beneficial
- recalculate trip metrics
- animate before/after

## Q79. What is the golden Less Walking route?
**A.**

Keep the same order:

Habous  
→ **CAR**  
→ Marché Central  
→ **WALK**  
→ Sacré-Cœur  
→ **CAR**  
→ Hassan II

## Q80. What are the Less Walking fallback metrics?
**A.**

### Before
- walking ~6.4 km
- movement ~80–85 min

### After
- walking ~1.5 km
- car used on longer segments
- movement ~38–49 min

Approximate impact:
- ~4.9 km less walking
- ~77% walking reduction
- ~30–45 min saved

Main demo headline:

> **77% less walking · ~40 min saved**

## Q81. How should the Less Walking animation work?
**A.**

Recommended sequence:

1. current route visible
2. user taps Less Walking
3. old route fades
4. new route draws
5. affected segment icons switch Walk → Car
6. timeline updates
7. metrics animate
8. result headline appears

This is one of the main jury “wow” moments.

---

# 28. TRANSPORT

## Q82. What transport modes are supported?
**A.**
- Walking
- Car

Only.

## Q83. Is public transportation included?
**A.**

No.

No buses, tram routing, train planning, or multimodal transport engine in the MVP.

---

# 29. BUDGET

## Q84. How is trip budget shown?
**A.**

Display an estimated overall range.

Example:

> Estimated day: 220–320 MAD

Do not build detailed expense management.

---

# 30. HOME

## Q85. What is the Home layout?
**A.**

The Home page should contain:

1. cinematic hero
2. strong short headline
3. inspiration composer
4. 3 quick inspiration / Popular cards
5. subtle regional identity

Do not make a huge tourism portal.

## Q86. What are the 3 Popular cards?
**A.**

Exactly:

1. Culture in Casablanca
2. Atlantic Escape
3. Local Food Trail

Clicking one should prefill relevant onboarding context.

---

# 31. EXPLORE

## Q87. Do we need a full Explore section?
**A.**

No.

Explore is secondary.

Possible preloaded categories:
- Food
- Culture
- Hidden Gems
- Near Me
- Tonight

Do not let Explore distract from the golden flow.

---

# 32. MOROCCO PASSPORT

## Q88. What is Morocco Passport?
**A.**

Light gamification.

When the user marks a place as visited:
- unlock a visual stamp
- save it locally

This creates emotional travel memory.

## Q89. Do we need real geofenced check-in?
**A.**

No.

Manual `Visited` must work reliably.

Geolocation can optionally help later.

---

# 33. SHARE CARD

## Q90. What is Share Card?
**A.**

A vertical/social-friendly visual summary containing:
- destination
- hero visual
- vibe
- 4 stops
- duration
- key metric
- branding

Useful for:
- Instagram Story
- WhatsApp
- social sharing

Priority: P2.

---

# 34. LOCALIZATION

## Q91. Which languages are required?
**A.**
- English
- French
- Arabic

## Q92. Is Arabic RTL required?
**A.**

Yes on key screens.

RTL must be supported structurally, not through random per-component hacks.

## Q93. How should translations be organized?
**A.**

Product UI strings:
- normal i18n messages

POI stories/data:
- localized content object such as:

```ts
{
  en: "...",
  fr: "...",
  ar: "..."
}
```

---

# 35. VISUAL IDENTITY

## Q94. What is the desired visual personality?
**A.**

A mix of:

1. Premium Travel
2. Gen-Z / Social Travel
3. Luxury Morocco
4. Adventure / Explorer
5. Invisible AI intelligence

## Q95. What should the app NOT look like?
**A.**
- generic SaaS dashboard
- chatbot
- cyberpunk AI product
- glassmorphism overload
- red/green Morocco stereotype
- folklore theme park
- hotel booking website
- administrative tourism portal

---

# 36. COLOR SYSTEM

## Q96. What palette should be used?
**A.**
- Ivory / cream base
- Atlantic blue primary
- Terracotta cultural accent
- Charcoal typography
- Deep green as tiny accent

## Q97. Is dark mode needed?
**A.**

No.

Light mode only for MVP.

---

# 37. MOROCCAN DESIGN LANGUAGE

## Q98. How should Moroccan identity appear?
**A.**

Intelligently and selectively.

Possible references:
- zellige geometry
- arches
- doorway shapes
- artisan texture
- architectural rhythm
- Atlantic identity

Usage:

### Home
Subtle.

### Onboarding
Small accents.

### Cultural stories
More visible.

### Map/Timeline
Almost none.

### Passport
Strongest expression.

---

# 38. TYPOGRAPHY

## Q99. What typography direction was selected?
**A.**

Two-level system:

### Display
Distinctive, bold, expressive, inspired by the personality of Kateru.

### UI
Clean readable sans such as Geist / Inter / Manrope-like.

Do not bundle an unlicensed Kateru font.

Typography must remain replaceable through tokens.

---

# 39. IMAGERY

## Q100. What image styles are used?
**A.**

### Home / hero
Cinematic premium.

### Vibe cards
Strong emotional editorial imagery.

### Social/cultural stories
Vertical/social-friendly.

### POI stories
Authentic documentary.

### Map cards
Clean and consistent.

## Q101. What images are P0?
**A.**

Golden four:

```text
public/images/poi/habous.webp
public/images/poi/marche-central.webp
public/images/poi/sacre-coeur.webp
public/images/poi/hassan-ii.webp
```

## Q102. What are the six vibe image paths?
**A.**

```text
public/images/vibes/culture.webp
public/images/vibes/food.webp
public/images/vibes/coast.webp
public/images/vibes/hidden-gems.webp
public/images/vibes/art.webp
public/images/vibes/adventure.webp
```

## Q103. What are the three Popular image paths?
**A.**

```text
public/images/popular/culture-casablanca.webp
public/images/popular/atlantic-escape.webp
public/images/popular/local-food-trail.webp
```

---

# 40. MOTION

## Q104. How much animation should the app use?
**A.**

Navigation:
calm.

Strong animation only for:
- recognition
- generation
- route reveal
- Adapt My Day
- cultural story opening
- Passport stamp

Avoid animation everywhere.

---

# 41. TECH STACK

## Q105. What frontend stack should be used?
**A.**
- Next.js
- React
- TypeScript
- App Router
- Tailwind CSS
- shadcn/ui foundations
- Motion
- Vaul or equivalent for drawers
- react-dropzone or equivalent
- MapLibre GL JS
- PWA
- localStorage
- Vercel

## Q106. Do we need a backend database?
**A.**

No.

No database required for the MVP.

## Q107. Do we need authentication?
**A.**

No.

No:
- login
- signup
- Google OAuth
- Apple OAuth
- account system

---

# 42. STATE MANAGEMENT

## Q108. What state management should we use?
**A.**

Keep it lightweight.

A small Zustand store is acceptable because trip state spans:
- onboarding
- trip
- map selection
- experience mode
- adaptation
- visited state

Do not use Redux.

---

# 43. STORAGE

## Q109. What should localStorage persist?
**A.**
- last trip
- visited POIs
- passport stamps
- lightweight preferences if useful

Use a storage abstraction.

Do not scatter direct `localStorage` calls everywhere.

---

# 44. CLIENT / SERVER BOUNDARY

## Q110. Where do secret AI keys live?
**A.**

Server-side only.

Never expose Gemini/Groq secrets in the browser.

Use Next.js server route handlers or equivalent server-side functions.

---

# 45. ROUTING

## Q111. How should routing be implemented?
**A.**

Through a provider abstraction.

Components must not depend directly on third-party provider schemas.

Normalized interface concept:

```ts
calculateSegment()
calculateRoute()
calculateMetrics()
```

## Q112. What happens if routing API is unreliable?
**A.**

The golden demo still works using local fallback metrics.

External routing may enrich geometry.

It must not own the experience.

---

# 46. FALLBACK ARCHITECTURE

## Q113. What is the fallback philosophy?
**A.**

> **External services enrich the product. They do not own the product.**

Every major external dependency needs a fallback.

## Q114. What happens if AI image recognition fails?
**A.**

Use:
- manual onboarding
- curated fallback
- golden-demo recognition path where appropriate

Never block.

## Q115. What happens if voice fails?
**A.**

Manual preference selection remains available.

## Q116. What happens if social metadata fails?
**A.**

Ignore it.

## Q117. What happens if routing fails?
**A.**

Use local route/fallback metrics.

## Q118. What happens if weather fails?
**A.**

Hide weather.

## Q119. What happens if a remote image fails?
**A.**

Use local category or hero fallback.

## Q120. What happens if audio fails?
**A.**

The cultural story still works.

---

# 47. PWA / OFFLINE

## Q121. What should work with poor connectivity?
**A.**
- app shell
- last trip
- demo POI data
- golden route
- essential hero images
- cultural story
- local fallback metrics

## Q122. Do we need offline map tiles?
**A.**

No.

---

# 48. PERFORMANCE

## Q123. What performance principles matter?
**A.**
- fast initial render
- local matching should feel instant
- images optimized
- videos lazy-loaded
- map lazy-loaded if helpful
- no giant JS bundle
- external API timeouts
- immediate fallback
- no infinite loaders

---

# 49. GEOLOCATION

## Q124. When should location permission be requested?
**A.**

Only contextually:
- Use my location
- Near me
- Start Trip
- optional check-in

Never on first page load.

---

# 50. DEMO FLOW

## Q125. What is the controlled jury demo flow?
**A.**

1. Home
2. Give inspiration
3. AI recognition/context extraction
4. Your Vibe
5. Your Day
6. Build My Trip
7. Generation states
8. Map + Timeline reveal
9. Show 4-stop Casablanca route
10. Start Trip
11. Open cultural experience
12. Listen / story
13. Adapt My Day
14. Less Walking
15. Show animated before/after

## Q126. What is the target demo duration?
**A.**

Approximately **60–90 seconds**.

Suggested pacing:

### 0–10 sec
Inspiration.

### 10–20 sec
Recognition.

### 20–30 sec
Quick preferences.

### 30–40 sec
Generation.

### 40–55 sec
Map + Timeline reveal.

### 55–70 sec
Experience / cultural layer.

### 70–90 sec
Less Walking adaptation.

---

# 51. DEMO WOW MOMENTS

## Q127. What are the three strongest visual/demo moments?
**A.**

### 1. Inspiration recognition
“I saw this online, the app understands it.”

### 2. Map + Timeline reveal
“My inspiration became a coherent real day.”

### 3. Less Walking transformation
“The day adapts to me instantly.”

---

# 52. BUILD PRIORITIES

## Q128. What is P0?
**A.**

Must work before the jury:

- Home
- Inspiration
- 3-step onboarding
- basic AI/fallback understanding
- 25-POI-compatible data
- deterministic matching
- exactly 4 stops
- golden Casablanca trip
- Map
- Timeline
- Start Trip
- one cultural experience
- Less Walking
- before/after metrics
- responsive mobile
- laptop projection
- reliable fallbacks
- no crashes

## Q129. What is P1?
**A.**
- real Gemini integration
- Groq voice
- EN/FR/AR
- RTL
- cultural content for all 4 golden POIs
- audio
- Passport
- lightweight weather
- Popular cards
- PWA polish
- 2–3 hero videos

## Q130. What is P2?
**A.**
- Share Card
- lightweight Explore
- sophisticated social metadata
- additional hero videos
- polish outside golden path
- additional adaptation modes

---

# 53. EXPLICITLY OUT OF SCOPE

## Q131. What must NOT be built now?
**A.**

Do not build:
- authentication
- signup
- admin dashboard
- database-heavy architecture
- booking engine
- payment
- hotels
- flights
- ticket purchase
- public transport engine
- native turn-by-turn navigation
- live traffic engine
- live crowd prediction
- full live opening-hours dependency
- heavy social scraping
- runtime video generation
- full offline maps
- complex notifications
- ML model training
- social network
- group collaboration
- drag-and-drop itinerary editor
- manual reorder/remove/replace stop
- full Rainy Day logic
- full Spend Less logic
- full Less Time logic

---

# 54. RECOMMENDED PROJECT STRUCTURE

## Q132. How should the app be structured?
**A.**

```text
src/
  app/
  components/
  config/
  data/
  features/
    home/
    onboarding/
    ai/
    trip/
    map/
    experience/
    passport/
    share/
    explore/
  lib/
    ai/
    matching/
    routing/
    adaptation/
    storage/
    i18n/
  types/

public/
  images/
    poi/
    vibes/
    popular/
  audio/
  video/
```

---

# 55. DOMAIN TYPES

## Q133. What shared domain concepts should exist?
**A.**

At minimum:

```text
InputSource
SocialPlatform
Interest
BudgetLevel
TripPace
TravelMode
IndoorOutdoor
PriceRange
CoordinateType
VerificationStatus
AvailabilityStatus
LocalizedText
TripProfile
ConfidenceMap
POI
POIMedia
OpeningHours
POIAvailability
TripStop
RouteSegment
RouteMetrics
Trip
AdaptationType
AdaptationRequest
AdaptationResult
CulturalContent
PassportStamp
VisitState
ProcessingStep
ProcessingState
BaseRoute
WeatherSummary
```

---

# 56. CRITICAL IMPLEMENTATION RULES

## Q134. What should Claude Code never do while implementing?
**A.**
- invent new product scope
- replace the 4-stop logic with free LLM route generation
- redesign the product as a chatbot
- add authentication
- add unnecessary backend complexity
- prioritize Explore over golden flow
- depend on live APIs for the demo
- replace curated data with random Google results
- hardcode one fragile external API
- make the map optional
- skip Less Walking
- create twenty half-finished screens

---

# 57. ACCEPTANCE CRITERIA

## Q135. When can the MVP be considered demo-ready?
**A.**

All of the following must be true:

### Home
- visually polished
- immediate inspiration CTA

### Onboarding
- maximum 3 screens
- no broken state
- user can proceed without AI

### AI
- structured profile returned OR fallback works
- no infinite loader

### Trip generation
- exactly 4 stops
- deterministic result
- coherent timeline

### Map
- visible in real Chrome/Safari
- 4 markers
- route visible
- marker/timeline sync works

### Trip
- Start Trip works

### Experience
- cultural story opens
- one golden stop works end to end

### Less Walking
- bottom sheet works
- transport changes
- metrics update
- before/after visible

### Fallback
- core golden demo survives API failure

### Responsive
- ~390px mobile works
- laptop/projection works

### Build
- lint passes
- typecheck passes
- tests pass
- production build passes

---

# 58. REAL-BROWSER QA

## Q136. What must be manually tested in a real browser?
**A.**

Especially:

1. Home rendering
2. onboarding step 2 vibe cards
3. MapLibre canvas
4. all 4 numbered markers
5. route line
6. timeline selection
7. Start Trip
8. Experience Mode
9. Adapt sheet
10. Less Walking route redraw
11. Arabic RTL
12. mobile viewport
13. desktop viewport

Headless browser success is not enough for MapLibre.

---

# 59. MAP QA BLOCKER RULE

## Q137. What if the map is blank?
**A.**

Treat it as P0 blocker.

Do not spend time polishing Passport, Share Card, or extra media while the map is blank.

Fix map first.

---

# 60. MEDIA PRIORITY

## Q138. What is the media priority order?
**A.**

### Tier 1
Golden 4 POIs.

### Tier 2
6 onboarding vibe images.

### Tier 3
3 Popular cards.

### Tier 4
Everything else.

The remaining 21 POIs may use category fallback images during MVP.

---

# 61. CULTURAL CONTENT PRIORITY

## Q139. Which POIs require the strongest cultural content first?
**A.**
1. Habous
2. Marché Central
3. Sacré-Cœur
4. Hassan II

For each:
- EN story
- FR story
- AR story
- cultural tip
- audio if possible

---

# 62. SHAREABLE DEMO STORY

## Q140. What should the jury understand after the demo?
**A.**

They should be able to repeat this:

> “I can show Siyaha something that inspired me online. It understands what I like, builds a real personalized day in Casablanca-Settat, shows me where to go and why the places matter, and adapts the day if my needs change.”

If the jury understands that sentence, the product story is successful.

---

# 63. THE ONE-SENTENCE TECHNICAL ARCHITECTURE

## Q141. How should the system be explained technically?
**A.**

> Multimodal AI converts messy traveler inspiration into a structured profile, a curated deterministic engine builds the 4-stop trip, geo services validate and visualize movement, and local fallback data guarantees the demo remains operational.

---

# 64. THE ONE-SENTENCE UX PRINCIPLE

## Q142. How should UX decisions be evaluated?
**A.**

> The user should feel that the app already understands them before they have to explain everything.

---

# 65. THE ONE-SENTENCE HACKATHON RULE

## Q143. What wins over additional features?
**A.**

> One beautiful end-to-end journey that works every time beats ten unfinished features.

---

# 66. IMPLEMENTATION ORDER FOR CLAUDE CODE

## Q144. If implementation is incomplete, in what exact order should Claude build?
**A.**

Follow this order.

### Phase 1 — Foundation
- shared types
- store
- theme
- i18n
- fixture data
- storage abstraction

### Phase 2 — Core Data
- 25 POIs
- 5 routes
- golden trip
- deterministic matcher

### Phase 3 — Core UI
- Home
- Inspiration
- Your Vibe
- Your Day
- generation screen

### Phase 4 — Trip
- MapLibre
- route
- 4 markers
- timeline
- map/timeline sync

### Phase 5 — Experience
- Start Trip
- progress
- cultural detail
- Navigate
- Visited

### Phase 6 — Adaptation
- Adapt My Day
- Less Walking
- before/after metrics
- route redraw

### Phase 7 — Runtime AI
- Gemini image/text understanding
- Groq voice fallback
- validation
- timeouts
- fallback

### Phase 8 — Polish
- EN/FR/AR
- RTL
- media
- Passport
- PWA

### Phase 9 — Optional
- Share Card
- Explore
- additional adaptation UI

---

# 67. CLAUDE CODE EXECUTION CONTRACT

## Q145. What instruction should be given to Claude Code with this file?
**A.**

Use:

```text
Read SIYAHA_APP_MASTER_QA.md completely before changing code.

Treat it as the canonical product source of truth.

First audit the current repository against every P0 acceptance criterion in the document.

Create a checklist:
IMPLEMENTED
PARTIAL
MISSING
BROKEN

Then implement all missing/broken P0 features in the exact implementation order defined in the document.

Do not add new product scope.

Do not stop after creating components. Wire the full end-to-end flow.

After each major phase:
- run lint
- run typecheck
- run tests
- run production build

At the end, manually verify the golden flow:
Home
→ Inspiration
→ Your Vibe
→ Your Day
→ Build My Trip
→ Map + Timeline
→ Start Trip
→ Cultural Experience
→ Adapt My Day
→ Less Walking

Return a final matrix showing every P0 item and whether it is PASS or FAIL.

Do not claim completion for a feature that is only mocked or visually present but not connected.
```

---

# 68. FINAL NON-NEGOTIABLES

These rules override almost everything else:

1. **Exactly 4 stops.**
2. **AI understands, local engine decides, geo services verify.**
3. **No chatbot UX.**
4. **Nothing in onboarding is mandatory.**
5. **Maximum 3 onboarding screens.**
6. **Golden route = Habous → Marché Central → Sacré-Cœur → Hassan II.**
7. **Map + Timeline is the central trip output.**
8. **Start Trip creates a real Experience Mode.**
9. **Cultural story + tip + audio are part of the product identity.**
10. **Less Walking is the only adaptation that must fully work.**
11. **Less Walking golden headline = 77% less walking · ~40 min saved.**
12. **No auth or database required.**
13. **EN / FR / AR with RTL support.**
14. **Mobile-first PWA, desktop projection friendly.**
15. **Casablanca-Settat regional identity, not Casablanca-only branding.**
16. **External APIs must never own the golden demo.**
17. **If the map is broken, fix it before secondary polish.**
18. **If P0 is not complete, do not build P2.**
19. **Do not invent live facts or coordinates.**
20. **One reliable beautiful flow wins the hackathon.**

---

# 69. GOLDEN DEMO CHECKLIST

Before presenting, manually confirm:

- [ ] Home hero renders
- [ ] inspiration upload works
- [ ] Paste Link does not crash
- [ ] Voice has graceful fallback
- [ ] Your Vibe displays six distinct categories
- [ ] Your Day works
- [ ] Build My Trip returns exactly four stops
- [ ] generation screen transitions properly
- [ ] map renders in real browser
- [ ] four pins are visible
- [ ] route line is visible
- [ ] timeline is visible
- [ ] timeline ↔ map interaction works
- [ ] Start Trip works
- [ ] Experience Mode shows current stop
- [ ] cultural story works
- [ ] Navigate produces external navigation link
- [ ] Visited changes state
- [ ] Passport persists if implemented
- [ ] Adapt My Day opens
- [ ] Less Walking works
- [ ] Walk → Car segments visibly change
- [ ] 6.4 km → ~1.5 km appears
- [ ] ~77% reduction appears
- [ ] ~40 min saved appears
- [ ] app survives missing Gemini key
- [ ] app survives routing outage
- [ ] app survives weather failure
- [ ] local images do not 404
- [ ] mobile 390px looks polished
- [ ] desktop projection looks polished
- [ ] EN works
- [ ] FR works
- [ ] AR/RTL key screens work
- [ ] `pnpm verify` passes
- [ ] Vercel production build works
- [ ] backup demo video recorded

---

# 70. FINAL PRODUCT STATEMENT

**Siyaha turns scattered travel inspiration into an intelligent, culturally rich journey across Casablanca-Settat. The traveler can show the app what inspired them, quickly express their vibe and constraints, receive a curated 4-stop itinerary, navigate it through a synchronized map and timeline, discover the cultural meaning of each place, and adapt the day instantly when their needs change.**

**See it. Plan it. Experience Morocco.**
