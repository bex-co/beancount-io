# Explicit compatibility paths

Use these only when `bea` is absent, or for the separate runtimes below.
An installed but failing `bea` needs repair; do not silently switch engines.
Suggest installing `bea` first. Do not prescribe `pip install beancount` as recovery.
Do not prescribe `pip install beanquery` as recovery either.

## Existing developer tools without `bea`

An already available developer `bean-query "$ledger" "$query"` can supply
reads, and `bean-check "$ledger"` can validate the **root** ledger.
For a confirmed write, retain the skill's normalization, dedup, categorization,
and review steps, then insert the approved directives into the approved
destination in date order. Preserve line endings, blank separators, and
trailing newlines. Put approved account opens with the existing account
definitions. Apply the same `import-id` rules as the `bea` path.

A nonzero check blocks a success claim. If neither checker is available,
report the result as **unvalidated** and explain that `bea check` is needed;
manual balancing is not proof that booking, includes, and assertions are valid.
Read-only workflows stay read-only on this path too.

## New-ledger template without `bea`

Only beancount-init uses this section. Use its confirmed currency and open
date; for a historical migration, the date must cover opening balances too.
Replace `{{OPEN_DATE}}`, `{{CURRENCY}}`, and `{{TAIL}}`:

```beancount
option "title" "Personal ledger"
option "operating_currency" "{{CURRENCY}}"

; Add more accounts with bea add open. Amounts on credit accounts are negative.
; bea import books rows it cannot categorize to Expenses:Uncategorized with flag '!'.
{{OPEN_DATE}} open Assets:Checking {{CURRENCY}}
{{OPEN_DATE}} open Assets:Savings {{CURRENCY}}
{{OPEN_DATE}} open Assets:Cash {{CURRENCY}}
{{OPEN_DATE}} open Liabilities:CreditCard {{CURRENCY}}
{{OPEN_DATE}} open Income:Salary {{CURRENCY}}
{{OPEN_DATE}} open Income:Interest {{CURRENCY}}
{{OPEN_DATE}} open Expenses:Groceries {{CURRENCY}}
{{OPEN_DATE}} open Expenses:Dining {{CURRENCY}}
{{OPEN_DATE}} open Expenses:Rent {{CURRENCY}}
{{OPEN_DATE}} open Expenses:Transport {{CURRENCY}}
{{OPEN_DATE}} open Expenses:Utilities {{CURRENCY}}
{{OPEN_DATE}} open Expenses:Fees {{CURRENCY}}
{{OPEN_DATE}} open Expenses:Uncategorized {{CURRENCY}}
{{OPEN_DATE}} open Equity:OpeningBalances {{CURRENCY}}

{{TAIL}}
```

With an opening balance, `{{TAIL}}` is a transaction named `Opening balances`
on `{{OPEN_DATE}}`, posting the exact supplied amount to `Assets:Checking`
and its negative to `Equity:OpeningBalances`, in `{{CURRENCY}}`. Preserve
the supplied precision (`100` stays `100`). Without one, use this comment:

```beancount
; Record opening balances with a transaction against Equity:OpeningBalances.
; {{OPEN_DATE}} * "Opening balance"
;   Assets:Checking          1000.00 {{CURRENCY}}
;   Equity:OpeningBalances  -1000.00 {{CURRENCY}}
```

## Separate runtimes that remain useful with `bea`

- **Fava:** optional browser UI, installed in its own uv project by
  beancount-init when requested. It does not supply the engine for `bea`.
- **Importer authoring:** Beangulp's `generate`/`test` golden-file harness
  runs with the importer project's Python. `bea ingest` only exposes
  identify/extract/archive; enabling Beangulp in its engine does not make it
  importable by the project's Python. Follow beancount-importer-author's
  authoring workflow. Keep authoring dependencies aligned with the managed
  engine, then verify the wired importer through `bea ingest`.
- **Repository CI:** upstream `bean-check` is an independent comparison
  oracle. Retain it alongside the customer `bea` checks.
