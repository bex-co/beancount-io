# `/loopx` worker: take one item to an outcome

You were dispatched by a `/loopx <wN>` orchestrator (see [`SKILL.md`](SKILL.md)) to handle **exactly one** item: a pending milestone (with all of its tasks, closing tasks included) or one open inbox note. If the dispatch says you are a *routine worker* instead, skip to [Routine runs](#routine-runs): you run one scheduled command, not an item. Your context is fresh on purpose. Everything you need is on disk: the item's files under `.pm/<wN>/`, `.pm/DO_NOT_DO.md`, the root and scoped `AGENTS.md` files, and the code. Do not rely on anything else.

Your job ends when the item has reached exactly one of four outcomes and that outcome is shipped to `origin/main`. Those outcomes are: implemented and shipped, closed as already done, moved to `blocked/` with the condition that would clear it, or deleted as invalid. Then return the result block below.

**Scope**
- Do not pick another item. Do not touch other items' board entries except through the `/pm` moves this item requires.
- Do not run any `scripts/loopx-guard.py` mode other than `outcome` (`start`, `end`, `wait`, `dispatch`, `settle`, `routine-due`, `routine-done` belong to the orchestrator).
- Never ask the user. A question you cannot settle from evidence is a **block**, with the question as its unblock condition.
- Start from a clean `main` that matches `origin/main`. If the tree is dirty with work you did not do, stop and report that in the result block (`outcome: blocked`, explaining it in `notes`) without touching it.

A pending item is a claim that the work is still wanted and still undone. Boards go stale: work lands through another item or a direct commit, a decision or a `DO_NOT_DO.md` rule retires the idea, the surface it targets gets removed or renamed. Never start implementing on the strength of a checkbox alone. Every item earns its implementation by passing triage first.

## 1. Triage the item

Read it fully: a milestone's `README.md` plus every open task file, or the note. These define scope, order, and acceptance. Milestones ship features **end to end**: include the dashboard and mobile tasks alongside the backend, CLI, and skills ones, and do not stop at the API. Respect the milestone's `## Definition of done` and each task's `## Acceptance criteria`. If the item's checkbox and its on-disk state disagree, trust the task files and repair the drift through `/pm`.

Then, **before writing any code**, establish what is actually true on `main` and pick one of four outcomes. Triage runs on evidence, not impression. `git log` the source the item cites and the paths it names. Grep for the commands, routes, and strings it describes. Open every path under `## Files`. Run the observable checks in `## Definition of done`. Reproduce a bug note's repro yourself. Write down the outcome and the evidence in a few lines before acting on it.

| Outcome | When | What you do |
| --- | --- | --- |
| **Work on it** | The goal is still wanted and its acceptance does not hold yet. Stale details (moved paths, renamed commands, a package that changed shape) do not change this: follow the intent and note the deviations in the result. | Write a one-line plan and continue to step 2. Close any sub-item already satisfied by shipped code with `/pm done`, citing the commit, paths, or tests that satisfy it, so the record shows why it closed without work. |
| **Close as already done** | The acceptance criteria already hold on `main`, including the standing closing tasks (adoption surfaces checked, meaningful tests exist), and the definition of done holds when you actually run its checks. A note's bug no longer reproduces at HEAD. Missing tests or an unchecked adoption surface make this *work on it*, not close. | `/pm done <target>`: tasks in dependency order, Closeout last. A note gets its resolution line and moves to `done/`. Skip to step 3 and ship the board move alone: `chore(pm): close <target> — already satisfied by <SHA>`. No code rides along. |
| **Block it** | The work is still wanted but cannot proceed here. Examples: missing credentials or external access, an unobservable acceptance criterion, a deploy or store review only the user can run, an unresolved failing check, a ship failure, a scope question only the user can answer, or a source record in `docs/adrs/` whose `- Status:` is `Draft` (only the owner can move it to `Proposed`). | `/pm block <target> <reason>`, writing the exact blocker, an **Unblock:** condition, and who can clear it. Preserve any partial work (see [Handling a block](#handling-a-block)). Skip to step 3 and ship the move alone: `chore(pm): block <target> — <one line>`. |
| **Delete as invalid** | The work should not be done at all. It conflicts with `.pm/DO_NOT_DO.md`; a decision recorded on the board, in an ADR, or in a commit retired it; it is fully superseded by or duplicates other work (shipped or still open — keep the better one); or the surface it targets no longer exists. | `/pm drop <target> <reason>`, naming the rule, ADR, commit, or item that justifies it. Skip to step 3 and ship the deletion alone: `chore(pm): drop <target> — <reason>`. If the reason generalizes into a rule, propose a `DO_NOT_DO.md` entry in `notes`; do not write one yourself. |

Closing, blocking, and deleting all rewrite a public board, so the bar is evidence you can cite. An item the user explicitly routed or approved (`user routed to`, `user approved`, `user decision`) that you merely *suspect* is unwanted gets **blocked**, with the question as its unblock condition. Never delete it. Deleting is for work that is provably invalid; blocking is for work that is still wanted and stuck. Never delete an item to avoid the work in it.

The last tasks of every milestone are the standing closing tasks defined in [`.agents/skills/pm/SKILL.md`](../pm/SKILL.md): Adoption surface when present, Simplify, Test coverage, Closeout. They are real work, not bookkeeping. Run `/simplify` for Simplify, write meaningful tests for Test coverage, and walk every surface the Adoption surface task names.

## 2. Implement it

Do the actual engineering, following `depends_on` order inside a milestone:

- Follow all `AGENTS.md` rules, root and the scoped `<package>/AGENTS.md` for every package you touch. Lockfiles are never hand-edited. Changes stay scoped to one package. `cd` into the package before running its scripts. No secrets. Every scope's guidance stays in a real `AGENTS.md`.
- Run the checks the change touches and make them pass before considering the item done:
  - `dashboard/` → `yarn format:check`, `yarn lint`, `yarn test`, `yarn build`
  - `mobile/` → `yarn format:check`, `yarn lint`, `yarn typecheck`, `yarn test:unit`
  - `cli/` → `make check-all`
  - `skills/` or `.agents/skills/` → `python3 scripts/skills/ci-check.py` (from the repo root)
  - `backend-cluster/*`, `deploy/` → the commands in that package's scoped `AGENTS.md`
  - any `AGENTS.md` or skill change → `python3 scripts/check-agent-guidance.py` (from the repo root)
  - before every ship → `python3 scripts/scan-secrets.py`

  Never mark an item complete on unverified code.

- A bug note is not fixed until its own repro fails to reproduce and a regression test covers it. Prove the test is real: revert the fix and watch it fail.
- You may delegate independent sub-tasks to subagents to parallelize, but you own correctness.
- Keep the board in sync as you go by invoking **`/pm done <target>`** for each finished task or note. `/pm` is the only skill that writes to `.pm/`, so never edit task frontmatter, milestone `**Status:**` lines, workstream checkboxes, or `done/` and `blocked/` placement by hand. Running `/pm done` on the milestone's Closeout task last is what moves the whole milestone to `.pm/<wN>/done/mN/` and flips its workstream checkbox to `[x]`. Do not close out until the milestone's definition of done actually holds. If it cannot hold here, the milestone is a **block**, not a close.

## 3. Ship it

Invoke **`/ship`** ([`.agents/skills/ship/SKILL.md`](../ship/SKILL.md)) for the item's changes: code and the `.pm/` moves together, or the board move alone when triage ended the item without code. `/ship` ends at a successful push. It has no test gate of its own and does not watch CI, so the checks in step 2 are the only gate. Run them before invoking it.

One board outcome per ship: never fold two outcomes into one commit. A milestone large enough to need it may ship at task boundaries, provided every ship is green and self-contained.

If `/ship` surfaces a failure it cannot fix (a rebase conflict it can't resolve, a rejected push), that is a block.

## Handling a block

A block is anything you cannot resolve autonomously. It can surface at triage or mid-implementation. Either way, the blocked work leaves the open tree through `/pm block` with its unblock condition.

- When only *some* of a milestone's tasks are blocked, block those tasks in place (`status: blocked`, reason in the milestone `README.md`) and keep working the ones that can proceed. When every open task is blocked, block the milestone itself. A legitimate end state therefore never leaves the milestone open.
- Preserve partial code before blocking: push nothing half-done, and keep it in a named stash (`git stash push -u -m "loopx/<wN>/<id>"`). Never discard work, and never let a ship include blocked changes. Name the stash in `notes`.
- A shared failure (such as unavailable push access) cannot be shipped around. Report it as `outcome: blocked` with the failure in `notes`, and leave the board change unshipped in the stash.

## Guardrails

- **Triage before code.** Write down an evidence-backed outcome before changing anything.
- **Never ship red.** A failing check is a block, not a footnote. Run the gates as their own command and read the result before you commit. Chaining `&& git commit` onto the end of the gate command is exactly how a red push happens. If a gate fails, decide whether it is your change or a known flake, and say which in `notes`.
- **`/pm` owns the board.** All `.pm/` writes go through `/pm done`, `/pm block`, `/pm unblock`, and `/pm drop`.
- **Doubt is a block, not a delete.**
- **The board is public.** Nothing you write into `.pm/` or a commit may contain secrets, user data, or references to private repositories. That includes block reasons, delete reasons, and triage-close evidence.
- **Report honestly.** If you skipped a step, mocked something, or a suite was flaky, say so in `notes`. Do not present partial work as complete, and do not present a close-by-triage as work you did. The orchestrator checks your claim against `origin/main`.

## Routine runs

When the dispatch says you are a **routine worker**, there is no board item. You run the one command the dispatch quotes, as written, and nothing else. The command comes from a row in `.pm/<wN>/routine/README.md` and can be anything:

- **A slash command** (`/qa-find-bugs-cli w1 SHIP=1`, `/routine-dead-code-removal dashboard`, `/simplify`): invoke that skill with exactly those arguments and follow its `SKILL.md`, including any contract it tells you to read (proof standards, verify gates, budgets, STOPs, where its findings go). Where the skill is stricter than the rules below, the skill wins.
- **A shell command**: run it from the repository root, read its output, and act on what it reports within the command's evident purpose (fix what it flags, or surface it as follow-ups). Do not stretch it into unrelated work.
- **A task in plain words**: do that task, scoped as narrowly as it reads.

The triage and `/pm` sections above do not apply. Whatever the command is:

- Run the checks for every package you change (step 2's list) and ship each change through `/ship`. Never ship red.
- Write the board only when the command itself does so through `/pm` (a QA skill filing its findings, for example). List the item ids it filed or extended in `notes`.
- Anything else that needs board work goes into `followups`: a STOP that needs a person, a finding outside the command's scope, a candidate too large for one run. The orchestrator files each one as an inbox note. Write each one so it stands alone: the problem, the evidence, the paths, and a testable end state. The board is public.
- `result: found` means the run shipped at least one commit (code, or board items filed or extended); otherwise `empty`.
- Leave the tree clean and every shipped commit on `origin/main`. A half-done change goes into a named stash (`git stash push -u -m "loopx/routine/<name>"`), never into a ship.

End with this block instead of LOOPX-RESULT, with nothing after it:

```
LOOPX-ROUTINE
routine: <name>
result: found|empty
commits: <short SHA, comma-separated; - if none>
followups:
- <one line per follow-up: problem, evidence, paths, testable end state; or - if none>
notes: <at most two lines: skipped candidates and why, flakes, stash name>
```

## Result block

End your final message with exactly this block, and nothing after it:

```
LOOPX-RESULT
item: <wN>/<id>
outcome: shipped|closed|blocked|dropped
commits: <short SHA, comma-separated; - if none>
unblock: <the Unblock: condition and who can clear it; - unless blocked>
notes: <at most two lines: deviations, flakes, skipped steps, stash name, proposed DO_NOT_DO rule>
```
