# BQL cookbook — tested query recipes

Twenty-two copy-paste recipes for the questions newcomers ask first: where the
money went, what recurs, what is uncategorized, what the lot is worth. Every
marked query on this page is executed by CI against its declared fixture
ledger (`scripts/skills/verify-bql-cookbook.py`); a recipe that errors, returns
zero rows, or names a missing fixture fails the build.

Run any recipe with:

```sh
bea --file "$ledger" --json --no-input query "<query>"
```

## Fixtures

| fixture | ledger | covers |
|---|---|---|
| `personal` | `$SKILLS_SRC/skills/beancount-ask/evals/files/eval1_ledger.beancount` | Apr–Jun 2026 household: salary, groceries, gas, streaming, one $500 monitor, savings transfers, Amex payments |
| `investor` | `$SKILLS_SRC/skills/beancount-ask/evals/files/eval10_ledger.beancount` | Brokerage VTI/ACME lots plus BTC; prices for VTI and BTC, ACME unpriced |
| `variance` | `$SKILLS_SRC/skills/beancount-ask/evals/files/eval17_ledger.beancount` | Supplies with a May refund and a June purchase |
| `cleanup` | `$SKILLS_SRC/docs/skills/examples/bql-cookbook/cookbook-ledger.beancount` | Fresh-import mess: an uncategorized row, a EUR charge, a transfer in suspense, one `!` flag |

Before writing your own queries, read the sign traps in
`skills/beancount-ask/references/bql-recipes.md` (income accumulates negative;
`weight` is what a posting cost in the currency it settled in). Periods below
are half-open (`>= first, < first-of-next`).

## Spending

Where the money went, by account, month, category, and payee.

### Spend by account in one month

<!-- cookbook: spend-by-account | fixture: skills/beancount-ask/evals/files/eval1_ledger.beancount -->
```sql
SELECT account, sum(weight) as total
WHERE account ~ '^Expenses:' AND date >= 2026-06-01 AND date < 2026-07-01
GROUP BY account ORDER BY total DESC
```

*Expected shape: 3 rows — Groceries 141.60, Gas 50.00, Streaming 17.99.*

### Spend by month

<!-- cookbook: spend-by-month | fixture: skills/beancount-ask/evals/files/eval1_ledger.beancount -->
```sql
SELECT year(date) as year, month(date) as month, sum(weight) as spent
WHERE account ~ '^Expenses:'
GROUP BY year, month ORDER BY year, month
```

*Expected shape: 3 rows — 200.99, 707.89 (the $500 monitor), 209.59.*

### One category's monthly trend

<!-- cookbook: category-trend | fixture: skills/beancount-ask/evals/files/eval1_ledger.beancount -->
```sql
SELECT year(date) as year, month(date) as month, sum(weight) as total
WHERE account = 'Expenses:Food:Groceries'
GROUP BY year, month ORDER BY year, month
```

*Expected shape: 3 rows — 145.50, 147.40, 141.60. Use `account ~ '^Expenses:Food:'` for a subtree.*

### Top payees

<!-- cookbook: top-payees | fixture: skills/beancount-ask/evals/files/eval1_ledger.beancount -->
```sql
SELECT coalesce(payee, narration) AS merchant, count(id) AS n, sum(weight) AS total
WHERE account ~ '^Expenses:'
GROUP BY merchant ORDER BY total DESC
```

*Expected shape: 5 rows — BEST BUY 500.00 down to NETFLIX 48.97. Imported one-description rows have an empty payee, hence `coalesce`.*

### Net saved per month (savings rate input)

<!-- cookbook: net-saved | fixture: skills/beancount-ask/evals/files/eval1_ledger.beancount -->
```sql
SELECT year(date) AS year, month(date) AS month, -sum(number(weight)) AS net_saved
WHERE account ~ '^Income:|^Expenses:'
GROUP BY year, month ORDER BY year, month
```

*Expected shape: 3 rows — 2799.01, 2292.11, 2790.41. Divide by the month's income (same query over `^Income:` with `-sum(number(weight))`, 3000.00 every month here) for the rate. Negate the `number()`, not the `sum()`: `-sum(weight)` fails on multi-row inventories.*

### Recurring-charge candidates

<!-- cookbook: recurring-candidates | fixture: skills/beancount-ask/evals/files/eval1_ledger.beancount -->
```sql
SELECT merchant, count(id) as n, sum(total) as total
FROM (SELECT coalesce(payee, narration) as merchant, id, sum(weight) as total
      WHERE account ~ '^Expenses:' GROUP BY merchant, id)
GROUP BY merchant ORDER BY n DESC
```

