/**
 * Cash-flow classification heuristics.
 *
 * Beancount accounts carry no activity metadata, so the cash-flow report
 * (and the overview Sankey) infer everything from account NAMES. This file
 * is the single source of truth for that inference — review and adjust the
 * rules here; both surfaces read from it.
 *
 * Two independent rules:
 *
 * 1. CASH_EQUIVALENT_PATTERNS — which accounts count as "cash". These
 *    accounts never appear as statement rows; they are the cash whose
 *    movement the statement explains, and their balances form the
 *    opening/closing bottom line. Also used by the overview Sankey to keep
 *    cash accounts out of its "investing" bucket.
 *
 * 2. CASH_FLOW_ACTIVITY_BY_ROOT — which cash-flow activity each Beancount
 *    root account maps to. The statement row for an account is the INVERSE
 *    of its period change (beancount is credit-normal), so e.g. an Income
 *    credit of -5000 becomes a +5000 operating inflow, and a credit-card
 *    payment (liability moving toward zero) becomes a financing outflow.
 *
 * These tables are the FALLBACK layer. A `cash-flow-role` metadata entry on
 * an account's `open` directive (e.g. `cash-flow-role: "investing"`)
 * overrides both of them at once — see `lib/role-resolver.ts`, which owns
 * the precedence, and `docs/PRFAQ-cash-flow-ledger-classification.md` for
 * the spec.
 */

/**
 * Accounts matching any of these patterns are cash & cash equivalents.
 * Matched against the full account name (e.g. "Assets:US:Chase:Checking").
 */
export const CASH_EQUIVALENT_PATTERNS: readonly RegExp[] = [
  /^Assets:.*Cash$/i,
  /^Assets:.*Checking$/i,
  /^Assets:.*Savings$/i,
  /^Assets:.*Bank/i,
];

/**
 * Cash-flow activity per Beancount root account. Roots not listed here are
 * excluded from the statement. Known judgment calls:
 *
 * - Expenses are operating consumption, but paying the CREDIT CARD that
 *   carried them is financing (the expense was already counted when
 *   incurred).
 * - Non-cash Assets (brokerage, property) are investing, so unrealized
 *   value changes under `at_value` conversion show up as investing flows.
 */
export const CASH_FLOW_ACTIVITY_BY_ROOT = {
  Income: "operating",
  Expenses: "operating",
  Assets: "investing",
  Liabilities: "financing",
  Equity: "financing",
} as const;

export type CashFlowRoot = keyof typeof CASH_FLOW_ACTIVITY_BY_ROOT;
