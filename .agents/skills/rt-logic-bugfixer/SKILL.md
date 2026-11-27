---
name: rt-logic-bugfixer
description: Autonomous maintenance routine that picks one tricky logic unit in a
  monorepo package — state machines, date/period math, sign conventions, dedup
  windows, pagination — models its states and edge cases exhaustively, proves any
  divergence from documented intent with a failing test, makes the minimal
  root-cause fix plus regression test, and lands via /land. Use only when the
  user explicitly invokes /rt-logic-bugfixer or asks to hunt for logic bugs.
  SKIP for test-infrastructure failures and intermittent tests
  (rt-flaky-test-fixer) and for merely convoluted-but-correct code
  (rt-logic-simplifier). The core trigger is "model this tricky logic and
  fix what's provably wrong".
metadata: {"internal": true}
---

# Task: Model tricky logic to find and fix provable bugs

Usage: `/rt-logic-bugfixer [package-or-path]`

Pick one unit of genuinely tricky logic, enumerate its states and edges, derive
inputs that should break it, prove each bug with a failing test against
documented intent, fix the root cause, and land via `/land`.

## Contract

Read `.agents/skills/rt-shared/contract.md` first — preconditions,
scope resolution, verify gates, land protocol, budget, universal STOPs. Floor
even without it: never land red; one finding per landing; anything in a
`DO_NOT_DO.md` is a hard STOP.

## Workflow

### 1. Scope

Resolve scope per the contract.

### 2. Discover

Start with the ledger: a Deferred entry under `rt-logic-bugfixer` is a
suspected bug another routine handed over, and it comes before a new hunt.

Otherwise pick **one** tricky unit — the kinds this repo actually has:
auth/session state machines, date and period arithmetic, amount sign
conventions, dedup/fuzzy-match windows, pagination cursors, cache
invalidation, balance computation. The richest kind is **two things that must
agree**: a ranking and the rule its comment promises, a client-side check and
the server rule it mirrors, an export and what the screen shows, a preview
and the write it previews, the CLI engine and its mirrored frontend copy.
Check the pair against each other on the edges. Then model it explicitly: list every state, transition, and edge
(empty input, boundary dates, negative amounts, timezone/DST edges, off-by-one
windows, concurrent transitions). From the model, derive candidate-breaking
inputs.

### 3. Prove it

A bug exists only when you have **both**:

1. A failing test against current code for a derived input, and
2. **Documented intent** the behavior diverges from — code comments, docs,
   `AGENTS.md` guidance, beancount semantics, ADRs, or the git history of the
   unit.

Reproducible crashes found while modeling count as provable bugs (crashing is
never the documented intent). If the intent is genuinely ambiguous — the test
pins a choice nobody has made — **STOP for that finding** and report the
ambiguity instead of landing an opinion.

### 4. Fix

The minimal root-cause fix, plus the failing test as a permanent regression
test. No drive-by refactoring; if the unit also deserves simplification, defer
to `rt-logic-simplifier` in the summary.

Before finalizing the fix, run this **Guard-Ordering & Pipeline Sweep**:

1. **Guard ordering:** auth / capability / scope checks must run before
   existence lookups or query-param validation; cancellation checks must precede
   upstream error handling; mutations/claims must serialize every competing
   decision path (e.g., both approve and deny).
2. **Upstream & downstream pipeline:** trace every preprocessing/rewriting stage
   upstream of your guard (e.g., BQL literal rewriters before ordinal guards;
   span builders like `firstAndLastDate` before `intervalRanges`) and every
   caller/user-facing note downstream (e.g., CLI notes after format selection).
3. **Sibling consumers & options:** grep for every sibling option/helper/copy in
   the package (e.g., `receipt_base_folder` beside `transaction_file`) so one
   defect class is fixed completely in one PR.

### 5. Verify

New regression test green (exercising the real end-to-end entry point, never a
stubbed verb or a generator whose cap/boundary is never reached), full
owning-package gate green, and a quick sweep of callers for anyone depending on
the old wrong behavior (if someone does, that is an intent ambiguity — STOP and
report).

### 6. Land

Compose `/land` for this one bug. Loop within budget.

## What NOT to do

- **No bug = no PR:** if modeling finds no provable behavioral bug, exit cleanly
  with zero commits and zero PRs — never open a `test-only` padding PR or a fix
  for a synthetic edge case that no user or crash/DoS path can trigger.
- Never land a "fix" whose only justification is that the new behavior seems
  more reasonable — no documented intent, no bug.
- Never weaken or delete an existing test to make a fix pass, AND never bend
  production code (e.g., magic-number carve-outs or spurious side effects) just
  to keep a stale/flawed test green; a conflicting test means conflicting
  intent — STOP and report.
- Intermittent failures are not logic bugs — defer to
  `rt-flaky-test-fixer`.
- Don't model units that are trivial or already exhaustively tested; spend the
  budget where trickiness lives.

## Arguments

$ARGUMENTS
