# Realized gains for a year

Read-only. Every figure comes from the shown `bea` output quoted with
the answer — never from arithmetic done in prose. `$year_start` is the year's
first day, `$year_end` the next year's first day.

Start with the command, not a query:

```sh
bea --file "$ledger" --json --no-input report capital-gains --from-date 2026-01-01 --to-date 2026-12-31
```

It lists one row per closed lot — account, commodity, acquired and sold
dates, held days, quantity, proceeds, basis, and gain — and buckets the
totals into held one year or less vs more than one year (a bare day count
with no tax rules attached). Both bounds are inclusive, so the to-date is
the year's last day, where the queries below compare against the next
year's first day (`$year_end`). A closed lot is a reducing posting that
carries both cost and price: splits and own-account transfers reduce lots
without a price and stay out. Amounts are in each row's cost currency —
never sum across currencies.

**Tie-out.** The per-lot gains must equal what was actually booked to the
ledger's gains account(s) that year — the one thing the command does not
answer. `$gains_pattern` matches the ledger's own naming (for example
`CapitalGains`); run it once per cost currency present above:

<!-- recipe: realized-gains-booked -->
```sh
bea --file "$ledger" --json --no-input query "SELECT -sum(number) AS booked_gain WHERE account ~ '$gains_pattern' AND currency = '$currency' AND date >= $year_start AND date < $year_end"
```

Quote both outputs. If they disagree, say so and show both figures — a
difference means a gain was booked somewhere the lot rows do not explain
(a typed-in gain, a missing price, a differently named account). Never
adjust a row or a total to force the tie.

The queries behind the command, for windows it does not carve (a custom
predicate, a per-lot filter the flags cannot express) — the per-lot rows:

<!-- recipe: realized-gains -->
```sh
bea --file "$ledger" --json --no-input query "SELECT account, currency AS commodity, cost_date AS acquired, date AS sold, (date - cost_date) AS held_days, -number AS quantity, -number * number(price) AS proceeds, -number * cost_number AS cost, (-number * number(price)) - (-number * cost_number) AS gain, cost_currency WHERE number < 0 AND price IS NOT NULL AND cost_number IS NOT NULL AND date >= $year_start AND date < $year_end ORDER BY date"
```

Then the engine-computed subtotals per holding bucket and cost currency:

<!-- recipe: realized-gains-totals -->
```sh
bea --file "$ledger" --json --no-input query "SELECT (date - cost_date) > 365 AS long_held, cost_currency, sum((-number * number(price)) - (-number * cost_number)) AS gain WHERE number < 0 AND price IS NOT NULL AND cost_number IS NOT NULL AND date >= $year_start AND date < $year_end GROUP BY long_held, cost_currency"
```

**Not covered:** open lots and unrealized gains (nothing here prices a
position still held — those are beancount-ask's holdings recipes in its
`references/bql-recipes.md`), positions without prices, wash sales, FX gains on
cash balances, and any tax form or jurisdiction rule. A reduction whose
posting carries no price is not a sale here; if the user says one was,
that is a fact to surface, not to price by guessing.
