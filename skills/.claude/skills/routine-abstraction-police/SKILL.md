---
name: routine-abstraction-police
description: Autonomous maintenance routine that finds imports crossing a stated
  architectural boundary the wrong way — cross-package imports, dashboard
  features reaching into each other, backend-v2 transport adapters touching
  models, mobile routes bypassing screens — and fixes each violation by moving
  code or inverting the dependency, shipping via /ship. Use only when the user
  explicitly invokes /routine-abstraction-police or asks to fix layering
  violations. Only rules stated in a CLAUDE.md count; SKIP for too-many-layers
  (routine-abstraction-improver) and duplicated logic (routine-dup-unifier). The
  core trigger is "this import points the wrong way across a stated boundary".
---

# Task: Fix imports that cross a stated boundary the wrong way

Usage: `/routine-abstraction-police [package-or-path]`

Find an import that violates a boundary this repo has written down, fix it by
moving code to the right layer or inverting the dependency, and ship via
`/ship`.

## Contract

Read `skills/.claude/skills/routine-shared/contract.md` first — preconditions,
scope resolution, verify gates, ship protocol, budget, universal STOPs. Floor
even without it: never ship red; one finding per ship; anything in a
`DO_NOT_DO.md` is a hard STOP.

## The one proof rule

**A violation exists only against a rule stated in a `CLAUDE.md` (root or
scoped) or an ADR. Your own taste in layering is not a rule.** Before fixing,
quote the rule; re-read the scoped `CLAUDE.md` of the target package for rules
beyond the seed list below. No stated rule → no finding.

## Workflow

### 1. Scope

Resolve scope per the contract.

### 2. Discover — the stated rules and their greps

- **Repo-wide** (root `CLAUDE.md`): no cross-package imports — grep for
  relative imports escaping the package root and cross-package path aliases.
- **dashboard** (`dashboard/CLAUDE.md`): one feature must not import another
  feature's private component/utility (cross-feature infrastructure belongs in
  `src/common/`); route files under `src/routes/` stay thin and import the
  feature page — grep `src/features/*` for imports from sibling features.
- **backend-v2** (`backend-cluster/backend-v2/CLAUDE.md`, Dependency and layer
  rules): resolvers/REST handlers delegate — they do not access models or
  orchestrate several services; workflows must not import GraphQL DTOs from
  `api/`; services stay transport-agnostic; models hold persistence only.
- **mobile** (`mobile/CLAUDE.md`): `app/` route files mount screens from
  `src/screens/` — screen logic does not live in `app/`; `src/generated-graphql/`
  is codegen output nothing hand-edits.

### 3. Prove it

Read the violating import in context and quote the stated rule it breaks.
Confirm the violation is real usage, not a type-only import a rule permits.

### 4. Fix

Pick the smallest correct repair:

1. **Move the code** to the layer both sides may depend on (`src/common/`, a
   service, `src/shared/`).
2. **Invert the dependency** — pass the value/callback in as a parameter or
   prop instead of importing downward.
3. **Duplicate a tiny helper** (≤10 lines, with a comment naming the twin) when
   sharing would demand a worse structure — explicitly not a
   `routine-dup-unifier` finding at that size.

For a cross-**package** violation, the fix lives entirely on the violating side
(duplicate or restructure locally); touching the other package is a separate
concern and usually a universal STOP.

### 5. Verify

Full owning-package gate, plus re-grep to show the violating pattern is gone
and no new one was introduced.

### 6. Ship

Compose `/ship` for this one violation. Loop within budget.

## What NOT to do

- Never invent a boundary. If the structure feels wrong but no rule says so,
  propose the rule in the summary — don't enforce it.
- Don't remove layers (`routine-abstraction-improver`) or unify duplicates
  (`routine-dup-unifier`).
- Never "fix" a violation by weakening the rule's `CLAUDE.md` wording.
- Never hand-edit codegen output to satisfy a boundary — regenerate or
  restructure the source instead.

## Arguments

$ARGUMENTS
