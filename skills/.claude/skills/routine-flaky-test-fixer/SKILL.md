---
name: routine-flaky-test-fixer
description: Autonomous maintenance routine that root-causes intermittently
  failing CI tests — mining GitHub Actions history for same-commit red-to-green
  reruns, reproducing locally with repeated runs, fixing the real
  nondeterminism (timers, teardown, ordering, unawaited promises), and shipping
  via /ship after 20 consecutive green runs. Use only when the user explicitly
  invokes /routine-flaky-test-fixer or asks to hunt down flaky tests. SKIP for
  tests that can never fail (routine-useless-test-pruner) and for logic bugs
  that fail deterministically (routine-logic-bugfixer). The core trigger is
  "this test sometimes fails; make it deterministic".
---

# Task: Root-cause flaky CI tests and make them deterministic

Usage: `/routine-flaky-test-fixer [package-or-path]`

Find a test that sometimes fails, reproduce or root-cause the nondeterminism,
fix the real cause, prove determinism with repeated runs, and ship via `/ship`.

## Contract

Read `skills/.claude/skills/routine-shared/contract.md` first — preconditions,
scope resolution, verify gates, ship protocol, budget, universal STOPs. Floor
even without it: never ship red; one finding per ship; anything in a
`DO_NOT_DO.md` is a hard STOP.

## Workflow

### 1. Scope

Resolve scope per the contract. A test that is **consistently red on main** is
the degenerate case and jumps the queue — fix or escalate it first.

### 2. Discover

Mine CI history on the path-filtered workflows:

```zsh
gh run list --workflow=ci.yml --branch main --limit 50            # mobile
gh run list --workflow=ci-dashboard.yml --branch main --limit 50
gh run list --workflow=ci-cli.yml --branch main --limit 50
gh run list --workflow=ci-skills.yml --branch main --limit 50
```

Flake signals: the same commit red then green on rerun; failures whose job logs
(`gh run view <id> --log-failed`) show different tests failing across runs.
Locally: rerun the owning suite — or the suspect file — 20–30 times (mobile via
`yarn test:unit`, the bespoke `mobile/scripts/jest-lite-runner.js`; dashboard/
backend via their jest commands; cli via pytest), with shuffled order where the
runner supports it.

### 3. Prove it

Either a local reproduction, or an unambiguous root cause read from the logs
and code. The usual suspects: real timers and wall-clock time, missing
teardown (handles, listeners, temp files — the dashboard OTP-teardown fix is
the house example), shared state and test-order dependence, port/tmp-path
collisions, unawaited promises, network reliance, unseeded randomness. Name the
mechanism before touching the test.

### 4. Fix

Fix the nondeterminism itself: fake timers, complete teardown, per-test unique
ports/paths, seeded randomness, awaited async, order independence. Sometimes
the bug is in the production code's lifecycle (leaked handle, race) — that is
still this routine's finding; fix it at the root.

### 5. Verify

**20 consecutive green runs** of the fixed test (in-suite, not isolated, when
order was implicated), then the owning package's full gate.

### 6. Ship

Compose `/ship` for this one flake. Loop within budget.

## What NOT to do

- **Never add retry wrappers, `jest.retryTimes`, or blind timeout bumps** —
  masking a flake is worse than leaving it visibly flaky.
- Never delete a flaky test to make it stop flaking. If it is genuinely
  unsalvageable, that must independently pass
  `routine-useless-test-pruner`'s proof standard — and the summary says so
  honestly.
- Never mark a fix done on fewer than 20 consecutive greens; three passes is
  luck, not determinism.
- A test failing the same way every run is not flaky — defer to
  `routine-logic-bugfixer`.

## Arguments

$ARGUMENTS