*Expected shape: 5 rows — four merchants at n = 3, BEST BUY at n = 1. The inner query folds each transaction id to one row so `n` counts charges, not postings.*

### One merchant's history (price creep)

<!-- cookbook: merchant-history | fixture: skills/beancount-ask/evals/files/eval1_ledger.beancount -->
```sql
SELECT date, sum(weight) as amount
WHERE account ~ '^Expenses:' AND coalesce(payee, narration) = 'NETFLIX'
GROUP BY id, date ORDER BY date
```

*Expected shape: 3 rows — 15.49, 15.49, 17.99 (the June price rise).*

### Unusually large charges

<!-- cookbook: anomalies | fixture: skills/beancount-ask/evals/files/eval1_ledger.beancount -->
```sql
SELECT date, payee, narration, sum(weight) as amount
WHERE account ~ '^Expenses:'
GROUP BY id, date, payee, narration HAVING sum(number(weight)) > 200 ORDER BY date
```

*Expected shape: 1 row — the BEST BUY 500.00 monitor on 2026-05-28. Set the threshold from context (~3× the category's typical charge).*

## Cleanup

The review queue after an import: uncategorized rows, unmatched transfers, review flags, and foreign charges.

### Uncategorized postings

<!-- cookbook: uncategorized | fixture: docs/skills/examples/bql-cookbook/cookbook-ledger.beancount -->
```sql
SELECT date, payee, narration, position
WHERE account = 'Expenses:Uncategorized'
ORDER BY date
```

*Expected shape: 1 row — SQ *COFFEE CART 42.17 on 2026-06-15. Categorize each row into an existing account, or keep it visibly flagged.*

### Transfers still in suspense

<!-- cookbook: unmatched-transfers | fixture: docs/skills/examples/bql-cookbook/cookbook-ledger.beancount -->
```sql
SELECT date, payee, narration, position
WHERE account = 'Assets:Suspense'
ORDER BY date
```

*Expected shape: 1 row — the 250.00 brokerage transfer of 2026-06-18. Money that left but whose other side has not imported yet sits in a suspense account; this lists what is still waiting.*

### Review flags before close

<!-- cookbook: flag-sweep | fixture: docs/skills/examples/bql-cookbook/cookbook-ledger.beancount -->
```sql
SELECT id, date, flag, payee, narration
WHERE flag = '!' AND date < 2026-07-01
GROUP BY id, date, flag, payee, narration ORDER BY date
```

*Expected shape: 1 row — the WHOLE FOODS receipt-missing flag of 2026-06-20. Bind the date to the first day after the period being closed.*

### Foreign charges: what was actually paid

<!-- cookbook: foreign-spend | fixture: docs/skills/examples/bql-cookbook/cookbook-ledger.beancount -->
```sql
SELECT payee, sum(number(weight)) AS paid_usd, sum(number(cost(position))) AS cost_number
WHERE account = 'Expenses:Food:Groceries'
GROUP BY payee ORDER BY paid_usd DESC
```

*Expected shape: 3 rows — HOTEL IBIS paid 330.00 with cost-number 300 (a 300 EUR charge at 1.10); the USD rows agree. `weight` is what a posting cost in the currency it settled in, so it is the column for spending answers.*

## Balances

Point-in-time and per-account balances, plus one account's dated postings.

### Net worth (book value)

<!-- cookbook: net-worth | fixture: skills/beancount-ask/evals/files/eval1_ledger.beancount -->
```sql
SELECT sum(cost(position)) as net_worth WHERE account ~ '^Assets:|^Liabilities:'
```

*Expected shape: 1 row — 14581.53. This is cost basis, not market value; market value needs price directives and `value(position)`.*

### Balance per account

<!-- cookbook: account-balances | fixture: skills/beancount-ask/evals/files/eval1_ledger.beancount -->
```sql
SELECT account, sum(cost(position)) as balance
WHERE account ~ '^Assets:|^Liabilities:' GROUP BY account ORDER BY account
```

*Expected shape: 3 rows — Checking 8880.51, Savings 6500.00, Amex -798.98. Add `AND date < 2026-06-01` for a point-in-time balance.*

### One account's dated postings

<!-- cookbook: account-postings | fixture: skills/beancount-ask/evals/files/eval1_ledger.beancount -->
```sql
SELECT date, payee, narration, position
WHERE account = 'Assets:Bank:Checking' AND date >= 2026-06-01 AND date < 2026-07-01
ORDER BY date
```

*Expected shape: 3 rows — salary +3000.00, savings transfer -500.00, groceries -63.40. For a running balance, run `bea report register ACCOUNT` instead; its last row is the trial-balance total.*

## Investments

Open lots at cost, what cannot be priced, market value, and allocation. Cash in investment accounts is not a lot and appears in none of these.

### Open lots at own cost

<!-- cookbook: holdings-lots | fixture: skills/beancount-ask/evals/files/eval10_ledger.beancount -->
```sql
SELECT account, currency AS commodity, cost_number, cost_date, sum(number) AS units,
  sum(number * cost_number) AS cost, cost_currency
WHERE cost_number IS NOT NULL
GROUP BY account, commodity, cost_number, cost_date, cost_currency
HAVING sum(number) != 0 ORDER BY account, commodity, cost_date
```

*Expected shape: 4 rows — ACME 10 @ 50.00, VTI 10 @ 100.00, VTI 10 @ 120.00, BTC 0.5 @ 40000.00.*

### What cannot be valued

<!-- cookbook: holdings-unpriced | fixture: skills/beancount-ask/evals/files/eval10_ledger.beancount -->
```sql
SELECT account, currency AS commodity, sum(number) AS units
WHERE cost_number IS NOT NULL AND currency(value(position)) != cost_currency
GROUP BY account, commodity HAVING sum(number) != 0
```

*Expected shape: 1 row — ACME 10. `value()` with no price quietly returns raw units, so this guard (`currency(value(position))` equals the cost currency only when a price converted the lot) runs before any valuation.*

### Per-lot market value and unrealized gain

<!-- cookbook: holdings-lots-market | fixture: skills/beancount-ask/evals/files/eval10_ledger.beancount -->
```sql
SELECT account, currency AS commodity, cost_date, cost_currency, sum(number) AS units,
  sum(number * cost_number) AS cost, sum(number(value(position))) AS market,
  sum(number(value(position))) - sum(number * cost_number) AS unrealized
WHERE cost_number IS NOT NULL AND currency(value(position)) = cost_currency
GROUP BY account, commodity, cost_date, cost_currency
HAVING sum(number) != 0 ORDER BY account, commodity, cost_date
```

*Expected shape: 3 rows — VTI 1000.00 → 3000.00 (+2000.00), VTI 1200.00 → 3000.00 (+1800.00), BTC 20000.00 → 30000.00 (+10000.00). `value()` reads the latest price on or before today.*

### Market total per cost currency

<!-- cookbook: holdings-market-total | fixture: skills/beancount-ask/evals/files/eval10_ledger.beancount -->
```sql
SELECT cost_currency, sum(number(value(position))) AS total_market
WHERE cost_number IS NOT NULL AND currency(value(position)) = cost_currency
GROUP BY cost_currency
```

*Expected shape: 1 row — USD 36000.00000000. Bind this total into the allocation query; never sum across cost currencies.*

### Allocation over invested lots

<!-- cookbook: holdings-allocation | fixture: skills/beancount-ask/evals/files/eval10_ledger.beancount -->
```sql
SELECT commodity, cost_currency, market, 100 * market / 36000.00000000 AS share_pct
FROM (SELECT currency AS commodity, cost_currency,
        sum(number(value(position))) AS market
      WHERE cost_number IS NOT NULL AND currency(value(position)) = cost_currency
      GROUP BY commodity, cost_currency)
ORDER BY market DESC
```

*Expected shape: 2 rows — BTC 83.33%, VTI 16.67%. The divisor is the engine's own total from the previous recipe; rebind it whenever the ledger changes.*

## Variance

Why one account changed between two periods.

### One account's total per period

<!-- cookbook: variance-total | fixture: skills/beancount-ask/evals/files/eval17_ledger.beancount -->
```sql
SELECT sum(weight) AS total WHERE account ~ '^Expenses:Supplies' AND date >= 2026-06-01 AND date < 2026-07-01
```

*Expected shape: 1 row — 200.00 (May is -100.00, the refund). Run once per period with half-open bounds, then compare.*

### Postings behind the delta

<!-- cookbook: variance-drivers | fixture: skills/beancount-ask/evals/files/eval17_ledger.beancount -->
```sql
SELECT date, payee, narration, cost(position) AS amount WHERE account ~ '^Expenses:Supplies' AND date >= 2026-05-01 AND date < 2026-07-01 ORDER BY date
```

*Expected shape: 2 rows — the -100.00 May refund and the 200.00 June purchase. Every driver claim in an answer must trace to rows from this query; anything without posting evidence is a hypothesis.*
