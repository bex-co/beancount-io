# BQL recipes — tested against beanquery (beancount v3)

All queries below are verified against beanquery ≥ 0.2. Run them with `bea --file "$ledger" --json --no-input query "$query"`; the shared command contract is in beancount-init's `references/bea-cli.md`. The explicit developer fallback is in beancount-init's `references/compatibility.md`. Adjust date literals (`2026-06-01`) to the resolved period; date literals are unquoted. `~` is regex match.

## Sign traps (read first)

- **Income accumulates negative** (−3000 salary means $3000 earned). Negate for prose or use `neg()`.
- **Expenses accumulate positive** — totals read naturally.
- **Spend in the currency paid:** `weight` is what a posting cost in the currency it settled in — a `{cost}` lot at its cost, and an `@`/`@@`-priced foreign charge (`300 EUR @ 1.10 USD`) at the 330 USD paid. Use `sum(weight)` / `number(weight)` for USD spending answers. `cost(position)` converts only `{cost}` lots, so a priced foreign charge stays `300 EUR` and its number is compared as if it were dollars; keep it for book-value balances. `sum(position)` returns raw units (multi-currency ledgers render mixed units), and market value needs price directives and `value(position)`.
- **Spending ≠ cash out**: transfers and credit-card payments move money between own accounts. Selecting `account ~ '^Expenses:'` is what makes the recipes immune to that trap.

## 1. Top expenses (period)

<!-- recipe: top-expenses -->
```sql
SELECT account, sum(weight) as total
WHERE account ~ '^Expenses:' AND date >= 2026-06-01 AND date < 2026-07-01
GROUP BY account ORDER BY total DESC
```

Half-open period (`>= first, < first-of-next`) — never `<= last-day`, it drops nothing but reads wrong on time-of-day semantics elsewhere; consistency wins. Per-merchant variant: select `coalesce(payee, narration) as merchant` and `GROUP BY merchant` (imported one-description rows have an empty payee).

## 2. Monthly trend for one category

<!-- recipe: category-trend -->
```sql
SELECT year(date) as year, month(date) as month, sum(weight) as total
WHERE account = 'Expenses:Food:Groceries'
GROUP BY year, month ORDER BY year, month
```

Subtree instead of one account: `account ~ '^Expenses:Food:'`.

## 3. Net worth (book value)

<!-- recipe: net-worth -->
```sql
SELECT sum(cost(position)) as net_worth WHERE account ~ '^Assets:|^Liabilities:'
```

This is **cost basis**, not market value — say so when the ledger holds investments. Market value needs price directives and `value(position)`; if prices are missing, report that instead of a wrong number. Point at Fava's Balance Sheet for the browsable version.

## 4. Monthly burn (total spending per month)

<!-- recipe: monthly-burn -->
```sql
SELECT year(date) as year, month(date) as month, sum(weight) as spent
WHERE account ~ '^Expenses:'
GROUP BY year, month ORDER BY year, month
```

"Burn" for prosumers = expenses per month; net burn (spend − income) is this minus the same query over `^Income:` (negated). Flag outlier months rather than averaging over them silently.

## 5. Recurring charges & price creep

Candidates — same merchant hitting Expenses repeatedly. A merchant is the payee, or the narration when the payee is empty: `bea import` maps a one-description bank CSV to the narration, so grouping by `payee` alone lumps every imported row into one empty group.

<!-- recipe: recurring-candidates -->
```sql
SELECT merchant, count(id) as n, sum(total) as total
FROM (SELECT coalesce(payee, narration) as merchant, id, sum(weight) as total
      WHERE account ~ '^Expenses:' GROUP BY merchant, id)
GROUP BY merchant ORDER BY n DESC
```

BQL returns one row per posting, so the inner query first folds each transaction (its `id`) into one row: `n` counts charges, not postings — a monthly charge with a sales-tax line is still one charge a month, and a split purchase is one.

A merchant with n ≈ months-in-ledger and steady amounts is a subscription; groceries/gas also recur — distinguish by *amount regularity*, and say which you excluded and why. Then per-merchant history to spot creep, using the `merchant` value from the candidates:

<!-- recipe: merchant-history -->
```sql
SELECT date, sum(weight) as amount
WHERE account ~ '^Expenses:' AND coalesce(payee, narration) = 'NETFLIX'
GROUP BY id, date ORDER BY date
```

One row per charge, its expense legs summed (a 15.49 plan plus 1.40 tax is one 16.89 charge); drop the `GROUP BY` and `sum` to show the legs separately, and say so. Report creep as "was X through <date>, now Y (+Z%)".

## 6. Anomalies (unusually large transactions)

<!-- recipe: anomalies -->
```sql
SELECT date, payee, narration, sum(weight) as amount
WHERE account ~ '^Expenses:'
GROUP BY id, date, payee, narration HAVING sum(number(weight)) > 200 ORDER BY date
```

The threshold applies to each transaction's expense total, so a $260 purchase split across two categories still crosses $200; grouping by `id` keeps two same-day charges at one merchant apart. Set the threshold from context (e.g. ~3× the category's typical charge), and say what threshold you used. For "did anything unusual happen in <month>", combine with the period predicate from recipe 1.

## 7. Account balances / statement-style checks

<!-- recipe: account-balances -->
```sql
SELECT account, sum(cost(position)) as balance
WHERE account ~ '^Assets:|^Liabilities:' GROUP BY account ORDER BY account
```

Point-in-time: add `AND date < 2026-07-01`. For "does this match my bank" → that's `beancount-reconcile`, not a query. For an account's dated postings with a running balance, run `bea report register ACCOUNT` instead of querying — its last row is the trial-balance total.

