# w2 · m59 — Close the books for a business: agings, liabilities, and owner equity

**Worker:** worker2 **Goal:** when a ledger has business accounts, `beancount-close` adds the page an accountant asks for — receivable and payable aging, collected-tax and payroll liability balances, owner contributions and draws for the period — each tied to booked balances, while a personal close stays exactly as it is. **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Add a business section to the close report | 75m | w2/m56/t006, w2/m57/t003, w2/m48/t008, w3/m58/t006 |
| t002 | Write evals: a business close and the personal-close regression | 60m | t001 |
| t003 | Run the evals on both clients | 45m | t002 |
| t004 | Adoption surface | 30m | t003 |
| t005 | Simplify | 15m | t004 |
| t006 | Test coverage | 45m | t004, t005 |
| t007 | Closeout | 15m | t006 |

## Definition of done

- The business section appears only when the ledger has receivable, payable, collected-tax, payroll-liability, or owner-equity accounts.
- Each figure in it comes from an executed query and ties to its account balance at period end.
- Nothing in it calls the close verified beyond the accounts statements tie.
- The existing personal close evals pass unchanged; the business eval passes on Claude Code and Codex.

## Source + Goal linkage

- **Source:** small-business owner review of the skill suite (five-person services LLC: client invoices, contractors, a payroll provider, quarterly tax remittances), triaged 2026-10-21 — item 7.
- **Goal linkage:** **A1 — Agent-native accounting:** the month-end package a small business hands its accountant comes out of the same agent-kept close.
- **Expected outcome:** an owner closes a month and has the agings and liability balances the accountant asks for, tied to the books. Signals: eval pass rate on both clients; close invocations on business ledgers.
- **Why now:** last in the sequence: it reports what [m56](../m56/README.md) and [m57](../m57/README.md) book, and it changes the close report after [w2/m48](../blocked/m48/README.md) and [w3/m58](../../w3/m58/README.md) do, so the report is not rewritten three ways at once. Adoption surface is included because close's customer output changes.
