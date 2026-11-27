# Explicit compatibility paths

Use these only when `bea` is absent, or for the separate runtimes below.
An installed but failing `bea` is repaired, not swapped for another engine: a
`bea` that is too old, cannot install its engine, or has no temporary directory
is still installed, so the developer paths below do not apply. Show its error
and the repair step from `bea-cli.md` beside this file (When the installed
`bea` fails) and stop; never answer with another `bea`, a checkout found on
disk, or `bean-query`.
When `bea` is missing, suggest installing it rather than `pip install beancount` or `pip install beanquery`.

## Existing developer tools without `bea`

An already available developer `bean-query "$ledger" "$query"` can supply
reads, and `bean-check "$ledger"` can validate the **root** ledger.
Before changing an existing ledger, require a working checker. If neither
`bea check` nor developer `bean-check` can run, leave the ledger unchanged,
show the unposted proposal and explain the missing validation prerequisite.
Approval and manual balancing do not replace a checker. The new-ledger scaffold
below is a separate, explicitly unvalidated initialization path, not permission
to continue into imports, reconciliation or other existing-ledger writes.

For a confirmed developer-tool write, retain the skill's normalization, dedup,
categorization and review steps. Check the root first; a red result blocks this
manual fallback. Prepare the proposed files in a temporary copy that preserves
the root's includes and relative paths, validate that copy with `bean-check`,
then insert only those approved directives into the approved destination in
date order and check the real root again. Preserve line endings, separators and
trailing newlines. Put approved account opens with the existing account
definitions. Apply the same `import-id` rules as the `bea` path.

A nonzero check blocks further writes and a success claim; report the actual
state and error. The `bea`-specific diagnosed-assertion exception belongs to
beancount-reconcile and is not a manual-check bypass. Read-only workflows stay
read-only, and shared recipes never broaden the invoking skill's scope.

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
{{OPEN_DATE}} open Income:Salary
{{OPEN_DATE}} open Income:Interest
{{OPEN_DATE}} open Expenses:Groceries
{{OPEN_DATE}} open Expenses:Dining
{{OPEN_DATE}} open Expenses:Rent
{{OPEN_DATE}} open Expenses:Transport
{{OPEN_DATE}} open Expenses:Utilities
{{OPEN_DATE}} open Expenses:Fees
{{OPEN_DATE}} open Expenses:Uncategorized
{{OPEN_DATE}} open Equity:OpeningBalances

{{TAIL}}
```

Investor and property opens confirmed in the skill's Step 3b are appended to
this template in the same style, at `{{OPEN_DATE}}`, before `{{TAIL}}` — for
example `{{OPEN_DATE}} open Assets:Brokerage {{CURRENCY}},VTI "FIFO"` (the
booking method quoted, omitted for the STRICT default).

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
