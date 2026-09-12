---
name: loop-worker
description: Autonomously work a `.pm` workstream to completion — pick the next pending milestone, implement every task end to end, ship it, then move to the next until none remain. Use when the user explicitly invokes $loop-worker or asks to loop, drain, or work through a whole workstream's backlog (e.g. `$loop-worker w1`). Sequential, not interval-based; do not use for a timed poll, a single task, or ordinary code edits.
---

# Task: Drain a `.pm` workstream milestone by milestone

Usage: `/loop-worker <wN>`

`/loop-worker <wN>` — repeatedly pick the next **actionable pending** milestone in workstream `<wN>`, implement it fully, `/ship` it, and continue until no pending milestones remain or all remaining work is blocked. Automatically skip blocked milestones and their dependents to work on later independent milestones, without waiting for user input. This is a long-running autonomous loop over the `.pm` board; it composes `/pm` (the only writer to `.pm/`), your own implementation work, and `/ship`. It is sequential, not interval-based — for a timed poll use `/loop`.

Parse the target workstream from `$ARGUMENTS` (e.g. `w1`). If `$ARGUMENTS` is empty, **STOP** and ask which workstream to drain — never guess.

## Preconditions (verify once, up front)

1. `git branch --show-current` is `main`. If not, STOP and ask (same rule as `/ship`).
2. `git status` — note pre-existing uncommitted changes. Do not sweep unrelated changes into a milestone's ship; if the tree is dirty with work you didn't do, surface it and ask before starting.
3. The workstream `.pm/<wN>/README.md` exists. If not, STOP and report.
4. Read `.pm/DO_NOT_DO.md` once. Every milestone you pick must respect it.

## The loop

Repeat until the exit condition below:

### 1. Pick the next pending milestone

Read `.pm/<wN>/README.md`. In the `## Milestones` list, pending milestones are the unchecked ones (`- [ ] **mN**`). Pick the **lowest-numbered actionable** pending milestone that still has a live directory (`.pm/<wN>/mN/`, not under `.pm/<wN>/done/`). Inspect milestone READMEs and open task dependencies to establish which milestones can proceed: honor both explicit `depends_on` links and prerequisites stated in scope or acceptance criteria, including transitive dependencies. Numbering alone does not imply a dependency. Exclude unresolved blocked milestones and milestones requiring their unfinished work; scan all later pending milestones before deciding none can proceed. Cross-check by listing `.pm/<wN>/m*/` and `.pm/<wN>/done/` — the checkbox and the on-disk state must agree; if they disagree, trust the task files, flag the drift, and repair it through `/pm` before continuing.

Loose inbox notes (`.pm/<wN>/NNN.md`) are **not** work items for this loop — they are ideas or sub-hour units that nobody has committed to. Leave them alone and list them in the final summary.

If there are **no** pending milestones, or none are actionable, go to **Exit**.

Announce which milestone you picked and give a one-line plan before doing work.

### 2. Understand the milestone

Read `.pm/<wN>/mN/README.md` and every open task file `.pm/<wN>/mN/tNNN.md` (skip any already in `.pm/<wN>/mN/done/`). These define the scope, order, `depends_on` graph, and acceptance. Milestones ship features **end to end** — include the dashboard/mobile tasks alongside the backend, CLI, and skills ones; do not stop at the API. Respect the milestone's `## Definition of done` and each task's `## Acceptance criteria`.

The last tasks of every milestone are the standing closing tasks defined in [`.agents/skills/pm/SKILL.md`](../pm/SKILL.md) (Adoption surface when present, Simplify, Test coverage, Closeout). They are real work, not bookkeeping: run `/simplify` for Simplify, write meaningful tests for Test coverage, and walk every surface the Adoption surface task names.

### 3. Implement it

Do the actual engineering, task by task, following the `depends_on` order (the next actionable task is the first non-done task whose dependencies are all done):

- Follow all `CLAUDE.md` rules — root and the scoped `<package>/CLAUDE.md` for every package you touch (lockfiles are never hand-edited, changes stay scoped to one package, `cd` into the package before running its scripts, no secrets, `AGENTS.md` symlinks stay in sync with `CLAUDE.md`).
- Run the checks the change touches and make them pass before considering a task done:
  - `dashboard/` → `yarn format:check`, `yarn lint`, `yarn test`, `yarn build`
  - `mobile/` → `yarn format:check`, `yarn lint`, `yarn typecheck`, `yarn test:unit`
  - `cli/` → `make check-all`
  - `skills/` or `.agents/skills/` → `python3 skills/scripts/ci-check.py` (from the repo root)
  - `backend-cluster/*`, `deploy/` → the commands in that package's scoped `CLAUDE.md`
  - any `CLAUDE.md` / `AGENTS.md` / skill change → `python3 scripts/check-agent-guidance.py` (from the repo root)
  - before every ship → `gitleaks dir . --redact --verbose`

  Never mark a task complete on unverified code.

