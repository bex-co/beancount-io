# Recording payroll

A business that pays staff through a payroll provider records each run from the provider's printed summary, following beancount-init's `references/business-books.md`. Receiving a paycheck is an ordinary transaction, not this; paying a contractor with no withholding is too.

**Inputs, as printed:** the pay date, gross wages, each employee withholding line (income tax, social security, health insurance, retirement…), each employer tax line, net pay, and the account it left from. Every figure comes from the summary; a figure it does not print is asked for, never computed from wages, rates, or tables.

**Gate (engine arithmetic, quoted):** printed gross minus the printed withholdings must equal the printed net — `$gross`, `$withholdings` (a parenthesized sum of the withholding lines), `$net` as decimal literals:

<!-- recipe: payroll-tie -->
```sh
bea --file "$ledger" --json --no-input query "SELECT $gross - $withholdings AS computed_net, $net - ($gross - $withholdings) AS gap FROM #accounts LIMIT 1"
```

A nonzero `gap` stops the proposal: show the printed figures and the gap, and ask — a misread line, a deduction the summary lists elsewhere, or a reimbursement. Never adjust a figure to make it tie.

**The entry** (one per run, `payroll: "<pay date>"` metadata):

- `Expenses:Payroll:Wages` at the gross, and `Expenses:Payroll:EmployerTaxes` at the employer taxes (or the ledger's own payroll expense accounts).
- One `Liabilities:Payroll:<Item>` posting per withholding and employer-tax line, named as the summary prints it — negative, owed until remitted. Withholding and the matching employer line for the same tax (social security, medicare) may share one liability when the provider remits them together; say which.
- The paying account at the net pay.

Missing payroll accounts are proposed as `open`s in the same proposal. Check for the run already being recorded: an entry with the same `payroll:` date, or the same net on the paying account within ±3 days (the `already-recorded` recipe). Write it with the `batch` recipe (its `meta` carries `payroll:`), then the root check.

**Remittance:** a payment to the tax authority clears the liabilities it covers, each at the amount the deposit confirmation or return states, against the paying account. Read each liability's balance first; a remittance larger than a liability's balance, or one that leaves a balance the user did not expect, is shown and asked about — never spread across liabilities by guess.

<!-- recipe: payroll-liabilities -->
```sh
bea --file "$ledger" --json --no-input query "SELECT account, sum(number) AS owed WHERE account ~ '^Liabilities:Payroll:' AND date < $as_of GROUP BY account ORDER BY account"
```

Quarter totals for an accountant are a read: beancount-ask's `payroll-quarter` recipe in its `references/bql-recipes.md`.
