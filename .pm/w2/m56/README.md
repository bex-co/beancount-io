# w2 · m56 — Invoice clients and pay bills, with collected tax and an aging you can trust

**Worker:** worker2 **Goal:** a customer skill records an invoice issued (receivable against income, with the tax leg the user's document states), each payment applied to it — including a payment processor's gross, fee, and net — supplier bills and their payments, and the remittance that clears collected tax, proposed first and written after a yes; it answers "who owes me, and how overdue" from booked postings. **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Decide placement and the invoice model, verified on `bea` | 45m | w2/m55/t001 |
| t002 | Issue an invoice and apply its payments | 75m | t001 |
| t003 | Receive and pay a supplier bill | 45m | t001 |
| t004 | Record collected sales tax and its remittance | 60m | t002 |
| t005 | Apply payments found in imports and statements | 45m | t002 |
| t006 | Report open invoices, bills, and their aging | 60m | t002, t003 |
| t007 | Write evals, fixtures, and routing entries | 60m | t002, t003, t004, t005, t006 |
| t008 | Run the evals and routing set on both clients | 45m | t007 |
| t009 | Adoption surface | 30m | t008 |
| t010 | Simplify | 15m | t009 |
| t011 | Test coverage | 45m | t009, t010 |
| t012 | Closeout | 15m | t011 |

## Definition of done

- An invoice books the receivable against income, plus a collected-tax leg when the user's document states one; each payment links to its invoice and reduces exactly that receivable; a processor payment books gross to the receivable and the fee to an expense, with cash equal to the net; an overpayment or a payment matching no open invoice is asked about.
- `freelance@1`'s acceptance case holds: invoice 1,000 then receive 400 leaves 600 receivable on that invoice.
- A bill and its payments do the same against payables.
- Collected tax accumulates as a liability from user-stated amounts, a remittance clears it, and an owed-for-period query ties to the liability balance. No rate is looked up or inferred.
- A deposit staged by import or reconcile that matches an open invoice is offered as its payment, never applied silently.
- Aging lists each open invoice and bill with issue date, due date when stated, days outstanding, and open amount, and the open amounts sum to the receivable and payable balances from an executed query.
- Nothing is written without a yes; the root `bea check` gates success; evals pass on Claude Code and Codex.

## Decisions

- _Recorded by t001._

## Source + Goal linkage

- **Source:** small-business owner review of the skill suite (five-person services LLC: client invoices, contractors, a payroll provider, quarterly tax remittances), triaged 2026-10-21 — item 2, with item 5 (sales tax) bundled because the tax leg belongs to the invoice. Verified on `main`: "invoice" appears only in `skills/beancount-migrate/references/qbo.md`, which skips invoice and bill rows; "receivable" only in `beancount-property`'s rent note; no skill tracks collected tax. Not covered by `beancount-accruals` ([w3/m57](../../w3/done/m57/README.md), shipped), which drafts period-end accrual schedules, not invoice lifecycles.
- **Goal linkage:** **A1 — Agent-native accounting:** money owed in and out is what separates business books from household books; without it the suite stays cash-basis only.
- **Expected outcome:** a freelancer or small services business invoices clients, tracks partial payments, and sees who owes them, all in agent-kept plain-text books. Signals: skill invocations, eval pass rate on both clients, aging answers that tie to the receivable balance.
- **Why now:** the highest-impact business gap in the review. [m55](../m55/README.md)/t001 fixes its names first, and the suite already has the pieces it composes: links, propose-then-confirm, and engine tie-outs. Hosted aging waits on [w6/blocked/017](../../w6/blocked/017.md), so this ships on local `bea` first. Adoption surface is included because a new customer skill ships.
