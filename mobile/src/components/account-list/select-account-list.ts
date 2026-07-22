import { resolveCurrencyBalance } from "../../common/balance-util";
import { leafName } from "../../common/account-util";

export type AccountNode = {
  /** Full beancount account, e.g. "Assets:Bank:Checking". */
  account: string;
  /** Display name for this row (segment(s) below its parent). */
  name: string;
  /** Signed rolled-up balance (includes descendants) in the active currency. */
  value: number;
  /** Immediate sub-accounts (one level deeper), same shape. */
  children: AccountNode[];
};

/** Beancount's five root account categories; each key is also its i18n key. */
export type CategoryKey =
  "assets" | "liabilities" | "equity" | "income" | "expenses";

/** The five categories in conventional balance-sheet-then-income order. */
export const CATEGORY_KEYS: readonly CategoryKey[] = [
  "assets",
  "liabilities",
  "equity",
  "income",
  "expenses",
] as const;

/**
 * The direction a category's balance naturally runs. Beancount stores
 * Liabilities, Income and Equity as credits, so their balances are normally
 * negative; Assets and Expenses are debits and normally positive. Two uses:
 *
 * - The Reports tab negates by it, so an income or expense breakdown reads as a
 *   positive magnitude ("you earned $63k") — fava's
 *   `invert-income-liabilities-equity` convention.
 * - The Accounts tab shows balances exactly as the ledger holds them, matching
 *   the web dashboard, and uses this only to spot a value running *against* its
 *   category — an overdrawn asset, a refunded expense — which earns the error color.
 *
 * Either way the sign is applied **once at the category root**, never per node:
 * negating each node (the old `Math.abs`) corrupted any subtree holding a
 * negative, so a margin-negative `Assets:…:Cash` flipped positive and its
 * siblings stopped summing to their parent.
 */
export const CATEGORY_SIGN: Record<CategoryKey, 1 | -1> = {
  assets: 1,
  liabilities: -1,
  equity: -1,
  income: -1,
  expenses: 1,
};

/** Drop the top-level category segment (e.g. "Assets:Bank" → "Bank"). */
function stripTopLevel(account: string): string {
  const parts = account.split(":");
  return parts.length > 1 ? parts.slice(1).join(":") : account;
}

type RawChild = {
  account: string;
  balance_children: Record<string, number | string>;
  children?: RawChild[] | null;
};

function toNode(
  raw: RawChild,
  currency: string,
  sign: 1 | -1,
  displayName: (account: string) => string,
): AccountNode {
  return {
    account: raw.account,
    name: displayName(raw.account),
    value: sign * resolveCurrencyBalance(raw.balance_children, currency),
    children: (raw.children ?? [])
      .map((child) => toNode(child, currency, sign, leafName))
      .filter((node) => node.value !== 0)
      // By magnitude: a large negative belongs next to its large siblings, not
      // sunk to the bottom of the list.
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
  };
}

/**
 * Two rolled-up balances that round to the same cent. Values are float sums, so
 * an exact `===` would miss `902.36` vs `902.3600000000001`.
 */
