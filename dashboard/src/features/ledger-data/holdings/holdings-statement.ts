/**
 * Holdings queries.
 *
 * Every valuation here is pinned to `today()`. The engine's `GETPRICE`
 * defaults to the query date while `VALUE` falls through to the latest price
 * available at any date, so leaving both undated priced one column at today's
 * quote and the market value at a future one: 150 ACME showed a 90.80 price
 * beside a 14,565.00 USD market value that only reconciles against a 2027
 * quote, and a gain where today's quote implies a loss. Dating both — the
 * price column, the aggregate market value and the gain numerator — puts every
 * number in a row on the same cutoff. Quantities, cost and acquisition dates
 * are untouched.
 */
/**
 * Gain over the book value, in percent: signed market value minus signed
 * cost, over the cost's magnitude. Taking the magnitude of each side first
 * read a position quoted at −20 against a 10 cost as a +100% gain; it is
 * −300% (w4/1019). A short position keeps its sign, and a zero basis is 0.
 */
const UNREALIZED_PROFIT_PCT =
  "safediv(sum(number(value(position, today()))) - sum(number(cost(position))), abs(sum(number(cost(position))))) * 100";

export const holdingsStatement = `SELECT
  account,
  units(sum(position)) as units,
  cost_number as cost,
  first(getprice(currency, cost_currency, today())) as price,
  cost(sum(position)) as book_value,
  value(sum(position), today()) as market_value,
  ${UNREALIZED_PROFIT_PCT} as unrealized_profit_pct,
  cost_date as acquisition_date
WHERE account_sortkey(account) ~ "^[01]"
GROUP BY account, cost_date, currency, cost_currency, cost_number, account_sortkey(account)
ORDER BY account_sortkey(account), currency, cost_date`;

export const holdingsStatementByAccount = `SELECT
  account,
  units(sum(position)) as units,
  cost(sum(position)) as book_value,
  value(sum(position), today()) as market_value,
  ${UNREALIZED_PROFIT_PCT} as unrealized_profit_pct
WHERE account_sortkey(account) ~ "^[01]"
GROUP BY account, cost_currency, account_sortkey(account), currency
ORDER BY account_sortkey(account), currency
`;

export const holdingsStatementByCurrency = `SELECT
  units(sum(position)) as units,
  safediv(number(only(first(cost_currency), cost(sum(position)))), number(only(first(currency), units(sum(position))))) as average_cost,
  first(getprice(currency, cost_currency, today())) as price,
  cost(sum(position)) as book_value,
  value(sum(position), today()) as market_value,
  ${UNREALIZED_PROFIT_PCT} as unrealized_profit_pct
WHERE account_sortkey(account) ~ "^[01]"
GROUP BY currency, cost_currency
ORDER BY currency, cost_currency
`;

export const holdingsStatementByCostCurrency = `SELECT
  units(sum(position)) as units,
  sum(cost(position)) as book_value,
  value(sum(position), today()) as market_value,
  ${UNREALIZED_PROFIT_PCT} as unrealized_profit_pct
WHERE account_sortkey(account) ~ "^[01]"
GROUP BY cost_currency
ORDER BY cost_currency
`;
