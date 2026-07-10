---
description: Propose .pm milestones and tasks for a topic — decompose, size, and hand orchestration to /pm
argument-hint: "<topic or goal to break down>"
allowed-tools: Read, Bash(ls:*), Bash(find:*), Bash(cat:*), Bash(beancount-cli:*)
---

# Task: Propose milestones and tasks

`/pm-brainstorm` is the **divergent** half of the pair: it thinks a topic through, **proposes** work, and hands orchestration and materialization to `/pm`. It writes **nothing** — the output is a text proposal. `$ARGUMENTS` is the topic/goal.

The board conventions — hierarchy, sizing rule, milestone quality gate, standing closing tasks, templates — live **canonically** in [`.claude/commands/pm.md`](pm.md). Read that file and apply its rules; do not restate or diverge from them here.

## Steps

1. **Load the canon, the goals, and the anti-goals.** Read `.claude/commands/pm.md` (conventions), `.pm/GOAL.md` (product pillars), and `.pm/DO_NOT_DO.md` (hard constraint). If a proposed item conflicts with an anti-goal, reject it explicitly and explain why.
2. **Load context.** Read the relevant `.pm` board state (workstream `README.md`s, open milestones, inbox notes — `find .pm -name README.md`, plus loose notes) so proposals fit the existing roadmap and reuse its numbering/naming. Pick the workstream the topic belongs to (or propose a new `wN`).
3. **Consult the platform repo (private, read-only).** The beancount.io platform lives in a **private** sibling checkout at `../web-beancount` relative to this repo's root (`../../web-beancount` from `mobile/`). Use it to ground proposals in what the platform already supports, instead of guessing from the mobile app's generated GraphQL schema alone:
   - `beancount-dashboard/` — the production web frontend; the reference for feature parity ("web has it, mobile doesn't") and for how a backend capability is already consumed.
   - `beancount-cli/` — CLI + Python library for the platform; you may run `beancount-cli` to inspect real platform behavior while brainstorming.
   - `backend-cluster/idl/` — canonical API definitions (OpenAPI specs: `backend-v2`, `beancount-ledger`, `gitea`); the source of truth for backend capabilities.

   **Privacy guard (hard rule):** this monorepo is open source; `web-beancount` is not, and everything `/pm` materializes into `.pm/` is public. Reference private material by path and operation name only — never copy proprietary code, internal hostnames/URLs, credentials, infra topology (`backend-cluster/_infra*`), or business metrics into proposals or any file in this repo. If the sibling checkout is absent, proceed without it.
4. **Think like a PM for beancount.io users.** Start from the user's pain, not the technology: what makes accounting tedious on mobile today, and how does this topic make it easier? Frame each proposal against the `.pm/GOAL.md` pillars (effortless capture, AI assistance, analytics & insights, plain-text fidelity). Prefer work whose outcome a user can feel in the app over internal refactors.
5. **Discuss & decompose.** Talk the topic through with the user: pressure-test scope, surface dependencies and risks, and break it into candidate tasks, each with a rough estimate and `depends_on` links. Ground tasks in the real codebase (`app/` routes, `src/screens/`, `src/components/`, Apollo/GraphQL layer) and, for backend-capability questions, the API definitions in `../web-beancount/backend-cluster/idl/` (step 3, privacy guard applies). Flag explicitly any task that would need a new dependency (repo rule: ask the user before adding dependencies).
6. **Size and gate** each cluster of work using `/pm`'s sizing rule and milestone quality gate. Undersized work → propose an inbox note instead of a milestone, and say so. Work that fails the quality gate (no pillar linkage, no observable user outcome, no why-now) → mark it **not meaningful**, do not propose it as a milestone, and suggest a better-scoped alternative.
7. **Emit the proposal as text only** — the target workstream, each proposed milestone (task table + definition of done + source + goal linkage + expected outcome + why-now rationale) and/or inbox note. Propose **implementation tasks only**: `/pm` appends the standing closing tasks (UX pass, Simplify, Test coverage) itself when it materializes, so do not include them. Do **not** write files.
8. **Hand off to `/pm`.** End by giving the exact `/pm` command(s) to materialize the proposal, e.g.:
   - `/pm new milestone w1 <title>` (then the tasks), or
   - `/pm add w1 <idea>` for sub-hour work, or
   - `/pm promote w1/NNN` to promote an existing inbox note.

## Topic

$ARGUMENTS
