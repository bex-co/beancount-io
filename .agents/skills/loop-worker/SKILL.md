---
name: loop-worker
description: Autonomously work a `.pm` workstream to completion — triage each pending milestone (work on it, close it as already done, or drop it), implement what survives end to end, ship it, then move to the next until none remain. Use when the user explicitly invokes $loop-worker or asks to loop, drain, or work through a whole workstream's backlog (e.g. `$loop-worker w1`). Sequential, not interval-based; do not use for a timed poll, a single task, or ordinary code edits.
---

# Task: Drain a `.pm` workstream milestone by milestone

Usage: `/loop-worker <wN>`

`/loop-worker <wN>` — repeatedly pick the next **actionable pending** milestone in workstream `<wN>`, **triage** it (work on it, close it because `main` already satisfies it, or drop it because it should no longer be done), implement it fully when it survives triage, `/ship` it, and continue until no pending milestones remain or all remaining work is blocked. Automatically skip blocked milestones and their dependents to work on later independent milestones, without waiting for user input. This is a long-running autonomous loop over the `.pm` board; it composes `/pm` (the only writer to `.pm/`), your own implementation work, and `/ship`. It is sequential, not interval-based — for a timed poll use `/loop`.

An unchecked milestone is a claim that the work is still wanted and still undone. Boards go stale: work lands through another milestone or a direct commit, a decision or a `DO_NOT_DO.md` rule retires the idea, the surface it targets gets removed or renamed. Never start implementing on the strength of the checkbox alone — every milestone earns its implementation by passing triage first.

Parse the target workstream from `$ARGUMENTS` (e.g. `w1`). If `$ARGUMENTS` is empty, **STOP** and ask which workstream to drain — never guess.

## Preconditions (verify once, up front)

1. `git branch --show-current` is `main`. If not, STOP and ask (same rule as `/ship`).
2. `git status` — note pre-existing uncommitted changes. Do not sweep unrelated changes into a milestone's ship; if the tree is dirty with work you didn't do, surface it and ask before starting.
3. The workstream `.pm/<wN>/README.md` exists. If not, STOP and report.
4. Read `.pm/DO_NOT_DO.md` once. Every milestone you pick must respect it, and a conflict with it is a drop reason in triage.

## The loop

Repeat until the exit condition below:

### 1. Pick the next pending milestone

Read `.pm/<wN>/README.md`. In the `## Milestones` list, pending milestones are the unchecked ones (`- [ ] **mN**`). Pick the **lowest-numbered actionable** pending milestone that still has a live directory (`.pm/<wN>/mN/`, not under `.pm/<wN>/done/`) and that you have not already deferred or recorded as blocked this run. Inspect milestone READMEs and open task dependencies to establish which milestones can proceed: honor both explicit `depends_on` links and prerequisites stated in scope or acceptance criteria, including transitive dependencies. Numbering alone does not imply a dependency. Exclude unresolved blocked milestones and milestones requiring their unfinished work; scan all later pending milestones before deciding none can proceed. Cross-check by listing `.pm/<wN>/m*/` and `.pm/<wN>/done/` — the checkbox and the on-disk state must agree; if they disagree, trust the task files, flag the drift, and repair it through `/pm` before continuing.

Loose inbox notes (`.pm/<wN>/NNN.md`) are **not** work items for this loop — they are ideas or sub-hour units that nobody has committed to. Leave them alone and list them in the final summary.

If there are **no** pending milestones, or none are actionable, go to **Exit**.

Announce which milestone you picked. The plan comes after triage, not before it.

### 2. Triage the milestone

Read `.pm/<wN>/mN/README.md` and every open task file `.pm/<wN>/mN/tNNN.md` (skip any already in `.pm/<wN>/mN/done/`). These define the scope, order, `depends_on` graph, and acceptance. Milestones ship features **end to end** — include the dashboard/mobile tasks alongside the backend, CLI, and skills ones; do not stop at the API. Respect the milestone's `## Definition of done` and each task's `## Acceptance criteria`.

Then, **before writing any code**, establish what is actually true on `main` and pick one of four outcomes. Triage runs on evidence, not impression: `git log` the source the milestone cites and the paths its tasks name, grep for the commands, routes, and strings it describes, open every path under `## Files`, and run the observable checks in `## Definition of done`. Announce the outcome and the evidence in a few lines before acting on it.

| Outcome | When | What you do |
| --- | --- | --- |
| **Work on it** | The goal is still wanted and the definition of done does not hold yet. Stale details — moved paths, renamed commands, a package that changed shape — do not change this: follow the intent and note the deviations in the per-milestone summary. | Give a one-line plan and continue to step 3. If some tasks are *already* satisfied by shipped code, close those first with `/pm done <wN/mN/tNNN>`, citing the commit, paths, or tests that satisfy them so the task file records why it closed without work this session; implement the rest. |
| **Close as already done** | Every task's acceptance criteria — including the standing closing tasks (adoption surfaces checked, meaningful tests exist for the behavior) — already hold on `main`, and the definition of done holds when you actually run its checks. Missing tests or an unchecked adoption surface make this *work on it*, not close. | Run `/pm done` on each task in dependency order, citing the evidence per task, Closeout last. Skip to step 4 and ship the board move alone — `chore(pm): close <wN/mN> — already satisfied by <SHA or milestone>`. No code changes ride along. |
| **Drop it** | The milestone should not be done at all: it conflicts with `.pm/DO_NOT_DO.md`; a decision recorded on the board, in an ADR, or in a commit retired it; it is fully superseded by or duplicates other work (shipped or still open — keep the better one); or the surface it changes no longer exists. | Run `/pm drop <wN/mN> <reason>`, naming the rule, ADR, commit, or milestone that justifies it. Skip to step 4 and ship the drop alone — `chore(pm): drop <wN/mN> — <reason>`. If the reason generalizes into a rule, propose a `DO_NOT_DO.md` entry in the final summary; do not write one yourself. |
| **Defer** | On the evidence you cannot tell whether the milestone is still wanted, and the only remaining question is one for the user: product direction, a superseding decision you cannot find written down, a partial overlap where keeping or dropping is a judgment call. | Touch nothing. Write down the one question that would settle it, go back to step 1 for the next actionable pending milestone, and list every deferred milestone with its question in the final summary. "It looks hard" or "the tasks are stale" is not a doubt — that is *work on it*. |

