---
name: pmx
description: Route one specific piece of work onto a named .pm workstream and drain that workstream in a single command — materialize the work through /pm (a loose inbox note when it is sub-hour, a milestone with the standing closing tasks when it is larger), ship that board addition, then run /loopx on the same workstream. Use only when the user explicitly invokes $pmx `<work> to <wN>` or asks to add specific work to a worker's queue and then work that queue. Do not use to only add or arrange board items (that is pm), to propose or brainstorm work (that is pm-brainstorm), to drain a workstream without adding anything (that is loopx), or for a single code change.
metadata: {"internal": true}
---

# Task: Route work onto a worker's queue, then drain it

Usage: `/pmx <work> to <wN>` — e.g. `/pmx make bea doctor print a fix hint for every failed check to w3`

`/pmx` is `/pm` → `/ship` → `/loopx <wN>` as one command: put the work on worker `<wN>`'s queue, ship the board addition by itself, then drain the whole queue. It adds no board conventions and no loop rules of its own. [`.agents/skills/pm/SKILL.md`](../pm/SKILL.md) stays the canonical board definition and [`.agents/skills/loopx/SKILL.md`](../loopx/SKILL.md) stays the canonical loop; read both when this file and your memory of them disagree. `/pm` remains the only writer to `.pm/`, so this skill never edits a board file by hand.

## 0. Parse the arguments

`$ARGUMENTS` must end in ` to <wN>` (an optional trailing `worker` is allowed: `to w3 worker`). The work is everything before the last ` to w<digits>`; the worker is that `wN`.

- No work text, or no trailing `wN`: **STOP** and ask. Never guess a worker, and never pick one by topic — workers are general-purpose queues.
- `.pm/<wN>/README.md` must exist. If it does not, **STOP** and report. Creating a workstream is a deliberate `/pm new workstream`, not a side effect of routing.
- The work may be a sentence or a pointer (a QA report, an issue, a path). Resolve a pointer into what it says, so the board entry stands on its own. The board is public: carry no secrets, user data, or private-repository references into it.

## 1. Preconditions (before anything is written)

1. `git branch --show-current` is `main`; if not, STOP and ask (same rule as `/ship`).
2. `git status` is clean. A tree dirty with work you did not do is surfaced and asked about, because the board addition ships alone in step 4.
3. Read `.pm/DO_NOT_DO.md`. If the work conflicts with a rule there, **STOP**, cite the rule, and write nothing. Routing is not a way around an anti-goal.

A refusal here leaves the tree untouched, so no half-routed state needs cleaning up.

## 2. Look for the work already on the board

Search `.pm/` for the work — its commands, paths, and distinctive nouns — across open items, `done/`, `blocked/`, and `## Dropped` tombstones in every workstream.

| Found | Do |
| --- | --- |
| Open in `<wN>` and covering the request | Add nothing. Name the covering item, skip to step 5, and say so in the report. |
| Open in another workstream, under `done/`, under `blocked/`, or dropped | **STOP** and report the path and its state or tombstone reason. Moving, reviving, or re-adding it is the user's decision, and a duplicate would only be triaged back out. |
| Nothing | Continue. |

## 3. Materialize it with `/pm`

The user's request is the scope; do not widen it. Apply `/pm`'s **sizing rule** and invoke the matching subcommand:

- **≤ ~1h:** `/pm add <wN> <idea>` — one inbox note. Write what is wrong or wanted, the observable end state, and the paths or commands that are known. Make the acceptance testable.
- **> ~1h and more than one task:** `/pm new milestone <wN> <title>` — tasks from `/pm`'s template, followed by the standing closing tasks it defines (Adoption surface when the work ships something a user or coding agent touches, then Simplify, Test coverage, Closeout). Fill `## Source + Goal linkage` with the source, the A1/A2/A3 pillar, the expected outcome, and why now.
- **Several independent deliverables:** one item for each, so every one can land as its own ship later.

Provenance records that the user routed the work, in the form existing board lines already use: the note ends with `Routed to <wN> by the user via /pmx, <YYYY-MM-DD>.`, and the milestone's workstream line ends `← user request via /pmx, <YYYY-MM-DD>; user routed to <wN>`. `/loopx` reads `user routed to` as an explicit user decision, so triage blocks the item with a question instead of deleting it on suspicion.

If you cannot write a testable acceptance criterion from the request, that is a question for the user — ask it once, before writing anything, rather than adding a vague item.

Before moving on, confirm that each new file sits at its expected path, that its number is the next free one, and that the workstream `README.md` links to it.

## 4. Ship the board addition

Run `python3 scripts/scan-secrets.py` and read the result before shipping; the board is public. Then invoke `/ship` for the `.pm/` addition alone: `chore(pm): add <wN>/<id> — <title>`.

It ships alone because `/loopx` expects a clean tree and ships exactly one outcome per commit. Left unshipped, the addition would ride along inside whichever item `/loopx` picks first.

If the scan reports anything, or `/ship` fails (a rebase conflict it cannot resolve, a rejected push), **STOP** and report; do not start `/loopx` on top of an unshipped board commit. A push failure would block every later ship anyway.

## 5. Drain with `/loopx <wN>`

Say in one line what was routed (the id and path) and the shipped SHA, then invoke `/loopx <wN>`. From here the whole contract is `/loopx`'s — arm the guard, triage before code, one `/ship` per outcome, keep going until its Exit. `/pmx` does not stop early, add checkpoints, or tell the user to resume.

Two consequences of composing literally, which the report should state plainly:

- `/loopx` drains the **whole** workstream, not just the item you added. It picks the lowest-numbered actionable milestone, then the lowest open inbox note, so older pending items in `<wN>` may run before the routed work.
- The routed item goes through triage like any other. It can come out shipped, closed as already done, blocked, or deleted, with evidence for the outcome.

## Final report

When `/loopx` reaches its Exit, give its report and put a routing header above it:

- what was routed — id, path, and why it is a note or a milestone;
- the board-addition SHA from step 4, or the covering item when step 2 added nothing;
- where the routed item ended — the shipped SHA, the close evidence, or the blocker and its **Unblock:** condition;
- everything else `/loopx` handled in the run, per its own report.

## Guardrails

- **Literal composition.** Nothing here overrides `/pm` or `/loopx`; if they change, follow them.
- **Never guess the worker.** No `wN` means ask.
- **Route, then drain.** No code changes before `/loopx`'s triage. The only change `/pmx` makes itself is the board addition.
- **One request, one board-addition ship.** Never fold it into an implementation commit.
- **`/pm` owns the board.** No hand edits to `.pm/`.
- **The board is public.** Nothing in a note, milestone, commit message, or report may contain secrets, user data, or references to private repositories.
- **No early exit.** Only `/loopx`'s Done, Blocked, or hard-stop exits end the run.

## Arguments

$ARGUMENTS
