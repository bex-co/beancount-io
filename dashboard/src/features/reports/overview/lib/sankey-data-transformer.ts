import {
  categorizeAccount,
  extractAccountAtDepth,
  isExcludedAccount,
} from "./account-categorizer";
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
};

/**
 * Extract numeric amount from balance object
 */
function pickNumericAmount(
  balance?: Record<string, unknown> | null,
  inverse = false,
): number {
  if (!balance) return 0;

  const value = balance["USD"] ?? Object.values(balance)[0];
  if (value == null) return 0;

  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  const result = Number.isFinite(num) ? num : 0;

  return inverse ? -result : result;
}

/**
 * Recursively aggregate balance from hierarchy node and all descendants
 */
export function aggregateHierarchyBalance(
  node: HierarchyNode,
  inverse = false,
): number {
  if (!node.children || node.children.length === 0) {
    return pickNumericAmount(node.balance, inverse);
  }

  return node.children.reduce(
    (sum, child) => sum + aggregateHierarchyBalance(child, inverse),
    0,
  );
}

/**
 * Extract nodes at specified depth from hierarchy
 */
function extractNodesAtDepth(
  roots: SerializableTreeNode | undefined | null | HierarchyNode[],
  targetDepth: number,
  inverse = false,
): Map<string, number> {
  const nodeMap = new Map<string, number>();

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
    const category = categorizeAccount(node.account);

    // Skip excluded accounts
    if (category === "exclude" || isExcludedAccount(node.account)) {
      return;
    }

    if (
      currentDepth === targetDepth ||
      !node.children ||
      node.children.length === 0
    ) {
      // Reached target depth or leaf node
      const balance = aggregateHierarchyBalance(node, inverse);

      if (balance !== 0) {
        const existing = nodeMap.get(accountAtDepth) || 0;
        nodeMap.set(accountAtDepth, existing + balance);
      }
    } else {
      // Continue traversing
      node.children?.forEach((child) => traverse(child, currentDepth + 1));
    }
  }

  rootsArray.forEach((root) => traverse(root, 1));
  return nodeMap;
}

interface TransformOptions {
  incomeHierarchyData?: SerializableTreeNode;
  expensesHierarchyData?: SerializableTreeNode;
  assetsHierarchyData?: SerializableTreeNode;
  liabilitiesHierarchyData?: SerializableTreeNode;
  depth?: 1 | 2 | 3;
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
  } = options;

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  // Extract nodes at target depth
  const incomeNodes = extractNodesAtDepth(incomeHierarchyData, depth, true); // Inverse for income
  const expenseNodes = extractNodesAtDepth(expensesHierarchyData, depth, false);

  // Filter assets to only include investing (exclude cash-equivalent)
  const assetNodes = new Map<string, number>();
  extractNodesAtDepth(assetsHierarchyData, depth, false).forEach(
    (value, key) => {
      if (!isExcludedAccount(key)) {
        assetNodes.set(key, value);
      }
    },
  );

  const liabilityNodes = extractNodesAtDepth(
    liabilitiesHierarchyData,
    depth,
    false,
  );

  // Calculate totals
  const totalIncome = Array.from(incomeNodes.values()).reduce(
    (sum, val) => sum + val,
    0,
  );
  const totalExpenses = Array.from(expenseNodes.values()).reduce(
    (sum, val) => sum + val,
    0,
  );
  const totalInvesting = Array.from(assetNodes.values()).reduce(
    (sum, val) => sum + val,
    0,
  );
  const totalFinancing = Array.from(liabilityNodes.values()).reduce(
    (sum, val) => sum + val,
    0,
  );
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

  return { nodes, links };
}
