import type { SerializableTreeNode } from "@/graphql/definitions";

/** A tree row: a real ledger account, optionally sign-inverted or marked. */
export type HierarchyListNode = SerializableTreeNode & {
  inverted?: boolean;
  /**
   * Cash-flow statement rows only: how the row's activity was resolved.
   * "declared" rows get a small marker; heuristic rows stay unmarked and
   * other reports never set this.
   */
  roleSource?: "declared" | "heuristic";
};

/**
 * A plain total/summary row rendered below the tree rows: the label is plain
 * text (no account link, no expander) and the amounts go through the same
 * currency columns as tree rows so signs and dashes match.
 */
export interface HierarchySummaryRow {
  label: string;
  balance: Record<string, unknown>;
  bold?: boolean;
  inverted?: boolean;
}
