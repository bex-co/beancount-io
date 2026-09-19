import {
  categorizeAccount,
  extractAccountAtDepth,
  isExcludedAccount,
} from "./account-categorizer";
import type { AccountMetaMap } from "@/features/reports/cash-flow/lib/model";
import type { SerializableTreeNode } from "@/graphql/definitions";

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

/**
 * Amounts keyed by their currency unit.
 *
 * The ledger's balances are maps like `{ USD: 52047.35, IRAUSD: 18000 }`, and
 * the two numbers are not commensurable: no price was supplied, so adding them
 * produces a figure that is neither a USD total nor a conversion. Everything in
 * this module therefore carries amounts per unit and never sums across keys.
 */
export type UnitAmounts = Map<string, number>;

function addAmount(into: UnitAmounts, unit: string, amount: number): void {
  if (!Number.isFinite(amount) || amount === 0) return;
  into.set(unit, (into.get(unit) ?? 0) + amount);
}

/** Merge one unit map into another, unit by unit. */
function mergeAmounts(into: UnitAmounts, from: UnitAmounts): void {
  from.forEach((amount, unit) => addAmount(into, unit, amount));
}

/** Read every unit a balance carries, rather than USD-or-whatever-is-first. */
function readBalance(
  balance: Record<string, unknown> | null | undefined,
  inverse: boolean,
  into: UnitAmounts,
): void {
  if (!balance) return;
  for (const [unit, raw] of Object.entries(balance)) {
    const num = typeof raw === "string" ? parseFloat(raw) : Number(raw);
    if (!Number.isFinite(num)) continue;
    addAmount(into, unit, inverse ? -num : num);
  }
}

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
 * Two things this has to get right that the scalar version did not:
 *
 * - **A node's own postings count.** The producer stores an account's direct
 *   postings in `balance` and rolls them into each ancestor's
 *   `balanceChildren`, so `balance` is read at every level and nothing is
 *   double-counted. Summing only children dropped real money whenever a parent
 *   had postings of its own — and it dropped them even when the child that
 *   caused the recursion was empty.
 * - **Every descendant resolves its own role.** The caller resolves the node it
 *   entered through; without resolving each account below it, a Cash or
 *   Checking leaf reaches the investing bucket purely because its parent did.
 *   A declared activity role on such an account still keeps it, because that is
 *   what `isExcludedAccount` already decides.
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

      const existing = nodeMap.get(accountAtDepth);
      if (existing) {
        mergeAmounts(existing, balance);
      } else {
        nodeMap.set(accountAtDepth, balance);
      }
    } else {
      // An ancestor above the grouping depth can hold postings of its own, and
      // they belong to its own depth key rather than to any child's.
      readBalanceAtDepth(node, accountAtDepth, inverse, nodeMap);
      node.children?.forEach((child) => traverse(child, currentDepth + 1));
    }
  }

  rootsArray.forEach((root) => traverse(root, 1));
  return nodeMap;
}

function readBalanceAtDepth(
  node: HierarchyNode,
  accountAtDepth: string,
  inverse: boolean,
  nodeMap: Map<string, UnitAmounts>,
): void {
  const own: UnitAmounts = new Map();
  readBalance(node.balance, inverse, own);
  if (own.size === 0) return;
  const existing = nodeMap.get(accountAtDepth);
  if (existing) {
    mergeAmounts(existing, own);
  } else {
    nodeMap.set(accountAtDepth, own);
  }
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

/**
 * Choose the one unit this diagram speaks in.
 *
 * A Sankey adds its links together — into node totals, into the centre, into
 * Savings — so it can only ever show one unit truthfully. The unit that most
 * accounts are denominated in is the one that describes the ledger; ties go to
 * the larger total and then to alphabetical order, so the choice is stable
 * across renders rather than dependent on object key order.
 */
function chooseDisplayUnit(groups: Map<string, UnitAmounts>[]): string | null {
  const accounts = new Map<string, number>();
  const magnitude = new Map<string, number>();
  for (const group of groups) {
    group.forEach((amounts) => {
      amounts.forEach((amount, unit) => {
        accounts.set(unit, (accounts.get(unit) ?? 0) + 1);
        magnitude.set(unit, (magnitude.get(unit) ?? 0) + Math.abs(amount));
      });
    });
  }
  let best: string | null = null;
  for (const unit of accounts.keys()) {
    if (best === null) {
      best = unit;
      continue;
    }
    const byAccounts = (accounts.get(unit) ?? 0) - (accounts.get(best) ?? 0);
    const byMagnitude = (magnitude.get(unit) ?? 0) - (magnitude.get(best) ?? 0);
    if (byAccounts > 0 || (byAccounts === 0 && byMagnitude > 0)) best = unit;
    else if (byAccounts === 0 && byMagnitude === 0 && unit < best) best = unit;
  }
  return best;
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

/** Every unit any account in the diagram holds, for disclosing its scope. */
function collectUnits(groups: Map<string, UnitAmounts>[]): string[] {
  const units = new Set<string>();
  for (const group of groups) {
    group.forEach((amounts) => amounts.forEach((_, unit) => units.add(unit)));
  }
  return [...units].sort();
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
  const units = collectUnits(groups);
  const unit = chooseDisplayUnit(groups);
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
