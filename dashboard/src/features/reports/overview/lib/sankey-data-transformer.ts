import {
  categorizeAccount,
  extractAccountAtDepth,
  isExcludedAccount,
} from "./account-categorizer";
import type { AccountMetaMap } from "@/features/reports/cash-flow/lib/model";
import type { SerializableTreeNode } from "@/graphql/definitions";
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

export type SankeyNode = {
  name: string;
  itemStyle?: { color: string };
};

export type SankeyLink = {
  source: string;
  target: string;
  value: number;
};

export type SankeyData = {
  nodes: SankeyNode[];
  links: SankeyLink[];
  /** The one unit every `value` above is denominated in, or null when empty. */
  unit: string | null;
  /** Every unit the underlying accounts hold, so scope can be disclosed. */
  units: string[];
};

/** True when this account carries no cash-flow activity of its own. */
function isSkipped(account: string, accountMeta?: AccountMetaMap): boolean {
  const meta = accountMeta?.get(account);
  return (
    categorizeAccount(account, meta) === "exclude" ||
    isExcludedAccount(account, meta)
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
): UnitAmounts {
  const totals: UnitAmounts = new Map();

  function collect(current: HierarchyNode): void {
    readBalance(current.balance, inverse, totals);
    for (const child of current.children ?? []) {
      if (!child?.account) continue;
      if (isSkipped(child.account, accountMeta)) continue;
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
    if (isSkipped(node.account, accountMeta)) {
      return;
    }

    if (
      currentDepth === targetDepth ||
      !node.children ||
      node.children.length === 0
    ) {
      // Reached target depth or leaf node
      const balance = aggregateHierarchyBalance(node, inverse, accountMeta);
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
}

/** Amounts in one unit only; accounts holding none of it drop out. */
function projectToUnit(
  group: Map<string, UnitAmounts>,
  unit: string,
): Map<string, number> {
  const projected = new Map<string, number>();
  group.forEach((amounts, name) => {
    const amount = amounts.get(unit);
    if (amount !== undefined && amount !== 0) projected.set(name, amount);
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

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  // Extract nodes at target depth
  const incomeAmounts = extractNodesAtDepth(
    incomeHierarchyData,
    depth,
    true,
    accountMeta,
  ); // Inverse for income
  const expenseAmounts = extractNodesAtDepth(
    expensesHierarchyData,
    depth,
    false,
    accountMeta,
  );

  // Filter assets to only include investing (exclude cash-equivalent)
  const assetAmounts = new Map<string, UnitAmounts>();
  extractNodesAtDepth(assetsHierarchyData, depth, false, accountMeta).forEach(
    (amounts, key) => {
      if (!isExcludedAccount(key, accountMeta?.get(key))) {
        assetAmounts.set(key, amounts);
      }
    },
  );

  const liabilityAmounts = extractNodesAtDepth(
    liabilitiesHierarchyData,
    depth,
    false,
    accountMeta,
  );

  const groups = [
    incomeAmounts,
    expenseAmounts,
    assetAmounts,
    liabilityAmounts,
  ];
  const allAmounts = groups.flatMap((group) => [...group.values()]);
  const units = collectUnits(allAmounts);
  const unit = chooseDisplayUnit(allAmounts);
  if (!unit) {
    return { nodes, links, unit: null, units };
  }

  const incomeNodes = projectToUnit(incomeAmounts, unit);
  const expenseNodes = projectToUnit(expenseAmounts, unit);
  const assetNodes = projectToUnit(assetAmounts, unit);
  const liabilityNodes = projectToUnit(liabilityAmounts, unit);

  // Calculate totals — all within the one displayed unit, so no unlike units
  // are ever added together.
  const sum = (values: Map<string, number>) =>
    Array.from(values.values()).reduce((total, value) => total + value, 0);
  const totalIncome = sum(incomeNodes);
  const totalExpenses = sum(expenseNodes);
  const totalInvesting = sum(assetNodes);
  const totalFinancing = sum(liabilityNodes);
  const totalSavings =
    totalIncome - totalExpenses - totalInvesting - totalFinancing;

  // Add Cash Flow center node
  nodes.push({ name: "Cash Flow" });

  // Add income nodes and links
  incomeNodes.forEach((value, name) => {
    if (value <= 0) return;
    nodes.push({ name });
    links.push({ source: name, target: "Cash Flow", value });
  });

  // Add expense nodes and links
  expenseNodes.forEach((value, name) => {
    if (value <= 0) return;
    nodes.push({ name });
    links.push({ source: "Cash Flow", target: name, value });
  });

  // Add investing nodes and links
  assetNodes.forEach((value, name) => {
    if (value <= 0) return;
    nodes.push({ name });
    links.push({ source: "Cash Flow", target: name, value });
  });

  // Add financing nodes and links
  liabilityNodes.forEach((value, name) => {
    if (value <= 0) return;
    nodes.push({ name });
    links.push({ source: "Cash Flow", target: name, value });
  });

  // Add savings node if there's surplus
  if (totalSavings > 0) {
    nodes.push({ name: "Savings" });
    links.push({ source: "Cash Flow", target: "Savings", value: totalSavings });
  }

  return { nodes, links, unit, units };
}
