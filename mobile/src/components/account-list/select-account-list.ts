import { AccountHierarchyQuery } from "@/generated-graphql/graphql";
import { resolveCurrencyBalance } from "../../common/balance-util";
import { leafName } from "../../common/account-util";

export type AccountNode = {
  /** Full beancount account, e.g. "Assets:Bank:Checking". */
  account: string;
  /** Display name for this row (segment(s) below its parent). */
  name: string;
  /** Absolute rolled-up balance (includes descendants) in the active currency. */
  value: number;
  /** Immediate sub-accounts (one level deeper), same shape. */
  children: AccountNode[];
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
  displayName: (account: string) => string,
): AccountNode {
  return {
    account: raw.account,
    name: displayName(raw.account),
    value: Math.abs(resolveCurrencyBalance(raw.balance_children, currency)),
    children: (raw.children ?? [])
      .map((child) => toNode(child, currency, leafName))
      .filter((node) => node.value > 0)
      .sort((a, b) => b.value - a.value),
  };
}

/**
 * Map + filter + sort the top-level sub-accounts of one category: strip the
 * category segment from each name, drop zero-balance accounts, sort by balance
 * descending. Shared by both selectors below.
 */
function buildTopLevel(topLevel: RawChild[], currency: string): AccountNode[] {
  return topLevel
    .map((child) => toNode(child, currency, stripTopLevel))
    .filter((accountNode) => accountNode.value > 0)
    .sort((a, b) => b.value - a.value);
}

/**
 * Build a two-level account tree under a labelled hierarchy node ("assets",
 * "liabilities", …): each top-level sub-account (rolled-up balance) with its
 * immediate children nested beneath it. Every node's `value` is the rolled-up
 * subtree total, so children are a breakdown *of* their parent — never additive
 * to it. Zero-balance accounts are omitted; nodes are sorted by balance
 * descending.
 */
export function selectAccountTree(
  currency: string,
  label: string,
  data?: AccountHierarchyQuery,
): AccountNode[] {
  if (!currency || !data?.accountHierarchy?.data) {
    return [];
  }
  const node = data.accountHierarchy.data.find(
    (item) => item.label.toLowerCase() === label.toLowerCase(),
  );
  const topLevel = (node?.data?.children ?? []) as RawChild[];

  return buildTopLevel(topLevel, currency);
}

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
 * zero-balance accounts omitted, sorted by balance descending — over the
 * camelCase SerializableTreeNode shape instead of the labelled AccountHierarchy
 * shape.
 */
export function selectAccountTreeFromRoot(
  currency: string,
  root?: SerializableTreeNodeLike | null,
): AccountNode[] {
  if (!currency || !root?.children) {
    return [];
  }
  const children = root.children as SerializableChild[] | null | undefined;
  return buildTopLevel((children ?? []).map(fromSerializable), currency);
}
