# BENNA (بنّة)

**Moroccan homemade lunch, ordered together at work.**

Colleagues in the same building join one group order before a cutoff. Home kitchens cook to
order, one delivery serves the whole building, and everyone pays a lower group price for their
own share. Built for Hack4Bladi: a working demo with demo data, not a production service.

> **Team:** start with [docs/ONBOARDING.md](docs/ONBOARDING.md). Every change goes through a
> pull request reviewed and merged by @AbdelkbirNA. AI agents follow [AGENTS.md](AGENTS.md).

## What it does

- **Today's menu by workplace:** each building sees the kitchens of its own city (Casablanca,
  Rabat, Marrakech), with a weekday rotation of lunches and breakfasts.
- **Group ordering:** a live group card with delivery time, pickup point, cutoff countdown and
  who already ordered. Invite colleagues with a link (`/rejoindre/[code]`) or a WhatsApp message.
- **Meal detail and cart:** portions, sides and notes, group vs solo price, declared ingredients
  and allergens, a simulated payment, and an order status timeline.
- **BENNA M3AK:** say what you feel like in Darija, French or Arabic, typed or spoken
  (*"bghit chi haja b lkhodra, bla djaj, 35 DH"*). It suggests dishes from today's real menu.
- **AI invite:** writes the WhatsApp invite in Darija, French or Arabic.
- **WhatsApp ordering bot:** order by chat, with a kitchen dashboard at `/admin/commandes`.
  See [WHATSAPP_SETUP.md](WHATSAPP_SETUP.md).

### How the AI is used

The model only turns what people say into a strict, validated request (zod). Prices, savings,
allergens and the "why it matches" reasons are computed by code from the menu data, never
written by the model. Nothing goes in the cart until the person taps. Without API keys, every
AI feature falls back to a local, offline answer.

## Quick start

Requires Node 22+ and pnpm.

```bash
pnpm install
cp .env.example .env.local   # every key is optional
pnpm dev                     # http://localhost:3000
```

Optional, for the menu from a database and the WhatsApp bot:

```bash
supabase start               # local Supabase (Docker), applies migrations + seed
# put the printed API URL and anon key in BENNA_SUPABASE_URL / BENNA_SUPABASE_ANON_KEY
```

| Key in `.env.local` | Enables |
| --- | --- |
| `OPENAI_API_KEY`, `GEMINI_API_KEY` | M3AK understanding, voice transcription, AI invites |
| `BENNA_SUPABASE_URL`, `BENNA_SUPABASE_ANON_KEY` | Today's menu read from Supabase |
| `BENNA_SUPABASE_SERVICE_ROLE_KEY`, `BENNA_ADMIN_TOKEN` | Orders storage and the admin page (server only) |
| `WHATSAPP_*`, `TWILIO_*` | The WhatsApp bot (see WHATSAPP_SETUP.md) |

Keys stay on the server. Never commit `.env.local`.

## Commands

| Command | What |
| --- | --- |
| `pnpm dev` | Run the app |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | Checks to run before every pull request |
| `pnpm verify` | All checks + production build |
| `pnpm benna:seed` | Regenerate `supabase/seed.sql` from `src/features/benna/data.ts` |

## Screens

| Route | Screen |
| --- | --- |
| `/bienvenue` | Choose your workplace, or enter an invite code |
| `/` | Today: group card, M3AK search, kitchens and menu |
| `/plat/[id]` | Meal detail and options |
| `/groupe`, `/groupe/inviter` | Group order, participants, invite |
| `/rejoindre/[code]` | Landing page of a shared invite link |
| `/panier`, `/commande/[id]` | Cart, simulated checkout, order status |
| `/compte` | Account and order history |
| `/admin/commandes` | Kitchen dashboard for WhatsApp orders (token) |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · Zustand · Zod ·
Motion + View Transitions · Supabase (Postgres, PostgREST) · OpenAI and Gemini · pnpm.
Mobile-first PWA in French, RTL-ready, font Readex Pro (Latin + Arabic).

## Code map

| Where | What |
| --- | --- |
| `src/features/benna/` | Screens, UI pieces, demo data, cart, M3AK, WhatsApp flow |
| `src/app/api/benna/` | M3AK, transcription and invite endpoints |
| `src/app/api/whatsapp/`, `src/lib/whatsapp/` | WhatsApp webhook, senders, bridge |
| `src/lib/benna/` | Menu and orders access (server only) |
| `src/components/` | Page shell, transitions, tab bar, sheets, brand |
| `src/app/globals.css` | Colour tokens (deep green, logo red, cream), animations |
| `supabase/` | Migrations and generated seed |

## Honesty rules

All workplaces, kitchens, people and prices are demo data, and prices are labelled as pilot
prices. Payment is simulated and never presented as real. No invented statistics, partners or
guaranteed savings. Ingredients and allergens are shown as declared by the kitchen.

Older files in `docs/` describe Siyaha, the tourism project this repo started as.
