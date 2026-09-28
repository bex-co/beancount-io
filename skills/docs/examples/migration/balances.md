# Synthetic account balances — Monarch migration

Fictional sample data, not a real institution or customer.

The Monarch export covers 2026-03-05 through 2026-03-15. Balances below are
as of the **end of 2026-03-15**, the export's last day.

| Monarch account | Opening at start of 2026-03-05 | Ending at end of 2026-03-15 |
| --- | ---: | ---: |
| Chase Checking | 500.00 USD — from the February statement | 2445.80 USD — from the March statement |
| Ally Savings | not available | 1501.25 USD — shown in the bank app |

Chase Checking has two independent anchors. Its opening comes from a statement,
not from the export, so the ending assertion genuinely checks the migrated rows.

Ally Savings has only a current balance. Its opening must be derived as
`1501.25 − (500.00 + 1.25) = 1000.00` and labelled derived. The resulting
ending assertion is a consistency check of that derivation, not independent
evidence that the export contains every savings row.
