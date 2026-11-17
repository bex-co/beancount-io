---
name: rt-dup-unifier
description: Autonomous maintenance routine that finds duplicated implementations
  of the same logic within one monorepo package, merges them into the single best
  copy, repoints every caller, deletes the rest, and ships each unification via
  /ship. Use only when the user explicitly invokes /rt-dup-unifier or asks
  to merge/deduplicate duplicated code. SKIP for code with no remaining callers
  (rt-dead-code-removal), needless indirection around a single
  implementation (rt-abstraction-improver), and duplication across two
  packages — that is reported, never merged. The core trigger is "these are two
  copies of the same logic; make them one".
metadata: {"internal": true}
---

# Task: Merge duplicated implementations into one

Usage: `/rt-dup-unifier [package-or-path]`

Find two (or more) live copies of the same logic inside one package. Copies
that have drifted apart are the finding this routine exists for: prove which
side is wrong, fix it, and leave one copy. Copies that are still the same are
merged when a missed edit to one of them would be a bug. Either way keep the
best one, repoint all callers, delete the rest, and ship via `/ship`.

## Contract

Read `.agents/skills/rt-shared/contract.md` first — preconditions,
scope resolution, verify gates, ship protocol, budget, universal STOPs. Floor
even without it: never ship red; one finding per ship; anything in a
`DO_NOT_DO.md` is a hard STOP.

## Workflow

### 1. Scope

Resolve scope per the contract. Duplication is a **within-one-package** concern
here; never widen scope mid-run.

### 2. Discover

Agent-driven search — Grep for repeated names, similar signatures, and shared
distinctive string literals (error messages, format strings, regexes); read
sibling directories that grew in parallel (helpers/utils files, per-screen
copies of formatting or validation logic). Optional accelerator with no new
dependency: `npx --yes jscpd --min-tokens 50 <pkg>/src --output .internal/jscpd/`
(output stays in the gitignored repo-root `.internal/`).

### 3. Prove it

- Read every copy **end to end** — name similarity is not proof — and diff
  them.
- **Copies that differ are the best finding, not a reason to skip.** Either
  the difference is deliberate (say why, and skip) or the copies drifted: one
  gained a fix, a guard or a case the other never did. That is usually a live
  bug — an export with its own serializer that missed the escaping the shared
  one gained; two modules registering the same global name, where the last to
  load wins. Write the test that fails on the stale copy, then unify onto the
  correct behavior and ship it as a `fix`. The contract's rule for a proven
  bug applies: fix it here, do not hand it to `rt-logic-bugfixer`.
- **Copies that are identical** must clear the contract's value bar: they
  have to change together, and a missed edit would be a bug (a retry or
  idempotency rule, a validation, a parser). A parameter that covers a
  trivial difference is fine when the survivor stays simpler than the sum of
  the copies.
- The intended survivor is test-covered for the behavior all callers rely on;
  if not, write those tests first (they are part of the finding).

### 4. Fix

Keep the better copy (better tested, more used, better placed). Port any
unique behavior from the losers, repoint every caller, delete the losers, and
move over any tests that pinned loser-only behavior worth keeping. Re-run the
package's dead-code detector (`yarn lint:deadcode` / `make deadcode`) to
confirm nothing was orphaned.

### 5. Verify

Owning package's full gate per the contract.

### 6. Ship

Compose `/ship` for this one unification. Loop within budget.

## What NOT to do

- **Never merge across packages.** Packages are independent by repo rule (no
  new cross-package imports). Cross-package copies can still drift: compare
  them, fix a proven difference inside the package that is wrong, and record
  the pair in the ledger.
- If unification requires an abstraction more complex than either original
  (config objects, strategy callbacks, mode flags), skip the finding — a
  slightly duplicated simple thing beats a unified complicated one.
- Never delete a copy before every caller is repointed and green.
- The deliberate clean-room reimplementations noted in `.pm/DO_NOT_DO.md`
  (e.g. `fava-slim` vs vendored fava) are not duplication findings.

## Arguments

$ARGUMENTS
