# Migration sample data

All names, amounts, and IDs here are synthetic. Copy these files into a separate
run-owned workspace; never rehearse against personal books. The
[migration guide](../../migration.md) walks through them with the installed
customer skills, and `scripts/verify-migration.py` checks each checkpoint.

| File | Purpose |
| --- | --- |
| `monarch-export.csv` | Five-row Monarch export, 2026-03-05 … 2026-03-15; identical to beancount-migrate's `evals/files/eval2_monarch.csv` |
| `balances.md` | Independent checking anchors and a current-only savings balance |
| `balances-conflicting.md` | The same, except checking's claimed ending is 10.00 USD above its rows |
| `checking-overlap.csv` | Later checking export: only rows already migrated, including the transfer's checking side |
| `savings-overlap.csv` | Later savings export: only rows already migrated, including the transfer's savings side |
| `checking-april.csv` | Later checking export: one migrated transfer row and one genuinely new purchase |
| `expectations.json` | Source-row dispositions, expected import IDs, transactions, anchors, and checkpoints |

## Row dispositions

Five source rows become four history transactions. The 2026-03-10 transfer
appears once per account and merges into one transaction that keeps both
source identities: the checking row's ID as `import-id`, the savings row's as
`import-id-2`. No row is skipped.

| Row | Account | Amount | Disposition |
| ---: | --- | ---: | --- |
| 1 | Chase Checking → `Assets:Checking` | 2500.00 | `Income:Salary` |
| 2 | Chase Checking → `Assets:Checking` | -54.20 | `Expenses:Groceries` |
| 3 | Chase Checking → `Assets:Checking` | -500.00 | transfer pair with row 4 |
| 4 | Ally Savings → `Assets:Savings` | 500.00 | transfer pair with row 3 |
| 5 | Ally Savings → `Assets:Savings` | 1.25 | `Income:Interest` |

Row accounting: `5 rows = 3 transactions + 2 × 1 merged pair + 0 skipped`.
Every mapped account already exists in the `bea init` template, so the
migration opens no new accounts. Import IDs follow beancount-import's
`references/dedup.md`: `monarch:sha256:` plus the first 16 hex characters of
`<date>|<exact amount> USD|<Original Statement>|<ledger account>`.

## Balances

| Account | Opening (2026-03-04) | Kind | Ending, asserted 2026-03-16 |
| --- | ---: | --- | ---: |
| `Assets:Checking` | 500.00 | independent statement | 2445.80 |
| `Assets:Savings` | 1000.00 | derived from current balance | 1501.25 |

Source arithmetic: checking `500.00 + 2500.00 − 54.20 − 500.00 = 2445.80`;
savings `1501.25 − 500.00 − 1.25 = 1000.00`. Only checking's assertion is
independent evidence. The savings assertion confirms the derivation and says
nothing about rows missing from the export.

With `balances-conflicting.md`, checking's rows still sum to 2445.80 while the
statement claims 2455.80, a residual of **+10.00 USD** (statement minus
ledger). The expected result writes the history, openings, and the savings
assertion, leaves checking without an assertion, and adds no adjustment.

## Ongoing imports

The later exports are the banks' own CSVs: `Date,Description,Amount` with
positive deposits and negative withdrawals (`sign=bank`). `Description` is the
same raw text Monarch shows as `Original Statement`, so a bank row and its
migrated entry share one digest. The CSV mapping is in `expectations.json`.

| Export | Source account | Expected effect |
| --- | --- | --- |
| `checking-overlap.csv` | `Assets:Checking` | 0 written; both rows are already migrated |
| `savings-overlap.csv` | `Assets:Savings` | 0 written; the transfer matches through `import-id-2` |
| `checking-april.csv` | `Assets:Checking` | exactly 1 written: 2026-04-03 `-61.10` to `Expenses:Groceries`, `import-id: "csv:sha256:765112df24194e91"` |

Importing `checking-april.csv` a second time writes nothing. These overlap
results need `bea` 0.3.1 or later; 0.3.0 previews migrated rows as new.