function sameAmount(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

/**
 * Compress a chain of single-child nodes into one row. A node whose only child
 * carries the same balance adds nothing — a row for each would print the number
 * twice (Liabilities' `US → Chase → Slate` spent three rows on one value). The
 * surviving row joins the segments into its label ("US:Chase:Slate"), takes the
 * deepest node's `account` — the one worth drilling into — and adopts its
 * children.
 *
 * The equal-balance test is what keeps this honest: a parent holding postings of
 * its own (`Assets:Bank` = 28,100 over a lone `Assets:Bank:Checking` = 18,100)
 * has 10,000 that exists nowhere else, so it keeps its row.
 */
function compressChain(node: AccountNode): AccountNode {
  let current = node;
  const segments = [node.name];
  while (
    current.children.length === 1 &&
    sameAmount(current.children[0].value, current.value)
  ) {
    current = current.children[0];
    segments.push(current.name);
  }
  return {
    account: current.account,
    name: segments.join(":"),
    value: current.value,
    children: current.children.map(compressChain),
  };
}

/**
 * A node its children fully account for: every cent of its balance is already
 * broken out one level down, so its own row would only restate them. A node
 * holding postings of its own fails this and keeps its row.
 */
function isPassThrough(node: AccountNode): boolean {
  if (node.children.length === 0) {
    return false;
  }
  const childSum = node.children.reduce((sum, child) => sum + child.value, 0);
  return sameAmount(childSum, node.value);
}

/**
 * Skip the category's own pass-through levels. `compressChain` can only fold a
 * chain into a *row*, and the category has no row of its own to fold into — so
 * while it holds a single child its own children fully account for, drop that
 * child's row and carry its segment onto the rows beneath (a ledger whose assets
 * all sit under `Assets:US` shouldn't spend a row saying so). Requiring children
 * is also what keeps the last row: a chain bottoming out in a leaf
 * (Liabilities:US:Chase:Slate) keeps that leaf as its row rather than emptying
 * the category.
 */
function skipPassThroughLevels(rows: AccountNode[]): AccountNode[] {
  const prefix: string[] = [];
  let current = rows;
  while (current.length === 1 && isPassThrough(current[0])) {
    prefix.push(current[0].name);
    current = current[0].children;
  }
  if (prefix.length === 0) {
    return current;
  }
  const path = prefix.join(":");
  return current.map((node) => ({ ...node, name: `${path}:${node.name}` }));
}

/**
 * Map + filter + sort the top-level sub-accounts of one category, then collapse
 * the redundant levels: strip the category segment from each name, drop
 * zero-balance accounts, sort by magnitude descending, and fold away every node
 * whose balance merely repeats its parent's. Shared by both selectors below.
 */
function buildTopLevel(
  topLevel: RawChild[],
  currency: string,
  sign: 1 | -1,
): AccountNode[] {
  const rows = topLevel
    .map((child) => toNode(child, currency, sign, stripTopLevel))
    .filter((accountNode) => accountNode.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .map(compressChain);
  return skipPassThroughLevels(rows);
}

/** One of the five root categories: its own total plus its account tree. */
export type AccountCategory = {
  /** Category key — also the i18n key for its label. */
  key: CategoryKey;
  /**
   * The ledger's own root account for this category ("Assets", …), for drilling
   * into. Empty when the hierarchy doesn't name one.
   */
  account: string;
  /** Rolled-up total for the whole category, as the ledger holds it. */
  value: number;
  /** Top-level accounts beneath it (already compressed). */
  children: AccountNode[];
};

/**
 * Recursive raw node from an IncomeStatement `SerializableTreeNode`
 * (camelCase `balanceChildren`, JSON-typed children). Mirrors `RawChild` but in
 * the shape the income-statement query returns.
 */
type SerializableChild = {
  account: string;
  balanceChildren: Record<string, number | string>;
  children?: SerializableChild[] | null;
};

/** Boundary shape for an IncomeStatement hierarchy root passed in from a query. */
type SerializableTreeNodeLike = {
  account: string;
  balanceChildren: Record<string, number | string>;
  children?: unknown;
};

/** Normalize a SerializableTreeNode subtree into the RawChild shape toNode reads. */
function fromSerializable(node: SerializableChild): RawChild {
  return {
    account: node.account,
    balance_children: node.balanceChildren,
    children: (node.children ?? []).map(fromSerializable),
  };
}

/**
 * Build the account tree under an IncomeStatement hierarchy root
 * (`incomeHierarchyData` / `expensesHierarchyData`): a single node whose
 * `children` are the top-level accounts of that category. Same semantics as
 * `selectAccountTree` — rolled-up totals, leaf names for nested rows,
 * zero-balance accounts omitted, sorted by magnitude descending, single-child
 * chains folded — over the camelCase SerializableTreeNode shape instead of the
 * labelled AccountHierarchy shape.
 *
 * `sign` defaults to leaving the ledger's own signs alone (what the Accounts tab
 * wants); pass `CATEGORY_SIGN[category]` to flip a credit-normal category into
 * positive magnitudes (what the Reports tab wants).
 */
export function selectAccountTreeFromRoot(
  currency: string,
  root?: SerializableTreeNodeLike | null,
  sign: 1 | -1 = 1,
): AccountNode[] {
  if (!currency || !root?.children) {
    return [];
  }
  const children = root.children as SerializableChild[] | null | undefined;
  return buildTopLevel((children ?? []).map(fromSerializable), currency, sign);
}
