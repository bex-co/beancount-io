# rt-* shared contract

Every `/rt-*` skill is an autonomous maintenance pass over this monorepo:
**discover → prove → fix → verify → land**, one finding at a time. This file is
the shared contract; each skill's `SKILL.md` adds only what is specific to its
defect class.

## Preconditions (verify once, up front)

1. `git branch --show-current` is `main`. If not, STOP and ask (same rule as `/land`).
2. `git status` — note pre-existing uncommitted changes. If the tree is dirty
   with work you didn't do, surface it and ask before starting; never sweep
   unrelated changes into a routine's landing.
3. Read the root `.pm/DO_NOT_DO.md` and the target package's `.pm/DO_NOT_DO.md`
   when it exists (e.g. `mobile/.pm/DO_NOT_DO.md`). Anything they forbid is a
   hard STOP for any finding that would conflict.

## Scope resolution

`$ARGUMENTS` may name a package (`mobile`, `dashboard`, `cli`, `skills`,
`backend-v2`, `ledger`, `idl`, `deploy`) or a path — scope the run
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
ADR014's engine/frontend split in `cli/`) lands with a drift guard in the same
commit, whichever routine finds it; see "Guard every twin" in
[`rt-dup-unifier`](../rt-dup-unifier/SKILL.md).

## Value bar (the tidy routines)

`rt-dup-unifier`, `rt-logic-simplifier`, `rt-abstraction-improver`,
`rt-abstraction-police`, `rt-useless-test-pruner`, `rt-dead-code-removal`,
and `rt-shipped-feature-inliner` exist to find the bugs that drifted copies,
hidden state, dead code, hollow tests, and crossed boundaries cause, and to
remove the hazards that cause them. Tidier code is a by-product, not a
finding. On top of the proof standard, a finding counts only when it:

- fixes or prevents a concrete bug, or
- removes a real hazard: copies that must change together and can drift
  apart, or a structure that has already caused a bug, or
- makes a unit that is genuinely hard to change clearly safer to change.

These never count on their own: a rename, removing an alias, binding a
repeated expression to a local, naming a condition, extracting a helper that
is called once, moving code without reducing coupling, deduplicating a few
stable lines. That a change provably preserves behavior is what makes it
safe, not what makes it worth landing. Spend the run searching for a finding
that clears this bar instead of landing the first provable one. Zero findings
beats a cosmetic one.

- **Batch cleanup & minimum threshold:** for pure cleanup/refactor runs (no
  user-visible bug fix), sweep the target package completely and deliver all
  confirmed items in **one batched PR** (rather than opening separate tiny PRs
  per file). If the entire sweep yields only a single isolated non-bug cleanup
  of `<=15` changed lines, skip it and land nothing.
- **Whole-invariant & no-bug threshold (`rt-logic-bugfixer`):** when fixing an
  invariant, check every sibling projection, caller, upstream/downstream
  pipeline stage, and engine/frontend twin of the same contract in the same run
  so one invariant is not split across follow-up PRs. If an audit finds **no
  real behavioral bug**, leave the working tree clean, make no commit, and open
  **no PR** — never ship `test-only` padding PRs, comment-only edits, ledger-only
  updates, or synthetic edge cases that an upstream layer already rejects with no
  reachable user/crash/DoS path.
- **Never bend production code to appease an existing test:** if a fix fails an
  existing test, inspect whether the test is stale/flawed or whether intent
  genuinely conflicts. Never add magic-number carve-outs (e.g. exempting a
  single sentinel value like `I64_MAX`) or spurious production side effects
  solely to avoid updating an old test; either fix the test (when the old
  expectation is demonstrably wrong) or STOP and report the conflict.

## Ledger

`.agents/skills/rt-shared/ledger.md` carries findings from one run to the
next, one section per routine. Read your routine's section before
discovering: finish an open **Deferred** entry before hunting new ones, and
do not re-examine a **Skipped** entry unless the code it cites has changed.

Update it **only alongside a real code or qualifying test change**: remove the
entries this run fixed, add what it deferred, and add what it examined and
skipped when another run would otherwise repeat the work. One line each,
`- YYYY-MM-DD <path or symbol> — <finding>; <why deferred or skipped>`, newest
first, at most 20 entries per routine (drop the oldest Skipped first).
**Never commit or open a PR that only touches `ledger.md` — even for Deferred
entries.** A run with no code or qualifying test changes leaves the working
tree clean, makes no commit, opens no PR, and lists any Deferred/Skipped notes
in its summary only.

## Board items are not routine work

- **Never work a `.pm` board item.** The board is `/loopx`'s queue, and a
  routine that takes an item races the worker it was filed for. Find your own
  candidates in the code and the ledger. When a bug you found is already filed
  on the board, leave it to that worker: skip it and name the item in your
  summary.

## Ledger entries

- **Check it is still open.** Before working a ledger entry, read its current
  line on `origin/main`, and `git log origin/main --since=24.hours --oneline`
  for the files it names. If it is gone or already fixed, skip it with that
  reason: another session may have taken it since the ledger was written.
- **Check again before you push.** Main moves while you work. Right before you
  push or open the PR, run `git fetch origin main` and
  `git log HEAD..origin/main --oneline` for the files your finding names. If a
  commit on main already fixed it, push nothing and report it as superseded by
  that commit. If main changed the files you touched, rebase onto it and rerun
  your checks before you push.

## Verify gates (never land your own red)

Run the checks the change touches and make them pass before landing — always
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
- before every landing → `python3 scripts/scan-secrets.py` (from the repo root)

**If no automated check covers the changed behavior** (backend-v2 and deploy
have no package-wide CI workflow), STOP and report the finding
instead of landing it.

## Land protocol

Each proven, verified finding lands by composing `/land`
(`.agents/skills/land/SKILL.md`). You made the changes this session, so
`/land` runs session-aware: stage exactly the files you touched, message from
session knowledge. `/land` has no test gate of its own — the gates above are the
only gate. **One finding per landing for bug fixes**; for pure cleanup/refactor
runs (useless-test pruning, dead-code removal, duplication/abstraction
cleanups), batch the target package's confirmed items into a single PR/landing
instead of opening separate tiny PRs per file. Do not start the next finding
until `/land` reports the landed HEAD SHA.

## Budget

Default budget: **3 landed findings per invocation**, then stop and summarize:

- **candidates** — every candidate you examined, one line each (file:line,
  what it is, verdict). List them all, the ones you dropped at a glance
  included: this list is how the run's search is judged
- **landed** — SHA + what it changes for a user or maintainer (not "cleaner")
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
  owns the class. It is one finding with its own landing, its test included, and
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
