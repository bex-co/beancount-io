---
name: loopx
description: Autonomously drain a `.pm` workstream item by item, then keep listening for new work — the session orchestrates while each pending milestone or inbox note goes to a fresh-context worker that triages it and implements and ships it, closes it as already done, blocks it with an unblock condition, or deletes it as invalid; once drained, it runs the workstream's routines (`.pm/<wN>/routine/README.md`) on their schedule, always yielding to new board items, and otherwise a zero-token background `git fetch` listener (up to 24 h, `--no-listen` to exit instead) wakes the loop when new items land on origin/main. Do not stop early to ask the user to resume. Use when the user explicitly invokes $loopx or asks to loop, drain, or work through a whole workstream's backlog (e.g. `$loopx w1`). Not for a single task, ordinary code edits, or a generic timed poll of something other than a `.pm` workstream.
metadata: {"internal": true}
---

# Task: Drain a `.pm` workstream, then listen for more

Usage: `/loopx <wN> [--no-listen]`

`/loopx <wN>` repeats one cycle until an exit: pick the next **actionable pending item** in workstream `<wN>`, hand it to a **worker** with a fresh context, verify the outcome it claims against `origin/main`, and continue. An item is a pending **milestone** (with all of its tasks) or an open **inbox note**. When nothing is actionable, the loop does not end. Next it runs any due [routine](#routines) from the workstream's schedule, returning to the board after each one. When no routine is due, it **listens**: a background process polls `origin/main` with exponential backoff, costs no model tokens, and wakes the loop when new items land or when the next routine is due. After 24 idle hours with no routine scheduled it stops. With `--no-listen`, drained means done.

This session is the **orchestrator**. It owns the queue, the guard, the listener, and the verification. It does not read code or implement anything. Every item's triage, implementation, `/pm` moves, and `/ship` belong to the worker, whose full contract is [`worker.md`](worker.md). The split exists because each item needs its own context: a milestone's history is noise to the next one, and a session cannot clear itself. Fresh workers keep the orchestrator small, so it stays cheap even after a long idle wait has expired the prompt cache.

Parse the workstream and the optional `--no-listen` from `$ARGUMENTS` (e.g. `w1`, `w1 --no-listen`). If no workstream is given, **STOP** and ask which one to drain. Never guess.

## Preconditions (verify once, up front)

1. `git branch --show-current` is `main`. If not, STOP and ask (same rule as `/ship`).
2. `git status`: note pre-existing uncommitted changes. Workers ship from this checkout, so if the tree is dirty with work you didn't do, surface it and ask before starting.
3. The workstream `.pm/<wN>/README.md` exists. If not, STOP and report.
4. Read `.pm/DO_NOT_DO.md` once, so you recognize an item that conflicts with it when you pick it.
5. Arm the loop guard: `python3 scripts/loopx-guard.py start <wN>` (append `--no-listen` when given). In Claude Code it is a `Stop` hook that refuses to let this session's turn end while `<wN>` still holds an actionable item, and names the next pick. When the queue is drained it also refuses to let the turn end unless a background `wait` is running (unless `--no-listen`). It binds to the session that ran `start`: other sessions in the same checkout are never held to your loop (`start` warns if another session already loops on `<wN>`), and the mark is dropped when your session ends. Codex has no `Stop` hook, so there `start` reports that nothing was armed and the exit rules below are the only enforcement.

## The loop

### 1. Pick the next pending item

Read `.pm/<wN>/README.md` and list the tree: `.pm/<wN>/m*/`, `.pm/<wN>/*.md`, `.pm/<wN>/done/`, `.pm/<wN>/blocked/`. Read only what picking needs: the item list, each milestone's status line and `depends_on` links. Leave the item bodies to the worker.

Pick in this order, and announce what you picked:

1. **The lowest-numbered actionable pending milestone.** It is unchecked (`- [ ] **mN**`), has a live directory (`.pm/<wN>/mN/`, not under `done/` or `blocked/`), and was not deferred or blocked earlier this run.
2. **The lowest-numbered open inbox note** (`.pm/<wN>/NNN.md`), when no milestone is actionable. Notes are sub-hour units: a bug fix, a doc correction, a decision to record. Pull one forward out of order when a milestone depends on it.
3. **A blocked item whose unblock condition now holds** (`.pm/<wN>/blocked/`). Read just its **Unblock:** condition and check it against the repository. If it holds, the worker's first step is `/pm unblock`; say so in the dispatch. Do not retry an unchanged blocker.

Honor explicit `depends_on` links and prerequisites stated in scope or acceptance criteria, including transitive ones, before deciding none can proceed. Numbering alone does not imply a dependency. Scan every later pending item before concluding the workstream is drained.

If nothing is actionable, go to **Routines**, then **Listen**.

### 2. Dispatch it to a worker

One worker at a time, strictly in sequence. Every worker ships to `main` from this checkout, so two at once would race on the tree and the rebase.

- **Claude Code:** use the Agent tool with `subagent_type: "general-purpose"` and no `model`, so the worker runs on the session's model. The prompt is short, because everything else is on disk:

  > You are a `/loopx` worker for `<wN>/<id>` in this repository. Read `.agents/skills/loopx/worker.md` and follow it exactly for this one item. <Add only what the pick step learned, e.g. "its unblock condition holds: start with `/pm unblock`".> End with the LOOPX-RESULT block.

  Right after launching it, run `python3 scripts/loopx-guard.py dispatch <wN>/<id>`. The worker runs in the background, and without this mark the Stop hook would hand every idle turn straight back while you wait. With it, end the turn and let the worker's completion notification wake you; do not poll or sleep. Do nothing else until the result arrives.
- **Codex, or any agent without a subagent tool:** run [`worker.md`](worker.md) inline for this one item, then continue from step 3. Context then accumulates in this session, which is the old single-session behaviour; the loop rules are unchanged.

### 3. Verify the outcome

A worker's summary is a claim, not evidence. Check it:

```
python3 scripts/loopx-guard.py outcome <wN> <id>
```

It fetches and prints where the item sits on `origin/main` (`open`, `done`, `blocked`, or `absent`), whether this checkout's `HEAD` equals `origin/main` (`pushed`), and whether the tree is `clean`. A verified outcome satisfies all of the following:

- `shipped` or `closed` → `where: done`
- `blocked` → `where: blocked`
- `dropped` → `where: absent`
- `pushed: true`, `clean: true`, and every SHA the worker listed is in `git log origin/main`

If the check fails, or the result block is missing, send the **same** worker one follow-up (SendMessage in Claude Code) that states exactly what does not match, and verify again. If it still fails, stop trusting the worker. Keep any leftover changes in a named stash (`git stash push -u -m "loopx/<wN>/<id>"`). Block the item yourself with `/pm block <target> worker did not reach a verified outcome: <what is wrong>; Unblock: <the concrete fix>`. Ship that move alone with `/ship`. If the item ended up shipped but red or half-done, record the commits in the block reason; do not revert them yourself.

Once the outcome is verified (or the fallback block has shipped), run `python3 scripts/loopx-guard.py settle`. Settle only then: while a follow-up is pending, the worker is still in flight.

Record one line per item: id, verified outcome, SHAs, and for blocks the unblock condition. That run-local list is all the orchestrator keeps. Do not paste worker reports into the conversation.

### 4. Continue

Return to step 1 **immediately**. Do not end the turn, ask the user to resume, or wait for another `/loopx` invocation while step 1 would still find an actionable item. A long queue, a long session, or several items already shipped are not reasons to stop.

Between items, write one sentence: what was verified and the id you are picking next.

When an item is blocked, skip it and its dependents and keep going. If `m2` is blocked and `m3` depends on it but `m4` is independent, skip `m2` and `m3` and dispatch `m4`. Revisit a blocked item only when new evidence changes its condition.

## Routines

When step 1 finds nothing actionable, run any due routine **before** listening. With `--no-listen`, skip this section and go to **Exit**: no routines run in that mode.

A workstream can list routines in `.pm/<wN>/routine/README.md` (format in [`.agents/skills/pm/SKILL.md`](../pm/SKILL.md#routine-list-wnroutinereadmemd)). Each row has a `name`, the **command** to run, an interval, and optionally `when` and `paths`. The command can be anything a worker can carry out: a slash command with its arguments (`/qa-find-bugs-cli w1 SHIP=1`, `/routine-dead-code-removal dashboard`, `/simplify`), a shell command, or a task in plain words. Neither the guard nor the orchestrator interprets it; the row carries every argument the command needs.
- `always` (the default): runs on its schedule, every interval, whatever changed.
- `changed`: an opt-in token saver. The row also waits for one of its `paths` (any path when it lists none) to change since its last run, and its interval doubles after a run that ships nothing.

The guard decides which routine is due, not the model:

```
python3 scripts/loopx-guard.py routine-due <wN>
```

It reads the list from `origin/main` and returns the first row that meets all of these conditions:
- its interval has passed;
- for `when: changed` rows, its `paths` have commits since its last run;
- the day's routine budget is not spent (default 4 runs per rolling 24 h; a `Budget: N runs/day` line in the list overrides it).

Run state (last run, last SHA, current interval) lives in `.git/loopx/`, never on the public board. If nothing is due, go to **Listen**.

**Board work always comes first.** A routine never starts while a board item is actionable. After every routine, the loop returns to step 1 before considering the next routine. A routine already running is not interrupted, because it may be mid-ship, but anything that arrived meanwhile is picked as soon as it finishes.

To run one:

1. Confirm the board is still drained: `git pull --rebase`, then step 1. If an item is actionable, it goes first, and this routine waits for the next pass.
2. Dispatch a fresh worker the same way as an item (step 2, including `dispatch routine:<name>`), with this prompt, quoting the row's command verbatim:

   > You are a `/loopx` routine worker for routine `<name>` in workstream `<wN>` of this repository. Read the "Routine runs" section of `.agents/skills/loopx/worker.md` and run this command under it: `<command>`. End with the LOOPX-ROUTINE block.

   A command that files board items itself (through `/pm`, as the QA skills do with `<wN> SHIP=1`) lands its findings in the workstream it names, and the next pick works them like any other item.

3. Verify: every SHA it lists is in `git log origin/main`, `HEAD` equals `origin/main`, and the tree is clean. If any check fails, send the same worker one follow-up. If the second check also fails, keep leftovers in a named stash (`loopx/<wN>/routine-<name>`) and record the run as `empty`, with the fault noted in your run log. A routine is not a board item, so there is nothing to block.
4. Record the run: `python3 scripts/loopx-guard.py routine-done <wN> <name> found|empty`. Use `found` when the run shipped at least one commit (code, or board items it filed or extended), and `empty` otherwise. A `changed` row's interval doubles after an empty run (up to 14 days) and resets after a found run. An `always` row keeps its fixed interval.
5. If the worker reported `followups` (work the command surfaced but did not file or fix itself: a STOP that needs a person, a finding outside the command's scope, a candidate too large for one run), file each as an inbox note with `/pm add <wN> …`, then ship those additions as one board commit (`chore(pm): add <wN>/<ids> — follow-ups from routine <name>`). They become board work, and board work comes first on the next pick.
6. `settle`, write one line (routine name, found or empty, SHAs, follow-ups filed), then `git pull --rebase` and go back to **step 1**, not to the next routine. Items that arrived while the routine ran, including anything the routine just filed, are picked before any further routine.


## Listen

When the board is drained and no routine is due:

1. Write the **drained report**: every item and routine this run handled with its verified outcome (SHAs, close evidence, blockers with their unblock conditions and owners, deletion reasons, proposed `DO_NOT_DO.md` rules), and what is still blocked. The user reads this one while the loop idles, so it is the full report, not a teaser. If nothing happened since the last drained report, one line is enough.
2. Confirm `git status` is clean and `HEAD` matches `origin/main`. A dirty tree or unpushed commit here is a fault: resolve it the way step 3 does before listening.
3. Start the listener: `python3 scripts/loopx-guard.py wait <wN>`. It fetches `origin/main` every 2 minutes at first, doubling up to 30 minutes with jitter. Each poll checks the board first, then the routine schedule. It never sleeps past the next routine's due time, so a routine runs on schedule even while the board poll is backed off. Its 24-hour idle window, measured on the wall clock, applies only when no routine is scheduled.
   - **Claude Code:** run it as a background command (`run_in_background`), then end the turn. The Stop hook lets the turn end because the listener is alive, and the harness wakes this session when the command exits. Waiting costs nothing.
   - **Codex:** run it in the foreground with `--chunk 600` and call it again each time it exits `10`.
4. When it exits:
   - `0`: new board work on `origin/main`. `git pull --rebase`, then go to step 1.
   - `5`: a routine is due. `git pull --rebase`, then go to step 1. Board work still comes first; if the board is drained, step 1 leads to **Routines**.
   - `3`: idle for 24 hours with no routine scheduled. Go to **Exit** (Done).
   - `4`: `git fetch` kept failing. Go to **Exit** (hard stop) and report the fetch failure.
   - `10`: the Codex chunk elapsed. Run it again.

Listening also covers a workstream whose remaining items are all blocked. When the owner clears a blocker (`/unblock` moves it back through `/pm unblock`), the item reappears as a pending item on `origin/main` and wakes the loop.

## Exit

Stop the loop and give a final summary **only** when one of these holds:

- **Done:** nothing actionable remains in `<wN>`, and either `--no-listen` was given or the listener's 24-hour idle window ran out with no due routine. Report what happened since the last drained report, or the full per-item report if there was none.
- **Blocked (`--no-listen` only):** pending items remain, but every one is blocked or depends directly or transitively on unresolved blocked work. Report items shipped this run (with HEAD SHAs), each blocker and what is needed to proceed, deferred dependents, and where partial work was preserved. Without `--no-listen`, this state listens instead.
- **Hard stop only:** the user explicitly interrupts, or the runtime forces a stop (session or tool limit, killed process, a listener that exited `4`, lost push access that blocks every remaining ship). Report progress (verified, in-flight, blocked, **next actionable pick**) so a later `/loopx <wN>` can resume. **Never** choose this exit yourself while step 1 still has a known next item.

**Not an exit:** "checkpoint", "budget", "long enough", "several items shipped already", "the queue is empty for now" (that is **Listen**), or "resume with `/loopx <wN>` to pick up at NNN" while actionable items remain. If you can name the next pick, dispatch it and continue.

When one of the three exits genuinely holds, clear the guard with `python3 scripts/loopx-guard.py end`, then give the final report. Until you run that, the `Stop` hook keeps handing the turn back with the next pick, or with the instruction to start the listener. That is the intended behaviour, not a fault to work around. Never clear it to end a run that has an actionable item left. (The guard clears itself when the listener gives up after 24 hours.)

## Guardrails

- **Keep going when the next item is known.** Knowing that `226` (or any later note or milestone) is next is a reason to dispatch it now, not to stop and tell the user to re-invoke `/loopx`.
- **Orchestrate, don't implement.** The orchestrator picks, dispatches, verifies, records, and listens. Item bodies, code, triage evidence, `/pm` moves, and ships are the worker's. The exceptions are the fallback block in step 3 and Codex's inline run.
- **Verify, don't trust.** An outcome counts only after `outcome` confirms it on `origin/main`.
- **Board, then routines, then listening.** Never run a routine while a board item is actionable, return to step 1 after every routine, and never run a routine that `routine-due` did not return. Routines spend tokens on purpose; their interval and the daily budget (plus `when: changed` where opted in) are what bound that spending.
- **Mark the wait.** `dispatch` before waiting on any worker, and `settle` after verifying it. Never leave a dispatch mark on a loop that is not waiting.
- **Every item ends somewhere.** Shipped, `done/`, `blocked/`, or deleted. An item left open and untouched because it looked hard is not an outcome: it is a block, and it needs a written unblock condition.
- **One worker, one item, one board outcome per ship.** Never run two workers at once, and never let one worker take two items.
- **`/pm` owns the board.** All `.pm/` writes go through `/pm`, whether a worker or the orchestrator's fallback block makes them.
- **The board is public.** Nothing written into `.pm/`, a commit, or a dispatch prompt may contain secrets, user data, or references to private repositories.
- **Stay in `<wN>`.** Only pick items from the requested workstream.
- **Report honestly.** Relay what workers flagged (skipped steps, mocks, flakes) in the drained and final reports. Do not present a close-by-triage as implemented work, or a fallback block as the worker's.

## Arguments

$ARGUMENTS
