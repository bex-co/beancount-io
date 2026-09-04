---
name: routine-dead-code-removal
description: Autonomous maintenance routine that deletes provably unreachable code
  from one monorepo package using the repo's own detectors (yarn lint:deadcode /
  make deadcode / scripts/lint-deadcode.sh), verifies every hit against dynamic
  references before deleting, and ships each removal via /ship. Use only when the
  user explicitly invokes /routine-dead-code-removal or asks to find and delete
  dead or unused code. SKIP for dead branches behind a feature flag
  (routine-shipped-feature-inliner), live duplicates whose callers need repointing
  (routine-dup-unifier), tests that pass but assert nothing
  (routine-useless-test-pruner), or live single-implementation indirection
  (routine-abstraction-improver). The core trigger is "find and delete code
  nothing can reach".
---

# Task: Delete provably unreachable code

Usage: `/routine-dead-code-removal [package-or-path]`

Run the target package's dead-code detector, prove each hit is truly
unreachable, delete it (with the tests and fixtures that only existed for it),
make the package's checks pass, and ship each removal via `/ship`.

## Contract

Read `skills/.claude/skills/routine-shared/contract.md` first — it defines
preconditions, scope resolution, verify gates, the ship protocol, the budget,
and universal STOPs. This file adds only what is specific to dead code. Floor
even without it: never ship red; one finding per ship; anything in a
`DO_NOT_DO.md` is a hard STOP.

## Workflow

### 1. Scope

Resolve scope per the contract. With no argument, prefer running
`scripts/lint-deadcode.sh` from the repo root once as a survey, then pick the
one package with the most promising hits.

### 2. Discover

`cd` into the package, then run its detector:

- JS/TS packages (`mobile`, `dashboard`, `backend-cluster/backend-v2`,
  `backend-cluster/ledger`, `backend-cluster/agent-box`) → `yarn lint:deadcode`
  (Knip; config in the package's `knip.jsonc`)
- `cli/` → `make deadcode` (Vulture; high-confidence only)

Also legitimate finds while reading nearby code: commented-out blocks,
`if (false)`-style branches, early-return shadowed code. A detector hit is a
**candidate, not proof**.

### 3. Prove it

For every candidate, sweep for references the detector can't see before
touching anything:

- Grep the whole package for the symbol/file name as a **string** — dynamic
  imports, registries, config-referenced entries, test fixtures.
- Expo Router is file-based: files under `mobile/app/` are routes reachable by
  navigation and deep links even with zero imports — never a dead-code finding.
- Codegen inputs (GraphQL documents, `codegen.ts`, `apollo.config.json`) and
  build/tooling entry points (`babel.config.js`, scripts referenced from
  `package.json`) count as reachable.

A confirmed **false positive** is its own legitimate finding: add a scoped
ignore to the package's `knip.jsonc` (with a short reason) instead of deleting,
so the detector stays trustworthy.

### 4. Fix

- Prefer the safe fixers where they apply: `yarn lint:deadcode:fix` /
  `make deadcode-fix` — then **review the resulting diff before keeping it**
  (root `CLAUDE.md` rule). Discard anything the proof step didn't cover.
- Delete manually what the fixers can't reach (commented-out blocks,
  unreachable branches).
- Delete tests and fixtures whose only purpose was exercising the removed code
  — they travel with it.

### 5. Verify

Run the owning package's full gate from the contract's table, plus a clean
re-run of the detector to confirm nothing was orphaned by the deletion.

### 6. Ship

Compose `/ship` for this one removal. Loop back to step 2 while candidates and
budget remain.

## What NOT to do

- Never delete a branch that is dead only because a feature flag holds one
  value — that is `routine-shipped-feature-inliner`'s job.
- Never delete one of two live duplicate implementations — that is
  `routine-dup-unifier`'s job (it repoints callers first).
- Never touch the CLI's vendored `fava` code, codegen output, or lockfiles.
- Never trust a Knip/Vulture hit without the reference sweep — file-based
  routes and dynamic lookups are exactly where detectors lie.

## Arguments

$ARGUMENTS
