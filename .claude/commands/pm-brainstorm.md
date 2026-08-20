---
description: Propose .pm adoption milestones and tasks for a topic — decompose, size, and hand orchestration to /pm
argument-hint: "<topic or goal to break down>"
allowed-tools: Read, Bash(ls:*), Bash(find:*), Bash(cat:*), Bash(git fetch:*), Bash(git pull:*), Bash(git status:*)
---

# Task: Propose milestones and tasks

`/pm-brainstorm` is the **divergent** half of the pair: it thinks a topic through with a TPM's eye for adoption, **proposes** work, and hands orchestration and materialization to `/pm`. It writes **nothing** — the output is a text proposal. `$ARGUMENTS` is the topic/goal.

The board conventions — mission and pillars, hierarchy, sizing rule, milestone quality gate, standing closing tasks, templates — live **canonically** in [`.claude/commands/pm.md`](pm.md). Read that file and apply its rules; do not restate or diverge from them here.

## Steps

1. **Load the canon and the anti-goals.** Read `.claude/commands/pm.md` (conventions, mission pillars A1/A2/A3) and `.pm/DO_NOT_DO.md` (hard constraint). If a proposed item conflicts with an anti-goal, reject it explicitly and explain why.
2. **Sync with remote main.** Before analyzing anything, run `git fetch origin main` then `git status` to check whether the local branch is behind. If it is and the working tree is clean, `git pull` (fast-forward) so the `.pm` board state you read next reflects the latest remote. If the working tree is dirty or the branch has diverged, report this to the user and ask how to proceed rather than pulling over local work.
3. **Load context.** Read the relevant `.pm` board state (workstream `README.md`s, open milestones, inbox notes — `find .pm -name README.md`, plus loose notes) so proposals fit the existing roadmap and reuse its numbering/naming. Pick the workstream the topic belongs to (or propose a new `wN`). Also check `wN/done/` and any nested `done/` folders (`find .pm -type d -name done`) for milestones that already shipped the same capability — read their titles/READMEs before proposing, and drop or reshape any candidate that duplicates completed work instead of proposing it fresh. For any topic touching an agent or user surface, the shipped ground truth is the repo itself: the root `README.md` and `CLAUDE.md` package tables, the owning package's `README.md`/`CLAUDE.md`, and the `skills/CLAUDE.md` skills table. Read those before proposing — build on what exists rather than re-deriving or duplicating it.
4. **Apply the TPM adoption lens.** For each candidate, answer before proposing it:
   - **Pillar:** which of A1/A2/A3 it advances (a candidate that fits none is out — or `.pm/DO_NOT_DO.md` material).
   - **Adopter:** who concretely adopts the result — a human open-source user, a coding agent, or a developer building on beancount.
   - **Friction removed:** what the adopter can do afterward that they couldn't (or wouldn't bother to) before.
   - **Signal:** which observable signal should move — installs, stars, skill invocations, time-to-first-ledger, contributors, issue quality.
   Prefer compounding assets (docs, skills, examples, install paths that every future adopter benefits from) over one-off promotion. Prefer removing an onboarding cliff over adding a power feature.
5. **Discuss & decompose.** Talk the topic through with the user: pressure-test scope, surface dependencies and risks, and break it into candidate tasks, each with a rough estimate and `depends_on` links.
6. **Size and gate** each cluster of work using `/pm`'s sizing rule and milestone quality gate. Undersized work → propose an inbox note instead of a milestone, and say so. Work that fails the quality gate → mark it **not meaningful**, do not propose it as a milestone, and suggest a better-scoped alternative.
7. **Emit the proposal as text only.** Give the full detail first: the target workstream, each proposed milestone (task table + definition of done + source + pillar linkage + expected outcome + why-now rationale) and/or inbox note, numbered in proposed priority order. Propose **implementation tasks only**: `/pm` appends the standing closing tasks (Adoption surface when the milestone ships a user- or agent-facing change, then Simplify, then Test coverage, then Closeout) itself when it materializes, so do not include them — but do flag in the proposal whether you expect Adoption surface to apply, so `/pm` and the user aren't guessing. Do **not** write files.
8. **End with the summary and handoff.** The response must **end** with these two blocks, in this order, so the user can scan the close without rereading the detail:
   1. A **"Summary (priority order)"** section: a numbered list of every candidate (milestones and inbox notes together) using the same numbers as the detail above — one line each: `N. <title> (wN, ~size) — one-line outcome`.
   2. The exact `/pm` command(s) to materialize the proposal, e.g.:
      - `/pm new milestone w1 <title>` (then the tasks), or
      - `/pm add w1 <idea>` for sub-hour work, or
      - `/pm promote w1/NNN` to promote an existing inbox note.
   Nothing comes after these blocks — no trailing analysis or caveats.

## Topic

$ARGUMENTS
