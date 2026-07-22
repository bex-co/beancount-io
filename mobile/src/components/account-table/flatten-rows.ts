import type {
  AccountCategory,
  AccountNode,
  CategoryKey,
} from "@/components/account-list/select-account-list";

/** One rendered line of the table — a category root or an account beneath it. */
export type TableRow = {
  /** Stable, unique row key (the full beancount account, or the category key). */
  key: string;
  /**
   * Account to drill into — a category row carries its own root account, so it
   * navigates like any other. Empty only when the ledger names no account for it,
   * which leaves the row fold-only.
   */
  account: string;
  /** Row label: an i18n key on category rows, a ready display name below them. */
  label: string;
  /** Category this row belongs to — picks the label's translation at depth 0. */
  category: CategoryKey;
  /** Signed rolled-up balance in the active currency. */
  value: number;
  /** 0 = category root. */
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  /**
   * 0..1 magnitude relative to the largest row at the same level under the same
   * parent — the width of the row's share bar. 0 on category rows (see below).
   */
  share: number;
};

/**
 * Categories expanded on first render. Assets and Liabilities are what the tab is
 * for; Equity is usually one opening-balances line, and Income/Expenses are long
 * and already have a home on the Reports tab — so those three start collapsed
 * rather than burying the balance sheet.
 */
const DEFAULT_EXPANDED: readonly CategoryKey[] = ["assets", "liabilities"];

/**
 * Deepest account row expanded on load. 1 shows a category's top-level accounts
 * and stops there — with single-child chains already folded away, one level is
 * usually the whole account anyway.
 */
const DEFAULT_EXPANDED_DEPTH = 1;

/**
 * Share of the widest sibling, for the row's magnitude bar. Normalizing against
 * the largest row at the same level — rather than the category total — keeps
 * every bar within its track and makes the comparison the eye actually wants
 * (this row against its peers). Against the category total, a sibling offsetting
 * a negative one would overflow: Assets' BofA is 124% of the $2,677.28 total.
 *
 * An only child gets no bar: with nothing to compare against it would always
 * draw full-width, which says nothing and reads as a rule under the row.
 */
function shareOfSiblings(value: number, siblings: AccountNode[]): number {
  if (siblings.length < 2) {
    return 0;
  }
  const widest = Math.max(...siblings.map((node) => Math.abs(node.value)));
  return widest > 0 ? Math.abs(value) / widest : 0;
}

/**
 * Flatten the category trees into the visible rows a `FlatList` renders, honoring
 * per-row expand/collapse. `overrides` holds the rows the user has toggled; rows
 * it doesn't mention fall back to the defaults above.
 *
 * Category rows carry no share bar: their magnitudes aren't comparable to each
 * other — Assets and Liabilities are balances at a point in time, Income and
 * Expenses are flows over the ledger's life — so one shared scale would invite a
 * meaningless comparison.
 */
export function flattenRows(
  categories: AccountCategory[],
  overrides: Record<string, boolean>,
): TableRow[] {
  const rows: TableRow[] = [];

  const isExpanded = (key: string, fallback: boolean) =>
    overrides[key] ?? fallback;

  const pushNodes = (
    nodes: AccountNode[],
    depth: number,
    category: CategoryKey,
  ) => {
    for (const node of nodes) {
      const hasChildren = node.children.length > 0;
      const expanded =
        hasChildren && isExpanded(node.account, depth < DEFAULT_EXPANDED_DEPTH);
      rows.push({
        key: node.account,
        account: node.account,
        label: node.name,
        category,
        value: node.value,
        depth,
        hasChildren,
        expanded,
        share: shareOfSiblings(node.value, nodes),
      });
      if (expanded) {
        pushNodes(node.children, depth + 1, category);
      }
    }
  };

  for (const category of categories) {
    const hasChildren = category.children.length > 0;
    const expanded =
      hasChildren &&
      isExpanded(category.key, DEFAULT_EXPANDED.includes(category.key));
    rows.push({
      // Keyed by category, not by account: this is what the expand/collapse
      // overrides map is keyed on, and no account row can collide with it (they
      // are all colon-paths beneath a root).
      key: category.key,
      account: category.account,
      label: category.key,
      category: category.key,
      value: category.value,
      depth: 0,
      hasChildren,
      expanded,
      share: 0,
    });
    if (expanded) {
      pushNodes(category.children, 1, category.key);
    }
  }

  return rows;
}
