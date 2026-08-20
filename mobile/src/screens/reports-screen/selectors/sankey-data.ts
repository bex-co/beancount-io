import type { AccountNode } from "../../../components/account-list/select-account-list";
import { leafName } from "../../../common/account-util";
import { topNWithOther } from "./select-breakdown-rows";

/** Depth of account path the Sankey draws — matches the web transformer. */
export const SANKEY_DEPTH = 2;

/**
 * Visible category nodes per side before the tail folds into "Other".
 * Chosen in m33/t001: 5 ranked by value share keeps labels readable at 402pt.
 */
export const SANKEY_TOP_N = 5;

/** Max characters of a beside-node label before ellipsis (t001). */
export const SANKEY_LABEL_MAX_CHARS = 10;

export const CASH_FLOW_ID = "cash-flow";
export const SAVINGS_ID = "savings";
export const OTHER_INCOME_ACCOUNT = "__other_income__";
export const OTHER_EXPENSES_ACCOUNT = "__other_expenses__";

export type SankeyRole = "source" | "hub" | "operating" | "savings";

export type SankeyNodeDatum = {
  id: string;
  label: string;
  role: SankeyRole;
};

export type SankeyLinkDatum = {
  source: string;
  target: string;
  value: number;
};

export type SankeyData = {
  nodes: SankeyNodeDatum[];
  links: SankeyLinkDatum[];
  /** Signed sum of the input income tree — same number the statement card shows. */
  totalIncome: number;
  /** Signed sum of the input expense tree — same number the statement card shows. */
  totalExpenses: number;
};

export type AccountCategory =
  "source" | "operating" | "investing" | "financing" | "exclude";

/**
 * Categorize a Beancount account by its type prefix.
 * Port of the web `account-categorizer` — typed copy, no cross-package import.
 */
export function categorizeAccount(accountName: string): AccountCategory {
  if (!accountName) {
    return "exclude";
  }
  const prefix = accountName.split(":")[0];
  switch (prefix) {
    case "Income":
      return "source";
    case "Expenses":
      return "operating";
    case "Assets":
      return "investing";
    case "Liabilities":
      return "financing";
    default:
      return "exclude";
  }
}

/**
 * Cash-equivalent assets do not belong in an investing outflow.
 * Port of the web helper; income/expense trees rarely hit it, but the
 * transformer still consults it so a stray asset path cannot leak through.
 */
export function isExcludedAccount(accountName: string): boolean {
  if (!accountName) {
    return false;
  }
  const exclusionPatterns = [
    /^Assets:.*Cash$/i,
    /^Assets:.*Checking$/i,
    /^Assets:.*Savings$/i,
    /^Assets:.*Bank/i,
  ];
  return exclusionPatterns.some((pattern) => pattern.test(accountName));
}

/** Account path truncated to `depth` segments (`Income:Salary:Gross` at 2 → `Income:Salary`). */
export function extractAccountAtDepth(
  accountName: string,
  depth: number,
): string {
  if (!accountName) {
    return "";
  }
  const parts = accountName.split(":");
  const targetDepth = Math.min(depth, parts.length);
  return parts.slice(0, targetDepth).join(":");
}

/**
 * Numeric amount from a `{ currency: amount }` balance.
 *
 * Prefers USD, then the first key — the web transformer's currency pick, kept
 * so a raw hierarchy node can feed this file the same way. The Reports path
 * does not use it: `selectRangedAccountTree` has already resolved the active
 * currency into `AccountNode.value`.
 */
export function pickNumericAmount(
  balance?: Record<string, unknown> | null,
  inverse = false,
): number {
  if (!balance) {
    return 0;
  }
  const value = balance["USD"] ?? Object.values(balance)[0];
  if (value == null) {
    return 0;
  }
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  const result = Number.isFinite(num) ? num : 0;
  return inverse ? -result : result;
}

/** Ellipsis-truncate a beside-node label so neighbouring labels cannot overlap. */
export function truncateSankeyLabel(
  label: string,
  maxChars: number = SANKEY_LABEL_MAX_CHARS,
): string {
  if (maxChars <= 0) {
    return "";
  }
  if (label.length <= maxChars) {
    return label;
  }
  if (maxChars === 1) {
    return "…";
  }
  return `${label.slice(0, maxChars - 1)}…`;
}

export function sankeyRoleForId(id: string): SankeyRole {
  if (id === CASH_FLOW_ID) {
    return "hub";
  }
  if (id === SAVINGS_ID) {
    return "savings";
  }
  if (id === OTHER_INCOME_ACCOUNT) {
    return "source";
  }
  if (id === OTHER_EXPENSES_ACCOUNT) {
    return "operating";
  }
  const category = categorizeAccount(id);
  switch (category) {
    case "source":
      return "source";
    case "operating":
      return "operating";
    default:
      return "hub";
  }
}

/** Map a Sankey role onto the theme token palette — never a literal color. */
export function sankeyColorForRole(
  role: SankeyRole,
  theme: {
    success: string;
    error: string;
    primary: string;
    information: string;
  },
): string {
  switch (role) {
    case "source":
      return theme.success;
    case "operating":
      return theme.error;
    case "hub":
      return theme.primary;
    case "savings":
      return theme.information;
  }
}

