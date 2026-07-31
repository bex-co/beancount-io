# QuickBooks Online export format

QBO has no single canonical export; the practical path is **Reports → Transaction List by Date → Export to Excel/CSV** for the date range, all accounts. Typical columns:

```
"Date","Transaction Type","No.","Name","Memo/Description","Account","Split","Amount"
"05/07/2026","Expense","","Trader Joes","TRADER JOES #123","Checking","Groceries","-54.20"
```

Parsing rules:

- **Inspect the header first** — QBO layouts vary by report settings and region. Confirm the column mapping with the user before parsing (same ask-once rule as everywhere).
- **`Account`** = the bank/card register the money moved through (→ source account). **`Split`** = the category/other side (→ category mapping). A `Split` of `-Split-` means a multi-line transaction: ask the user to re-export with "split detail" on, or convert against `Expenses:Uncategorized` with a report note.
- **`Transaction Type`** distinguishes `Expense`/`Deposit`/`Transfer`/`Invoice`/`Payment` etc. `Transfer` rows pair per mapping.md. Invoice/Payment (A/R) and Bill/Bill Payment (A/P) rows: for a books-migration these collapse to their cash effect — convert the payment rows, skip the invoice/bill accrual rows, and say so in the report (accrual detail is out of scope; the user keeps QBO records for history).
- **Dates**: usually MDY in US exports — prove from data or ask.
- **import-id hash input**: use `Memo/Description` as the raw-description field (fall back to `Name` when Memo is empty) — same precedent as Mint's "Original Description" and Monarch's "Original Statement", so a later `beancount-import` of the same account computes identical hashes.
- **Amounts**: signed from the register's perspective in most layouts — verify once.
- QBO *does* show balances (Chart of Accounts screen) — use those as the stated current balances for mapping.md's opening math.
- Business users migrating from QBO may have equity/retained-earnings structure this skill doesn't recreate — state plainly that the migration produces cash-basis books and complex equity needs manual review.
