---
name: routine-useless-test-pruner
description: Autonomous maintenance routine that finds tests that cannot fail —
  no real assertions, tautologies that assert a mock returns what it was told,
  mock-everything tests that never touch the unit — proves it mechanically by
  breaking the covered behavior and watching the test stay green, deletes them,
  and ships via /ship. Use only when the user explicitly invokes
  /routine-useless-test-pruner or asks to prune useless/worthless tests. SKIP
  for tests that fail intermittently (routine-flaky-test-fixer), tests of code
  being deleted (they travel with their code), and slow-but-valid tests. The
  core trigger is "delete tests that can't fail".
---

# Task: Delete tests that cannot fail

Usage: `/routine-useless-test-pruner [package-or-path]`

Find tests that pass no matter what the code does, prove it by sabotaging the
covered behavior and watching them stay green, delete them, and ship via
`/ship`.

## Contract

Read `skills/.claude/skills/routine-shared/contract.md` first — preconditions,
scope resolution, verify gates, ship protocol, budget, universal STOPs. Floor
even without it: never ship red; one finding per ship; anything in a
`DO_NOT_DO.md` is a hard STOP.

## Workflow

### 1. Scope

Resolve scope per the contract. Test roots: `mobile/src/__tests__/` (run by the
jest-lite runner), dashboard and backend `__tests__/` beside features, cli's
pytest suite.

### 2. Discover

Read test files for the shapes that can't fail:

- No meaningful assertion (only "doesn't throw" on code that can't throw).
- Tautologies — asserting a mock returns the value the test just told it to
  return.
- Mock-everything tests where the unit under test is itself mocked away.
- Exact or near-exact duplicates of a neighboring test.

### 3. Prove it — mechanically, every time

For each candidate: temporarily break the behavior the test claims to cover
(invert the condition, corrupt the return value), run the test, and observe it
**still green**. Then revert the sabotage immediately. A test that went red is
a real test — leave it and move on. Reading alone is never proof.

### 4. Fix

Default: delete the test. Replace it with a real assertion only when the
intended behavior is unambiguous from the test's own name/context and the
replacement is a few lines — otherwise deletion is the honest change.

### 5. Verify

- **`git diff` must show only test changes — every sabotage fully reverted.**
  This check is part of the finding, not cleanup; a shipped sabotage is the
  worst outcome this routine has.
- Owning package's full gate green.

### 6. Ship

Compose `/ship` for this one pruning. Loop within budget.

## What NOT to do

- Never delete a test that went red under sabotage, however ugly it looks.
- Never prune a test for being slow, intermittent (`routine-flaky-test-fixer`),
  or attached to code some other routine is deleting.
- Never leave sabotage in the tree — verify the revert with `git diff` before
  staging, every time.
- Don't batch prunings across files into one ship; each finding stays
  reviewable on its own.

## Arguments

$ARGUMENTS
