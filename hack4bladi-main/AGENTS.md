<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BENNA team rules (for every AI agent: OpenCode, Claude Code, Codex…)

Human onboarding: `docs/ONBOARDING.md`. The repo owner @AbdelkbirNA is the only person who
merges into `main`.

## Git — hard rules

- Never commit or push on `main`. Work on a branch: `feat/…`, `fix/…`, `docs/…`, `chore/…`.
- Never merge (no `gh pr merge`, no merging into `main`), never force-push, never rewrite
  history, never delete remote branches. Delivery = push the branch + open a pull request.
- Before committing, show the human the diff summary and get their OK. Before pushing, run
  `pnpm lint && pnpm typecheck && pnpm test`; if anything fails, fix it or say so in the PR.
- Never commit `.env.local`, keys, tokens or `.wa-bridge-auth/`. Scan the staged diff for
  secrets before each commit.
- PR description: what changed, why, how it was tested (commands + screen checked),
  screenshots for UI changes, and anything left undone. Fill `.github/pull_request_template.md`.

## Scope

- Do only the task you were given. No drive-by refactors, reformatting, renames, dependency
  upgrades or new dependencies unless the task asks. List other ideas as follow-ups in the PR.
- Keep diffs small and in the style of the surrounding code. Reuse what exists
  (`src/features/benna/ui.tsx`, `src/components/*`, tokens in `src/app/globals.css`).
- Don't edit `opencode.json`, `AGENTS.md`, `.github/` or `supabase/migrations/` that are
  already committed unless the task is about them. New schema changes = a new migration file.
- `supabase/seed.sql` is generated: edit `src/features/benna/data.ts`, then `pnpm benna:seed`.

## Product rules

- French UI, sentence case, works in RTL. Mobile first (390px).
- Prices, savings, allergens and "why it matches" reasons come from code and data, never from
  model output. AI only fills the strict zod schemas in `src/features/benna/m3ak.ts`.
- API keys stay server-side (`src/config/env.ts`); never ship the service role key to a browser.
- Demo data is labelled as demo; simulated payments are never presented as real.

## Commands

- `pnpm dev` — run the app · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm verify` (all + build)
