/**
 * The pure half of the report oracle (w23/m41): flatten a report's account
 * trees to per-account balances and compare them with stock's. No engine and
 * no I/O; `replay-report-oracle.ts` feeds it data and the unit tests feed it
 * fixtures.
 */
import BigNumber from "bignumber.js";
import type { Difference } from "./bql-oracle-compare";

export type Report = "trial-balance" | "balance-sheet" | "income-statement";

export type Node = {
  account: string;
  balance: Record<string, string>;
  children: Node[];
};

/**
 * Accounts the balance sheet adds that no ledger declares: Fava closes the
 * period's earnings, the translation of currencies and unrealized gains into
 * equity so that assets, liabilities and equity net to zero. Stock BQL over
 * the same accounts has no such rows.
 */
const SYNTHETIC_EQUITY = new Set([
  "Equity:Earnings:Current",
  "Equity:Earnings:Previous",
  "Equity:Conversions:Current",
  "Equity:Unrealized",
]);

/** Amounts by currency as exact decimals, so `96` and `96.00` are one figure. */
function exact(amounts: [currency: string, number: string][]): string {
  return amounts
    .map(([currency, number]) => [currency, new BigNumber(number).toFixed()])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, number]) => `${number} ${currency}`)
    .join(", ");
}

/** What stock prints, `["96.00 USD", "3 EUR"]`, as the same exact text. */
export function stockAmounts(cell: unknown): string {
  const parts = Array.isArray(cell) ? cell : [cell];
  return exact(
    parts.map((part) => {
      const [number, currency] = String(part).split(" ");
      return [currency, number] as [string, string];
    }),
  );
}

/** Every account that holds a balance of its own, as exact decimals. */
export function flatten(roots: Node[], report: Report): Map<string, string> {
  const balances = new Map<string, string>();
  const visit = (node: Node) => {
    const own = Object.entries(node.balance ?? {});
    const synthetic =
      report === "balance-sheet" && SYNTHETIC_EQUITY.has(node.account);
    if (own.length > 0 && !synthetic) balances.set(node.account, exact(own));
    node.children.forEach(visit);
  };
  roots.forEach(visit);
  return balances;
}

export function compare(
  stock: Map<string, string>,
  report: Map<string, string>,
): Difference[] {
  const differences: Difference[] = [];
  const missing = [...stock.keys()].filter((account) => !report.has(account));
  const extra = [...report.keys()].filter((account) => !stock.has(account));
  if (missing.length > 0 || extra.length > 0) {
    differences.push({
      kind: "row-count",
      detail: `report lacks [${missing.join(", ")}], adds [${extra.join(", ")}]`,
    });
  }
  const wrong = [...stock]
    .filter(
      ([account, amount]) =>
        report.has(account) && report.get(account) !== amount,
    )
    .map(
      ([account, amount]) =>
        `${account}: stock ${amount}, report ${report.get(account)}`,
    );
  if (wrong.length > 0) {
    differences.push({ kind: "cells", detail: wrong.join("; ") });
  }
  return differences;
}

