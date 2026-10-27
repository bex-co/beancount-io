# w2 · m55 — Business-books conventions, and profit by client or project

**Worker:** worker2 **Goal:** one decision record fixes the names and identities every business procedure shares — receivables, payables, collected tax, payroll liabilities, owner equity, invoice identity, and the client/project key — and the suite then records and reports that key, so "profit by client?" is a shown query instead of one income account per client. **Status:** todo (t001–t005 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| [t001](./done/t001.md) | Write the business-books conventions decision record — **DONE** | 75m | — |
| [t002](./done/t002.md) | Propose the client/project key when entries are recorded — **DONE** | 60m | t001 |
| [t003](./done/t003.md) | Let `bea import` rules set the client/project key — **DONE** | 75m | t001 |
| [t004](./done/t004.md) | Report profit by client or project in beancount-ask — **DONE** | 60m | t001 |
| [t005](./done/t005.md) | Write evals, fixtures, and routing entries — **DONE** | 60m | t002, t003, t004 |
| t006 | Run the evals and routing set on both clients | 45m | t005 |
| t007 | Adoption surface | 30m | t006 |
| t008 | Simplify | 15m | t007 |
| t009 | Test coverage | 45m | t007, t008 |
| t010 | Closeout | 15m | t009 |

## Definition of done

- A business-books decision record exists under `docs/adrs/`. It records each convention with its reason, matches the catalog's `freelance@1` and `business@1` names or names the preset version change required, and lists the non-goals with proposed `DO_NOT_DO.md` lines for the owner.
- Recording a business entry proposes the client/project key from the payee's history and writes it only after the proposal's yes; with no confident prior the entry is proposed without one, flagged, never guessed.
- A CSV import whose rules name a client/project writes that key on matching rows; unknown rule keys still refuse.
- A per-client P&L shows income, expenses, and net per client plus an unattributed bucket, and those totals equal the period's account totals from an executed query.
- Evals pass on Claude Code and Codex, recorded with versions and dates; new recipes run in `scripts/skills/test_beancount_skills.py`.

## Source + Goal linkage

- **Source:** small-business owner review of the skill suite (five-person services LLC: client invoices, contractors, a payroll provider, quarterly tax remittances), triaged 2026-10-21 — items 1 and 3; the shared decision record was the triage's first recommendation. Verified on `main`: no skill proposes a client/project dimension, no ask recipe sums by tag or metadata, and `bea import` rules accept only `match` and `account` (`cli/src/bea_engine/csv_mapper.py`). [ADR021](../../../docs/adrs/ADR021-backend-v2-ledger-creation-experience.md)'s `freelance@1` preset already asks "Review income and costs by client or project?" and promises allocation labels without an account per client, with no convention behind it yet.
- **Goal linkage:** **A1 — Agent-native accounting:** an agent keeping a business's books answers the question owners ask monthly from the ledger itself.
- **Expected outcome:** a services business sees profit per client or project as a shown, re-runnable query without exploding its chart of accounts. Signals: eval pass rate on both clients; ask invocations for client/project questions.
- **Why now:** m56–m59 all depend on t001's names; settling them once prevents the naming drift the 2026-10-20 prompt audit had to repair (`Equity:Opening-Balances` against `Equity:OpeningBalances`, `214ca2403`). The dimension is the cheapest business gap and needs no new skill. Adoption surface is included because skills, a CLI rule key, and ask recipes change.
