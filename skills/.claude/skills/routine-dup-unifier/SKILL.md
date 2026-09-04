---
name: routine-dup-unifier
description: Autonomous maintenance routine that finds duplicated implementations
  of the same logic within one monorepo package, merges them into the single best
  copy, repoints every caller, deletes the rest, and ships each unification via
  /ship. Use only when the user explicitly invokes /routine-dup-unifier or asks
  to merge/deduplicate duplicated code. SKIP for code with no remaining callers
  (routine-dead-code-removal), needless indirection around a single
  implementation (routine-abstraction-improver), and duplication across two
  packages — that is reported, never merged. The core trigger is "these are two
  copies of the same logic; make them one".
---

# Task: Merge duplicated implementations into one

Usage: `/routine-dup-unifier [package-or-path]`

Find two (or more) live copies of the same logic inside one package, prove they
are semantically the same, keep the best one, repoint all callers, delete the
rest, and ship via `/ship`.

## Contract

Read `skills/.claude/skills/routine-shared/contract.md` first — preconditions,
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
dependency: `npx --yes jscpd --min-tokens 50 <pkg>/src --output <pkg>/tmp/`
(output stays in the gitignored `tmp/`).

### 3. Prove it

- Read every copy **end to end** — name similarity is not proof.
- Semantics must be identical, or differ only in ways trivially covered by a
  parameter that keeps the survivor simpler than the sum of the copies.
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
  new cross-package imports). Cross-package duplication goes in the summary as
  a report, nothing more.
- If unification requires an abstraction more complex than either original
  (config objects, strategy callbacks, mode flags), skip the finding — a
  slightly duplicated simple thing beats a unified complicated one.
- Never delete a copy before every caller is repointed and green.
- The deliberate clean-room reimplementations noted in `.pm/DO_NOT_DO.md`
  (e.g. `fava-slim` vs vendored fava) are not duplication findings.

## Arguments

$ARGUMENTS
