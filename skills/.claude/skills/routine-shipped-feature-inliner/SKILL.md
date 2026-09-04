---
name: routine-shipped-feature-inliner
description: Autonomous maintenance routine that finds gates for fully shipped
  features — flags, env switches, boolean guards that have held one value
  everywhere for a long time — triages deliberate gates from forgotten ones,
  inlines the enabled path, deletes the dead branch and the flag itself, and
  ships each removal via /ship. Use only when the user explicitly invokes
  /routine-shipped-feature-inliner or asks to clean up shipped/stale feature
  flags. SKIP for unreachable code not behind a flag (routine-dead-code-removal)
  and for changing what any flag is set to — this routine never flips a value.
  The core trigger is "this feature fully shipped; remove its flag and inline
  the winning path".
---

# Task: Remove gates for fully shipped features

Usage: `/routine-shipped-feature-inliner [package-or-path]`

Find a flag whose decision has already been made everywhere, prove it is
forgotten rather than deliberate, inline the path it always takes, delete the
other branch and the flag definition, and ship via `/ship`.

## Contract

Read `skills/.claude/skills/routine-shared/contract.md` first — preconditions,
scope resolution, verify gates, ship protocol, budget, universal STOPs. Floor
even without it: never ship red; one finding per ship; anything in a
`DO_NOT_DO.md` is a hard STOP.

## Workflow

### 1. Scope

Resolve scope per the contract.

### 2. Discover

Grep the package for gate shapes:

- `mobile/src/config.ts` → `config.features.*` compile-time constants
- `process.env.*` used as a boolean switch; values seeded in `.env.example`
  and deploy configs (`deploy/`, root `bex.yaml`)
- `is*Enabled` / `enable*` booleans, route guards, early returns on a config
  value

### 3. Prove it — deliberate gate vs forgotten flag (mandatory triage)

A flag is only a finding when **all** of these hold:

1. It holds one value in every environment: grep every setter and reader,
   `.env.example`, deploy configs — no environment or code path flips it.
2. Nothing marks it deliberate: check root `.pm/DO_NOT_DO.md`, the package's
   `.pm/DO_NOT_DO.md`, `docs/adrs/`, and code comments at the definition.
3. `git log` on its introduction and last value change shows it has sat at its
   final value for a while, with no sign of a pending decision.

Any evidence of intent → not a finding; note it as skipped.

### 4. Fix

Inline the path the flag always takes. Delete: the now-dead branch, the flag
definition, its plumbing (props/params that only carried it), and tests that
only exercised the removed branch. Update tests that asserted the flag's value
to assert the now-unconditional behavior. **Never change the flag's value on
the way out — inline only flags already at their final value.**

### 5. Verify

Owning package's full gate per the contract. If the flag guarded UI, verify the
surviving path still renders (mobile: light and dark per `mobile/CLAUDE.md`).

### 6. Ship

Compose `/ship` for this one flag. Loop within budget.

## What NOT to do

- **NEVER inline, remove, or flip `config.features.agentChat`.** The mobile
  agent-chat surface stays gated off by owner decision
  (`mobile/.pm/DO_NOT_DO.md`) — it is a deliberate gate, permanently out of
  scope.
- **The backend `featureFlags` GraphQL field is a cross-package contract**
  (`backend-cluster/backend-v2/src/features/ledger/api/resolvers/ledger-legacy-resolver.query.ts`,
  consumed by the mobile app). Removing or reshaping it is a coordinated
  multi-package change — report it, don't fix it (universal STOP).
- Never delete unflagged dead code — that is `routine-dead-code-removal`'s job.
- Never "finish shipping" a feature by turning its flag on. Flipping a value is
  a product decision, not maintenance.

## Arguments

$ARGUMENTS
