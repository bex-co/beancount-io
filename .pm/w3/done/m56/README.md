# w3 · m56 — Variance explanation in `beancount-ask`, reused by `beancount-close`

**Worker:** worker3 **Goal:** period changes are explained from contributing postings under explicit user thresholds — with a supported driver or an honest "unresolved", never an invented cause. **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Add the variance recipe to `beancount-ask` — **DONE** | 75m | — |
| t002 | Reuse the recipe in `beancount-close` and write the evals — **DONE** | 60m | t001 |
| t003 | Adoption surface — **DONE** | 30m | t002 |
| t004 | Simplify — **DONE** | 15m | t003 |
| t005 | Test coverage — **DONE** | 45m | t003 |
| t006 | Closeout — **DONE** | 10m | t004, t005 |

## Definition of done

- "Why did dining jump?" returns current, comparator, and delta under a stated threshold policy (absolute and relative, their AND/OR relationship, denominator convention, always-comment accounts), plus the contributing postings.
- A zero or negative comparator shows the absolute delta with percentage as not applicable; a missing budget is reported missing, never as zero.
- Every claimed driver traces to posting evidence; anything else is labelled a hypothesis or unresolved. Posting descriptions alone never prove causality.
- An operational bridge (price/volume-style) is produced only when its inputs exist and its components sum to the actual change; otherwise the report is an account/payee movement explanation.
- Evals pass on Claude Code and Codex, recorded with versions and dates.

## Source + Goal linkage

- **Source:** `/pm-brainstorm w3` 2026-10-20 candidate 4, from [ADR020 P1](../../../docs/adrs/ADR020-skills-accounting-workflow-candidates.md), including its rule that the upstream 5% fallback is not inherited as a universal threshold.
- **Goal linkage:** A1 — Agent-native accounting.
- **Expected outcome:** users asking their agent to explain a change get evidence or an explicit unknown, so ask answers stay trustworthy enough to act on. Signals: `beancount-ask` invocations, eval pass rate on both clients.
- **Why now:** it extends a shipped skill on shipped query primitives, needs no blocked dependency, and close's commentary (w2/m48's review state) is more useful with it. Adoption surface is included (t003) because two customer skills change behavior.

## Prior blocker — cleared 2026-10-21

- **t002** — close reuse shipped and Claude Code evals pass; the Codex runs are quota-blocked at the account level. Unblock condition is written in t002.

The stale Codex quota condition is cleared by successful native runs recorded in `t002` and source `703fe36ca`; current client/source limits remain in the dated evidence. Continue the remaining tasks above.

## Closeout (2026-10-26)

All six tasks done; the milestone's definition of done was verified observably at close (see t006). Closed by this task.
