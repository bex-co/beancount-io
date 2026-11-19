# Realized gains for a year

Read-only. Every figure comes from the shown `bea` output quoted with
the answer — never from arithmetic done in prose. `$year_start` is the year's
first day, `$year_end` the next year's first day.

**Answer contract:** show every closed lot's acquisition date, sale date,
quantity, proceeds, cost basis, gain, and holding bucket (one year or less, or
more than one year), alongside the booked-gains tie-out. State explicitly that
open lots and unrealized gains are excluded. Keep these fields and exclusions
in the user-facing answer as well as the reproducible commands.

Start with the command, not a query:

```sh
bea --file "$ledger" --json --no-input report capital-gains --from-date 2026-01-01 --to-date 2026-12-31
```

It lists one row per closed lot — account, commodity, acquired and sold
dates, held days, quantity, proceeds, basis, and gain — and buckets the
totals into held one year or less vs more than one year (by calendar
date, with no tax rules attached: a lot is long only when it sold after
the acquisition date's anniversary, so a lot held exactly one year is
short even when that year had 366 days). Both bounds are inclusive, so the to-date is
the year's last day, where the queries below compare against the next
year's first day (`$year_end`). A closed lot is a reducing posting that
carries both cost and price. A reduction without a price states no proceeds,
so it is never a row: splits and own-account transfers (the same transaction
takes the commodity back in) stay out silently, and any other one is listed
under `unpriced_reductions` with its `file` and `line`. `bea` 0.4.1 and
earlier lack that field and drop such a sale without notice, so there the
tie-out below is the only sign of one. Amounts are in each row's cost
currency — never sum across currencies.

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
(a typed-in gain, a missing price, a differently named account). Each entry
in `unpriced_reductions` is one such sale: name its `file:line` and say that
adding the sale price (`@ PRICE`) to that posting reports it. Never adjust a
row or a total to force the tie.

The queries behind the command, for windows it does not carve (a custom
predicate, a per-lot filter the flags cannot express) — the per-lot rows:

<!-- recipe: realized-gains -->
```sh
bea --file "$ledger" --json --no-input query "SELECT account, currency AS commodity, cost_date AS acquired, date AS sold, (date - cost_date) AS held_days, -number AS quantity, -number * number(price) AS proceeds, -number * cost_number AS cost, (-number * number(price)) - (-number * cost_number) AS gain, cost_currency WHERE number < 0 AND price IS NOT NULL AND cost_number IS NOT NULL AND date >= $year_start AND date < $year_end ORDER BY date"
```

Then the engine-computed subtotals per holding bucket and cost currency
(`long_held` compares calendar dates the way the command does, so a lot
held exactly one year across 29 February stays short):

<!-- recipe: realized-gains-totals -->
```sh
bea --file "$ledger" --json --no-input query "SELECT year(date) * 10000 + month(date) * 100 + day(date) > (year(cost_date) + 1) * 10000 + month(cost_date) * 100 + day(cost_date) AS long_held, cost_currency, sum((-number * number(price)) - (-number * cost_number)) AS gain WHERE number < 0 AND price IS NOT NULL AND cost_number IS NOT NULL AND date >= $year_start AND date < $year_end GROUP BY long_held, cost_currency"
```

**Not covered:** open lots and unrealized gains (nothing here prices a
position still held — those are beancount-ask's holdings recipes in its
`references/bql-recipes.md`), positions without prices, wash sales, FX gains on
cash balances, and any tax form or jurisdiction rule. A reduction whose
posting carries no price is not counted as a sale here; it appears under
`unpriced_reductions` for the user to price, never priced by guessing.
