# Synthetic checking statement — August 2026

This is fictional sample data, not a real institution or customer statement.

Account: Assets:Checking (USD)
Period: 2026-08-01 through 2026-08-31, inclusive
Opening balance at start of 2026-08-01: 1000.00 USD

Positive amounts increase checking; negative amounts decrease it.
IDs are native bank transaction IDs, represented in ledger metadata as `bank:<ID>`.

| Date | Payee | Narration | Amount (USD) | ID |
| --- | --- | --- | ---: | --- |
| 2026-08-05 | Synthetic Employer | August salary | 2000.00 | august-salary |
| 2026-08-10 | Synthetic Market | Groceries | -50.00 | august-groceries |
| 2026-08-15 | Synthetic Cafe | Coffee | -5.00 | august-coffee |
| 2026-08-31 | Synthetic Bank | Monthly service fee | -3.00 | august-fee |

Closing balance at end of 2026-08-31: **2942.00 USD**.

The export was downloaded before the service fee posted. The statement supplies
that missing transaction; propose Expenses:Fees, already opened by initialization.
The correct period-end assertion date is **2026-09-01** (start of day).
There are no other active asset or liability accounts in this scenario.
