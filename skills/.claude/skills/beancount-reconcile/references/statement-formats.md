# Statement normalization

Turn a bank or broker statement into **normalized lines** the Match phase can diff against the ledger. A normalized line is:

```
{ date: YYYY-MM-DD, amount: signed Decimal (ledger sign), description: str, raw: str }
```

Plus two statement-level facts the balance assertion depends on: the **period** (start, end dates) and the **ending balance**.

The whole job of this phase is to remove format variability so Match sees one clean shape. Two things corrupt a reconciliation silently if you get them wrong: **sign** and **date**. When either is ambiguous, ask — never guess.

## Two accepted inputs

### CSV export

The common shape is one row per transaction with a date, a description/payee, and an amount expressed one of three ways:

1. **Signed amount column** — one `Amount` column, negative for money leaving the account. Closest to ledger convention already.
2. **Separate Debit / Credit columns** — two columns; each row fills one. You must combine them into a single signed amount (see sign rules below).
3. **Amount + running balance** — an `Amount` and a `Balance` column. The `Balance` column is a gift: the last row's balance is the ending balance, and you can cross-check each line by walking the running balance.

A transaction-row CSV carries no period bounds. Infer the period as the **calendar month of the row dates** (state the inference in the proposal; the last row's date is *not* the period end), or ask when the rows span a month boundary and the user's words don't pin the month.

Detect the columns from the header row. If there is no header, infer from the data (a column that is always a parseable date; a column that is always numeric) and **state your inference to the user before relying on it**.

### Pasted PDF text

When the user pastes text copied out of a PDF statement, there is no delimiter structure — extract by pattern:

- **Period**: look for "Statement period", "Billing cycle", "From … to …", "Opening/Closing date" lines.
- **Opening balance** and **ending/closing balance**: labelled lines ("Beginning balance", "Ending balance", "New balance", "Closing balance").
- **Transaction lines**: rows that begin (or end) with a date and contain an amount. Multi-line descriptions happen — join continuation lines to the row whose date they follow.

If period bounds or ending balance are missing from the pasted text, ask the user for them explicitly. Do not infer an ending balance by summing — a statement you can't anchor to a stated ending balance can't be reconciled with a trustworthy assertion.

## Sign normalization — depends on the account type

Normalize every amount to **the ledger's sign for the target account**. The account type (from Discover) decides the mapping:

### Asset account (checking, savings, brokerage cash)

Ledger convention: money **in** is `+`, money **out** is `−`.

| Statement shows | Normalized (asset) |
|---|---|
| Deposit / credit / "money in" | `+` |
| Withdrawal / debit / purchase / "money out" | `−` |
| Signed amount column (already −for out) | keep as-is |
| Separate columns | `Credit` → `+`, `Debit` → `−` |

### Liability account (credit card, line of credit)

Ledger convention: a **charge** makes the balance more negative (`−`, you owe more); a **payment** makes it less negative (`+`, you owe less). This is the inverse of an asset, and it is the single most common reconciliation sign error.

| Statement shows | Normalized (liability) |
|---|---|
| Purchase / charge / debit | `−` |
| Payment / credit / refund | `+` |

Credit-card CSVs frequently list **purchases as positive numbers** ("Amount = 54.20" for a $54.20 charge). For a liability account that must become `−54.20`. Watch for this explicitly; if a card's export convention is unclear, ask.

> Sanity check after normalizing: `opening_balance + sum(normalized amounts) == ending_balance`. If it doesn't, your sign mapping (or a missing/extra line) is wrong. This walk is the cheapest way to catch a flipped column before you ever diff against the ledger. Record the confirmed convention in the config block so re-runs skip the detection.

## Date normalization

- **MDY vs DMY** is genuinely ambiguous for day ≤ 12 (`03/04/2026`). Resolve it from the statement's locale/issuer if known, from any unambiguous date on the same statement (a day > 12 fixes the order), from the ledger's own posting dates when they corroborate exactly one reading (say which source decided it), or by asking. Persist the resolved `date_format` in the config block.
- Use the **posting/transaction date**, not any "posted vs. effective" second date, and be consistent with whichever the ledger already uses. Pending-vs-settled date differences are expected and handled by the Match phase's date window — don't try to correct them here.
- Emit ISO `YYYY-MM-DD`.

## Output of this phase

Hand the Match phase: the normalized line list, the period start/end, and the ending balance. Carry the opening balance too when available — it lets Match confirm it is starting from the same point as the ledger's prior balance assertion.

## Out of scope

- **Fetching** statements from a bank (no scraping — this decays constantly). The user exports the CSV or copies the PDF text. For an automated read-only feed, point them at SimpleFIN (~$1.50/mo), which many beancount users already bridge from.
- Parsing binary PDF directly — ask the user to paste the text (or export CSV). Text extraction quality from arbitrary PDFs is not worth silently getting a number wrong.
