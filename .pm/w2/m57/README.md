# w2 · m57 — Record a payroll run from the provider's summary

**Worker:** worker2 **Goal:** a business records each payroll run exactly as its provider's summary prints it — gross wages, each withholding and employer tax to its liability, net pay out of the bank — records the remittances that clear those liabilities, and answers quarter totals for its accountant from booked postings. **Status:** todo (t001–t003 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| [t001](./done/t001.md) | Decide placement and the payroll liability model, verified on `bea` — **DONE** | 45m | w2/m55/t001 |
| [t002](./done/t002.md) | Record a payroll run from the provider's printed summary — **DONE** | 60m | t001 |
| [t003](./done/t003.md) | Record remittances and report quarter totals — **DONE** | 60m | t002 |
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

- **Placement (t001, 2026-10-27): a gated procedure in `beancount-add`, with quarter totals as a `beancount-ask` recipe — no new skill.** Routing probe at `622086cd7` (scratch workspace, suite linked, one client's `claude-opus-5-5[1m]`): "Record this payroll run from my Gusto summary…" and "We paid the quarterly payroll taxes…" opened `beancount-add`; "What were my total wages and payroll taxes for Q3…" opened `beancount-ask`. Both already route correctly, so the work is the missing procedure, not a new trigger. ADR020's test does not favor a separate skill: the run is one gated entry shape from a printed summary (like `beancount-property`'s mortgage split inside its owner), and a fifteenth description competing with `beancount-add` adds routing risk without a distinct deliverable.
- **Model (t001), per [ADR025](../../../docs/adrs/ADR025-skills-business-books.md):** `Expenses:Payroll:Wages` and `Expenses:Payroll:EmployerTaxes`; one `Liabilities:Payroll:<Item>` per withholding or employer-tax line the provider prints; net pay out of the paying account; `payroll: "<pay date>"` metadata identifies the run. Verified with `bea` 0.3.1 (checkout) on a synthetic ledger: a run of 8,000 gross + 612 employer taxes = 2,324 to three liabilities + 6,288 net, and a quarterly deposit of 2,324 that cleared all three to 0.00; the root check passed and Q3 movements read per account.
- **Figures only as printed.** The gates compare printed figures (gross − withholdings = net; the liabilities equal the printed withholdings plus employer taxes); a missing or non-tying figure is a question. Nothing is computed from wage rates or tax tables.

## Source + Goal linkage

- **Source:** small-business owner review of the skill suite (five-person services LLC: client invoices, contractors, a payroll provider, quarterly tax remittances), triaged 2026-10-21 — item 4. Verified on `main`: "payroll" appears only in eval fixtures, as receiving a paycheck. [PRFAQ001](../../../docs/prfaqs/PRFAQ001-ledger-creation.md) defers payroll calculation, which stays out of scope here.
- **Goal linkage:** **A1 — Agent-native accounting:** a business that runs payroll through a provider keeps its liabilities right without dictating every split.
- **Expected outcome:** an owner books each run from the provider's summary in one confirmed step and hands the accountant quarter totals that tie to the books. Signals: eval pass rate on both clients; skill invocations for payroll requests.
- **Why now:** next in the review's impact order after invoices; it reuses `beancount-property`'s printed-figures discipline and m55/t001's liability names. Adoption surface is included because a customer workflow ships.
