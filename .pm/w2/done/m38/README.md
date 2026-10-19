# w2 · m38 — Route every ledger request to the right beancount skill

**Worker:** worker2 **Goal:** a labeled routing set shows which `beancount-*` skill (or none) Claude Code and Codex choose for common ledger requests, and the eight descriptions are tuned against that evidence instead of by eye. **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| [t001](./done/t001.md) | Write the suite routing set — **DONE** | 45m | — |
| [t002](./done/t002.md) | Validate the routing set in `ci-check.py` — **DONE** | 30m | t001 |
| [t003](./done/t003.md) | Build the local routing runner — **DONE** | 45m | t001 |
| [t004](./done/t004.md) | Record the baseline on Claude Code and Codex — **DONE** | 30m | t002, t003 |
| [t005](./done/t005.md) | Tune descriptions: skip clauses and the words users type — **DONE** | 45m | t004 |
| [t006](./done/t006.md) | State local-only scope and the hosted-ledger hand-off — **DONE** | 30m | t004 |
| [t007](./done/t007.md) | Re-measure, record, and require the check for description changes — **DONE** | 30m | t005, t006 |
| [t008](./done/t008.md) | Adoption surface — **DONE** | 20m | t007 |
| [t009](./done/t009.md) | Simplify — **DONE** | 15m | t008 |
| [t010](./done/t010.md) | Test coverage — **DONE** | 30m | t008, t009 |
| [t011](./done/t011.md) | Closeout — **DONE** | 15m | t010 |

## Definition of done

- A suite-level routing set (proposed path `skills/evals/routing.json`) labels at least 40 prompts with the skill that should handle each one, or `none`. It includes the near-miss pairs below, and each skill has positive prompts and near-miss negatives.
- `python3 skills/scripts/ci-check.py` validates the set. It fails on a label that names no installed skill, on duplicate prompts, and on a skill with no near-miss negative. A future rename therefore fails CI until the labels move with it.
- A local runner records the skill each client actually chose, per prompt, for Claude Code and Codex. It cannot modify anything outside its scratch workspace, and CI never runs it (no paid client calls in CI, per `skills/AGENTS.md`).
- Baseline and after-tuning results for both clients are recorded with client versions and dates, apart from the deterministic tests. After tuning, every near-miss prompt routes correctly on both clients, or each remaining miss is listed with its cause. No prompt that routed correctly at baseline regresses.
- Every description says the skill works on local ledger files and names its confusable skips. Each body gives the hosted-ledger hand-off.
- `skills/AGENTS.md` requires running the routing set whenever a description changes or a skill is added.

Near-miss pairs the set must cover:

- "Close my old Amex account" (a `close` directive) vs closing the month (`beancount-close`).
- "Set my ledger's operating currency option" (a Beancount `option`) vs recording an options trade (`beancount-options`). The dashboard uses "Beancount options" for exactly these settings (`dashboard/src/features/ledger-data/settings/beancount-options-section`).
- "What does `bea ask` do?" vs a ledger question (`beancount-ask`).
- Import vs migrate vs reconcile vs close, e.g. "bring my Monarch history over" vs "import this Chase CSV" vs "does my June statement match" vs "reconcile everything for June".
- One manual entry ("I paid $42 for dinner on the Amex"), which is `none` until a skill owns it ([m40](../../blocked/m40/README.md) adds that label).
- General Beancount or BQL documentation questions, which are `none`.
- A hosted Beancount.io ledger with the MCP server connected, which is `none` for the local skills.

## Source + Goal linkage

- **Source:** agentic-skill review of `skills/` at the user's request, 2026-10-18. The 71 per-skill evals all assume the skill was already chosen; none checks which of the eight siblings an agent picks. Skill names and descriptions overlap with Beancount's own `close` and `option` directives and with the `bea ask` command, and no measurement exists to tell whether that misroutes requests.
- **Goal linkage:** **A1 — Agent-native accounting.** The description is the only thing an agent reads before it picks a skill. Routing quality is instruction-file quality, measured. Secondary **A3**: registry hosts list skills by name and description.
- **Expected outcome:** a ledger request in Claude Code or Codex reaches the skill built for it, and a maintainer can show it with recorded numbers before and after any description change.
- **Why now:** [m39](../../blocked/m39/README.md) (renames) and [m40](../../blocked/m40/README.md) (a ninth skill) both need this evidence first, and [ADR 020](../../../../docs/adrs/ADR020-skills-accounting-workflow-candidates.md) proposes more skills (roll-forward, accruals) that will crowd the routing further. Names and descriptions should be settled before [w6/m6](../../../w6/m6/README.md) publishes immutable ClawHub versions. Adoption surface is included because the milestone changes every skill's frontmatter, which is what agents and registries read.

## Out of scope

- Renaming skills ([m39](../../blocked/m39/README.md)).
- Changing what any skill does once it is chosen.
- Running paid client calls in CI.

## Closeout

Closed 2026-10-19 with every definition-of-done item verified on `main`:

- `skills/evals/routing.json` labels 48 prompts (31 positives, 17 `none`) and covers every near-miss pair above; each skill has positives and near-miss negatives.
- `check_routing()` in `skills/scripts/ci-check.py` fails on unknown labels, duplicate prompts, and a skill with no positive or no near-miss entry (`TestRoutingSet`); `CI (skills)` passed on `64e37d2a6`.
- `skills/scripts/run-routing.py` records each client's choice per prompt in a scratch workspace outside the repository and never runs in CI; its detection, scoring, and watchdog are tested with fake clients (`test_run_routing.py`).
- `skills/docs/routing-rehearsal.md` records two baseline and two after runs per client with versions and dates: Claude Code 47/48 → 48/48, Codex 43–45/48 → 46–47/48. No prompt that routed correctly at baseline regresses. The remaining Codex misses are hosted-ledger prompts where Codex opens the local skill and then hands off to the MCP server, as recorded.
- Every description says local and names its confusable skips; every body's first step carries the hosted-ledger hand-off (`bea-cli.md`, Hosted ledgers).
- `skills/AGENTS.md` requires the routing check for description changes and new skills.

Evidence that bears on [m39](../../blocked/m39/README.md): the predicted `close` and `option` collisions did not misroute on either client in any run, before or after the skip clauses.