## 8. Holdings, market value, and unrealized gains (open lots)

"What do I hold, what is it worth, how is it allocated?" Start with the command, not a query:

```bash
bea --file "$ledger" --json --no-input report holdings [--group-by commodity]
```

It answers units, average cost, cost basis, and market value per position, labels values from stale quotes, and reports unpriced commodities in `missing_prices` instead of valuing them. Use the BQL below only for what the command does not answer: per-lot costs, unrealized gains, and allocation. Open lots first — every lot still held, at its own cost:

<!-- recipe: holdings-lots -->
```sql
SELECT account, currency AS commodity, cost_number, cost_date, sum(number) AS units,
  sum(number * cost_number) AS cost, cost_currency
WHERE cost_number IS NOT NULL
GROUP BY account, commodity, cost_number, cost_date, cost_currency
HAVING sum(number) != 0 ORDER BY account, commodity, cost_date
```

Market value needs a `price` directive per commodity, and `value(position)` has a trap: with no price it quietly returns the raw units (`10 ACME` values as the number 10). The guard is `currency(value(position))` — it equals the cost currency only when a price converted the lot. List what cannot be valued before valuing anything:

<!-- recipe: holdings-unpriced -->
```sql
SELECT account, currency AS commodity, sum(number) AS units
WHERE cost_number IS NOT NULL AND currency(value(position)) != cost_currency
GROUP BY account, commodity HAVING sum(number) != 0
```

Name every row of that output as unpriced (units and cost from `holdings-lots`, no market figure), and value only the rest — per lot, so the unrealized gain is the engine's subtraction, never prose arithmetic:

<!-- recipe: holdings-lots-market -->
```sql
SELECT account, currency AS commodity, cost_date, cost_currency, sum(number) AS units,
  sum(number * cost_number) AS cost, sum(number(value(position))) AS market,
  sum(number(value(position))) - sum(number * cost_number) AS unrealized
WHERE cost_number IS NOT NULL AND currency(value(position)) = cost_currency
GROUP BY account, commodity, cost_date, cost_currency
HAVING sum(number) != 0 ORDER BY account, commodity, cost_date
```

`value()` reads the latest `price` on or before today, so also quote which price each figure rests on — the last row per commodity:

<!-- recipe: holdings-prices -->
```sql
SELECT date, currency, amount FROM #prices ORDER BY currency, date
```

Allocation: bind `<total_market>` to the engine's own total for the same cost currency, then let the engine divide. Never sum or divide across cost currencies; run the pair once per cost currency present.

<!-- recipe: holdings-market-total -->
```sql
SELECT cost_currency, sum(number(value(position))) AS total_market
WHERE cost_number IS NOT NULL AND currency(value(position)) = cost_currency
GROUP BY cost_currency
```

<!-- recipe: holdings-allocation -->
```sql
SELECT commodity, cost_currency, market, 100 * market / <total_market> AS share_pct
FROM (SELECT currency AS commodity, cost_currency,
        sum(number(value(position))) AS market
      WHERE cost_number IS NOT NULL AND currency(value(position)) = cost_currency
      GROUP BY commodity, cost_currency)
ORDER BY market DESC
```

Cash in investment accounts is not a lot and appears in none of these; say whether the allocation is over invested lots only. Realized gains (closed lots) are beancount-trade's `references/realized-gains.md`; recording a trade is `beancount-trade`, and refreshing stale prices is the price workflow, not a query.

## 9. Variance: why did this category change?

A variance answer compares one account (or subtree) across two periods under a **threshold policy the user states** — there is no built-in percentage that makes a change "worth explaining". Ask for, or state and confirm: the absolute threshold, the relative threshold, whether both must trip (AND) or either (OR), the denominator (comparator period by default), and any always-comment accounts that are explained regardless. The old upstream habit of a universal 5% fallback is not a rule here.

Run the same totals query for the current period and the comparator period (half-open bounds, as everywhere in this file):

<!-- recipe: variance-total -->
```sql
SELECT sum(weight) AS total WHERE account ~ '<account-re>' AND date >= <start> AND date < <end>
```

Then the contributing postings behind the delta — every driver claim in the answer must trace to rows from this query, in both periods:

<!-- recipe: variance-drivers -->
```sql
SELECT date, payee, narration, cost(position) AS amount WHERE account ~ '<account-re>' AND date >= <start> AND date < <end> ORDER BY date
```

Rules the prose must obey:

- **Zero or negative comparator**: report the absolute delta and render the percentage as **not applicable** — never divide by a zero or negative base and never present the resulting number as a growth rate.
- **A missing budget is missing**: when the user asks "versus budget" and the ledger holds no budget figures, say the budget is absent. An absent comparator is never rendered as zero (which would fabricate an infinite variance).
- **Drivers need postings**: a claimed cause ("the jump is the BEST BUY purchase on 2026-05-28") cites its posting rows. Anything without posting evidence is labelled a **hypothesis**, and when the postings do not support an explanation the answer is **unresolved** — a posting's narration describes what was bought, never why.
- **Bridges only with inputs**: a price/volume-style split is produced only when the ledger actually holds the quantities and prices it needs, and its components must sum to the actual delta; otherwise report the account/payee movement explanation and stop.

## Fava pointers

Top expenses / burn → Income Statement (filtered by time); net worth → Balance Sheet / Net Worth chart; holdings → Holdings; per-payee history → Journal with `payee:"NETFLIX"` filter; account balances → Trial Balance. Give the user the Fava path when they want to browse rather than ask again.
