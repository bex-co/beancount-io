import { resolveCurrencyBalance } from "../../common/balance-util";
import { notInTotalOf, type Holding } from "../../common/balance-display";
import { dropRoot, leafName } from "../../common/account-util";
import {
  currencyMinorUnits,
  getCurrencySymbol,
} from "../../common/currency-util";
import { amountScale } from "../../common/number-utils";

export type AccountNode = {
  /** Full beancount account, e.g. "Assets:Bank:Checking". */
  account: string;
  /** Display name for this row (segment(s) below its parent). */
  name: string;
  /** Signed rolled-up balance (includes descendants) in the active currency. */
  value: number;
  /** Immediate sub-accounts (one level deeper), same shape. */
  children: AccountNode[];
  /**
   * The postings made to the parent itself, as a child row of its own. They
   * had none, so a parent's children did not add up to it (w21/174). Its
   * `account` is the parent's.
   */
  own?: true;
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

/**
 * Which way a change in a category moves net worth. Assets and Liabilities
 * make it up; Income, Expenses and Equity mirror it, because every posting
 * balances: earning income or incurring an expense moves the other side. An
 * account page colors a change by `change * NET_WORTH_SIGN[category]`, while
 * every figure keeps the sign the ledger holds (w0/033).
 */
export const NET_WORTH_SIGN: Record<CategoryKey, 1 | -1> = {
  assets: 1,
  liabilities: 1,
  equity: -1,
  income: -1,
  expenses: -1,
};

/** A ledger's root names (`option "name_assets"` and friends), by category. */
export type CategoryRootNames = Partial<
  Record<CategoryKey, string | null | undefined>
>;

const DEFAULT_ROOT_NAMES: Record<CategoryKey, string> = {
  assets: "Assets",
  liabilities: "Liabilities",
  equity: "Equity",
  income: "Income",
  expenses: "Expenses",
};

/**
 * The category an account belongs to by its root segment, honoring the
 * ledger's renamed roots and falling back to Beancount's defaults while they
 * load. Null for a root that is none of the five.
 */
export function accountCategory(
  account: string,
  roots: CategoryRootNames = {},
): CategoryKey | null {
  const root = account.split(":")[0];
  return (
    CATEGORY_KEYS.find(
      (key) => (roots[key] || DEFAULT_ROOT_NAMES[key]) === root,
    ) ?? null
  );
}

type RawChild = {
  account: string;
  balance_children: Record<string, number | string>;
  /** The account's own postings, without its descendants. */
  balance?: Record<string, number | string> | null;
  children?: RawChild[] | null;
};

/**
 * What counts as a node's balance when the tree decides what to keep and fold.
 * By default only its operating-currency value does; with `wholeBalance` (see
 * `ZeroBalanceOptions`) the holdings that value cannot express count too.
 */
type TreeRules = {
  /**
   * Whether a node with rows beneath it survives the zero-value filter even
   * when its own value is zero: the Accounts tab keeps a parent whose children
   * net to nothing (w21/423); a report category that nets to nothing is "$0.00 ·
   * 0%", noise (w21/055, w21/492).
   */
  keepNetZeroParents: boolean;
  /**
   * Whether two rolled-up balances are the same amount (see `amountTolerance`).
   */
  same: (a: number, b: number) => boolean;
  /**
   * Whether a parent's own postings earn a row of their own beyond what their
   * operating-currency value says: its euros or shares, when the whole balance
   * counts (w21/450).
   */
  ownHoldsMore: (balance: RawChild["balance"]) => boolean;
  /** Spares a node the zero-value filter would otherwise drop. */
  keep: (node: AccountNode) => boolean;
  /** Whether `children` hold exactly what `parent` does, beyond the value. */
  sameHoldings: (
    children: readonly AccountNode[],
    parent: AccountNode,
  ) => boolean;
};

/**
 * Whether the zero-value filter spares a node: it holds something, is listed,
 * or has a row beneath it that does. Receivable's closed Alice +20 and Bob -20
 * net to nothing, and went with it (w21/423).
 */
function spared(node: AccountNode, rules: TreeRules): boolean {
  return (
    node.value !== 0 ||
    (rules.keepNetZeroParents && node.children.length > 0) ||
    rules.keep(node)
  );
}

function toNode(
  raw: RawChild,
  currency: string,
  sign: 1 | -1,
  displayName: (account: string) => string,
  rules: TreeRules,
): AccountNode {
  const children = (raw.children ?? [])
    .map((child) => toNode(child, currency, sign, leafName, rules))
    .filter((node) => spared(node, rules));
  // A parent's own postings, beside its sub-accounts, so the rows beneath it
  // add up to it (w21/174). A leaf's own balance is its value already.
  const ownValue = raw.balance
    ? sign * resolveCurrencyBalance(raw.balance, currency)
    : 0;
  if (
    children.length > 0 &&
    (!rules.same(ownValue, 0) || rules.ownHoldsMore(raw.balance))
  ) {
    children.push({
      account: raw.account,
      name: leafName(raw.account),
      value: ownValue,
      children: [],
      own: true,
    });
  }
  return {
    account: raw.account,
    name: displayName(raw.account),
    value: sign * resolveCurrencyBalance(raw.balance_children, currency),
    // By magnitude: a large negative belongs next to its large siblings, not
    // sunk to the bottom of the list.
    children: children.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
  };
}

/**
 * Two rolled-up balances that round to the same cent. Values are float sums, so
 * an exact `===` would miss `902.36` vs `902.3600000000001`.
 */
function sameWithin(tolerance: number): (a: number, b: number) => boolean {
  return (a, b) => Math.abs(a - b) < tolerance;
}

/**
 * How close two balances in `currency` must be to count as one. Half the minor
 * unit of a known currency: a flat half cent folded a KWD wallet's own 0.004
 * into its only child, and the rows read short of their parent (w21/808). A
 * commodity the app has no symbol for (BTC as a ledger's operating currency)
 * is held at its own recorded digits instead, and never less than half a cent:
 * a flat half cent folded a wallet's 0.004 BTC into nothing (w21/451).
 */
function amountTolerance(raw: readonly RawChild[], currency: string): number {
  if (getCurrencySymbol(currency) !== "") {
    return 0.5 * 10 ** -currencyMinorUnits(currency);
  }
  let scale = 2;
  for (const node of rawNodes(raw)) {
    for (const balance of [node.balance_children, node.balance]) {
      const entry = balance?.[currency];
      if (entry !== undefined) {
        scale = Math.max(scale, amountScale(String(entry)));
      }
    }
  }
  // Bounded: float residue near 1e-15 must still fold.
  return 0.5 * 10 ** -Math.min(scale, 12);
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
function compressChain(node: AccountNode, rules: TreeRules): AccountNode {
  let current = node;
  const segments = [node.name];
  while (
    current.children.length === 1 &&
    rules.same(current.children[0].value, current.value) &&
    rules.sameHoldings(current.children, current)
  ) {
    current = current.children[0];
    segments.push(current.name);
  }
  return {
    account: current.account,
    name: segments.join(":"),
    value: current.value,
    children: current.children.map((child) => compressChain(child, rules)),
    ...(current.own ? { own: true as const } : {}),
  };
}

/**
 * A node its children fully account for: every cent of its balance is already
 * broken out one level down, so its own row would only restate them. A node
 * holding postings of its own fails this and keeps its row.
 */
function isPassThrough(node: AccountNode, rules: TreeRules): boolean {
  // Its own-postings row (w21/174) makes the children sum up, but the node
  // still holds money of its own and keeps its row.
  if (node.children.length === 0 || node.children.some((child) => child.own)) {
    return false;
  }
  const childSum = node.children.reduce((sum, child) => sum + child.value, 0);
  return (
    rules.same(childSum, node.value) && rules.sameHoldings(node.children, node)
  );
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
function skipPassThroughLevels(
  rows: AccountNode[],
  rules: TreeRules,
): AccountNode[] {
  const prefix: string[] = [];
  let current = rows;
  while (current.length === 1 && isPassThrough(current[0], rules)) {
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
  rules: TreeRules,
): AccountNode[] {
  const rows = topLevel
    .map((child) => toNode(child, currency, sign, dropRoot, rules))
    .filter((accountNode) => spared(accountNode, rules))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .map((node) => compressChain(node, rules));
  return skipPassThroughLevels(rows, rules);
}

/** Per-currency totals of the holdings several accounts' values leave out. */
function holdingTotals(
  accounts: readonly AccountNode[],
  unconverted: ReadonlyMap<string, Holding[]>,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const { account } of accounts) {
    for (const holding of unconverted.get(account) ?? []) {
      totals.set(
        holding.currency,
        (totals.get(holding.currency) ?? 0) + holding.number,
      );
    }
  }
  return totals;
}

/** The keep and fold rules a tree is built with (see `TreeRules`). */
function treeRules(
  raw: readonly RawChild[],
  currency: string,
  keep: ReadonlySet<string>,
  wholeBalance = false,
): TreeRules {
  const same = sameWithin(amountTolerance(raw, currency));
  if (!wholeBalance) {
    return {
      same,
      keepNetZeroParents: false,
      ownHoldsMore: () => false,
      keep: (node) => keep.has(node.account),
      sameHoldings: () => true,
    };
  }
  const unconverted = new Map(
    rawNodes(raw).map((node) => [
      node.account,
      notInTotalOf(node.balance_children, currency),
    ]),
  );
  return {
    same,
    keepNetZeroParents: true,
    ownHoldsMore: (balance) =>
      balance != null && notInTotalOf(balance, currency).length > 0,
    keep: (node) =>
      keep.has(node.account) ||
      (unconverted.get(node.account)?.length ?? 0) > 0,
    sameHoldings: (children, parent) => {
      const below = holdingTotals(children, unconverted);
      const own = holdingTotals([parent], unconverted);
      return [...new Set([...below.keys(), ...own.keys()])].every(
        (key) => Math.abs((below.get(key) ?? 0) - (own.get(key) ?? 0)) < 1e-9,
      );
    },
  };
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
  balance?: Record<string, number | string> | null;
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
    balance: node.balance,
    children: (node.children ?? []).map(fromSerializable),
  };
}

/** Every node of the raw hierarchy, at any depth. */
function rawNodes(
  children: readonly RawChild[],
  out: RawChild[] = [],
): RawChild[] {
  for (const node of children) {
    out.push(node);
    rawNodes(node.children ?? [], out);
  }
  return out;
}

/** Opt-in inclusion of accounts the hierarchy omits because they are zero. */
export type ZeroBalanceOptions = {
  /**
   * Full account names (from ledger metadata) to keep even at zero — the
   * Accounts view's "a newly opened account must be visible before its first
   * transaction". Report category views pass nothing, so their zero-filtering
   * is untouched.
   */
  accounts?: readonly string[];
  /**
   * The hierarchy root's own account ("Assets", or a renamed root). Needed
   * because a root node can come back without one.
   */
  rootAccount?: string;
  /**
   * Count the whole currency map as a node's balance (the Accounts view): a
   * node holding only commodities the operating currency cannot express is
   * not empty and is kept, and a chain folds only when those holdings match
   * as well as the value. Report views leave it off.
   */
  wholeBalance?: boolean;
};

/**
 * Graft the zero-balance accounts into the raw hierarchy **at their real
 * structural level**, creating any absent intermediate ancestors, and return
 * the accounts the zero-filter must then spare.
 *
 * Grafting before the tree is built is the whole point: appending these rows
 * after compression put `Assets:NonCurrent:Goodwill` straight under `Assets`,
 * outside the `NonCurrent` branch whose disclosure should control it.
 */
function graftZeroAccounts(
  children: readonly RawChild[],
  options: ZeroBalanceOptions,
  currency: string,
): { children: RawChild[]; keep: Set<string> } {
  const keep = new Set<string>();
  const wanted = options.accounts ?? [];
  const root = options.rootAccount ?? "";
  if (wanted.length === 0 || !root) {
    return { children: children as RawChild[], keep };
  }

  // A descendant the filters will not drop: listed, or holding something.
  // The raw tree also carries closed accounts, emptied, which they do drop
  // (w21/280).
  const survives = (node: RawChild): boolean =>
    wanted.includes(node.account) ||
    resolveCurrencyBalance(node.balance_children, currency) !== 0 ||
    (options.wholeBalance === true &&
      notInTotalOf(node.balance_children, currency).length > 0);
  const rendered = rawNodes(children).filter(survives);
  // Copied, never mutated in place: the raw nodes belong to the Apollo cache.
  // Every field `toNode` reads: dropping `balance` left a parent's own postings
  // out of the Accounts tab, so its rows did not add up to it (w21/331).
  const clone = (node: RawChild): RawChild => ({
    account: node.account,
    balance_children: node.balance_children,
    balance: node.balance,
    children: (node.children ?? []).map(clone),
  });
  const grafted = children.map(clone);

  for (const account of wanted) {
    if (!account.startsWith(`${root}:`)) {
      continue;
    }
    // An ancestor of accounts the hierarchy still renders: those rows stand
    // in for it, so it needs neither a graft nor a reprieve from the filter.
    if (rendered.some((node) => node.account.startsWith(`${account}:`))) {
      continue;
    }
    let siblings = grafted;
    let path = root;
    for (const segment of account.slice(root.length + 1).split(":")) {
      path = `${path}:${segment}`;
      // Every ancestor is kept too, so an existing zero ancestor cannot be
      // filtered out from under the account it holds.
      keep.add(path);
      let node = siblings.find((sibling) => sibling.account === path);
      if (!node) {
        node = { account: path, balance_children: {}, children: [] };
        siblings.push(node);
      }
      node.children = node.children ?? [];
      siblings = node.children;
    }
  }

  return { children: grafted, keep };
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
 *
 * `zeroBalance` is opt-in and empty by default: only the Accounts view asks for
 * zero-balance accounts to survive, so a report category view keeps exactly the
 * filtering it had.
 */
export function selectAccountTreeFromRoot(
  currency: string,
  root?: SerializableTreeNodeLike | null,
  sign: 1 | -1 = 1,
  zeroBalance: ZeroBalanceOptions = {},
): AccountNode[] {
  // A root without children is still worth walking when zero-balance accounts
  // are opted in: a ledger whose accounts are all freshly opened has an empty
  // hierarchy and nothing but metadata to show.
  if (!currency || !root || (!root.children && !zeroBalance.accounts?.length)) {
    return [];
  }
  const children = root.children as SerializableChild[] | null | undefined;
  const { children: raw, keep } = graftZeroAccounts(
    (children ?? []).map(fromSerializable),
    zeroBalance,
    currency,
  );
  return buildTopLevel(
    raw,
    currency,
    sign,
    treeRules(raw, currency, keep, zeroBalance.wholeBalance),
  );
}
