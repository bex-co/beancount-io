# w2 · m5 — beancount-close: month-end close ritual

**Worker:** worker2 **Goal:** an agent runs a complete month-end close as a checklist — reconcile every active account, assert balances, check recurring-entry completeness, and land the month's P&L/BS summary as a clean git commit **Status:** todo

## Tasks (in order)

| id   | title                                                    | est | depends_on |
| ---- | -------------------------------------------------------- | --- | ---------- |
| t001 | SKILL.md skeleton: triggers/skip, close checklist frame  | 30m | —          |
| t002 | Close checklist reference (delegates to beancount-reconcile) | 1h  | t001       |
| t003 | Report + commit: month P&L/BS summary, commit convention | 45m | t002       |
| t004 | Evals: fixture mid-close ledger + expected outcomes      | 1h  | t003       |
| t005 | Adoption surface — skill discoverable on every surface   | 30m | t004       |
| t006 | Simplify                                                 | 20m | t005       |
| t007 | Test coverage — failure-mode evals                       | 45m | t005       |
| t008 | Closeout                                                 | 15m | t007       |

## Definition of done

On a fixture ledger mid-close, the skill walks the checklist end-to-end: reconciliation status per active account (delegating account-level work to the `beancount-reconcile` skill), period-end balance assertions present, recurring entries verified complete, flagged (`!`) entries surfaced, and — after confirmation — the month's P&L/BS summary committed with the documented message convention; `bean-check` clean throughout; evals pass.

## Source + Goal linkage

- **Source:** /pm-brainstorm 2026-07-31 — July 2026 skills-market research: month-end close is what Pilot sells at $99–499/mo and Puzzle ships as "AI Close"; a checklist agent over plain text is the prosumer equivalent.
- **Goal linkage:** A1 — the capstone maintenance ritual: composes reconcile + assertions + reporting into the recurring monthly habit that keeps a ledger trustworthy.
- **Expected outcome:** users run a monthly close with their agent instead of paying a close service; observable via recurring monthly invocations (the strongest retention signal on the board).
- **Why now:** sequenced last deliberately — it **depends on m1 (beancount-reconcile) shipping first** and gets cheaper if m4's report recipes exist; materialized now so the dependency ordering is visible on the board. Adoption surface included: ships a new agent-facing skill.
