import {
  categorizeAccount,
  extractAccountAtDepth,
  isExcludedAccount,
} from "./account-categorizer";
import type { AccountRoots } from "@/features/reports/cash-flow/lib/account-roots";
import type { CashFlowRoot as RootType } from "@/features/reports/cash-flow/config";
import type { AccountMetaMap } from "@/features/reports/cash-flow/lib/model";
import type { SerializableTreeNode } from "@/graphql/definitions";
import {
  isPositiveDecimalNumber,
  negateDecimalNumber,
  sumDecimalNumbers,
} from "@/common/lib/beancount/decimal-number";
import {
  type UnitAmounts,
  chooseDisplayUnit,
  collectUnits,
  mergeAmounts,
  readBalance,
} from "./unit-amounts";

type HierarchyNode = {
  account: string;
  balance?: Record<string, unknown> | null;
  children?: HierarchyNode[];
};

/**
 * The diagram's own nodes, beside the ledger's accounts. Links and colors use
 * these identities; the chart shows each under its translated label.
 */
export const CASH_FLOW_NODE = "Cash Flow";
export const SAVINGS_NODE = "Savings";
export const SHORTFALL_NODE = "Shortfall";

export type SankeyNode = {
  name: string;
  itemStyle?: { color: string };
};

export type SankeyLink = {
  source: string;
  target: string;
  /** The flow as a double, for the diagram's geometry. */
  value: number;
  /** The ledger's decimal, for text: a double drops its digits (w4/m53). */
  exact: string;
};

export type SankeyData = {
  nodes: SankeyNode[];
  links: SankeyLink[];
  /** The one unit every `value` above is denominated in, or null when empty. */
  unit: string | null;
  /** Every unit the underlying accounts hold, so scope can be disclosed. */
  units: string[];
};

/**
 * The ledger's root names, read off each tree's own root account: a ledger
 * that renames its roots (`Revenus`, `Charges`) keeps them as types rather
 * than seeing every account dropped as an unknown root (w4/1020).
 */
export function hierarchyRoots(trees: {
  income?: SerializableTreeNode | null;
  expenses?: SerializableTreeNode | null;
  assets?: SerializableTreeNode | null;
  liabilities?: SerializableTreeNode | null;
}): AccountRoots {
  const roots = new Map<string, RootType>();
  const typed: Array<[RootType, SerializableTreeNode | null | undefined]> = [
    ["Income", trees.income],
    ["Expenses", trees.expenses],
    ["Assets", trees.assets],
    ["Liabilities", trees.liabilities],
  ];
  for (const [type, tree] of typed) {
    const name = (tree as HierarchyNode | null | undefined)?.account;
    if (name && !name.includes(":")) roots.set(name, type);
  }
  return roots;
}

/** True when this account carries no cash-flow activity of its own. */
function isSkipped(
  account: string,
  accountMeta?: AccountMetaMap,
  roots?: AccountRoots,
): boolean {
  const meta = accountMeta?.get(account);
  return (
    categorizeAccount(account, meta, roots) === "exclude" ||
    isExcludedAccount(account, meta, roots)
  );
}

/**
 * Total a node and everything beneath it, per unit.
 *
 * `balance` is read at every level: the producer stores an account's direct
 * postings there and rolls them into each ancestor's `balanceChildren`, so
 * descending and reading as you go double-counts nothing. Each descendant
 * resolves its own role, so a Cash leaf does not reach the investing bucket
 * on its parent's authority.
 */
export function aggregateHierarchyBalance(
  node: HierarchyNode,
  inverse = false,
  accountMeta?: AccountMetaMap,
  rootTypes?: AccountRoots,
): UnitAmounts {
  const totals: UnitAmounts = new Map();

  function collect(current: HierarchyNode): void {
    readBalance(current.balance, inverse, totals);
    for (const child of current.children ?? []) {
      if (!child?.account) continue;
      if (isSkipped(child.account, accountMeta, rootTypes)) continue;
      collect(child);
    }
  }

  collect(node);
  return totals;
}

/**
 * Extract nodes at specified depth from hierarchy
 */
function extractNodesAtDepth(
  roots: SerializableTreeNode | undefined | null | HierarchyNode[],
  targetDepth: number,
  inverse = false,
  accountMeta?: AccountMetaMap,
  rootTypes?: AccountRoots,
): Map<string, UnitAmounts> {
  const nodeMap = new Map<string, UnitAmounts>();

  // Handle undefined, null, or empty data
  if (!roots) {
    return nodeMap;
  }

  // Normalize to array
  // Handle both single node and array of nodes (for backward compatibility with tests)
  const rootsArray = Array.isArray(roots)
    ? (roots as HierarchyNode[])
    : [roots as unknown as HierarchyNode];

  function traverse(node: HierarchyNode, currentDepth: number) {
    // Guard against nodes without account property
    if (!node || !node.account) {
      return;
    }

    const accountAtDepth = extractAccountAtDepth(node.account, targetDepth);

    // Skip excluded accounts
    if (isSkipped(node.account, accountMeta, rootTypes)) {
      return;
    }

    if (
      currentDepth === targetDepth ||
      !node.children ||
      node.children.length === 0
    ) {
      // Reached target depth or leaf node
      const balance = aggregateHierarchyBalance(
        node,
        inverse,
        accountMeta,
        rootTypes,
      );
      if (balance.size === 0) return;

      addToGroup(nodeMap, accountAtDepth, balance);
    } else {
      // An ancestor above the grouping depth can hold postings of its own, and
      // they belong to its own depth key rather than to any child's.
      const own: UnitAmounts = new Map();
      readBalance(node.balance, inverse, own);
      addToGroup(nodeMap, accountAtDepth, own);
      node.children?.forEach((child) => traverse(child, currentDepth + 1));
    }
  }

  rootsArray.forEach((root) => traverse(root, 1));
  return nodeMap;
}

