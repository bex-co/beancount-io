---
name: routine-logic-bugfixer
description: Autonomous maintenance routine that picks one tricky logic unit in a
  monorepo package — state machines, date/period math, sign conventions, dedup
  windows, pagination — models its states and edge cases exhaustively, proves any
  divergence from documented intent with a failing test, lands the minimal
  root-cause fix plus regression test, and ships via /ship. Use only when the
  user explicitly invokes /routine-logic-bugfixer or asks to hunt for logic bugs.
  SKIP for test-infrastructure failures and intermittent tests
  (routine-flaky-test-fixer) and for merely convoluted-but-correct code
  (routine-logic-simplifier). The core trigger is "model this tricky logic and
  fix what's provably wrong".
---

# Task: Model tricky logic to find and fix provable bugs

Usage: `/routine-logic-bugfixer [package-or-path]`

Pick one unit of genuinely tricky logic, enumerate its states and edges, derive
inputs that should break it, prove each bug with a failing test against
documented intent, fix the root cause, and ship via `/ship`.

## Contract

Read `skills/.claude/skills/routine-shared/contract.md` first — preconditions,
scope resolution, verify gates, ship protocol, budget, universal STOPs. Floor
even without it: never ship red; one finding per ship; anything in a
`DO_NOT_DO.md` is a hard STOP.

## Workflow

### 1. Scope

Resolve scope per the contract.

### 2. Discover

Pick **one** tricky unit — the kinds this repo actually has: auth/session state
machines, date and period arithmetic, amount sign conventions,
dedup/fuzzy-match windows, pagination cursors, cache invalidation, balance
computation. Then model it explicitly: list every state, transition, and edge
(empty input, boundary dates, negative amounts, timezone/DST edges, off-by-one
windows, concurrent transitions). From the model, derive candidate-breaking
inputs.

### 3. Prove it

A bug exists only when you have **both**:

1. A failing test against current code for a derived input, and
2. **Documented intent** the behavior diverges from — code comments, docs,
   `CLAUDE.md` guidance, beancount semantics, ADRs, or the git history of the
   unit.

Reproducible crashes found while modeling count as provable bugs (crashing is
never the documented intent). If the intent is genuinely ambiguous — the test
pins a choice nobody has made — **STOP for that finding** and report the
ambiguity instead of shipping an opinion.

### 4. Fix

The minimal root-cause fix, plus the failing test as a permanent regression
test. No drive-by refactoring; if the unit also deserves simplification, defer
to `routine-logic-simplifier` in the summary.

### 5. Verify

New regression test green, full owning-package gate green, and a quick sweep of
callers for anyone depending on the old wrong behavior (if someone does, that
is an intent ambiguity — STOP and report).

### 6. Ship

Compose `/ship` for this one bug. Loop within budget.

## What NOT to do

- Never ship a "fix" whose only justification is that the new behavior seems
  more reasonable — no documented intent, no bug.
- Never weaken or delete an existing test to make a fix pass; a conflicting
  test means conflicting intent — STOP and report.
- Intermittent failures are not logic bugs — defer to
  `routine-flaky-test-fixer`.
- Don't model units that are trivial or already exhaustively tested; spend the
  budget where trickiness lives.

## Arguments

$ARGUMENTS
