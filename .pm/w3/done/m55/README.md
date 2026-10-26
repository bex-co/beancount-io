# w3 · m55 — `beancount-roll-forward`: explain how a balance-sheet account moved

**Worker:** worker3 **Goal:** a new read-only customer skill explains an account's movement from opening to closing with every component tied to an executed query and no balancing plug. **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Write the roll-forward skill and its calculation reference — **DONE** | 90m | — |
| t002 | Write evals and fixtures for the roll-forward cases — **DONE** | 60m | t001 |
| t003 | Adoption surface — **DONE** | 30m | t002 |
| t004 | Simplify — **DONE** | 15m | t003 |
| t005 | Test coverage — **DONE** | 45m | t003 |
| t006 | Closeout — **DONE** | 10m | t004, t005 |

## Definition of done

- For prepaid, loan, and brokerage fixtures, opening and closing balances are queried independently and every posting is included exactly once, per account and per currency.
- The report shows opening, signed movements grouped with an explicit uncategorized bucket, closing, and a residual with pass/fail; a forced residual fails loudly and is never plugged.
- Cost and valuation views are never mixed; a valuation view names its price source, date, and basis.
- Evals pass on Claude Code and Codex, recorded with versions and dates; executable recipes run in `scripts/skills/test_beancount_skills.py`.

## Source + Goal linkage

- **Source:** `/pm-brainstorm w3` 2026-10-20 candidate 3, from [ADR020 P1](../../../docs/adrs/ADR020-skills-accounting-workflow-candidates.md); w2/m48 names roll-forwards out of its scope, so this duplicates no open work.
- **Goal linkage:** A1 — Agent-native accounting: an agent can maintain a ledger end-to-end with workpapers a user can trust.
- **Expected outcome:** users closing a month get a movement explanation they can re-run instead of model arithmetic in chat. Signals: skill invocations, eval pass rate on both clients.
- **Why now:** it depends only on shipped `bea` query primitives, not on any blocked workstream, and it supplies the movement evidence m57's accruals reuse. Adoption surface is included (t003) because a new customer skill ships.

## Prior blocker — cleared 2026-10-21

- **t002** — evals pass 6/6 on Claude Code; the Codex runs are quota-blocked at the account level. Unblock condition is written in t002.

The stale Codex quota condition is cleared by successful native runs recorded in `t002` and source `703fe36ca`; current client/source limits remain in the dated evidence. Continue the remaining tasks above.

## Closeout (2026-10-26)

All six tasks done; the milestone's definition of done was verified observably at close (see t006). Closed by this task.