Closing and dropping both rewrite a public board, so the bar is evidence you can cite. A milestone the user explicitly routed or approved (`user routed to`, `user approved`, `user decision`) that you merely *suspect* is unwanted is a defer, not a drop. A milestone whose definition of done cannot be observed from this repo at all is a **block** (see [Handling a blocked milestone](#handling-a-blocked-milestone)), not a triage outcome.

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

Invoke **`/ship`** ([`.agents/skills/ship/SKILL.md`](../ship/SKILL.md)) for this milestone's changes — code and the `.pm/` moves together, or the `.pm/` close or drop alone when triage ended the milestone without code. Because you made the changes this session, `/ship` runs session-aware: it stages exactly what you touched and writes the commit message from your knowledge. `/ship` ends at a successful push — it has no test gate of its own and does not watch CI, so the checks in step 3 are the only gate; run them before invoking it. **Proceed after `/ship` reports the shipped HEAD, or after isolating a blocked milestone under the handling below.**

If `/ship` surfaces a failure it cannot fix (rebase conflict it can't resolve, rejected push), treat it as a **block** (see below).

### 5. Continue

Loop back to step 1 to pick the next pending milestone.

## Handling a blocked milestone

A block is something you cannot resolve autonomously: a user-only scope decision that surfaces during implementation, a `DO_NOT_DO.md` conflict that only became visible once work started (at triage it is a drop), missing external credentials/access, unobservable acceptance criteria, unresolved failing checks, or a ship failure. A triage **defer** is not a block: nothing was started, so there is nothing to preserve — record the question and move on.

- Report the milestone, exact blocker, and what would unblock it in a progress update; **do not stop or wait for input** while independent work remains. Keep a run-local record of blocked milestones and the dependency chains that defer other milestones. Leave unfinished tasks and milestones open; use `/pm` for any board changes.
- Preserve partial code and board changes together in an isolated worktree or a named stash before switching milestones. Do not discard work, ship half-work, or let a later ship include blocked changes or unpushed commits. Continue from the shipped baseline. Treat a shared failure (such as unavailable push access) as blocking every milestone that needs it; isolation does not resolve that failure.
- Return to step 1 and pick the lowest-numbered independent actionable milestone. For example, if `m2` is blocked and `m3` depends on `m2`, but `m4` is independent, skip `m2` and `m3` and work on `m4` automatically.
- Revisit deferred milestones when new evidence changes their blocker or prerequisites, including after another milestone ships or the user supplies missing input. Do not repeatedly retry an unchanged blocker. Stop only when no remaining milestone can proceed; report each blocker, its dependents, and where partial work was preserved.

## Exit

Stop the loop and give a final summary when any of these holds:

- **Done:** no pending milestones remain in `<wN>`, or every remaining one was deferred at triage (nothing started, only questions open). Report every milestone's triage outcome: shipped implementations with their HEAD SHAs, milestones closed as already done with the evidence, dropped milestones with their reasons (and any `DO_NOT_DO.md` rule you propose), deferred milestones each with the one question that would settle it, and any open inbox notes left in the workstream.
- **Blocked:** pending milestones remain, but every one is blocked, depends directly or transitively on unresolved blocked work, or was deferred at triage. Report milestones shipped this run (with HEAD SHAs), each blocker and what is needed to proceed, deferred dependents, preserved partial work, deferred milestones with their open questions, and open inbox notes. A single blocked milestone is not an exit condition while later independent work can proceed.
- **Budget/interrupt:** the user interrupts, or you've been running long enough that a checkpoint is warranted — report progress (triaged, shipped, in-flight, blocked, remaining) so the run can be resumed cleanly.

## Guardrails

- **Triage before code.** No milestone is implemented on the strength of its checkbox. Every pick gets an evidence-backed outcome — work on, close, drop, or defer — announced before any code changes.
- **One board outcome per ship.** Never batch two milestones into one commit; an implemented milestone, a triage close, and a drop each land as their own shipped unit so history and rollback stay clean.
- **Never ship red.** A failing check is a block, not a footnote. `/ship` will not stop you — the step 3 checks are the gate, so run them yourself before every ship.
- **`/pm` owns the board.** All `.pm/` writes go through `/pm done` and `/pm drop`; a milestone is done when it sits under `.pm/<wN>/done/mN/`, not when the code is written, and it is dropped when `/pm drop` has removed it, not when you stop looking at it.
- **Doubt is not a drop.** Drop only on evidence you can cite; when the question is one for the user, defer and ask it in the summary. Never drop a milestone to avoid the work in it.
- **The board is public.** Nothing you write into `.pm/` or a commit may contain secrets, user data, or references to private repositories — drop reasons and triage-close evidence included.
- **Stay in `<wN>`.** Only pick milestones from the requested workstream. Workers are general-purpose, but this run is scoped to the queue the user named.
- **Report honestly.** If you skipped a task, mocked something, or a suite was flaky, say so in the per-milestone summary — don't present partial work as complete, and don't present a close-by-triage as work you did.

## Arguments

$ARGUMENTS
