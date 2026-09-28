# Synthetic account balances with a conflict — Monarch migration

Deliberately inconsistent fictional data. Use it only in a separate workspace,
instead of `balances.md`.

Balances are as of the **end of 2026-03-15**, the export's last day.

| Monarch account | Opening at start of 2026-03-05 | Ending at end of 2026-03-15 |
| --- | ---: | ---: |
| Chase Checking | 500.00 USD — from the February statement | **2455.80 USD** — claimed by the March statement |
| Ally Savings | not available | 1501.25 USD — shown in the bank app |

Checking's independent opening plus its exported rows gives 2445.80 USD. That is
10.00 USD below the claimed ending, and nothing in the export explains the gap.
The user does not accept a residual or adjustment in this branch, so checking
stays unpinned: no balance assertion, no `Equity:Migration-Residual` posting,
and no claim that checking ties out. Savings still ties out, from its derived
opening.
