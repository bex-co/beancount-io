import {
  CATEGORY_SIGN,
  selectAccountTreeFromRoot,
} from "../../../components/account-list/select-account-list";
import type {
  AccountNode,
  CategoryKey,
} from "../../../components/account-list/select-account-list";
import { resolveCurrencyBalance } from "../../../common/balance-util";
import { rangeStartMonth, type TimeRange } from "../../../common/series-util";

/** A monthly income/expense point carrying per-account balances. */
type MonthlyAccountPoint = {
  date: string;
  // Backend returns `{ account: { currency: amount } }` (see
  // ledger-data-resolver.query.ts); the schema types it as opaque JSONObject,
  // so we cast at the boundary below.
  accountBalances: unknown;
};

/** Node in the SerializableTreeNode shape `selectAccountTreeFromRoot` reads. */
type TreeNode = {
  account: string;
  balanceChildren: Record<string, number>;
  children: TreeNode[];
};

type Trie = { account: string; children: Map<string, Trie> };

function insertAccount(root: Trie, account: string): void {
  const parts = account.split(":");
  let node = root;
  let prefix = "";
  for (const part of parts) {
    prefix = prefix ? `${prefix}:${part}` : part;
    let child = node.children.get(prefix);
    if (!child) {
      child = { account: prefix, children: new Map() };
      node.children.set(prefix, child);
    }
    node = child;
  }
}

/**
 * Rolled-up signed sum of a node's OWN balance plus every descendant's.
 *
 * The backend's `accountBalances` reports each account's own, non-overlapping
 * balance — NOT a rolled-up parent total — so an account can appear with its own
 * postings AND alongside its sub-accounts. `Expenses:Taxes:…:Federal` (its own USD
 * withholding) sits next to `…:Federal:PreTax401k` (a 401k leg booked in a
 * commodity). Summing only trie *leaves* dropped the own balance of every account
 * that also has sub-accounts — e.g. Federal's USD — which is what made the Taxes
 * total under-report against the web dashboard. So every node contributes its own
 * `sums` entry (0 when it has none, e.g. a pure aggregating level the backend
 * never reported); there is no double-counting because parents carry only their
 * own direct postings.
 */
function rollup(trie: Trie, sums: Map<string, number>): number {
  let total = sums.get(trie.account) ?? 0;
  for (const child of trie.children.values()) {
    total += rollup(child, sums);
  }
  return total;
}

function toTreeNode(
  trie: Trie,
  currency: string,
  sums: Map<string, number>,
): TreeNode {
  return {
    account: trie.account,
    balanceChildren: { [currency]: rollup(trie, sums) },
    children: Array.from(trie.children.values()).map((child) =>
      toTreeNode(child, currency, sums),
    ),
  };
}

/**
 * Build a range-scoped Income/Expense account breakdown from the income
 * statement's monthly per-account series (`incomeData` / `expensesData`).
 *
 * The hierarchy snapshots (`*HierarchyData`) are full-period, so to honor the
 * report's time-range pills we instead sum each account's monthly balance
 * across the selected window. The window is anchored to the latest data point's
 * month — the same convention the report charts use (`rangeStartMonth`) — so a
 * stale ledger still shows history instead of an empty list. The summed
 * per-account totals are rebuilt into the same expandable tree the Accounts tab
 * renders, via `selectAccountTreeFromRoot`. `category` picks the display sign
 * (income is stored as a credit, so it's negated to read positive); `total` is
 * the signed sum of the displayed top-level accounts, so the card headline always
 * matches its rows.
 */
export function selectRangedAccountTree(
  currency: string,
  points:
    readonly (MonthlyAccountPoint | null | undefined)[] | null | undefined,
  range: TimeRange,
  category: CategoryKey,
): { tree: AccountNode[]; total: number } {
  if (!currency || !points || points.length === 0) {
    return { tree: [], total: 0 };
  }

  // Window: anchored to the latest point's month (matches filterSeriesByRange).
  const dated = points.filter((p): p is MonthlyAccountPoint => !!p?.date);
  if (dated.length === 0) {
    return { tree: [], total: 0 };
  }
  dated.sort((a, b) => a.date.localeCompare(b.date));
  const cutoff = rangeStartMonth(
    range,
    dated[dated.length - 1].date.slice(0, 7),
  );
  const ranged = cutoff
    ? dated.filter((p) => p.date.slice(0, 7) >= cutoff)
    : dated;

  // Sum each account's resolved balance across the window.
  const sums = new Map<string, number>();
  for (const point of ranged) {
    const accountBalances = (point.accountBalances ?? {}) as Record<
      string,
      Record<string, number | string> | null | undefined
    >;
    for (const [account, balances] of Object.entries(accountBalances)) {
      if (!account) {
        continue;
      }
      const value = resolveCurrencyBalance(balances ?? {}, currency);
      sums.set(account, (sums.get(account) ?? 0) + value);
    }
  }
  if (sums.size === 0) {
    return { tree: [], total: 0 };
  }

  // Build a trie from the account paths, roll up leaf sums, and convert to the
  // SerializableTreeNode shape. Skip the category level (e.g. "Income") so
  // stripTopLevel names the top-level accounts the same way the Accounts tab
  // does — the synthetic root's children are the depth-1 accounts.
  const root: Trie = { account: "", children: new Map() };
  sums.forEach((_v, account) => insertAccount(root, account));

  const topLevel: TreeNode[] = [];
  for (const category of root.children.values()) {
    if (category.children.size > 0) {
      for (const topAccount of category.children.values()) {
        topLevel.push(toTreeNode(topAccount, currency, sums));
      }
    } else {
      // Defensive: an account with no category prefix — surface it as-is.
      topLevel.push(toTreeNode(category, currency, sums));
    }
  }
  if (topLevel.length === 0) {
    return { tree: [], total: 0 };
  }

  const fakeRoot: TreeNode = {
    account: "root",
    balanceChildren: {},
    children: topLevel,
  };
  const tree = selectAccountTreeFromRoot(
    currency,
    fakeRoot,
    CATEGORY_SIGN[category],
  );
  const total = tree.reduce((sum, node) => sum + node.value, 0);
  return { tree, total };
}
