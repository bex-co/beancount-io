import type { SerializableTreeNode } from "@/graphql/definitions";

/**
 * Checks if all values in an object are empty or zero
 *
 * @param obj - The object to check
 * @returns true if all values are empty/zero, false otherwise
 */
function isObjectEmpty(obj: Record<string, unknown>): boolean {
  const keys = Object.keys(obj);
  if (keys.length === 0) return true;

  return keys.every((key) => {
    const value = obj[key];
    if (value === null || value === undefined || value === "" || value === 0) {
      return true;
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      return isObjectEmpty(value as Record<string, unknown>);
    }
    return false;
  });
}

/**
 * Internal recursive function to filter tree nodes
 *
 * @param node - The tree node to filter
 * @param isTopLevel - Whether this is the top level node (top level never returns null)
 * @returns A new tree node with filtered children, or null if the node should be removed
 */
function filterEmptyTreeNodesRecursive(
  node: SerializableTreeNode,
  isTopLevel: boolean = false,
): SerializableTreeNode | null {
  // Check if the node itself has any meaningful data
  const hasBalance = !isObjectEmpty(node.balance);
  const hasBalanceChildren = !isObjectEmpty(node.balanceChildren);
  const hasCost = node.cost ? !isObjectEmpty(node.cost) : false;
  const hasCostChildren = node.costChildren
    ? !isObjectEmpty(node.costChildren)
    : false;

  // Recursively filter children
  const filteredChildren = node.children
    .map((child) => {
      // Convert JSONObject to SerializableTreeNode-like structure
      const childNode = child as unknown as SerializableTreeNode;
      return filterEmptyTreeNodesRecursive(childNode, false);
    })
    .filter((child): child is SerializableTreeNode => child !== null);

  // For non-top-level nodes, remove if no meaningful data and no children
  if (
    !isTopLevel &&
    !hasBalance &&
    !hasBalanceChildren &&
    !hasCost &&
    !hasCostChildren &&
    filteredChildren.length === 0
  ) {
    return null;
  }

  // Return node with filtered children (top level always returns)
  return {
    ...node,
    children: filteredChildren as Array<Record<string, unknown>>,
  };
}

/**
 * Internal recursive function to filter tree nodes by transaction history
 */
function filterNoTxnTreeNodesRecursive(
  node: SerializableTreeNode,
  isTopLevel: boolean = false,
): SerializableTreeNode | null {
  const filteredChildren = node.children
    .map((child) =>
      filterNoTxnTreeNodesRecursive(
        child as unknown as SerializableTreeNode,
        false,
      ),
    )
    .filter((child): child is SerializableTreeNode => child !== null);

  if (!isTopLevel && !node.hasTxns && filteredChildren.length === 0) {
    return null;
  }

  return {
    ...node,
    children: filteredChildren as Array<Record<string, unknown>>,
  };
}

/**
 * Recursively filters SerializableTreeNode children by removing nodes with no transactions
 *
 * A node is removed if it has no transactions (hasTxns === false) and no surviving children.
 * The top-level node is always returned.
 *
 * @param node - The tree node to filter
 * @returns A new tree node with filtered children
 */
export function filterNoTxnTreeNodes(
  node: SerializableTreeNode,
): SerializableTreeNode {
  return filterNoTxnTreeNodesRecursive(node, true) as SerializableTreeNode;
}

/**
 * Recursively filters SerializableTreeNode children by removing nodes with empty data
 *
 * A node is considered empty if:
 * - It has no children (length 0), OR
 * - All key values in balance, balanceChildren, cost, and costChildren are empty or 0
 *
 * The top-level node is always returned with filtered children, never null.
 *
 * @param node - The tree node to filter
 * @returns A new tree node with filtered children
 */
export function filterEmptyTreeNodes(
  node: SerializableTreeNode,
): SerializableTreeNode {
  return filterEmptyTreeNodesRecursive(node, true) as SerializableTreeNode;
}

export interface AccountHierarchyFilterOptions {
  showZeroBalance: boolean;
  showZeroTransactions: boolean;
  showClosedAccounts: boolean;
  closedAccountNames: Set<string>;
}

function filterClosedTreeNodesRecursive(
  node: SerializableTreeNode,
  closedAccountNames: Set<string>,
  isTopLevel: boolean = false,
): SerializableTreeNode | null {
  const filteredChildren = node.children
    .map((child) =>
      filterClosedTreeNodesRecursive(
        child as unknown as SerializableTreeNode,
        closedAccountNames,
        false,
      ),
    )
    .filter((child): child is SerializableTreeNode => child !== null);

  const isClosed = closedAccountNames.has(node.account);
  const hasNoBalance =
    isObjectEmpty(node.balance) && isObjectEmpty(node.balanceChildren);

  if (
    !isTopLevel &&
    isClosed &&
    hasNoBalance &&
    filteredChildren.length === 0
  ) {
    return null;
  }

  return {
    ...node,
    children: filteredChildren as Array<Record<string, unknown>>,
  };
}

export function filterClosedAccounts(
  node: SerializableTreeNode,
  closedAccountNames: Set<string>,
): SerializableTreeNode {
  return filterClosedTreeNodesRecursive(
    node,
    closedAccountNames,
    true,
  ) as SerializableTreeNode;
}

export function filterAccountHierarchy(
  node: SerializableTreeNode,
  options: AccountHierarchyFilterOptions,
): SerializableTreeNode {
  let result = node;
  if (!options.showZeroBalance) result = filterEmptyTreeNodes(result);
  if (!options.showZeroTransactions) result = filterNoTxnTreeNodes(result);
  if (!options.showClosedAccounts)
    result = filterClosedAccounts(result, options.closedAccountNames);
  return result;
}
