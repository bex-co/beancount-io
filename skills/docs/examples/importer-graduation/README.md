# Importer graduation sample data

All rows, balances, and account history are synthetic. Copy the scenario into
a separate run-owned workspace, renaming `prior-ledger.beancount` to
`ledger.beancount` and keeping `import-rules.toml` beside it. The persisted
config's relative paths then name the intended files. Do not rehearse against
personal books.

| File | Purpose |
| --- | --- |
| `prior-history.csv` | Two source rows already present in the starting ledger |
| `prior-ledger.beancount` | Balanced starting ledger, existing accounts, confirmed import configuration, and both prior source IDs |
| `import-rules.toml` | Existing, reviewed categories for the three synthetic descriptions |
| `activity.csv` | Original header format: two prior rows plus two genuinely new rows |
| `renamed-headers.csv` | Renamed headers: one previously imported row plus one genuinely new row |
| `unrelated.csv` | Invoice export that neither original nor repaired importer may claim |
| `expectations.json` | Exact source identities, dispositions, balanced transactions, and checkpoint totals |

## Confirmed settings and provenance

The config follows the authoring skill's `eval2_ledger.beancount`: source
`chase-checking`, account `Assets:Bank:Checking`, MDY dates, and negative amounts
as outflows. It records the explicit public CSV mapping (`sign=bank`, which
preserves the bank's exported signs), durable rules path, and write destination.
All counter-accounts are already open. The opening balance is a synthetic
scenario input, not a claimed independent bank statement.

`prior-history.csv` copies the authoring skill's `eval3_old_sample.csv`.
`renamed-headers.csv` copies `eval3_new_sample.csv`. `activity.csv` combines the
old rows with the May 6 row from the renamed-header sample and the payroll row
from `eval1_sample.csv`. The invoice sample is new synthetic data. The original
evals remain in `.claude/skills/beancount-importer-author/evals/files/`.

The drift changes only `Date,Description,Amount` to `Post Date,Details,Value`.
Dates remain MDY, signs retain their meaning, and raw descriptions remain
unchanged. These fixtures do not authorize guessing a new sign convention or
an ambiguous date format on another export.

## Independently reviewed rows

Row numbers below and in the JSON count data rows, excluding the header.
Amounts are the signed source postings; opposite postings use the reviewed
category in the existing rules file.

| Transaction | Date | Amount (USD) | Category | Source identity (`csv:sha256:` suffix) |
| --- | --- | ---: | --- | --- |
| `prior-groceries` | 2026-04-03 | -33.20 | `Expenses:Food:Groceries` | `a8362f899f1ef12a` |
| `prior-fuel` | 2026-04-18 | -40.00 | `Expenses:Transport:Fuel` | `99d7aab6b18d28d8` |
| `new-groceries` | 2026-05-06 | -28.75 | `Expenses:Food:Groceries` | `4bb21afcb4079451` |
| `salary` | 2026-05-15 | 2500.00 | `Income:Salary` | `56e83e6ef0f8f1e7` |
| `repair-fuel` | 2026-05-19 | -42.30 | `Expenses:Transport:Fuel` | `9625a767cf66bf6d` |

IDs use the canonical normalization in
[`beancount-import/references/dedup.md`](../../../.claude/skills/beancount-import/references/dedup.md).
`expectations.json` records each complete hash input as well as its expected
ID, so a reviewer can check SHA-256 independently of an importer or its golden
files. For example:

```sh
printf '%s' '2026-04-03|-33.2 USD|TRADER JOES #123 SEATTLE WA|Assets:Bank:Checking' | shasum -a 256
```

The first 16 hexadecimal characters are `a8362f899f1ef12a`. Header names do not
participate in identity; the May 6 row must keep the same ID across both
formats. Expected results are a reviewed oracle, not output copied from a
generated golden file.

## Sequence and expected ledger effects

1. Start from `prior-ledger.beancount`: the opening plus two imported
   transactions, balance **926.80 USD** (`1000.00 - 33.20 - 40.00`). Authoring,
   golden review, and runner wiring do not change these ledger bytes.
2. Author against the original header format. `prior-history.csv` extracts
   two source legs but writes **zero** transactions when deduplicated against
   prior history. `activity.csv` extracts four source legs: skip its first two
   rows and approve exactly two new, balanced transactions. The ledger then
   has five transactions and **3398.05 USD** (`926.80 - 28.75 + 2500.00`). A
   repeat writes zero.
3. The original importer must reject `renamed-headers.csv`; no ledger change
   follows failed identification. Repair just the header mapping, preserve
   the original golden files, and review the new golden against its two rows.
   After repair, skip the May 6 overlap and approve only May 19 fuel. The
   ledger has six transactions and **3355.75 USD** (`3398.05 - 42.30`). A repeat
   writes zero.
4. `unrelated.csv` remains unclaimed before and after repair. Declining runner
   wiring leaves both the existing runner and the ledger byte-for-byte
   unchanged; the later walkthrough supplies the runner setup.

An importer extracts only the source posting. Its golden files are therefore
not balanced ledger fixtures. Deduplication, reviewed categorization, a
complete validated write, and `bea check` are separate steps; do not append
raw extraction to the ledger. These counts describe approved ledger effects,
not a promise that the Beangulp harness itself performs identity deduplication.