- You may delegate independent sub-tasks to subagents (Agent tool) to parallelize, but you own correctness.
- Keep the board in sync as you finish tasks by invoking **`/pm done <wN/mN/tNNN>`** for each completed task — `/pm` is the only skill that writes to `.pm/`, so never edit task frontmatter, milestone `**Status:**` lines, or workstream checkboxes by hand. Running `/pm done` on the milestone's Closeout task last is what moves the whole milestone to `.pm/<wN>/done/mN/` and flips its workstream checkbox to `[x]`. Do not close out until the milestone's definition of done actually holds.

### 4. Ship it

Invoke **`/ship`** ([`.agents/skills/ship/SKILL.md`](../ship/SKILL.md)) for this milestone's changes — code and the `.pm/` moves together. Because you made the changes this session, `/ship` runs session-aware: it stages exactly what you touched and writes the commit message from your knowledge. `/ship` ends at a successful push — it has no test gate of its own and does not watch CI, so the checks in step 3 are the only gate; run them before invoking it. **Proceed after `/ship` reports the shipped HEAD, or after isolating a blocked milestone under the handling below.**

If `/ship` surfaces a failure it cannot fix (rebase conflict it can't resolve, rejected push), treat it as a **block** (see below).

### 5. Continue

Loop back to step 1 to pick the next pending milestone.

## Handling a blocked milestone

A block is something you cannot resolve autonomously: a user-only scope decision, a `DO_NOT_DO.md` conflict, missing external credentials/access, unobservable acceptance criteria, unresolved failing checks, or a ship failure.

- Report the milestone, exact blocker, and what would unblock it in a progress update; **do not stop or wait for input** while independent work remains. Keep a run-local record of blocked milestones and the dependency chains that defer other milestones. Leave unfinished tasks and milestones open; use `/pm` for any board changes.
- Preserve partial code and board changes together in an isolated worktree or a named stash before switching milestones. Do not discard work, ship half-work, or let a later ship include blocked changes or unpushed commits. Continue from the shipped baseline. Treat a shared failure (such as unavailable push access) as blocking every milestone that needs it; isolation does not resolve that failure.
- Return to step 1 and pick the lowest-numbered independent actionable milestone. For example, if `m2` is blocked and `m3` depends on `m2`, but `m4` is independent, skip `m2` and `m3` and work on `m4` automatically.
- Revisit deferred milestones when new evidence changes their blocker or prerequisites, including after another milestone ships or the user supplies missing input. Do not repeatedly retry an unchanged blocker. Stop only when no remaining milestone can proceed; report each blocker, its dependents, and where partial work was preserved.

## Exit

Stop the loop and give a final summary when any of these holds:

- **Done:** no pending milestones remain in `<wN>`. Report which milestones you shipped this run (with their HEAD SHAs) and any open inbox notes left in the workstream.
- **Blocked:** pending milestones remain, but every one is blocked or depends directly or transitively on unresolved blocked work. Report milestones shipped this run (with HEAD SHAs), each blocker and what is needed to proceed, deferred dependents, preserved partial work, and open inbox notes. A single blocked milestone is not an exit condition while later independent work can proceed.
- **Budget/interrupt:** the user interrupts, or you've been running long enough that a checkpoint is warranted — report progress (shipped, in-flight, remaining) so the run can be resumed cleanly.

## Guardrails

- **One milestone per ship.** Never batch two milestones into one commit; each milestone lands as its own shipped unit so history and rollback stay clean.
- **Never ship red.** A failing check is a block, not a footnote. `/ship` will not stop you — the step 3 checks are the gate, so run them yourself before every ship.
- **`/pm` owns the board.** All `.pm/` writes go through `/pm done`; a milestone is done when it sits under `.pm/<wN>/done/mN/`, not when the code is written.
- **The board is public.** Nothing you write into `.pm/` or a commit may contain secrets, user data, or references to private repositories.
- **Stay in `<wN>`.** Only pick milestones from the requested workstream. Workers are general-purpose, but this run is scoped to the queue the user named.
- **Report honestly.** If you skipped a task, mocked something, or a suite was flaky, say so in the per-milestone summary — don't present partial work as complete.

## Arguments

$ARGUMENTS
