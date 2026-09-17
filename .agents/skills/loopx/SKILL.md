---
name: loopx
description: Autonomously drain a `.pm` workstream item by item — triage every pending milestone, task, and inbox note, then implement and ship it, close it as already done, block it with an unblock condition, or delete it as invalid, and keep going until nothing actionable remains (do not stop early to ask the user to resume). Use when the user explicitly invokes $loopx or asks to loop, drain, or work through a whole workstream's backlog (e.g. `$loopx w1`). Sequential, not interval-based; do not use for a timed poll, a single task, or ordinary code edits.
---

# Task: Drain a `.pm` workstream item by item

Usage: `/loopx <wN>`

`/loopx <wN>` — repeatedly pick the next **actionable pending item** in workstream `<wN>`, **triage** it, act on the outcome, `/ship` it, and continue until nothing actionable remains. An item is a pending **milestone**, a pending **task** inside a live milestone, or an open **inbox note**. Every item ends in exactly one of four places: implemented and shipped, closed as already done, moved to `blocked/` with the condition that would clear it, or deleted as invalid. Blocked items and their dependents are skipped automatically, without waiting for user input. This is a long-running autonomous loop over the `.pm` board; it composes `/pm` (the only writer to `.pm/`), your own implementation work, and `/ship`. It is sequential, not interval-based — for a timed poll use `/loop`. If you can name the next pick, keep looping — do not pause for a checkpoint or tell the user to re-run `/loopx`.

A pending item is a claim that the work is still wanted and still undone. Boards go stale: work lands through another item or a direct commit, a decision or a `DO_NOT_DO.md` rule retires the idea, the surface it targets gets removed or renamed. Never start implementing on the strength of a checkbox alone — every item earns its implementation by passing triage first.

Parse the target workstream from `$ARGUMENTS` (e.g. `w1`). If `$ARGUMENTS` is empty, **STOP** and ask which workstream to drain — never guess.

## Preconditions (verify once, up front)

1. `git branch --show-current` is `main`. If not, STOP and ask (same rule as `/ship`).
2. `git status` — note pre-existing uncommitted changes. Do not sweep unrelated changes into an item's ship; if the tree is dirty with work you didn't do, surface it and ask before starting.
3. The workstream `.pm/<wN>/README.md` exists. If not, STOP and report.
4. Read `.pm/DO_NOT_DO.md` once. Every item you pick must respect it, and a conflict with it is a delete reason in triage.

## The loop

Repeat until the exit condition below:

### 1. Pick the next pending item

Read `.pm/<wN>/README.md` and list the tree: `.pm/<wN>/m*/`, `.pm/<wN>/*.md`, `.pm/<wN>/done/`, `.pm/<wN>/blocked/`. The checkbox and the on-disk state must agree; if they disagree, trust the task files, flag the drift, and repair it through `/pm` before continuing.

Pick in this order, and announce what you picked:

1. **The lowest-numbered actionable pending milestone** — unchecked (`- [ ] **mN**`), with a live directory (`.pm/<wN>/mN/`, not under `done/` or `blocked/`), not deferred or blocked earlier this run. Inside it, work its **pending tasks** in `depends_on` order; the next actionable task is the first non-done task whose dependencies are all done. Each task is itself an item and gets its own triage.
2. **The lowest-numbered open inbox note** (`.pm/<wN>/NNN.md`), when no milestone is actionable. Notes are sub-hour units — a bug fix, a doc correction, a decision to record. They are work items for this loop, not scenery. Pull one forward out of order when a milestone depends on it.
3. **A blocked item whose unblock condition now holds** (`.pm/<wN>/blocked/`). Re-read the condition and verify it against the repository before reviving anything; `/pm unblock` moves it back, and it then re-enters triage like any other item. Do not retry an unchanged blocker.

Establish which items can proceed before deciding none can: honor explicit `depends_on` links and prerequisites stated in scope or acceptance criteria, including transitive ones. Numbering alone does not imply a dependency. Scan every later pending item before concluding the workstream is done.

If nothing is actionable, go to **Exit**.

### 2. Triage the item

Read it fully: a milestone's `README.md` plus every open task file, a task's own file, or the note. These define scope, order, and acceptance. Milestones ship features **end to end** — include the dashboard/mobile tasks alongside the backend, CLI, and skills ones; do not stop at the API. Respect the milestone's `## Definition of done` and each task's `## Acceptance criteria`.

Then, **before writing any code**, establish what is actually true on `main` and pick one of four outcomes. Triage runs on evidence, not impression: `git log` the source the item cites and the paths it names, grep for the commands, routes, and strings it describes, open every path under `## Files`, run the observable checks in `## Definition of done`, and reproduce a bug note's repro yourself. Announce the outcome and the evidence in a few lines before acting on it.

