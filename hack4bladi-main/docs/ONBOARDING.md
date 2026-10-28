# BENNA — team onboarding

BENNA (بنّة): Moroccan homemade lunch, ordered as a group at work. Next.js 16 app, French UI,
demo data, local Supabase for the menu, OpenAI/Gemini for the AI features.

**Leader / reviewer:** @AbdelkbirNA. Every change reaches `main` through a pull request he
merges. Nobody else merges, nobody pushes to `main`.

## 1. Set up (15 min)

```bash
gh repo clone AbdelkbirNA/hack4bladi && cd hack4bladi
pnpm install
cp .env.example .env.local      # ask the leader for the keys you need, in private
pnpm dev                        # http://localhost:3000
```

- Every key is optional: without them the app falls back to local data and offline answers.
- Menu from Supabase (optional): `supabase start`, then put the printed URL and anon key in
  `BENNA_SUPABASE_URL` / `BENNA_SUPABASE_ANON_KEY`. Change demo data in
  `src/features/benna/data.ts`, then `pnpm benna:seed` to regenerate `supabase/seed.sql`.
- **Never commit `.env.local`** or paste a key in code, an issue, a PR or a chat with an AI
  you don't control.

## 2. The workflow (every task)

1. Get a task from the leader (a GitHub issue). One task = one branch = one PR.
2. Branch from fresh `main`:
   ```bash
   git switch main && git pull
   git switch -c feat/short-name        # or fix/…, docs/…, chore/…
   ```
3. Work with your AI agent (OpenCode, Claude Code…). It reads `AGENTS.md` automatically.
4. Before pushing, run the checks and make sure they pass:
   ```bash
   pnpm lint && pnpm typecheck && pnpm test
   ```
5. Click through your change in the browser at phone width (390px). Take a screenshot.
6. Push your branch and open a PR:
   ```bash
   git push -u origin feat/short-name
   gh pr create --fill                  # then complete the template
   ```
7. The leader reviews. Fix what he asks **on the same branch** and push again.
   He merges. You delete your branch after.

**Never:** push to `main`, merge a PR (yours or anyone's), force-push a shared branch,
rewrite history on `main`, or commit secrets.

## 3. Working with an AI agent

- Your agent works for you; **you** own the PR. Read every line of the diff before pushing.
- Keep the PR small: one feature or one fix, ideally under ~300 changed lines.
- Ask the agent to explain anything you don't understand before you commit it.
- Don't let it "clean up" files unrelated to your task, reformat the repo, or upgrade
  dependencies. Out-of-scope ideas go into the PR description as "follow-ups".
- If it says "done", check it yourself: run the app, run the checks.
- Prices, savings and allergens are computed by code from data, never written by a model.

OpenCode users: `opencode.json` at the root already loads the team rules and blocks
`git push` to `main`, merging, and force-pushes. Don't edit it in your PR.

## 4. Where things are

| What | Where |
| --- | --- |
| Screens (Today, meal, group, cart, order…) | `src/features/benna/*-screen.tsx` |
| Shared BENNA UI (tags, countdown, dish rows) | `src/features/benna/ui.tsx` |
| Demo data, menus, rotation | `src/features/benna/data.ts` |
| Cart (zustand) | `src/features/benna/cart.ts` |
| M3AK assistant (darija → dishes) | `src/features/benna/m3ak.ts`, `src/app/api/benna/m3ak` |
| WhatsApp ordering bot | `src/features/benna/whatsapp-flow.ts`, `src/lib/whatsapp/`, `WHATSAPP_SETUP.md` |
| Colours, fonts, animations | `src/app/globals.css`, `src/app/layout.tsx` |
| Page shell, transitions, tab bar | `src/components/page-shell.tsx`, `src/components/bottom-nav.tsx` |
| Database schema + seed | `supabase/migrations/`, `supabase/seed.sql` (generated) |

## 5. Design rules (short)

- French UI, sentence case. Font: Readex Pro (Latin + Arabic). Must work in RTL.
- Deep green `#0F3D2E` = actions. Logo red `#A8060F` = accents and the desktop backdrop.
  Cream/white surfaces. Use the tokens in `globals.css`, no hard-coded colours.
- Mobile first (390px), no horizontal scroll, every button reachable with a thumb.
- Demo data stays labelled as demo. No invented statistics, partners or guaranteed savings.
  Simulated payments are never presented as real.
