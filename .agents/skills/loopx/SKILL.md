---
name: loopx
description: Autonomously drain a `.pm` workstream — each pending milestone or inbox note goes to a fresh-context worker that ships it, closes it, blocks it, or drops it; once drained, run the workstream's scheduled routines and listen for new items on origin/main (`--no-listen` exits instead). Use when the user explicitly invokes $loopx or asks to loop, drain, or work through a whole workstream's backlog (e.g. `$loopx w1`). Not for a single task or ordinary code edits.
metadata: {"internal": true}
---

# Task: Drain a `.pm` workstream, then listen for more

Usage: `/loopx <wN> [--no-listen]`

`/loopx <wN>` repeats one cycle until an exit: pick the next **actionable pending item** in workstream `<wN>`, hand it to a **worker** with a fresh context, verify the outcome it claims against `origin/main`, and continue. An item is a pending **milestone** (with all of its tasks) or an open **inbox note**. When nothing is actionable, the loop does not end. Next it runs any due [routine](#routines) from the workstream's schedule, returning to the board after each one. When no routine is due, it **listens**: a background process polls `origin/main` with exponential backoff, costs no model tokens, and wakes the loop when new items land or when the next routine is due. After 24 idle hours with no routine scheduled it stops. With `--no-listen`, drained means done. Before every pick it also checks whether one of its own pushes turned CI red, and fixes that first.

This session is the **orchestrator**. It owns the queue, the guard, the listener, and the verification. It does not read code or implement anything. Every item's triage, implementation, `/pm` moves, and `/ship` belong to the worker, whose full contract is [`worker.md`](worker.md). The split exists because each item needs its own context: a milestone's history is noise to the next one, and a session cannot clear itself. Fresh workers keep the orchestrator small, so it stays cheap even after a long idle wait has expired the prompt cache.

Parse the workstream and the optional `--no-listen` from `$ARGUMENTS` (e.g. `w1`, `w1 --no-listen`). If no workstream is given, **STOP** and ask which one to drain. Never guess.

## Preconditions (verify once, up front)

1. `git branch --show-current` is `main`. If not, STOP and ask (same rule as `/ship`).
2. `git status`: note pre-existing uncommitted changes. Workers ship from this checkout, so if the tree is dirty with work you didn't do, surface it and ask before starting.
3. The workstream `.pm/<wN>/README.md` exists. If not, STOP and report.
4. Read `.pm/DO_NOT_DO.md` once, so you recognize an item that conflicts with it when you pick it.
5. Arm the loop guard: `python3 scripts/loopx-guard.py start <wN>` (append `--no-listen` when given). In Claude Code it is a `Stop` hook bound to this session. It refuses to let the turn end while `<wN>` has a ready item, unless a dispatched worker is still running; and when nothing is ready, unless a listener is running or `--no-listen` was given. Other sessions in the checkout are never held to your loop, `start` warns if another session already loops on `<wN>`, and the mark is dropped when your session ends. Codex has no `Stop` hook: there `start` says nothing was armed, and the exit rules below are the only enforcement.

## The loop

### 1. Pick the next step

Run:

```
python3 scripts/loopx-guard.py board <wN>
```

It prints the facts for this pick as JSON, read from the working tree. Do not read the workstream `README.md` or list its directories yourself: that costs thousands of tokens per pick and adds nothing.

- `ci.own_failures`: workflows on `main` that one of this loop's pushes turned red. See [Own CI failures](#own-ci-failures). `ci.checked: false` means CI was not read (nothing pushed yet, or no working `gh`); carry its `reason` into your next report.
- `ready`: actionable items in pick order: milestones first, lowest number first, then inbox notes. A milestone is ready when one of its open tasks has every written `depends_on` done.
- `waiting`: milestones whose tasks all wait on unfinished work, with what each waits on. They need nothing from you. They become ready by themselves once that work is done, and the listener wakes for it.
- `blocked.review`: blocked items whose files changed since they were last listed, which is every blocked item on the first call of a run. Read just the **Unblock:** condition of each and check it against the repository. If it holds, dispatch that item and tell its worker to start with `/pm unblock`. Blocked items that are not listed are unchanged: do not reread them.
- `routine`: the routine that is due, if any.
- `next`: the default next step in the standing order: an own CI failure, then the first ready item, then the due routine, otherwise nothing.

Follow `next` unless you can state a reason not to, such as pulling a note forward because a milestone depends on it, or a blocked item under review whose condition now holds. Announce what you picked. A ready item that you believe cannot proceed, for a reason no `depends_on` records, still goes to a worker: its triage blocks it with the condition written down, which is the only way it leaves the open tree.

If `next` is a routine, go to **Routines**. If it is empty, go to **Listen**.

### 2. Dispatch it to a worker

One worker at a time, strictly in sequence. Every worker ships to `main` from this checkout, so two at once would race on the tree and the rebase.

- **Claude Code:** use the Agent tool with `subagent_type: "general-purpose"` and no `model`, so the worker runs on the session's model. The prompt is short, because everything else is on disk:

  > You are a `/loopx` worker for `<wN>/<id>` in this repository. Read `.agents/skills/loopx/worker.md` and follow it exactly for this one item. <Add only what the pick step learned, e.g. "its unblock condition holds: start with `/pm unblock`".> End with the LOOPX-RESULT block.

  Run `python3 scripts/loopx-guard.py dispatch <wN>/<id>` **first**, then launch the worker, then end the turn. The worker runs in the background. The mark tells the Stop hook that this loop is waiting, so idle turns are not handed straight back, and it is how the hook knows not to ask for a second worker. Let the worker's completion notification wake you: do not poll or sleep, and do nothing else until the result arrives. If the launch itself fails, run `python3 scripts/loopx-guard.py settle`.

  A notification with no result block, in which the worker says it is waiting on its own background work, is not a result. End the turn again and keep waiting. Do not send a follow-up, and do not settle.
- **Codex, or any agent without a subagent tool:** run [`worker.md`](worker.md) inline for this one item, then continue from step 3. Context then accumulates in this session; the loop rules are unchanged.

### 3. Verify the outcome

A worker's summary is a claim, not evidence. Check it, passing every commit the worker listed:

```
python3 scripts/loopx-guard.py outcome <wN> <id> <sha>...
```

It fetches and prints JSON:
- `where`: where the item sits on `origin/main` (`open`, `done`, `blocked`, or `absent`).
- `missing_commits`: listed commits that are not on `origin/main`.
- `pushed`: nothing in this checkout is unpushed. Another loop pushing in the meantime does not make this false.
- `clean`: the working tree has no leftovers.
- `ok`: all of the above hold and the item is no longer open.

The outcome is verified when `ok` is true and `where` matches the claim:

- `shipped` or `closed` → `where: done`
- `blocked` → `where: blocked`
- `dropped` → `where: absent`

A verified outcome clears the in-flight mark (`settled: true`) and remembers the commits for the CI check. If `fetched` is false the network failed: run it again before judging the worker.

If the check fails, or the result block is missing, send the **same** worker one follow-up (SendMessage in Claude Code) that states exactly what does not match, and verify again. If it still fails, stop trusting the worker. Keep any leftover changes in a named stash (`git stash push -u -m "loopx/<wN>/<id>"`). Block the item yourself with `/pm block <target> worker did not reach a verified outcome: <what is wrong>; Unblock: <the concrete fix>`. Ship that move alone with `/ship`, then run `python3 scripts/loopx-guard.py settle`. If the item ended up shipped but red or half-done, record the commits in the block reason; do not revert them yourself.

Record one line per item: id, verified outcome, SHAs, and for blocks the unblock condition. That run-local list is all the orchestrator keeps. Do not paste worker reports into the conversation.

### 4. Continue

Return to step 1 **immediately**. Do not end the turn, ask the user to resume, or wait for another `/loopx` invocation while step 1 would still find an actionable item. A long queue, a long session, or several items already shipped are not reasons to stop.

Between items, write one sentence: what was verified and the id you are picking next.

When an item is blocked, keep going. Milestones that depend on it show up under `waiting`, not `ready`, so the next `board` call already skips them: if `m2` is blocked and `m3` depends on it but `m4` is independent, `next` is `m4`. Revisit a blocked item only when `blocked.review` lists it.

## Own CI failures

`/ship` ends at the push, so nothing else reads CI. The guard records the commits of every verified worker and asks `gh` about them, on each `board` call and on each poll while listening. It reports a workflow only when the first failing run of its current red streak is on one of this loop's commits. Red that began on someone else's commit is not this loop's to chase: see "Failing checks" in the root `AGENTS.md`.

CI takes ten minutes to an hour, and the loop never waits for it. A failure therefore surfaces one or two items after the push that caused it. When `board` lists one, it comes before any board item:

1. `dispatch <label>` with the entry's `label` (for example `ci:ci-cli`), then launch a worker with this prompt:

   > You are a `/loopx` CI-fix worker in this repository. Workflow `<workflow>` on `main` has been red since `<since>`, a commit this loop pushed: <url>. Read the "CI fix runs" section of `.agents/skills/loopx/worker.md` and follow it. End with the LOOPX-RESULT block.

2. Verify with `outcome <wN> <label> <sha>...`. The fix's commits are remembered like any other push, so the next `board` reports the workflow again, with `attempt: 2`, if the fix did not turn it green.
3. After a second failed attempt, stop dispatching fixes for that workflow. File one inbox note with `/pm add <wN> …` that names the workflow, the run URL, and both attempts, ship it, and carry on. `ci.still_red` keeps listing the workflow until a run passes.

Without `gh`, or when it is not signed in, `ci.checked` is `false` and the loop runs without the CI check. Say so in the drained report instead of implying CI is green.

## Routines

When step 1 finds nothing actionable, run any due routine **before** listening. With `--no-listen`, skip this section and go to **Exit**: no routines run in that mode.

A workstream can list routines in `.pm/<wN>/routine/README.md` (format in [`.agents/skills/pm/SKILL.md`](../pm/SKILL.md#routine-list-wnroutinereadmemd)). Each row has a `name`, the **command** to run, an interval, and optionally `when` and `paths`. The command can be anything a worker can carry out: a slash command with its arguments (`/qa-find-bugs-cli w1 SHIP=1`, `/rt-dead-code-removal dashboard`, `/simplify`), a shell command, or a task in plain words. Neither the guard nor the orchestrator interprets it; the row carries every argument the command needs.
- `always` (the default): runs on its schedule, every interval, whatever changed.
- `changed`: an opt-in token saver. The row also waits for one of its `paths` (any path when it lists none) to change since its last run, and its interval doubles after a run that ships nothing.

The guard decides which routine is due, not the model: `board` names it in `routine.due`, from the list on `origin/main`. A row is due when all of these hold:
- its interval has passed;
- for `when: changed` rows, its `paths` have commits since its last run;
- the day's routine budget is not spent (default 4 runs per rolling 24 h; a `Budget: N runs/day` line in the list overrides it).

Run state (last run, last SHA, current interval) lives in `.git/loopx/`, never on the public board.

**Board work always comes first.** A routine never starts while a board item is actionable. After every routine, the loop returns to step 1 before considering the next routine. A routine already running is not interrupted, because it may be mid-ship, but anything that arrived meanwhile is picked as soon as it finishes.

To run one:

1. Run it only when `board` just returned it as `next`. That is the proof that no own CI failure and no ready item comes first.
2. `dispatch routine:<name>`, then launch a fresh worker the same way as for an item (step 2), with this prompt, quoting the row's command verbatim:

   > You are a `/loopx` routine worker for routine `<name>` in workstream `<wN>` of this repository. Read the "Routine runs" section of `.agents/skills/loopx/worker.md` and run this command under it: `<command>`. End with the LOOPX-ROUTINE block.

   A command that files board items itself (through `/pm`, as the QA skills do with `<wN> SHIP=1`) lands its findings in the workstream it names, and the next pick works them like any other item.

3. Verify with `python3 scripts/loopx-guard.py outcome <wN> routine:<name> <sha>...`, passing the commits it listed. If `ok` is false, send the same worker one follow-up. If the second check also fails, keep leftovers in a named stash (`loopx/<wN>/routine-<name>`) and record the run as `failed`, with the fault noted in your run log. A routine is not a board item, so there is nothing to block.
4. Record the run: `python3 scripts/loopx-guard.py routine-done <wN> <name> found|empty|failed`. Use `found` when the run shipped at least one commit (code, or board items it filed or extended), `empty` when it ran and had nothing to ship, and `failed` when the command could not run at all (missing credentials, a tool or service that is down) or its result could not be verified. A `changed` row's interval doubles after an empty run (up to 14 days) and resets after a found run. An `always` row keeps its fixed interval. A failed run changes neither, but after three in a row the guard drops the row to one try a day until a run succeeds, and tells you to file one inbox note about it (`/pm add <wN> …`, then ship it).
5. If the worker reported `followups` (work the command surfaced but did not file or fix itself: a STOP that needs a person, a finding outside the command's scope, a candidate too large for one run), file each as an inbox note with `/pm add <wN> …`, then ship those additions as one board commit (`chore(pm): add <wN>/<ids> — follow-ups from routine <name>`). They become board work, and board work comes first on the next pick.
6. Write one line (routine name, result, SHAs, follow-ups filed), then `git pull --rebase` and go back to **step 1**, not to the next routine. Recording the run already cleared the in-flight mark. Items that arrived while the routine ran, including anything the routine just filed, are picked before any further routine.


## Listen

When the board is drained and no routine is due:

1. Write the **drained report**: every item and routine this run handled with its verified outcome (SHAs, close evidence, blockers with their unblock conditions and owners, deletion reasons, proposed `DO_NOT_DO.md` rules), and what is still blocked. The user reads this one while the loop idles, so it is the full report, not a teaser. If nothing happened since the last drained report, one line is enough.
2. Confirm `git status` is clean and nothing is unpushed. A dirty tree or unpushed commit here is a fault: resolve it the way step 3 does before listening.
3. Start the listener: `python3 scripts/loopx-guard.py wait <wN>`. It fetches `origin/main` every 2 minutes at first, doubling up to 30 minutes with jitter. Each poll checks this loop's own pushes on CI, then the board, then the routine schedule. It never sleeps past the next routine's due time, so a routine runs on schedule even while the board poll is backed off, and it polls at least every five minutes while one of this loop's pushes is still running CI. Its 24-hour idle window, measured on the wall clock, applies only when no routine is scheduled. A network outage does not end it: it keeps backing off, and gives up only after fetch has failed for two hours straight.
   - **Claude Code:** run it as a background command (`run_in_background`), then end the turn. The Stop hook lets the turn end because the listener is alive, and the harness wakes this session when the command exits. Waiting costs nothing.
   - **Codex:** run it in the foreground with `--chunk 600` and call it again each time it exits `10`.
4. When it exits:
   - `0`: new board work on `origin/main`. `git pull --rebase`, then go to step 1.
   - `5`: a routine is due. `git pull --rebase`, then go to step 1. Board work still comes first; if the board is drained, step 1 leads to **Routines**.
   - `6`: one of this loop's pushes turned CI red. `git pull --rebase`, then go to step 1: `board` lists it first.
   - `3`: idle for 24 hours with no routine scheduled. Go to **Exit** (Done).
   - `4`: `git fetch` failed for two hours straight. Go to **Exit** (hard stop) and report the fetch failure.
   - `10`: the Codex chunk elapsed. Run it again.
   - `11`: a listener is already running for this workstream. Do not start another: end the turn, and that one wakes you.

Listening also covers a workstream whose remaining items are all blocked or waiting. When the owner clears a blocker (`/unblock` moves it back through `/pm unblock`), the item reappears as a pending item on `origin/main` and wakes the loop. A waiting milestone wakes it as soon as the work it depends on is done, in whichever workstream that work lives.

## Exit

Stop the loop and give a final summary **only** when one of these holds:

- **Done:** nothing actionable remains in `<wN>`, and either `--no-listen` was given or the listener's 24-hour idle window ran out with no due routine. Report what happened since the last drained report, or the full per-item report if there was none.
- **Blocked (`--no-listen` only):** pending items remain, but every one is blocked or depends directly or transitively on unresolved blocked work. Report items shipped this run (with HEAD SHAs), each blocker and what is needed to proceed, deferred dependents, and where partial work was preserved. Without `--no-listen`, this state listens instead.
- **Hard stop only:** the user explicitly interrupts, or the runtime forces a stop (session or tool limit, killed process, a listener that exited `4`, lost push access that blocks every remaining ship). Report progress (verified, in-flight, blocked, **next actionable pick**) so a later `/loopx <wN>` can resume. **Never** choose this exit yourself while step 1 still has a known next item.

**Not an exit:** "checkpoint", "budget", "long enough", "several items shipped already", "the queue is empty for now" (that is **Listen**), or "resume with `/loopx <wN>` to pick up at NNN" while actionable items remain. If you can name the next pick, dispatch it and continue.

When one of the three exits genuinely holds, clear the guard with `python3 scripts/loopx-guard.py end`, then give the final report. Until you run that, the `Stop` hook keeps handing the turn back with the next pick, or with the instruction to start the listener. That is the intended behaviour, not a fault to work around. Never clear it to end a run that has an actionable item left. (The guard clears itself when the listener gives up after 24 hours.)

## Guardrails

- **Keep going when the next item is known.** Knowing which note or milestone is next is a reason to dispatch it now, not to stop and tell the user to re-invoke `/loopx`.
- **Orchestrate, don't implement.** The orchestrator picks, dispatches, verifies, records, and listens. Item bodies, code, triage evidence, `/pm` moves, and ships are the worker's. The exceptions are the fallback block in step 3 and Codex's inline run.
- **Verify, don't trust.** An outcome counts only after `outcome` confirms it on `origin/main`.
- **Facts come from the guard.** `board` says what is ready, waiting, changed, due, and red. Do not re-derive them by reading the board yourself, and do not second-guess `waiting`.
- **Own red first, others' red never.** A workflow this loop's push turned red is fixed before any board item. Red that someone else caused is not this loop's work.
- **Board, then routines, then listening.** Never run a routine while a board item is actionable, return to step 1 after every routine, and never run a routine that `board` did not return as `next`. Routines spend tokens on purpose; their interval and the daily budget (plus `when: changed` where opted in) are what bound that spending.
- **Mark the wait, and launch once.** `dispatch` before launching any worker, and never launch a second worker for a label that is already in flight. A verified `outcome` or a recorded routine run clears the mark; `settle` is for the fallback block and for a launch that failed.
- **Every item ends somewhere.** Shipped, `done/`, `blocked/`, or deleted. An item left open and untouched because it looked hard is not an outcome: it is a block, and it needs a written unblock condition.
- **One worker, one item, one board outcome per ship.** Never run two workers at once, and never let one worker take two items.
- **`/pm` owns the board.** All `.pm/` writes go through `/pm`, whether a worker or the orchestrator's fallback block makes them.
- **The board is public.** Nothing written into `.pm/`, a commit, or a dispatch prompt may contain secrets, user data, or references to private repositories.
- **Stay in `<wN>`.** Only pick items from the requested workstream.
- **Report honestly.** Relay what workers flagged (skipped steps, mocks, flakes) in the drained and final reports. Do not present a close-by-triage as implemented work, or a fallback block as the worker's.

## Arguments

$ARGUMENTS
