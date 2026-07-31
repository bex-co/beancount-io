# Mapping strategy — categories, accounts, transfers, opening balances

## Account mapping (source accounts → Assets/Liabilities)

Type usually comes from the source (`Account Name` + account-type metadata, or the user). Checking/savings/cash → `Assets:Bank:<Name>` / `Assets:Cash`; credit cards → `Liabilities:CreditCard:<Issuer>`; loans → `Liabilities:Loan:<Name>`. Keep names short, CamelCase segments, and stable — they're forever. Sign rule after mapping: asset in = `+`; liability charge = `−`, payment = `+` (canonical detail — debit/credit split columns, sanity checks — in beancount-import's `references/formats.md` and beancount-reconcile's `references/statement-formats.md`).

## Category mapping (source categories → Expenses/Income)

Present the full distinct-category list with proposed targets as an editable table. Shaping rules:

- **Two levels max** to start (`Expenses:Food:Groceries`, not `Expenses:Food:Groceries:Organic`) — users can deepen later; collapsing later is painful.
- **Income categories** (Paycheck, Salary, Interest, Refund-like) → `Income:…`; remember beancount income is negative — the row's sign handles it, don't flip twice.
- **Merge near-duplicates** the app accumulated ("Coffee Shops", "Coffee") into one target — propose the merge visibly, let the user split if they object.
- **Refunds** in an expense category stay in that expense account (a positive Expenses posting is a refund, and that's fine).
- **No sensible target** → `Expenses:Uncategorized`, each such category listed with its row count in both the mapping table and the final report. Never guess.

## Transfer pairing

Transfer-ish categories (Mint: `Transfer`, `Credit Card Payment`; Monarch: `Transfer`; QBO: `Transfer` transaction type) describe **one** real movement that the export shows **twice** — once per account.

Pair rows where: both mapped as transfers, **same absolute amount**, **opposite directions**, **different source accounts**, dates within **±3 days** (symmetric — the same tolerance as beancount-import's fuzzy dedup layer). Each pair → one transaction:

```
2026-05-15 * "Payment to Amex"
  Assets:Bank:Checking          -450.00 USD
  Liabilities:CreditCard:Amex    450.00 USD
```

Greedy match closest-date-first; a transfer row with no partner (the counterparty account wasn't exported, or timing crossed the export boundary) is **unpaired**: convert it against `Equity:Transfers-Review` and list it in the report — totals still tie, the user resolves it later. Never drop it, never pair it with a non-transfer row.

## Opening balances and the endpoint assertion

Exports carry flows, not balances, so anchor both ends per account:

1. Ask the user for the **current balance** (from the old app's account screen or the real bank).
2. `opening = current − Σ(converted rows for that account)`.
3. Emit the opening entry dated the **day before the earliest row**:

```
2023-01-04 * "Opening balance (migrated)"
  Assets:Bank:Checking     212.55 USD
  Equity:Opening-Balances
```

4. Pin the endpoint with an assertion dated the **day after the last row** (beancount checks balances at the start of the date — same day-after rule as beancount-reconcile):

```
2026-07-16 balance Assets:Bank:Checking   3412.55 USD
```

A failing endpoint assertion is the migration's smoke detector — it means rows are missing from the export, pending transactions aren't in it, or the stated balance was wrong. Report the delta with those candidate causes. Only with the user's explicit acceptance, book the residual to `Equity:Migration-Residual` so the assertion passes *visibly* — never invisibly massage amounts.

## import-id on migrated entries

Every converted entry carries `import-id` metadata using the `beancount-import` skill's convention (see that skill's `references/dedup.md`): native row ID if the export has one, else `<source>:sha256:<16-hex>` over the same normalized `date|amount|description|source-account` input (e.g. `mint:sha256:…`). This makes migration and ongoing imports one continuous, deduplicated history: the user's first `beancount-import` run after migrating won't double-book overlap rows.

## Generic CSV path (unknown source)

Any export with date + amount + description + category + account columns migrates: confirm the column mapping and sign convention exactly as `beancount-import`'s formats reference prescribes, then follow this document from "Category mapping" on. Rows without a category all go to `Expenses:Uncategorized` — warn the user up front that refinement will be manual.
