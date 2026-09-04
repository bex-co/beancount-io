# routine-* shared contract

Every `/routine-*` skill is an autonomous maintenance pass over this monorepo:
**discover → prove → fix → verify → ship**, one finding at a time. This file is
the shared contract; each skill's `SKILL.md` adds only what is specific to its
defect class.

## Preconditions (verify once, up front)

1. `git branch --show-current` is `main`. If not, STOP and ask (same rule as `/ship`).
2. `git status` — note pre-existing uncommitted changes. If the tree is dirty
   with work you didn't do, surface it and ask before starting; never sweep
   unrelated changes into a routine's ship.
3. Read the root `.pm/DO_NOT_DO.md` and the target package's `.pm/DO_NOT_DO.md`
   when it exists (e.g. `mobile/.pm/DO_NOT_DO.md`). Anything they forbid is a
   hard STOP for any finding that would conflict.

## Scope resolution

`$ARGUMENTS` may name a package (`mobile`, `dashboard`, `cli`, `skills`,
`backend-v2`, `agent-box`, `ledger`, `idl`, `deploy`) or a path — scope the run
to it. When empty, survey in the default order `mobile → dashboard → cli →
backend-v2 → ledger → skills`, pick the single highest-value target, and
announce the pick with a one-line plan before doing work. Every finding stays
within one package (repo rule: scope changes to one package).

## Proof standard

Never fix on suspicion. A detector hit, a grep match, or a hunch is a
*candidate*; each skill defines what counts as *proof* (a failing test, a
still-green sabotaged test, a reference sweep that comes up empty, …). No proof
→ no fix; report the candidate as skipped instead.

## Verify gates (never ship red)

Run the checks the change touches and make them pass before shipping — always
`cd` into the package first:

- `dashboard/` → `yarn format:check`, `yarn lint`, `yarn test`, `yarn build`
- `mobile/` → `yarn format:check`, `yarn lint`, `yarn typecheck`, `yarn test:unit`
- `cli/` → `make check-all`
- `skills/` → `python3 skills/scripts/ci-check.py` (from the repo root)
- `backend-cluster/*`, `deploy/` → the commands in that package's scoped `CLAUDE.md`
- any `CLAUDE.md` / `AGENTS.md` / skill change → `python3 scripts/check-agent-guidance.py` (from the repo root)
- before every ship → `gitleaks dir . --redact --verbose`

**If no automated check covers the changed behavior** (backend-v2, agent-box,
and deploy have no package-wide CI workflow), STOP and report the finding
instead of shipping it.

## Ship protocol

Each proven, verified finding ships by composing `/ship`
(`skills/.claude/skills/ship/SKILL.md`). You made the changes this session, so
`/ship` runs session-aware: stage exactly the files you touched, message from
session knowledge. `/ship` has no test gate of its own — the gates above are the
only gate. **One finding per ship, never batched.** Do not start the next
finding until `/ship` reports the shipped HEAD SHA.

## Budget

Default budget: **3 shipped findings per invocation**, then stop and summarize:

- **shipped** — SHA + one-liner each
- **found but skipped** — with the reason (no proof, STOP condition, out of budget)
- **nothing found** — say so plainly; an empty pass is a valid result

## Universal STOPs

- The fix needs a **new dependency** (repo rule: ask first). `npx --yes`
  one-offs that touch no manifest or lockfile are fine.
- The fix changes a **cross-package API contract** (GraphQL schema fields,
  OpenAPI/IDL specs, generated clients' shapes) — report, don't fix.
- The finding conflicts with any `DO_NOT_DO.md`.
- The fix changes behavior that no test pins and that cannot be safely pinned first.
- A check goes red and you cannot root-cause it.

## Never touch

- Lockfiles (`yarn.lock`, `uv.lock`) — never hand-edit.
- `src/generated-graphql/` or any codegen output — regenerate, never hand-edit.
- `.pm/` — routines never write the board (`/pm` is its only writer).
- `.env*` files and anything secret-shaped.
- Vendored third-party code (the CLI's vendored `fava`).
- `AGENTS.md` symlinks and the shared-skills symlinks.

## Symptom → owner

When you find something outside your defect class, don't fix it — note it in
the summary and defer to its owner:

| Symptom | Owner |
| --- | --- |
| Code nothing can reach | `routine-dead-code-removal` |
| Dead branch behind a feature flag | `routine-shipped-feature-inliner` |
| Two live copies of the same logic | `routine-dup-unifier` |
| One implementation behind needless indirection | `routine-abstraction-improver` |
| Import crossing a stated boundary the wrong way | `routine-abstraction-police` |
| Live, single, reachable, but convoluted | `routine-logic-simplifier` |
| Behavior provably wrong (including crashes) | `routine-logic-bugfixer` |
| A test that can never fail | `routine-useless-test-pruner` |
| A test that sometimes fails | `routine-flaky-test-fixer` |
| Tests of code being deleted | travel with their code, whichever routine deletes it |
