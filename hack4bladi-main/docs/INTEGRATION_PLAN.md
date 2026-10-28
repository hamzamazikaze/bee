# Integration Plan

The Lead is the only agent who merges. Workers never merge `main` into their branch and
never merge their branch into `main`.

## Merge order and why

1. **AI/Data** — data and the engine. Everything downstream becomes real.
2. **Trip/Map** — map, timeline and adaptation, on top of real POIs.
3. **UI** — screens last, wrapping something that already works.

Boundaries are disjoint by design, so conflicts should only appear in three places:
`package.json` / `pnpm-lock.yaml`, the i18n message files, and `src/app/**` route stubs.
All three are anticipated below.

## Per-merge procedure

Ask the worker to confirm `pnpm verify` passes in their worktree, then:

```bash
cd ~/Work/Siyaha_hackathon
git fetch --all
git merge --no-ff feat/ai-data -m "feat: merge AI/Data worker"
# resolve conflicts centrally, then:
pnpm install
pnpm verify        # lint && typecheck && test && build
```

`pnpm verify` must be green before the next merge starts. Never stack two unverified
merges — a failure after four merges costs an hour to bisect.

## Conflict playbook

**`pnpm-lock.yaml`** — never hand-merge. Take `main`'s version, then re-resolve:
```bash
git checkout --ours pnpm-lock.yaml
pnpm install
```

**`package.json` dependencies** — union of both, keeping the Lead's pinned versions. If a
worker bumped a shared version, the Lead's wins and the worker is told.

**i18n messages** — union of blocks. Each worker owns its own feature block, so a conflict
here means someone edited outside their block; keep both blocks, drop the stray edit.

**Route stubs** — the worker's real page always replaces the Lead's stub. Take theirs.

**A Lead-owned file appearing in a worker diff** — do not merge it. Revert that file to
`main` and tell the worker. This is the rule that keeps the contracts stable.

## Small merges, not one big dump

Prefer merging a worker's partial-but-working slice early over waiting for their whole
branch. If a branch has one good commit and three broken ones, cherry-pick the good one:

```bash
git cherry-pick <sha>
```

## After every merge

- `pnpm verify`
- Click the golden demo path once by hand
- Commit any conflict resolution as its own commit, so it is auditable

## Regressions

If a merge breaks the golden demo and it is not fixable in ~15 minutes:

```bash
git revert -m 1 <merge-sha>
```

`main` must always be runnable and demo-ready. That constraint outranks any single
worker's feature.

## Definition of done for the whole build

- `pnpm verify` green on `main`
- The `docs/DEMO_PATH.md` run sheet works end to end
- The same run sheet works in airplane mode
- Deployed to Vercel and smoke-tested on a real phone
- A backup screen recording exists
