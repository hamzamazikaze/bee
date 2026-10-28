# Deploying to Vercel

Next.js is auto-detected: no `vercel.json`, no build overrides. Import the repo and it
builds. What follows is the part that is not automatic.

## 1. Environment variables

Set these in **Project → Settings → Environment Variables**, for *Production* and
*Preview*. `.env.local` is gitignored and is never uploaded — a deployment starts with
nothing.

| Variable | Needed for | Without it |
|---|---|---|
| `OPENAI_API_KEY` | the guide (`/chat`), the day curator, Whisper voice | conversation says "unavailable"; the engine builds the day alone |
| `GEMINI_API_KEY` | image understanding, intent extraction from links | a pasted link resolves on its caption text only |
| `VOICE_ENGINE` | **set to `darija`** | defaults to `darija` anyway — set it explicitly so it survives a default change |
| `NEXT_PUBLIC_APP_URL` | absolute URLs | relative paths, which is usually fine |
| `GROQ_API_KEY` | Whisper via Groq instead of OpenAI | falls through to OpenAI |
| `YOUTUBE_API_KEY` | YouTube link metadata | falls back to OpenGraph |
| `ENABLE_DIAGNOSTICS` | set to `1` to reach `/test-ai`, `/test-ai-darija`, `/test-openai` | the three laboratories answer 404 |

Every one of them is optional in the sense that nothing crashes without it — the app
degrades to local data by design. None of them is optional if you want the demo to work.

`ROUTING_BASE_URL` and `WEATHER_BASE_URL` have working public defaults; leave them unset.

## 2. Function durations are already handled

A Vercel function gets **10 seconds by default**, and three of these routes are designed to
spend longer than that. Each one now exports its own `maxDuration`:

| Route | Limit | Why |
|---|---|---|
| `/api/transcribe` | 60s | MoulSot is a queued public GPU Space — measured between 14s and 39s |
| `/api/test-openai/transcribe` | 60s | races every speech engine on one clip |
| `/api/chat`, `/api/extract` | 30s | a model call plus the catalogue or a thumbnail fetch |
| `/api/analyze` | 20s | a vision call on an uploaded photo |
| `/api/curate` | 15s | a model call over the full catalogue |

**Hobby plans cap at 60 seconds.** That is enough for all of the above, but leaves no room
if the HF Space is having a slow day. If voice matters on stage, Pro (300s) removes the
question — or set `VOICE_ENGINE=auto`, which answers in about a second and only waits on
MoulSot when the audio turns out to be Darija.

## 3. What will be slower than localhost

- **Voice.** Every recording waits for MoulSot under `VOICE_ENGINE=darija`. That is the
  deliberate trade: the fast engine gets Moroccan Darija wrong (measured on `/test-openai`),
  and a transcript is what the whole day is built from.
- **The first request after a quiet period** pays a cold start on top.
- **The MoulSot Space itself sleeps.** Send one throwaway recording a few minutes before
  the demo. It does not make inference faster; it removes the container wake from your
  first live attempt.

## 4. Before you present

1. Open `/test-openai` on the deployed URL — it reports whether the key is live and which
   models it can reach. Faster than guessing from a failing screen. **It answers 404 until
   you set `ENABLE_DIAGNOSTICS=1`** (see §5); set it, check the key, and consider unsetting
   it again before you share the link.
2. Paste the reel link into `/onboarding?new` and confirm the mosque is recognised.
3. Record one Darija sentence and check the transcript comes back from `moulsot`.
4. Open `/trip` in a fresh browser profile. It must say **"You have not built a day yet"** —
   if a day appears before you planned one, something is serving cached state.

## 5. What is closed by default on a public URL

Three things behave differently once `NODE_ENV` is `production`, because a URL a stranger
can reach is not a laptop.

**The developer laboratories are off.** `/test-ai`, `/test-ai-darija`, `/test-openai` and
the six `/api/test-*` routes behind them answer 404. They are genuinely useful and they are
also six unauthenticated endpoints that spend the project's API credits and enumerate what
the account can reach. Set `ENABLE_DIAGNOSTICS=1` when you want them, and prefer unsetting
it afterwards.

**`/api` is rate limited per IP.** `src/proxy.ts` allows 60 requests per ten minutes to
anything that reaches a paid provider (`/api/chat`, `/api/curate`, `/api/extract`,
`/api/analyze`, `/api/transcribe`) and 300 to the rest. A whole trip build costs two model
calls, so a jury room sharing one address gets roughly twenty-five days out of the budget
before anyone meets a limit; a script meets it in seconds. Over the limit the route answers
429, which every caller already treats exactly as it treats a timeout — an empty draft, an
uncurated day, "the guide is unavailable". Nothing dead-ends.

The counter lives in one server instance's memory. Vercel may run several and each keeps
its own tally, so the true ceiling is the limit times the number of warm instances, and it
resets when an instance is recycled. That is a brake, not a quota. A shared store (Upstash,
Redis) is the right next step if this outlives the demo.

**Pasted links cannot reach the private network.** `/api/extract` fetches any URL a
traveller pastes, from inside the deployment, and hands back the page's title and
description. Loopback, RFC1918, link-local — including `169.254.169.254`, every cloud
metadata service — and `.local`/`.internal` names are refused, and every hop of a redirect
chain is re-checked, so a public page cannot bounce us somewhere private. DNS rebinding is
not covered.
