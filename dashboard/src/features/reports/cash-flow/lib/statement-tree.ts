import { sumBalanceRecords } from "@/features/reports/export/model";
import type { HierarchyListNode } from "@/features/reports/balance-sheet/hierarchy-list-types";
import type { CashAccountSnapshot, CashFlowRow } from "./model";
import type { RoleResolution } from "./role-resolver";

function leafNode(
  account: string,
  balance: Record<string, unknown>,
  roleSource?: RoleResolution["source"],
): HierarchyListNode {
  return {
    __typename: "SerializableTreeNode",
    account,
    balance,
    balanceChildren: balance,
    children: [],
    hasTxns: false,
    cost: null,
    costChildren: null,
    // HierarchyList reads this to mark rows whose activity was declared in
    // the ledger.
    roleSource,
  };
}

interface MutableTreeNode {
  account: string;
  /** Set when a statement row lands exactly on this node (rows are leaves). */
  amounts: Record<string, string> | null;
  /** The row's classification source; only set alongside `amounts`. */
  roleSource: RoleResolution["source"] | null;
  /** Children keyed by their FULL account path. */
  children: Map<string, MutableTreeNode>;
}

/** Descending |amount in primaryCurrency|; floats for ordering only. */
function byPrimaryMagnitude(primaryCurrency: string) {
  return (a: HierarchyListNode, b: HierarchyListNode) =>
    Math.abs(Number(b.balanceChildren[primaryCurrency] ?? 0)) -
    Math.abs(Number(a.balanceChildren[primaryCurrency] ?? 0));
}

function toSerializable(
  node: MutableTreeNode,
  primaryCurrency: string,
): HierarchyListNode {
  if (node.children.size === 0) {
    return leafNode(
      node.account,
      node.amounts ?? {},
      node.roleSource ?? undefined,
    );
  }
  const children = [...node.children.values()]
    .map((child) => toSerializable(child, primaryCurrency))
    .sort(byPrimaryMagnitude(primaryCurrency));
  // Internal nodes never carry their own row (rows are leaves), so the rollup
  // is the exact-decimal sum of the child rollups.
  const balance = sumBalanceRecords(children.map((child) => child.balance));
  return {
    ...leafNode(node.account, balance),
    children: children as unknown as Record<string, unknown>[],
  };
}

/**
 * Rebuild a nested tree forest from an activity's flat rows for
 * HierarchyListCard. Top-level nodes are real accounts: the root segment is
 * dropped from the nesting (`Assets:Brokerage`, not `Assets` → `Brokerage`),
 * while every node's `account` keeps the FULL path so the list links to the
 * real account page. Nodes are keyed by full path, so same-named accounts
 * under different roots (`Income:Rent` / `Expenses:Rent`) stay distinct.
 * The activity total is NOT part of the forest — callers render it as a
 * plain summary row below the tree.
 */
export function buildActivityForest(
  rows: CashFlowRow[],
  primaryCurrency: string,
): HierarchyListNode[] {
  const roots = new Map<string, MutableTreeNode>();

  rows.forEach((row) => {
    const [rootSegment, ...segments] = row.accountPath.split(":");
    let siblings = roots;
    let path = rootSegment;
    segments.forEach((segment, index) => {
      path = `${path}:${segment}`;
      let node = siblings.get(path);
      if (!node) {
        node = {
          account: path,
          amounts: null,
          roleSource: null,
          children: new Map(),
        };
        siblings.set(path, node);
      }
      if (index === segments.length - 1) {
        node.amounts = row.amounts;
        node.roleSource = row.roleSource;
      }
      siblings = node.children;
    });
  });

  return [...roots.values()]
    .map((node) => toSerializable(node, primaryCurrency))
    .sort(byPrimaryMagnitude(primaryCurrency));
}

/**
 * Bottom-line forest: the real cash & equivalents accounts with their closing
 * balances, sorted by descending primary-currency magnitude. The aggregate
 * closing/opening/net-change rows are NOT part of the forest — callers render
 * them as plain summary rows below the tree.
 */
export function buildCashAccountForest(
  snapshots: CashAccountSnapshot[],
  primaryCurrency: string,
): HierarchyListNode[] {
  return snapshots
    .map((snapshot) =>
      leafNode(snapshot.account, snapshot.balance, snapshot.roleSource),
    )
    .sort(byPrimaryMagnitude(primaryCurrency));
}
