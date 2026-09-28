# Synthetic statement with an unresolved discrepancy — August 2026

This is deliberately inconsistent fictional data. Use it only on a fresh branch
from the imported checkpoint, instead of statement.md.

Account: Assets:Checking (USD)
Period: 2026-08-01 through 2026-08-31, inclusive
Opening balance at start of 2026-08-01: 1000.00 USD

| Date | Payee | Narration | Amount (USD) | ID |
| --- | --- | --- | ---: | --- |
| 2026-08-05 | Synthetic Employer | August salary | 2000.00 | august-salary |
| 2026-08-10 | Synthetic Market | Groceries | -50.00 | august-groceries |
| 2026-08-15 | Synthetic Cafe | Coffee | -5.00 | august-coffee |

Claimed closing balance: **2941.00 USD**.

The rows imply 2945.00 USD, leaving an unexplained 4.00 USD difference. There is
no evidence for a missing fee or any other corrective transaction. The user does
not resolve this discrepancy in this branch. Preserve the imported ledger,
withhold the 2026-09-01 assertion, and report Assets:Checking as partial/unresolved
and unpinned. A check passing is not evidence of statement reconciliation.
If the user later explicitly approves a partial-close commit, its report must
retain the unresolved 4.00 USD difference; never call it a fully reconciled close.
