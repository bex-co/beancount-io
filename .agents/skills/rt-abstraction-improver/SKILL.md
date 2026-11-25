---
name: rt-abstraction-improver
description: Autonomous maintenance routine that flattens over-engineered
  abstractions in a monorepo package — interfaces with one implementation and no
  stated reason, passthrough wrappers, one-product factories, delegate-only
  manager layers — by inlining the single thing behind them and landing via
  /land. Use only when the user explicitly invokes /rt-abstraction-improver
  or asks to flatten needless indirection. SKIP for convoluted logic inside one
  unit (rt-logic-simplifier), imports crossing stated boundaries
  (rt-abstraction-police), and duplicated implementations
  (rt-dup-unifier). The core trigger is "remove indirection that has
  exactly one thing behind it".
metadata: {"internal": true}
---

# Task: Flatten over-engineered abstractions

Usage: `/rt-abstraction-improver [package-or-path]`

Find a layer of indirection with exactly one thing behind it and no stated
reason to exist, inline it, delete the layer, and land via `/land`.

## Contract

Read `.agents/skills/rt-shared/contract.md` first — preconditions,
scope resolution, verify gates, land protocol, budget, universal STOPs. Floor
even without it: never land red; one finding per landing; anything in a
`DO_NOT_DO.md` is a hard STOP.

## Workflow

### 1. Scope

Resolve scope per the contract.

### 2. Discover

The shapes worth suspecting:

- Interfaces/abstract classes with exactly one implementation
- Wrapper functions/modules that only re-export or forward arguments
- Factories that can only ever produce one product
- Generics never instantiated with a second type
- "Manager"/"provider"/"service" layers that purely delegate

### 3. Prove it

A layer is a finding only when **all** hold:

1. Grep confirms exactly one implementation and one usage pattern.
2. **No stated reason for it exists.** Check the scoped `AGENTS.md`,
   `docs/adrs/`, and `.pm` boards. In particular: **backend-v2 mandates an
   `I<Name>` interface beside every service/workflow class**
   (`backend-cluster/backend-v2/AGENTS.md`, Dependency and layer rules) — those
   interfaces are a stated convention, never a finding. Same for seams that
   exist so tests can double them, when the tests actually do.
3. No evidence of a planned second implementation.
4. **It costs something** (the contract's value bar): a change that has to be
   made in two places, behavior a reader cannot find without chasing the
   indirection, or a seam that has let two callers diverge. A one-line alias
   or a re-export nobody trips over is not a finding.

When two callers reach the same thing through different layers, compare what
each ends up doing. A difference is a drift bug: prove it with a failing test
and fix it first.

### 4. Fix

Inline the single thing, delete the layer, call directly. If tests mocked the
deleted layer, rewrite them against the concrete unit with real assertions —
never leave them asserting a mock of something that no longer exists. Behavior
identical.

### 5. Verify

Typecheck + full owning-package gate, and a grep confirming no dangling
references to the deleted layer.

### 6. Land

Compose `/land` for this one flattening. Loop within budget.

## What NOT to do

- Never flatten an abstraction a `AGENTS.md`, ADR, or working test double
  justifies — a stated convention beats this routine's taste, every time.
- Don't rewrite convoluted logic inside a unit (`rt-logic-simplifier`) or
  move code across layers (`rt-abstraction-police`).
- Don't flatten two layers in one landing; each deletion stands alone.
- Don't replace the deleted abstraction with a cleverer one — the fix is
  *less* structure, not different structure.

## Arguments

$ARGUMENTS