/** Add amounts under a key, merging rather than replacing an existing entry. */
function addToGroup(
  group: Map<string, UnitAmounts>,
  key: string,
  amounts: UnitAmounts,
): void {
  if (amounts.size === 0) return;
  const existing = group.get(key);
  if (existing) mergeAmounts(existing, amounts);
  else group.set(key, amounts);
}

interface TransformOptions {
  incomeHierarchyData?: SerializableTreeNode;
  expensesHierarchyData?: SerializableTreeNode;
  assetsHierarchyData?: SerializableTreeNode;
  liabilitiesHierarchyData?: SerializableTreeNode;
  depth?: 1 | 2 | 3;
  /**
   * Open-directive metadata per account (cash-flow-role declarations), the
   * `meta` of getLedgerAccountDirectives. Omitted/empty means every account
   * resolves by the name heuristics, exactly as before.
   */
  accountMeta?: AccountMetaMap;
  /** The ledger's operating currency, preferred when the accounts hold it. */
  preferredCurrency?: string | null;
}

/** Amounts in one unit only; accounts holding none of it drop out. */
function projectToUnit(
  group: Map<string, UnitAmounts>,
  unit: string,
): Map<string, string> {
  const projected = new Map<string, string>();
  group.forEach((amounts, name) => {
    const amount = amounts.get(unit);
    if (amount !== undefined && Number(amount) !== 0) {
      projected.set(name, amount);
    }
  });
  return projected;
}

/**
 * Transform hierarchy data into Sankey diagram data structure
 */
export function transformToSankeyData(options: TransformOptions): SankeyData {
  const {
    incomeHierarchyData,
    expensesHierarchyData,
    assetsHierarchyData,
    liabilitiesHierarchyData,
    depth = 2,
    accountMeta,
  } = options;
  const rootTypes = hierarchyRoots({
    income: incomeHierarchyData,
    expenses: expensesHierarchyData,
    assets: assetsHierarchyData,
    liabilities: liabilitiesHierarchyData,
  });

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  // Extract nodes at target depth
  const incomeAmounts = extractNodesAtDepth(
    incomeHierarchyData,
    depth,
    true,
    accountMeta,
    rootTypes,
  ); // Inverse for income
  const expenseAmounts = extractNodesAtDepth(
    expensesHierarchyData,
    depth,
    false,
    accountMeta,
    rootTypes,
  );

  // Filter assets to only include investing (exclude cash-equivalent)
  const assetAmounts = new Map<string, UnitAmounts>();
  extractNodesAtDepth(
    assetsHierarchyData,
    depth,
    false,
    accountMeta,
    rootTypes,
  ).forEach((amounts, key) => {
    if (!isExcludedAccount(key, accountMeta?.get(key), rootTypes)) {
      assetAmounts.set(key, amounts);
    }
  });

  const liabilityAmounts = extractNodesAtDepth(
    liabilitiesHierarchyData,
    depth,
    false,
    accountMeta,
    rootTypes,
  );

  const groups = [
    incomeAmounts,
    expenseAmounts,
    assetAmounts,
    liabilityAmounts,
  ];
  const allAmounts = groups.flatMap((group) => [...group.values()]);
  const units = collectUnits(allAmounts);
  const unit = chooseDisplayUnit(allAmounts, options.preferredCurrency);
  if (!unit) {
    return { nodes, links, unit: null, units };
  }

  const incomeNodes = projectToUnit(incomeAmounts, unit);
  const expenseNodes = projectToUnit(expenseAmounts, unit);
  const assetNodes = projectToUnit(assetAmounts, unit);
  const liabilityNodes = projectToUnit(liabilityAmounts, unit);

  // Calculate totals — all within the one displayed unit, so no unlike units
  // are ever added together, and as decimals, so Savings is exact.
  const sum = (values: Map<string, string>) =>
    sumDecimalNumbers([...values.values()]);
  const outflows = [expenseNodes, assetNodes, liabilityNodes];
  const totalSavings = sumDecimalNumbers([
    sum(incomeNodes),
    ...outflows.map((group) => negateDecimalNumber(sum(group))),
  ]);
  // A link runs the other way for a negative amount, so an account whose
  // period total runs against its side — a refunded expense, clawed-back
  // income, a sold investment, new borrowing — crosses the hub under its own
  // name rather than being dropped, and everything entering the hub also
  // leaves it (w4/m54).
  const addLink = (source: string, target: string, exact: string) => {
    const reversed = exact.startsWith("-");
    const amount = reversed ? negateDecimalNumber(exact) : exact;
    links.push({
      source: reversed ? target : source,
      target: reversed ? source : target,
      value: Number(amount),
      exact: amount,
    });
  };
  const addFlows = (group: Map<string, string>, inbound: boolean) =>
    group.forEach((exact, name) => {
      nodes.push({ name });
      if (inbound) addLink(name, CASH_FLOW_NODE, exact);
      else addLink(CASH_FLOW_NODE, name, exact);
    });

  nodes.push({ name: CASH_FLOW_NODE });
  addFlows(incomeNodes, true);
  for (const group of outflows) addFlows(group, false);

  // What is left is kept as Savings, or was spent beyond what came in: a
  // Shortfall source of the exact gap, not an account the data cannot name.
  const shortfall = totalSavings.startsWith("-");
  if (shortfall || isPositiveDecimalNumber(totalSavings)) {
    const name = shortfall ? SHORTFALL_NODE : SAVINGS_NODE;
    nodes.push({ name });
    addLink(CASH_FLOW_NODE, name, totalSavings);
  }

  return { nodes, links, unit, units };
}