type TransformOptions = {
  income: AccountNode[];
  expenses: AccountNode[];
  otherLabel: string;
  cashFlowLabel: string;
  savingsLabel: string;
  depth?: number;
  topN?: number;
};

function treeTotal(nodes: AccountNode[]): number {
  return nodes.reduce((sum, node) => sum + node.value, 0);
}

function extractAtDepth(
  nodes: AccountNode[],
  targetDepth: number,
  out: Map<string, number>,
): void {
  for (const node of nodes) {
    if (!node || !node.account) {
      continue;
    }
    if (
      categorizeAccount(node.account) === "exclude" ||
      isExcludedAccount(node.account)
    ) {
      continue;
    }
    const parts = node.account.split(":").length;
    if (parts >= targetDepth || node.children.length === 0) {
      const key = extractAccountAtDepth(node.account, targetDepth);
      // Zero is dropped here so a balanced-to-nothing category does not
      // occupy a node; negatives are kept in the map so totals still match
      // the statement, then stripped from *links* below.
      if (node.value !== 0) {
        out.set(key, (out.get(key) ?? 0) + node.value);
      }
    } else {
      extractAtDepth(node.children, targetDepth, out);
    }
  }
}

function toRankedNodes(
  values: Map<string, number>,
  labelOf: (id: string) => string,
): AccountNode[] {
  return Array.from(values.entries())
    .filter(([, value]) => value > 0)
    .map(([account, value]) => ({
      account,
      name: labelOf(account),
      value,
      children: [],
    }))
    .sort((a, b) => b.value - a.value);
}

function pushNode(
  nodes: SankeyNodeDatum[],
  seen: Set<string>,
  id: string,
  label: string,
  role: SankeyRole,
): void {
  if (seen.has(id)) {
    return;
  }
  seen.add(id);
  nodes.push({ id, label, role });
}

/**
 * Income/expense account trees → `{ nodes, links }` for `d3-sankey`.
 *
 * Input is the range-scoped tree `selectRangedAccountTree` already builds, so
 * the flow honors the Reports time-range pills. Non-positive values never
 * become links: a near-zero negative once produced a negative SVG height on
 * another chart that silently drew nothing (m20), and a Sankey ribbon of
 * width ≤ 0 does the same.
 */
export function transformToSankeyData(options: TransformOptions): SankeyData {
  const {
    income,
    expenses,
    otherLabel,
    cashFlowLabel,
    savingsLabel,
    depth = SANKEY_DEPTH,
    topN = SANKEY_TOP_N,
  } = options;

  const totalIncome = treeTotal(income);
  const totalExpenses = treeTotal(expenses);

  const incomeValues = new Map<string, number>();
  const expenseValues = new Map<string, number>();
  extractAtDepth(income, depth, incomeValues);
  extractAtDepth(expenses, depth, expenseValues);

  const incomeRows = topNWithOther(
    toRankedNodes(incomeValues, leafName),
    topN,
    otherLabel,
    OTHER_INCOME_ACCOUNT,
  );
  const expenseRows = topNWithOther(
    toRankedNodes(expenseValues, leafName),
    topN,
    otherLabel,
    OTHER_EXPENSES_ACCOUNT,
  );

  const nodes: SankeyNodeDatum[] = [];
  const links: SankeyLinkDatum[] = [];
  const seen = new Set<string>();

  const hasFlows = incomeRows.length > 0 || expenseRows.length > 0;
  if (!hasFlows) {
    return { nodes, links, totalIncome, totalExpenses };
  }

  pushNode(nodes, seen, CASH_FLOW_ID, cashFlowLabel, "hub");

  for (const row of incomeRows) {
    // Link values must be strictly positive — zero/negative never reach the renderer.
    if (row.value <= 0) {
      continue;
    }
    pushNode(nodes, seen, row.account, row.name, sankeyRoleForId(row.account));
    links.push({
      source: row.account,
      target: CASH_FLOW_ID,
      value: row.value,
    });
  }

  for (const row of expenseRows) {
    if (row.value <= 0) {
      continue;
    }
    pushNode(nodes, seen, row.account, row.name, sankeyRoleForId(row.account));
    links.push({
      source: CASH_FLOW_ID,
      target: row.account,
      value: row.value,
    });
  }

  // Balance the graph from the links we actually drew, not the statement
  // totals: refunds and other non-positive rows still count toward
  // `totalIncome` / `totalExpenses` (so those match the cards) but never
  // become ribbons — using them for Savings would make the hub taller than
  // the income flow and break conservation on screen.
  const linkedIncome = links
    .filter((l) => l.target === CASH_FLOW_ID)
    .reduce((sum, l) => sum + l.value, 0);
  const linkedExpenses = links
    .filter((l) => l.source === CASH_FLOW_ID)
    .reduce((sum, l) => sum + l.value, 0);
  const savings = linkedIncome - linkedExpenses;
  if (savings > 0) {
    pushNode(nodes, seen, SAVINGS_ID, savingsLabel, "savings");
    links.push({
      source: CASH_FLOW_ID,
      target: SAVINGS_ID,
      value: savings,
    });
  }

  return { nodes, links, totalIncome, totalExpenses };
}
