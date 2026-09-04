---
name: routine-logic-simplifier
description: Autonomous maintenance routine that finds one convoluted unit of
  business logic in a monorepo package — deep nesting, boolean spaghetti,
  interleaved concerns — pins its behavior with tests, simplifies it in place
  with zero behavior change, and ships via /ship. Use only when the user
  explicitly invokes /routine-logic-simplifier or asks to simplify convoluted
  existing logic. SKIP for reviewing the current diff (/simplify), removing
  indirection layers (routine-abstraction-improver), and fixing wrong behavior
  (routine-logic-bugfixer). The core trigger is "make this convoluted logic read
  simply without changing what it does".
---

# Task: Simplify convoluted business logic, behavior-preserving

Usage: `/routine-logic-simplifier [package-or-path]`

Pick one genuinely convoluted unit, pin its current behavior with tests,
rewrite it in place so it reads simply, prove nothing changed, and ship via
`/ship`.

## Contract

Read `skills/.claude/skills/routine-shared/contract.md` first — preconditions,
scope resolution, verify gates, ship protocol, budget, universal STOPs. Floor
even without it: never ship red; one finding per ship; anything in a
`DO_NOT_DO.md` is a hard STOP.

## Workflow

### 1. Scope

Resolve scope per the contract.

### 2. Discover

Find hotspots worth the risk:

- `git log --oneline -- <pkg>` — files that keep appearing in `fix:` commits;
  churn is where convolution costs the most.
- Read for the smells: nesting past ~3 levels, long boolean chains, one
  function interleaving parsing + decision + formatting, repeated re-derivation
  of the same intermediate value.

Pick **one unit** (a function or a small cluster). Convoluted-but-working code
nobody touches is a weak finding; convoluted code with churn is a strong one.

### 3. Prove it (pin first)

- Existing tests must cover the unit's observable behavior, or you write
  pinning tests first — inputs/outputs as they are today, including the weird
  edges.
- If the behavior cannot be safely pinned (nondeterminism, giant I/O surface),
  **skip the finding** — an unpinned simplification is a gamble, not
  maintenance.

### 4. Fix

Simplify **in place**: flatten nesting with early returns, name the
intermediate values, split interleaved concerns into local helpers. Introduce
**no new abstractions** — no new interfaces, layers, or files unless splitting
one oversized file is itself the simplification. Zero behavior change, byte for
byte where observable.

### 5. Verify

Pinning tests and the owning package's full gate, all green. The pinning tests
ship with the change.

### 6. Ship

Compose `/ship` for this one unit. Loop within budget.

## What NOT to do

- **Never fold a behavior change into the refactor.** A bug discovered
  mid-simplify is a separate `routine-logic-bugfixer` finding — note it, finish
  the behavior-preserving simplification, report the bug in the summary.
- Don't remove indirection layers (single-impl interfaces, passthrough
  wrappers) — that is `routine-abstraction-improver`'s job.
- Don't "simplify" by deleting handling for edge cases you can't prove
  unreachable — that's how convoluted code got its reputation for being
  load-bearing.
- Don't reformat or rename beyond the unit you picked; keep the diff reviewable.

## Arguments

$ARGUMENTS
