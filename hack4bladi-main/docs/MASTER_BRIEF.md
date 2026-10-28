# Siyaha — Master Brief

The single summary of product truth. If code and this file disagree, this file is right
and the code is a bug.

## Promise

**See it. Plan it. Experience Morocco.**

Social inspiration → understanding → personalised trip → smart map → real experience →
live adaptation.

## Problem

Travellers discover Morocco through TikTok, Reels, Instagram and screenshots, then have to
rebuild the whole trip by hand: identify the place, find what is near it, judge distances,
order a sensible day, guess cost, learn the context. Inspiration and planning are
disconnected. Siyaha closes that gap.

## Not a chatbot

The AI never talks back. The user speaks; the *experience* answers — with selections,
extracted tags, cards, a map, a timeline, route changes, metrics, stories and audio.
There is no conversational assistant anywhere in the product.

## Scope

- **Region:** Casablanca-Settat. The product never presents itself as "Casablanca only".
- **Pilot dataset:** Casablanca, El Jadida, Azemmour, Oualidia, Mohammedia, Boulaouane.
- **Controlled demo:** entirely in Casablanca.
- **Persona:** first-time international visitor, Gen-Z social-first discovery behaviour.

## Input — nothing is mandatory

Any combination of screenshot, social URL, voice, text, interests, destination, time,
budget, pace, location. "Give us whatever you have. We understand the rest."

## The core rule

> **AI understands. The local engine decides. Geo services verify.**

The AI turns messy multimodal input into one structured `TripProfile`. It never invents
POIs and never invents coordinates. A deterministic local matcher picks the stops.

## The trip

Always **exactly 4 stops**. Selection pattern: 2 strongly aligned + 1 complementary +
1 signature must-see. Ordered as a narrative day (morning culture → midday food →
afternoon discovery → sunset icon), not by shortest distance. Pace changes stop
*duration*, never stop *count*.

## Differentiators

1. **Cultural layer** — a 3–4 line story, a tip and pre-recorded audio per stop.
2. **Adapt My Day** — Less Walking is fully working and animated; the other three are
   visible but minimal.
3. **Fallback integrity** — the whole golden demo runs with every external service dead.

## Personality and look

Premium travel × Gen-Z social × luxury Morocco × explorer × AI future.
Ivory ground, Atlantic blue, terracotta accent, charcoal type, deep green sparingly.
Modern, editorial, warm, mobile-first. Light theme only.

Avoid: generic SaaS dashboards, cyberpunk AI aesthetics, neon gradients, heavy
glassmorphism, red/green Morocco cliché, flags, folkloric clutter.

Moroccan visual language is used selectively: subtle on Home, accents in onboarding,
strong in cultural stories and Passport, almost none on map and timeline.

## Out of scope

Auth, accounts, database, booking, payments, public transport, turn-by-turn navigation,
live opening hours, heavy social scraping, runtime video or TTS generation, offline map
tiles, itinerary editing, drag-to-reorder. See the brief's §74 for the full list.

## Priorities

- **P0** — app shell, Home, 3-step onboarding, local profile state, fallback AI path,
  25-POI schema, matcher, 4-stop trip, map, timeline, golden Casablanca route, Start Trip,
  one cultural detail, Less Walking with before/after metrics, no crashes.
- **P1** — real Gemini, Groq voice, 3 languages + RTL, all 4 cultural stories and audio,
  Passport, weather, Popular cards, PWA, 2 hero videos.
- **P2** — share card, Explore, more media, richer social metadata, extra adaptations.
