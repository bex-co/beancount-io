# w2 · m57 — Record a payroll run from the provider's summary

**Worker:** worker2 **Goal:** a business records each payroll run exactly as its provider's summary prints it — gross wages, each withholding and employer tax to its liability, net pay out of the bank — records the remittances that clear those liabilities, and answers quarter totals for its accountant from booked postings. **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Decide placement and the payroll liability model, verified on `bea` | 45m | w2/m55/t001 |
| t002 | Record a payroll run from the provider's printed summary | 60m | t001 |
| t003 | Record remittances and report quarter totals | 60m | t002 |
| t004 | Write evals, fixtures, and routing entries | 45m | t002, t003 |
| t005 | Run the evals and routing set on both clients | 45m | t004 |
| t006 | Adoption surface | 30m | t005 |
| t007 | Simplify | 15m | t006 |
| t008 | Test coverage | 45m | t006, t007 |
| t009 | Closeout | 15m | t008 |

## Definition of done

- A payroll run is written only when the printed gross minus the printed withholdings equals the printed net; a mismatch stops with both figures shown, and a missing figure produces a question, never a computed amount.
- Each withholding and employer tax lands in its liability account as printed; a remittance clears it.
- Quarter totals per wage and liability account equal the quarter's account movements from an executed query.
- Receiving a paycheck still routes to `beancount-add`; evals pass on Claude Code and Codex.

## Decisions

- _Recorded by t001._

## Source + Goal linkage

- **Source:** small-business owner review of the skill suite (five-person services LLC: client invoices, contractors, a payroll provider, quarterly tax remittances), triaged 2026-10-21 — item 4. Verified on `main`: "payroll" appears only in eval fixtures, as receiving a paycheck. [PRFAQ001](../../../docs/prfaqs/PRFAQ001-ledger-creation.md) defers payroll calculation, which stays out of scope here.
- **Goal linkage:** **A1 — Agent-native accounting:** a business that runs payroll through a provider keeps its liabilities right without dictating every split.
- **Expected outcome:** an owner books each run from the provider's summary in one confirmed step and hands the accountant quarter totals that tie to the books. Signals: eval pass rate on both clients; skill invocations for payroll requests.
- **Why now:** next in the review's impact order after invoices; it reuses `beancount-property`'s printed-figures discipline and m55/t001's liability names. Adoption surface is included because a customer workflow ships.
