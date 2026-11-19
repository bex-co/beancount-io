# rt-* shared contract

Every `/rt-*` skill is an autonomous maintenance pass over this monorepo:
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

A fix to one of two copies that a boundary keeps apart (another package, or
ADR014's engine/frontend split in `cli/`) ships with a drift guard in the same
commit, whichever routine finds it; see "Guard every twin" in
[`rt-dup-unifier`](../rt-dup-unifier/SKILL.md).

## Value bar (the tidy routines)

`rt-dup-unifier`, `rt-logic-simplifier`, `rt-abstraction-improver` and
`rt-abstraction-police` exist to find the bugs that drifted copies, hidden
state and crossed boundaries cause, and to remove the hazards that cause them.
Tidier code is a by-product, not a finding. On top of the proof standard, a
finding counts only when it:

- fixes or prevents a concrete bug, or
- removes a real hazard: copies that must change together and can drift
  apart, or a structure that has already caused a bug, or
- makes a unit that is genuinely hard to change clearly safer to change.

These never count on their own: a rename, removing an alias, binding a
repeated expression to a local, naming a condition, extracting a helper that
is called once, moving code without reducing coupling, deduplicating a few
stable lines. That a change provably preserves behavior is what makes it
safe, not what makes it worth shipping. Spend the run searching for a finding
that clears this bar instead of shipping the first provable one. Zero findings
beats a cosmetic one.

## Ledger

`.agents/skills/rt-shared/ledger.md` carries findings from one run to the
next, one section per routine. Read your routine's section before
discovering: finish an open **Deferred** entry before hunting new ones, and
do not re-examine a **Skipped** entry unless the code it cites has changed.

Update it in the same commit as the finding it belongs to: remove the entries
this run fixed, add what it deferred, and add what it examined and skipped
when another run would otherwise repeat the work. One line each,
`- YYYY-MM-DD <path or symbol> — <finding>; <why deferred or skipped>`, newest
first, at most 20 entries per routine (drop the oldest Skipped first). A run
that ships no code but has Deferred entries to record, its own or another
routine's, commits the ledger alone (`chore(skills): record rt findings`). Skipped
entries alone do not: they ride along with the run's code or Deferred change,
and a run that has only Skipped entries lists them in its summary and ships
nothing.

## Board items and ledger entries

- **Check it is still open.** Before working a `.pm` board item or a ledger
  entry, read its current file on `origin/main`, and
  `git log origin/main --since=24.hours --oneline` for its id and for the files
  it names. If it is closed or already fixed, skip it with that reason: another
  session may have taken it since the board or ledger was written.
- **Check again before you push.** An item can close while you work on it.
  Right before you push a fix for a board item or open its PR, run
  `git fetch origin main`, read the item's file on `origin/main` again, and
  run `git log HEAD..origin/main --oneline` for its id and the files it
  names. If the item has closed or a commit on main already fixed it, push
  nothing and report it as superseded by that commit. If main changed the
  files you touched, rebase onto it and rerun your checks before you push.
- **One test per definition-of-done bullet.** When a change fixes a board
  item, every bullet of its definition of done gets a test that fails on the
  code before the fix for exactly that bullet's scenario, and the summary says
  which test covers which bullet. A test that passes before the fix proves
  nothing, however close its name is to the bullet.

## Verify gates (never ship your own red)

Run the checks the change touches and make them pass before shipping — always
`cd` into the package first. A check that already fails without your change is
not yours and is not a reason to stop: fix it in its own commit when that is
quick, otherwise carry on and name it in the summary (root `AGENTS.md`,
"Failing checks"). Never delete, skip, or weaken a check to get past it.

- `dashboard/` → `yarn format:check`, `yarn lint`, `yarn test`, `yarn build`
- `mobile/` → `yarn format:check`, `yarn lint`, `yarn typecheck`, `yarn test:unit`
- `cli/` → `make check-all`
- `skills/` or `.agents/skills/` → `python3 scripts/skills/ci-check.py` (from the repo root)
- `backend-cluster/*`, `deploy/` → the commands in that package's scoped `AGENTS.md`
- any `AGENTS.md` or skill change → `python3 scripts/check-agent-guidance.py` (from the repo root)
- before every ship → `python3 scripts/scan-secrets.py` (from the repo root)

**If no automated check covers the changed behavior** (backend-v2, agent-box,
and deploy have no package-wide CI workflow), STOP and report the finding
instead of shipping it.

## Ship protocol

Each proven, verified finding ships by composing `/ship`
(`.agents/skills/ship/SKILL.md`). You made the changes this session, so
`/ship` runs session-aware: stage exactly the files you touched, message from
session knowledge. `/ship` has no test gate of its own — the gates above are the
only gate. **One finding per ship, never batched.** Do not start the next
finding until `/ship` reports the shipped HEAD SHA.

## Budget

Default budget: **3 shipped findings per invocation**, then stop and summarize:

- **candidates** — every candidate you examined, one line each (file:line,
  what it is, verdict). List them all, the ones you dropped at a glance
  included: this list is how the run's search is judged
- **shipped** — SHA + what it changes for a user or maintainer (not "cleaner")
- **found but skipped** — with the reason (no proof, below the value bar, STOP
  condition, out of budget)
- **handed off** — what went into the ledger, and under which routine
- **nothing found** — say so plainly; an empty pass is a valid result

## Universal STOPs

- The fix needs a **new dependency** (repo rule: ask first). `npx --yes`
  one-offs that touch no manifest or lockfile are fine.
- The fix changes a **cross-package API contract** (GraphQL schema fields,
  OpenAPI/IDL specs, generated clients' shapes) — report, don't fix.
- The finding conflicts with any `DO_NOT_DO.md`.
- The fix changes behavior that no test pins and that cannot be safely pinned first.
- Your change turns a check red and you cannot root-cause it.

## Never touch

- Lockfiles (`yarn.lock`, `uv.lock`) — never hand-edit.
- `src/generated-graphql/` or any codegen output — regenerate, never hand-edit.
- `.pm/` — routines never write the board (`/pm` is its only writer).
- `.env*` files and anything secret-shaped.
- Vendored third-party code (the CLI's vendored `fava`).
- `AGENTS.md` files and the `.claude/skills` symlink.

## Symptom → owner

When you find something outside your defect class, never only mention it. The
summary is not a handoff: nobody reads it after the run.

- **A real bug you can prove** — behavior a user or caller can observe is
  wrong, and a failing test shows it — is fixed in this run, whichever routine
  owns the class. It is one finding with its own ship, its test included, and
  it outranks this routine's own findings. `rt-logic-bugfixer`'s rules still
  apply to it: the intent must be documented, and an ambiguous intent is a
  STOP.
- **Anything else** goes into the ledger under its owner's section as a
  Deferred entry, so that routine's next run starts there:

| Symptom | Owner |
| --- | --- |
| Code nothing can reach | `rt-dead-code-removal` |
| Dead branch behind a feature flag | `rt-shipped-feature-inliner` |
| Two live copies of the same logic | `rt-dup-unifier` |
| One implementation behind needless indirection | `rt-abstraction-improver` |
| Import crossing a stated boundary the wrong way | `rt-abstraction-police` |
| Live, single, reachable, but convoluted | `rt-logic-simplifier` |
| Behavior provably wrong (including crashes) | `rt-logic-bugfixer` |
| A test that can never fail | `rt-useless-test-pruner` |
| A test that sometimes fails | `rt-flaky-test-fixer` |
| Tests of code being deleted | travel with their code, whichever routine deletes it |
