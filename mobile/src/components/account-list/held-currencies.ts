import type { TrialBalanceQuery } from "@/generated-graphql/graphql";
import { isFiatCurrency } from "../../common/currency-util";

/** A node of a root's tree; `children` is an untyped JSON scalar. */
type Node = {
  account?: unknown;
  balance?: unknown;
  children?: unknown;
};

const HIERARCHIES = [
  "assetsHierarchyData",
  "liabilitiesHierarchyData",
  "equityHierarchyData",
  "incomeHierarchyData",
  "expensesHierarchyData",
] as const;

/**
 * The currencies each account holds in its own postings, from a trial balance
 * read in units (the Accounts tab's second read), for every root. The accounts
 * read of `getLedgerAccountDirectives` fills `balance` for Assets and
 * Liabilities only, so a budget on an Expenses account found nothing there
 * (w21/981).
 */
export function heldCurrenciesOf(
  data: TrialBalanceQuery | undefined,
): Map<string, string[]> {
  const held = new Map<string, string[]>();
  const visit = (node: Node) => {
    if (typeof node.account === "string") {
      const balance = node.balance;
      if (balance && typeof balance === "object") {
        const currencies = Object.entries(balance as Record<string, unknown>)
          .filter(([, amount]) => Number(amount) !== 0)
          .map(([currency]) => currency);
        if (currencies.length > 0) held.set(node.account, currencies);
      }
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) visit(child as Node);
    }
  };
  const trial = data?.getLedgerTrialBalance;
  for (const field of HIERARCHIES) {
    const root = trial?.[field] as Node | undefined;
    if (root) visit(root);
  }
  return held;
}

/**
 * The one national currency an account holds, or undefined for none, several,
 * or a commodity: a budget on an account that spends only in yen starts in yen,
 * not the ledger's dollar default (w21/946), while a stock account does not
 * pre-select its ticker (w21/981).
 */
export function accountOnlyCurrency(
  account: string,
  held: ReadonlyMap<string, readonly string[]>,
): string | undefined {
  const currencies = held.get(account.trim());
  return currencies?.length === 1 && isFiatCurrency(currencies[0]!)
    ? currencies[0]
    : undefined;
}
