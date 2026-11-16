# `/loopx` worker: take one item to an outcome

You were dispatched by a `/loopx <wN>` orchestrator (see [`SKILL.md`](SKILL.md)) to handle **exactly one** item: a pending milestone (with all of its tasks, closing tasks included) or one open inbox note. If the dispatch says you are a *routine worker* instead, skip to [Routine runs](#routine-runs): you run one scheduled command, not an item. If it says you are a *CI-fix worker*, skip to [CI fix runs](#ci-fix-runs). Your context is fresh on purpose. Everything you need is on disk: the item's files under `.pm/<wN>/`, `.pm/DO_NOT_DO.md`, the root and scoped `AGENTS.md` files, and the code. Do not rely on anything else.

Your job ends when the item has reached exactly one of four outcomes and that outcome is shipped to `origin/main`. Those outcomes are: implemented and shipped, closed as already done, moved to `blocked/` with the condition that would clear it, or deleted as invalid. Then return the result block below.

**Scope**
- Do not pick another item. Do not touch other items' board entries except through the `/pm` moves this item requires.
- Do not run any `scripts/loopx-guard.py` mode other than `outcome` (`start`, `end`, `board`, `wait`, `dispatch`, `settle`, `routine-due`, `routine-done` belong to the orchestrator).
- Run your checks in the foreground and wait for them. Never end your turn while a command of yours is still running in the background: the orchestrator would be woken by a result that is not one.
- Load `/pm` and `/ship` once each. After that, follow the instructions already in your context instead of invoking the skill again: every invocation reloads the whole file.
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
| **Block it** | The work is still wanted but cannot proceed here. Examples: missing credentials or external access, an unobservable acceptance criterion, a deploy or store review only the user can run, a check your own change breaks that you cannot fix, a ship failure, a scope question only the user can answer, or a source record in `docs/adrs/` whose `- Status:` is `Draft` (only the owner can move it to `Proposed`). | `/pm block <target> <reason>`, writing the exact blocker, an **Unblock:** condition, and who can clear it. Preserve any partial work (see [Handling a block](#handling-a-block)). Skip to step 3 and ship the move alone: `chore(pm): block <target> — <one line>`. |
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

  Never mark an item complete on unverified code. When a check fails, [Failing checks](#failing-checks) decides what happens next.

- A bug note is not fixed until its own repro fails to reproduce and a regression test covers it. Prove the test is real: revert the fix and watch it fail.
- You may delegate independent sub-tasks to subagents to parallelize, but you own correctness.
- Keep the board in sync as you go by invoking **`/pm done <target>`** for each finished task or note. `/pm` is the only skill that writes to `.pm/`, so never edit task frontmatter, milestone `**Status:**` lines, workstream checkboxes, or `done/` and `blocked/` placement by hand. Running `/pm done` on the milestone's Closeout task last is what moves the whole milestone to `.pm/<wN>/done/mN/` and flips its workstream checkbox to `[x]`. Do not close out until the milestone's definition of done actually holds. If it cannot hold here, the milestone is a **block**, not a close.

## 3. Ship it

Invoke **`/ship`** ([`.agents/skills/ship/SKILL.md`](../ship/SKILL.md)) for the item's changes: code and the `.pm/` moves together, or the board move alone when triage ended the item without code. `/ship` ends at a successful push. It has no test gate of its own, so the checks in step 2 are your gate: run them before invoking it. The orchestrator reads CI for your commits afterwards, and a workflow your push turns red comes back to the loop as a fix.

One board outcome per ship: never fold two outcomes into one commit. A milestone large enough to need it may ship at task boundaries, provided every ship is green and self-contained.

If `/ship` surfaces a failure it cannot fix (a rebase conflict it can't resolve, a rejected push), that is a block.

## Failing checks

The repo-wide rule is "Failing checks" in the root `AGENTS.md`: speed comes first, your own red is always fixed, and someone else's red never stops you. Applied here:

- **Yours**: the check passes without your change and fails with it. Fix it before you ship. If you cannot, the item is a block.
- **Not yours**: the check already fails without your change. Show it: run the same check with your change set aside (a named stash), or point to the same failure in a recent CI run on `main`. Then fix it in its own commit if that takes a few minutes. If it does not, leave it, ship your own work, and name the check and the evidence in `notes`. It never blocks your item.
- Never delete, skip, or weaken a check to get past it, and never use `--no-verify`.

## Handling a block

A block is anything you cannot resolve autonomously. It can surface at triage or mid-implementation. Either way, the blocked work leaves the open tree through `/pm block` with its unblock condition.

- When only *some* of a milestone's tasks are blocked, block those tasks in place (`status: blocked`, reason in the milestone `README.md`) and keep working the ones that can proceed. When every open task is blocked, block the milestone itself. A legitimate end state therefore never leaves the milestone open.
- Preserve partial code before blocking: push nothing half-done, and keep it in a named stash (`git stash push -u -m "loopx/<wN>/<id>"`). Never discard work, and never let a ship include blocked changes. Name the stash in `notes`.
- A shared failure (such as unavailable push access) cannot be shipped around. Report it as `outcome: blocked` with the failure in `notes`, and leave the board change unshipped in the stash.

## Guardrails

- **Triage before code.** Write down an evidence-backed outcome before changing anything.
- **Never ship your own red.** Run the gates as their own command and read the result before you commit. Chaining `&& git commit` onto the end of the gate command is exactly how a red push happens. If a gate fails, settle whose failure it is ([Failing checks](#failing-checks)) and say which in `notes`.
- **`/pm` owns the board.** All `.pm/` writes go through `/pm done`, `/pm block`, `/pm unblock`, and `/pm drop`.
- **Doubt is a block, not a delete.**
- **The board is public.** Nothing you write into `.pm/` or a commit may contain secrets, user data, or references to private repositories. That includes block reasons, delete reasons, and triage-close evidence.
- **Report honestly.** If you skipped a step, mocked something, or a suite was flaky, say so in `notes`. Do not present partial work as complete, and do not present a close-by-triage as work you did. The orchestrator checks your claim against `origin/main`.

## Routine runs

When the dispatch says you are a **routine worker**, there is no board item. You run the one command the dispatch quotes, as written, and nothing else. The command comes from a row in `.pm/<wN>/routine/README.md` and can be anything:

- **A slash command** (`/qa-find-bugs-cli w1 SHIP=1`, `/rt-dead-code-removal dashboard`, `/simplify`): invoke that skill with exactly those arguments and follow its `SKILL.md`, including any contract it tells you to read (proof standards, verify gates, budgets, STOPs, where its findings go). Where the skill is stricter than the rules below, the skill wins.
- **A shell command**: run it from the repository root, read its output, and act on what it reports within the command's evident purpose (fix what it flags, or surface it as follow-ups). Do not stretch it into unrelated work.
- **A task in plain words**: do that task, scoped as narrowly as it reads.

The triage and `/pm` sections above do not apply. Whatever the command is:

- Run the checks for every package you change (step 2's list) and ship each change through `/ship`. Never ship your own red ([Failing checks](#failing-checks)).
- Write the board only when the command itself does so through `/pm` (a QA skill filing its findings, for example). List the item ids it filed or extended in `notes`.
- Anything else that needs board work goes into `followups`: a STOP that needs a person, a finding outside the command's scope, a candidate too large for one run. The orchestrator files each one as an inbox note. Write each one so it stands alone: the problem, the evidence, the paths, and a testable end state. The board is public.
- `result: found` means the run shipped at least one commit (code, or board items filed or extended). `empty` means it ran and had nothing to ship. `failed` means the command could not run at all: missing credentials, a tool or service that is down, a skill that refuses to start. Say why in `notes`, and do not retry in a loop.
- Leave the tree clean and every shipped commit on `origin/main`. A half-done change goes into a named stash (`git stash push -u -m "loopx/routine/<name>"`), never into a ship.

Your final message is this block instead of LOOPX-RESULT, and nothing else:

```
LOOPX-ROUTINE
routine: <name>
result: found|empty|failed
commits: <short SHA, comma-separated; - if none>
followups:
- <one line per follow-up: problem, evidence, paths, testable end state; or - if none>
notes: <at most two lines: skipped candidates and why, flakes, stash name>
```

## CI fix runs

When the dispatch says you are a **CI-fix worker**, there is no board item either. A workflow on `main` went red on a commit this loop pushed, and the dispatch gives you the workflow, that commit, and the run URL. Your one job is to turn that workflow green again:

- Read the failure first: `gh run view <run id> --log-failed`, where the run id is the last part of the URL. Then reproduce it locally when the environment allows. Some jobs cannot be reproduced on this machine (another operating system, another Python version, a built artifact): work from the log.
- Fix the cause in the code or the test that is wrong. Never delete, skip, or weaken the failing check, and never revert someone else's commit to get to green.
- Run the checks for every package you change (step 2's list), then ship through `/ship`. Do not wait for CI: the orchestrator reads the result of your push and comes back if it is still red.
- If the cause is outside this repository (a runner outage, an expired secret, an upstream release), there is nothing to fix here. File one inbox note through `/pm add` in the dispatching workstream, with the run URL and what a person has to do, ship it, and report `outcome: blocked`.

End with the LOOPX-RESULT block, with `item: <the label from the dispatch, e.g. ci:ci-cli>` and `outcome: shipped` or `blocked`.

## Result block

Your final message is exactly this block and nothing else. Everything worth keeping is already in the commits and on the board:

```
LOOPX-RESULT
item: <wN>/<id>
outcome: shipped|closed|blocked|dropped
commits: <short SHA, comma-separated; - if none>
unblock: <the Unblock: condition and who can clear it; - unless blocked>
notes: <at most two lines: deviations, flakes, skipped steps, stash name, proposed DO_NOT_DO rule>
```
