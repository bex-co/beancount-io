# Report pack contract

## Inputs

- A local ledger root and a `bea --time` period. The script reads the root file and every file it `include`s and records their SHA-256 digests; URL includes and plugin inputs are outside the digest (EVIDENCE.md says so). If any digested file changes while the pack is being built, the build stops: a pack never mixes two states of the books.
- Valuation: `bea`'s default for balance sheet, income statement, trial balance and holdings, or the single `--conversion` the user chose, applied to all four. Cash flow always runs at cost.

## Files

| File | From | Notes |
| --- | --- | --- |
| `balance-sheet.csv`, `income-statement.csv`, `trial-balance.csv`, `holdings.csv`, `cash-flow.csv` | `bea report KIND --time … --format csv` | The CSV contract is in the CLI usage guide (Reports as CSV): exact decimals, one row per currency, an empty amount for a balance that cannot be valued, a tree account's own balance. |
| `SUMMARY.md` | the reports' JSON | Status, headline figures, tie-outs, left-visible gaps |
| `EVIDENCE.md` | the run | Input digests, each output's row count, SHA-256 and command |

## Tie-outs

Each compares figures produced by different reports (or by an independent query), per currency, in Beancount signs.

| Check | Passes when |
| --- | --- |
| Balance sheet balances | assets + liabilities + total equity (equity plus current earnings and any valuation adjustment) = 0 |
| Profit ties across statements | income-statement net profit + balance-sheet current earnings = 0 |
| Trial balance agrees with the statements | each root total in the trial balance equals the same root in the balance sheet or income statement |
| Cash rolls forward | opening cash + net change = closing cash; a gap passes only up to the cash-flow report's disclosed `rounding_residual` |
| Closing cash is independently recomputed | a BQL sum of the cash accounts' postings through the period end equals closing cash |

A check is **pass**, **FAIL** (a difference is shown), or **skipped** (a balance could not be valued, or the ledger has no cash accounts); a skipped check never counts as a pass, and the status line says `RECONCILED (some checks skipped)`. One failure makes the status `NOT RECONCILED` and exit status 3.

## Left visible

Reported, never resolved: cash-flow classes chosen by account name instead of a declared `cash-flow-role`; unknown role values; balances in accounts named `…Uncategorized…`; transactions flagged `!` in the period; accounts outside the five roots; price sources that are stale or in error.

## Non-goals

XLSX or PDF output, statutory or audited statements, tax computation, comparatives and budgets (use the reports directly), and bank-statement tie-out (beancount-reconcile).
