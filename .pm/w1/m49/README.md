# w1 · m49 — A period's income and expenses have one value, whatever the interval

**Worker:** worker1 **Goal:** under a currency conversion or `at_value`, every Income and Expenses posting is valued at the price on its own date, so an income statement's account trees, `Net Profit` and interval rows agree at every interval, in `bea` and in the hosted ledger service **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | `bea`: value Income and Expenses postings at their own date in the income statement, overview, balance sheet earnings and trial balance | 60m | — |
| t002 | `bea`: `USAGE.md` states the flow valuation rule and where the translation goes | 20m | t001 |
| t003 | Hosted ledger service: the income statement, overview and trial balance value flows at their own date | 60m | — |
| t004 | Adoption surface | 20m | t002, t003 |
| t005 | Simplify | 20m | t004 |
| t006 | Test coverage | 30m | t004 |
| t007 | Closeout | 15m | t005, t006 |

## Definition of done

On the repro ledger below, under the default conversion (`USD`):

- `bea report income-statement` reads `Travel 300.00 USD` and `Net Profit: -300.00 USD` at `-i monthly` (rows 100.00 + 200.00), `-i weekly` (100.00 + 200.00) and `-i yearly` (one row of 300.00); `--json` `net_profit` equals the sum of `periods[].net_profit` at each interval.
- `bea report overview` reads `Expenses: 300.00 USD` above monthly rows of 100.00 and 200.00.
- `bea report balance-sheet` reads `Current-period earnings (credit): 300.00 USD`, `Valuation/translation adjustment (credit): 100.00 USD` and `Total equity (credit): -1,600.00 USD`, and its Net Profit sentence says -300.00 USD; `report trial-balance` and `bea balance` read `Expenses 300.00 USD` with a 100.00 USD valuation line.
- A ledger whose prices never move reads exactly as before; `-x units` and `-x at_cost` read 200.00 EUR in the headline and 100.00 + 100.00 EUR in the rows, as before; a flow posting held at cost (`Expenses:Charity 5 VOO {400 USD}`) is valued at the VOO price on its own date under `at_value` and `USD`.
- The hosted ledger service's income statement, overview and trial balance return the same 300.00 figures for the same ledger (unit tests over the service), so REST, GraphQL and MCP, which all read it, agree with `bea`.
- `make check-all` (cli) and the ledger package's `yarn lint`, `yarn typecheck`, `yarn test` and `yarn verify:rustledger` pass.

## Repro

```beancount
option "operating_currency" "USD"
2026-01-01 open Assets:Euro EUR
2026-01-01 open Expenses:Travel EUR
2026-01-01 open Equity:Opening EUR
2026-01-01 price EUR 1.00 USD
2026-01-02 * "Opening"
  Assets:Euro  1000.00 EUR
  Equity:Opening
2026-01-15 * "Trip one"
  Expenses:Travel  100.00 EUR
  Assets:Euro
2026-02-01 price EUR 2.00 USD
2026-02-15 * "Trip two"
  Expenses:Travel  100.00 EUR
  Assets:Euro
```

At `90a86ab44` the income statement's trees read `Travel 400.00 USD` and `Net Profit: -400.00 USD` above monthly rows of 100.00 + 200.00 USD; `-i yearly` reads 400.00 and `-i weekly` 300.00. The overview reads `Expenses: 400.00 USD` above the same 100 + 200 rows, and the balance sheet reads `Current-period earnings (credit): 400.00 USD` with a 0.00 adjustment. The control `bea query "SELECT sum(convert(position, 'USD', date)) …"` reads 300 USD at each posting's date and 400 USD at the latest price.

## Cause

The trees come from `ChartModule.hierarchy` (`cli/src/fava/modules/chart.py`), which values each account's whole period inventory once, at the report's as-of date. The rows come from `ChartModule.interval_totals`, which values each bucket at its own end. The overview, the balance sheet's `current_earnings` and the trial balance's Income and Expenses roots read the same trees. The hosted service builds `accountHierarchy(…, valuationDate)` beside per-interval `intervalTotals(…)` in `backend-cluster/ledger/src/features/ledger/service/ledger-finance-service.ts`, so the dashboard's Income Statement page under a currency selection, and REST, GraphQL and MCP, show the same split.

## Out of scope

- Balances (assets, liabilities, equity, net worth and every balance series) keep their as-of valuation; the balance sheet's existing `Valuation/translation adjustment` line takes the difference.
- The hosted balance sheet: it has Fava's equity shape (income and expenses closed into `Equity:Earnings:Current` and valued with every other equity balance, conversions and unrealized gains booked so the sheet nets) and no current-earnings or adjustment line. Giving it the income statement's earnings needs a translation line in its response contract, a separate change.
- `units` and `at_cost` reports, `report budget` (never converts) and `report capital-gains` (cost currency).

## Source + Goal linkage

- **Source:** promoted from inbox note w1/336 (routine cli-qa, 2026-11-20) during `/loopx w1` triage on 2026-11-20: the fix spans the `bea` engine, its usage guide and the hosted ledger service, more than an hour across several tasks.
- **Evidence:** reproduced at `90a86ab44` with `bea 0.5.0` from the checkout (repro above). `cli/docs/USAGE.md` already promises "actual period rows with the same signed income and expenses as the account trees" and that "a later quote cannot value an earlier interval"; the headline breaks both for January's trip. [w5/617](../../w5/done/617.md) treated weekly rows that summed to 960 under a 965 headline as a bug, and [w1/252](../done/252.md) values register rows at their own date. Translating income and expenses at the rate on the day they happened, and balances at the closing rate, is the usual convention for foreign-currency books.
- **Goal linkage:** **A1 — Agent-native accounting**: an agent that totals `periods[].net_profit` from `--json`, or reconciles the monthly table against the headline, gets one answer instead of two, and that answer is what the spending cost on the days it happened.
- **Expected outcome:** a person or agent keeping books with foreign-currency spending sees one figure for a period's income and expenses in every view — headline, rows at any interval, overview, balance sheet, trial balance — in `bea` and on the hosted surfaces.
- **Why now:** the default conversion is the operating currency, so every single-operating-currency ledger with foreign spending and a moving rate shows the split today.
- **Adoption surface:** included — the change alters figures in user-facing `bea` reports and the hosted statements, and their documentation.
