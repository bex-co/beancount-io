# w21 · m3 — BQL cookbook: tested query recipes for humans and agents

**Worker:** worker1 **Goal:** one linkable page of BQL recipes whose every query CI executes against a fixture ledger **Status:** todo (t001-t004 done)

## Tasks (in order)

| id   | title                                                                 | est | depends_on       |
| ---- | --------------------------------------------------------------------- | --- | ---------------- |
| t001 | Inventory the recipes already in the skills and CLI docs — **DONE**   | 30m | —                |
| t002 | Write about 20 recipes on the example fixture ledgers — **DONE**     | 60m | t001             |
| t003 | Add a runner that executes every fenced recipe and fails on drift — **DONE** | 45m | t002       |
| t004 | Wire the runner into `CI (skills)` and link the cookbook — **DONE**  | 25m | t003             |
| t005 | Adoption surface                                                      | 20m | t004             |
| t006 | Simplify                                                              | 20m | t005             |
| t007 | Test coverage                                                         | 30m | t005             |
| t008 | Closeout                                                              | 15m | t006, t007       |

## Definition of done

`docs/skills/bql-cookbook.md` holds about 20 recipes, each a fenced query with its declared fixture ledger and a one-line expected shape. `python3 scripts/skills/ci-check.py` (or a sibling script it calls) runs every recipe through `bea query` and fails when a query errors, returns zero rows, or names a missing fixture. The page is linked from the CLI README, `bea query --help` guidance (via w21/1012), and `skills/beancount-ask`.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w21` 2026-10-25, candidate 2. Recipes currently live scattered across `skills/*/references`.
- **Goal linkage:** **A1 — Agent-native accounting** (a vetted starting point for agents writing BQL) and **A3 — Community & distribution** (a linkable, CI-verified reference).
- **Expected outcome:** a developer or agent copies a query that provably runs on `bea query`; fewer BQL-syntax questions and guessed queries; a docs asset every future adopter benefits from.
- **Why now:** w22 is adding holdings, register and capital-gains reports; the cookbook documents the raw-BQL equivalents and is cheapest to write while that surface is being defined.
- **Adoption surface:** included — the cookbook is a user- and agent-facing doc that must be discoverable from the README, the CLI and a skill.
- **Anti-goals:** original recipes over upstream `beanquery`; no re-implementation of upstream.