| Outcome | When | What you do |
| --- | --- | --- |
| **Work on it** | The goal is still wanted and its acceptance does not hold yet. Stale details — moved paths, renamed commands, a package that changed shape — do not change this: follow the intent and note the deviations in the per-item summary. | Give a one-line plan and continue to step 3. Close any sub-item already satisfied by shipped code with `/pm done`, citing the commit, paths, or tests that satisfy it, so the record shows why it closed without work this session. |
| **Close as already done** | The acceptance criteria already hold on `main` — including the standing closing tasks (adoption surfaces checked, meaningful tests exist) — and the definition of done holds when you actually run its checks. A note's bug no longer reproduces at HEAD. Missing tests or an unchecked adoption surface make this *work on it*, not close. | `/pm done <target>` — tasks in dependency order, Closeout last; a note gets its resolution line and moves to `done/`. Skip to step 4 and ship the board move alone: `chore(pm): close <target> — already satisfied by <SHA>`. No code rides along. |
| **Block it** | The work is still wanted but cannot proceed here: missing credentials or external access, an unobservable acceptance criterion, a deploy or store review only the user can run, an unresolved failing check, a ship failure, or a scope question only the user can answer. A question you cannot settle from evidence is a blocker, not a reason to skip quietly. | `/pm block <target> <reason>`, writing the exact blocker, an **Unblock:** condition, and who can clear it. Preserve any partial work (see [Handling a block](#handling-a-block)). Skip to step 4 and ship the move alone: `chore(pm): block <target> — <one line>`. |
| **Delete as invalid** | The work should not be done at all: it conflicts with `.pm/DO_NOT_DO.md`; a decision recorded on the board, in an ADR, or in a commit retired it; it is fully superseded by or duplicates other work (shipped or still open — keep the better one); or the surface it targets no longer exists. | `/pm drop <target> <reason>`, naming the rule, ADR, commit, or item that justifies it. Skip to step 4 and ship the deletion alone: `chore(pm): drop <target> — <reason>`. If the reason generalizes into a rule, propose a `DO_NOT_DO.md` entry in the final summary; do not write one yourself. |

Closing, blocking, and deleting all rewrite a public board, so the bar is evidence you can cite. An item the user explicitly routed or approved (`user routed to`, `user approved`, `user decision`) that you merely *suspect* is unwanted is a **block** with the question as its unblock condition, never a delete. Deleting is for work that is provably invalid; blocking is for work that is still wanted and stuck. Never delete an item to avoid the work in it.

The last tasks of every milestone are the standing closing tasks defined in [`.agents/skills/pm/SKILL.md`](../pm/SKILL.md) (Adoption surface when present, Simplify, Test coverage, Closeout). They are real work, not bookkeeping: run `/simplify` for Simplify, write meaningful tests for Test coverage, and walk every surface the Adoption surface task names.

### 3. Implement it

Do the actual engineering, one item at a time, following `depends_on` order inside a milestone:

- Follow all `CLAUDE.md` rules — root and the scoped `<package>/CLAUDE.md` for every package you touch (lockfiles are never hand-edited, changes stay scoped to one package, `cd` into the package before running its scripts, no secrets, `AGENTS.md` symlinks stay in sync with `CLAUDE.md`).
- Run the checks the change touches and make them pass before considering the item done:
  - `dashboard/` → `yarn format:check`, `yarn lint`, `yarn test`, `yarn build`
  - `mobile/` → `yarn format:check`, `yarn lint`, `yarn typecheck`, `yarn test:unit`
  - `cli/` → `make check-all`
  - `skills/` or `.agents/skills/` → `python3 skills/scripts/ci-check.py` (from the repo root)
  - `backend-cluster/*`, `deploy/` → the commands in that package's scoped `CLAUDE.md`
  - any `CLAUDE.md` / `AGENTS.md` / skill change → `python3 scripts/check-agent-guidance.py` (from the repo root)
  - before every ship → `gitleaks dir . --redact --verbose`

  Never mark an item complete on unverified code.

- A bug note is not fixed until its own repro fails to reproduce and a regression test covers it. Prove the test is real — revert the fix and watch it fail.
- You may delegate independent sub-tasks to subagents (Agent tool) to parallelize, but you own correctness.
- Keep the board in sync as you go by invoking **`/pm done <target>`** for each finished task or note — `/pm` is the only skill that writes to `.pm/`, so never edit task frontmatter, milestone `**Status:**` lines, workstream checkboxes, or `done/` and `blocked/` placement by hand. Running `/pm done` on the milestone's Closeout task last is what moves the whole milestone to `.pm/<wN>/done/mN/` and flips its workstream checkbox to `[x]`. Do not close out until the milestone's definition of done actually holds; if it cannot hold here, the milestone is a **block**, not a close.

### 4. Ship it

Invoke **`/ship`** ([`.agents/skills/ship/SKILL.md`](../ship/SKILL.md)) for this item's changes — code and the `.pm/` moves together, or the board move alone when triage ended the item without code. Because you made the changes this session, `/ship` runs session-aware: it stages exactly what you touched and writes the commit message from your knowledge. `/ship` ends at a successful push — it has no test gate of its own and does not watch CI, so the checks in step 3 are the only gate; run them before invoking it.

Ship each outcome before starting the next item. A milestone large enough to span several sessions may ship at task boundaries, provided every ship is green and self-contained. **Proceed after `/ship` reports the shipped HEAD**, or after isolating a block under the handling below.

If `/ship` surfaces a failure it cannot fix (a rebase conflict it can't resolve, a rejected push), that is a block.

### 5. Continue

Loop back to step 1 to pick the next pending item. After every ship (or block isolation), **immediately** re-scan and pick again — do not end the turn, ask the user to resume, or wait for another `/loopx` invocation while step 1 would still find an actionable item. A short progress line between items is fine; stopping because the queue is long, the session is long, or you already shipped several items is not.

## Handling a block

A block is anything you cannot resolve autonomously. It can surface at triage or mid-implementation; either way the item leaves the open tree through `/pm block` with its unblock condition, and the loop keeps going.

- Report the item, the exact blocker, and what would unblock it in a progress update; **do not stop or wait for input** while independent work remains. Keep a run-local record of blocked items and the dependency chains they defer.
- Preserve partial code together with its board changes before switching items — an isolated worktree or a named stash. Do not discard work, ship half-work, or let a later ship include blocked changes or unpushed commits. Continue from the shipped baseline. Treat a shared failure (such as unavailable push access) as blocking every item that needs it; isolation does not resolve that failure.
- When only *some* of a milestone's tasks are blocked, block those tasks in place (`status: blocked`, reason in the milestone `README.md`) and keep working the ones that can proceed. When every open task is blocked, block the milestone itself.
- Return to step 1 and pick the lowest-numbered independent actionable item. If `m2` is blocked and `m3` depends on it but `m4` is independent, skip `m2` and `m3` and work `m4` automatically.
- Revisit a blocked item only when new evidence changes its condition — another item shipped, the user supplied the missing input. Do not repeatedly retry an unchanged blocker.

## Exit

Stop the loop and give a final summary **only** when one of these holds:

- **Done:** no pending items remain in `<wN>`. Report every item's outcome: shipped implementations with their HEAD SHAs, items closed as already done with the evidence, blocked items with their unblock conditions and owners, deleted items with their reasons (and any `DO_NOT_DO.md` rule you propose).
- **Blocked:** pending items remain, but every one is blocked or depends directly or transitively on unresolved blocked work. Report items shipped this run (with HEAD SHAs), each blocker and what is needed to proceed, deferred dependents, and where partial work was preserved. A single blocked item is not an exit condition while later independent work can proceed.
- **Hard stop only:** the user explicitly interrupts, or the runtime forces a stop (session/tool limit, killed process, lost push access that blocks every remaining ship). In that case report progress (triaged, shipped, in-flight, blocked, **next actionable pick**) so a later `/loopx <wN>` can resume — but **never** choose this exit yourself while step 1 still has a known next item.

**Not an exit:** "checkpoint", "budget", "long enough", "several items shipped already", or "resume with `/loopx <wN>` to pick up at NNN" while open inbox notes or actionable milestones remain. If you can name the next pick, you must pick it and continue.

## Guardrails

- **Keep going when the next item is known.** Knowing that `226` (or any later note/milestone) is next is a reason to pick it now, not to stop and tell the user to re-invoke `/loopx`. Drain until Done, Blocked, or a hard stop above.
- **Triage before code.** No item is implemented on the strength of its checkbox. Every pick gets an evidence-backed outcome — work on, close, block, or delete — announced before any code changes.
- **Every item ends somewhere.** Shipped, `done/`, `blocked/`, or deleted. Leaving an item open and untouched because it looked hard is not an outcome; that is a block, and it needs a written unblock condition.
- **One board outcome per ship.** Never batch two items into one commit; an implementation, a triage close, a block, and a deletion each land as their own shipped unit so history and rollback stay clean.
- **Never ship red.** A failing check is a block, not a footnote. `/ship` will not stop you — the step 3 checks are the gate, so run them yourself before every ship.
- **`/pm` owns the board.** All `.pm/` writes go through `/pm done`, `/pm block`, `/pm unblock`, and `/pm drop`. An item is done when it sits under `done/`, blocked when it sits under `blocked/` with its condition, and deleted when `/pm drop` has removed it — not when you stop looking at it.
- **Doubt is a block, not a delete.** Delete only on evidence you can cite; when the question is one for the user, block with that question as the unblock condition and repeat it in the summary.
- **The board is public.** Nothing you write into `.pm/` or a commit may contain secrets, user data, or references to private repositories — block reasons, delete reasons, and triage-close evidence included.
- **Stay in `<wN>`.** Only pick items from the requested workstream. Workers are general-purpose, but this run is scoped to the queue the user named.
- **Report honestly.** If you skipped a task, mocked something, or a suite was flaky, say so in the per-item summary — don't present partial work as complete, and don't present a close-by-triage as work you did.

## Arguments

$ARGUMENTS
