import type { AccountNode } from "../../../components/account-list/select-account-list";
import { GLYPH_ADVANCE_EM } from "./sankey-glyph-widths";
import { leafName } from "../../../common/account-util";
import { getCurrencySymbol } from "../../../common/currency-util";
import { topNWithOther } from "./select-breakdown-rows";
import { formatShortMoneyWithCurrency } from "../../../common/number-utils";
import { getAccountRoot, type RootNames } from "../../../common/account-root";

/**
 * Below half a cent a flow is float residue, not money: a month whose income
 * equals its expenses drew a "Savings" node of 5.55e-17, and a category that
 * nets to zero a node with no ribbon (w21/055). Budget variance already treats
 * it as zero (w4/130).
 */
const HALF_CENT = 0.005;

/**
 * Below this a flow is residue in `currency`. Half a cent for a currency the app
 * knows; a commodity it has no symbol for (BTC as the operating currency) keeps
 * what is recorded, where a flat half cent dropped a 0.004 BTC Food node and left
 * Savings wrong (w21/541). Float residue is far below the floor.
 */
const COMMODITY_RESIDUE = 1e-9;
function flowResidue(currency: string | undefined): number {
  return currency === undefined || getCurrencySymbol(currency) !== ""
    ? HALF_CENT
    : COMMODITY_RESIDUE;
}
/** Depth of account path the Sankey draws — matches the web transformer. */
const SANKEY_DEPTH = 2;

/**
 * Visible category nodes per side before the tail folds into "Other".
 * Chosen in m33/t001: 5 ranked by value share keeps labels readable at 402pt.
 */
const SANKEY_TOP_N = 5;

/** Max characters of a beside-node label before ellipsis (t001). */
const SANKEY_LABEL_MAX_CHARS = 10;

export const CASH_FLOW_ID = "cash-flow";
export const SAVINGS_ID = "savings";
/**
 * The source that funds a deficit: what expenses drew beyond income, taken
 * from existing balances. It shares the Savings role (and color, and label),
 * so on the source side it reads as money from savings.
 */
export const SHORTFALL_ID = "shortfall";
/**
 * Categories whose period net ran against their side: refunded spending flows
 * into the hub, clawed-back income out of it. Left off, Savings was drawn from
 * the other ribbons alone and disagreed with Net Profit (w21/112).
 */
const REFUNDS_ID = "__refunds__";
const CLAWBACKS_ID = "__clawbacks__";
export const OTHER_INCOME_ACCOUNT = "__other_income__";
export const OTHER_EXPENSES_ACCOUNT = "__other_expenses__";
/** The nodes the chart adds beside the ledger's own categories. */
const ADDED_IDS = new Set([
  CASH_FLOW_ID,
  OTHER_INCOME_ACCOUNT,
  OTHER_EXPENSES_ACCOUNT,
  REFUNDS_ID,
  CLAWBACKS_ID,
  SAVINGS_ID,
  SHORTFALL_ID,
]);

export type SankeyRole = "source" | "hub" | "operating" | "savings";

export type SankeyNodeDatum = {
  id: string;
  label: string;
  role: SankeyRole;
};

type SankeyLinkDatum = {
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
 *
 * `roots` are the ledger's own names for the five roots: a ledger with
 * `option "name_income" "Ingresos"` has `Ingresos:Salario`, which read as
 * excluded here, so every node of a fully renamed ledger was dropped and the
 * card said "No cash flow" under a chart full of money (w21/235).
 */
export function categorizeAccount(
  accountName: string,
  roots: RootNames = {},
): AccountCategory {
  if (!accountName) {
    return "exclude";
  }
  switch (getAccountRoot(accountName, roots)) {
    case "income":
      return "source";
    case "expenses":
      return "operating";
    case "assets":
      return "investing";
    case "liabilities":
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
export function isExcludedAccount(
  accountName: string,
  roots: RootNames = {},
): boolean {
  if (!accountName) {
    return false;
  }
  const assets = (roots.assets ?? "Assets").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const exclusionPatterns = [
    new RegExp(`^${assets}:.*Cash$`, "i"),
    new RegExp(`^${assets}:.*Checking$`, "i"),
    new RegExp(`^${assets}:.*Savings$`, "i"),
    new RegExp(`^${assets}:.*Bank`, "i"),
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

/**
 * Room for kerning and for Android's Roboto, which the advances were not
 * measured in.
 */
const GLYPH_MARGIN = 1.03;
const IDEOGRAPH =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

/**
 * A character's advance in the system font, in ems, with room to spare: its
 * measured advance, a full em for an ideograph, and for any other character
 * the widest advance measured (Œ, ض).
 */
function advanceEm(char: string): number {
  const measured = GLYPH_ADVANCE_EM.get(char);
  if (measured !== undefined) return measured * GLYPH_MARGIN;
  return IDEOGRAPH.test(char) ? GLYPH_MARGIN : 1.15;
}

/** A label's width at `fontSize`, never less than the system font draws it. */
export function sankeyLabelWidth(text: string, fontSize: number): number {
  return Array.from(text).reduce(
    (width, char) => width + advanceEm(char) * fontSize,
    0,
  );
}

/**
 * `label` cut with "…" until it fits `maxWidth`. Ten characters were allowed
 * whatever their width, and a left-column label is right-aligned to its node:
 * "Qa20261020" ran past the card's left edge and read ")a20261020" (w21/749).
 * Estimated per script it cut "(expenses)" with room to spare (w21/768).
 */
export function fitSankeyLabel(
  label: string,
  maxWidth: number,
  fontSize: number,
): string {
  if (sankeyLabelWidth(label, fontSize) <= maxWidth) return label;
  const chars = Array.from(label);
  while (chars.length > 0) {
    chars.pop();
    const cut = `${chars.join("").trimEnd()}…`;
    if (sankeyLabelWidth(cut, fontSize) <= maxWidth) return cut;
  }
  return "…";
}

/**
 * The lines a beside-node label is drawn on. A group that shares its name with
 * one on the other side reads "Interest (income)" / "Interest (expenses)": cut
 * to one line the suffix went first and both read "Interest …" (w21/540). The
 * name and the parenthesized suffix get a line each, each cut to fit; a label
 * without a suffix is one line. Chinese writes the suffix in full-width
 * parentheses with no space, "Interest（收入）", which went unsplit and lost
 * it again (w21/748).
 */
export function sankeyLabelLines(
  label: string,
  maxChars: number = SANKEY_LABEL_MAX_CHARS,
): string[] {
  const split = /^(.*\S)\s*(\([^()]*\)|（[^（）]*）)$/u.exec(label);
  if (!split) return [truncateSankeyLabel(label, maxChars)];
  return [
    truncateSankeyLabel(split[1], maxChars),
    truncateSankeyLabel(split[2], maxChars),
  ];
}

export function sankeyRoleForId(id: string, roots: RootNames = {}): SankeyRole {
  if (id === CASH_FLOW_ID) {
    return "hub";
  }
  if (id === SAVINGS_ID || id === SHORTFALL_ID) {
    return "savings";
  }
  if (id === OTHER_INCOME_ACCOUNT || id === REFUNDS_ID) {
    return "source";
  }
  if (id === OTHER_EXPENSES_ACCOUNT || id === CLAWBACKS_ID) {
    return "operating";
  }
  const category = categorizeAccount(id, roots);
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
  /** The inflow of refunded spending, and the outflow of clawed-back income. */
  refundsLabel: string;
  clawbacksLabel: string;
  /**
   * Labels an income or expense group whose name the other side also uses
   * (`Income:Crypto` and `Expenses:Crypto` both read "Crypto"), so the two
   * tell apart without relying on color. Identity by default.
   */
  incomeNodeLabel?: (name: string) => string;
  expensesNodeLabel?: (name: string) => string;
  /** The ledger's names for its roots; Beancount's own when left out. */
  roots?: RootNames;
  depth?: number;
  topN?: number;
  /** The currency the amounts are in; sets what counts as residue. */
  currency?: string;
};

function treeTotal(nodes: AccountNode[]): number {
  return nodes.reduce((sum, node) => sum + node.value, 0);
}

/**
 * The depth to draw a side at. The tree arrives with its single-child levels
 * lifted (`Income:US` holding only Hoogle and ETrade lists those two), so when
 * every top-level account sits under one shared sub-account the nodes belong
 * below it: keyed at a flat depth, the whole side merged into one "US" node
 * while the cards listed its parts, and a refunded category netted inside it
 * hid the Refunds ribbon (w21/610). One top-level account keeps the flat depth.
 */
function sideDepth(nodes: AccountNode[], depth: number): number {
  const live = nodes.filter((node) => node?.account);
  if (live.length < 2) {
    return depth;
  }
  const parents = live.map((node) => node.account.split(":").slice(0, -1));
  let common = 0;
  const shortest = Math.min(...parents.map((parent) => parent.length));
  while (
    common < shortest &&
    parents.every((parent) => parent[common] === parents[0][common])
  ) {
    common += 1;
  }
  return Math.max(depth, common + 1);
}

function extractAtDepth(
  nodes: AccountNode[],
  targetDepth: number,
  out: Map<string, number>,
  roots: RootNames,
  residue: number,
): void {
  for (const node of nodes) {
    if (!node || !node.account) {
      continue;
    }
    if (
      categorizeAccount(node.account, roots) === "exclude" ||
      isExcludedAccount(node.account, roots)
    ) {
      continue;
    }
    const parts = node.account.split(":").length;
    if (parts >= targetDepth || node.children.length === 0) {
      const key = extractAccountAtDepth(node.account, targetDepth);
      // Zero is dropped here so a balanced-to-nothing category does not
      // occupy a node; negatives are kept in the map so totals still match
      // the statement, then stripped from *links* below.
      if (Math.abs(node.value) >= residue) {
        out.set(key, (out.get(key) ?? 0) + node.value);
      }
    } else {
      extractAtDepth(node.children, targetDepth, out, roots, residue);
    }
  }
}

function toRankedNodes(
  values: Map<string, number>,
  labelOf: (id: string) => string,
  residue: number,
): AccountNode[] {
  return Array.from(values.entries())
    .filter(([, value]) => value >= residue)
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
    refundsLabel,
    clawbacksLabel,
    incomeNodeLabel = (name: string) => name,
    expensesNodeLabel = (name: string) => name,
    roots = {},
    depth = SANKEY_DEPTH,
    topN = SANKEY_TOP_N,
    currency,
  } = options;
  const residue = flowResidue(currency);

  const totalIncome = treeTotal(income);
  const totalExpenses = treeTotal(expenses);

  const incomeValues = new Map<string, number>();
  const expenseValues = new Map<string, number>();
  extractAtDepth(
    income,
    sideDepth(income, depth),
    incomeValues,
    roots,
    residue,
  );
  extractAtDepth(
    expenses,
    sideDepth(expenses, depth),
    expenseValues,
    roots,
    residue,
  );

  const incomeRows = topNWithOther(
    toRankedNodes(incomeValues, leafName, residue),
    topN,
    otherLabel,
    OTHER_INCOME_ACCOUNT,
  );
  const expenseRows = topNWithOther(
    toRankedNodes(expenseValues, leafName, residue),
    topN,
    otherLabel,
    OTHER_EXPENSES_ACCOUNT,
  );

  // A group named on both sides gets its side named too (w0/034). The folded
  // "Other" rows are left alone: they are generic, and their side is their
  // position.
  const accountNames = (rows: AccountNode[], other: string) =>
    new Set(rows.filter((row) => row.account !== other).map((row) => row.name));
  const incomeNames = accountNames(incomeRows, OTHER_INCOME_ACCOUNT);
  const expenseNames = accountNames(expenseRows, OTHER_EXPENSES_ACCOUNT);
  const sideLabel = (
    row: AccountNode,
    otherSide: Set<string>,
    label: (name: string) => string,
  ) => (otherSide.has(row.name) ? label(row.name) : row.name);

  const nodes: SankeyNodeDatum[] = [];
  const links: SankeyLinkDatum[] = [];
  const seen = new Set<string>();

  // What ran against its side, as positive amounts (w21/112).
  const against = (values: Map<string, number>) =>
    Array.from(values.values())
      .filter((value) => value <= -residue)
      .reduce((sum, value) => sum - value, 0);
  const refunds = against(expenseValues);
  const clawbacks = against(incomeValues);

  const hasFlows =
    incomeRows.length > 0 ||
    expenseRows.length > 0 ||
    refunds >= residue ||
    clawbacks >= residue;
  if (!hasFlows) {
    return { nodes, links, totalIncome, totalExpenses };
  }

  pushNode(nodes, seen, CASH_FLOW_ID, cashFlowLabel, "hub");

  for (const row of incomeRows) {
    // Link values must be strictly positive — zero/negative never reach the renderer.
    if (row.value <= 0) {
      continue;
    }
    pushNode(
      nodes,
      seen,
      row.account,
      row.account === OTHER_INCOME_ACCOUNT
        ? row.name
        : sideLabel(row, expenseNames, incomeNodeLabel),
      sankeyRoleForId(row.account, roots),
    );
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
    pushNode(
      nodes,
      seen,
      row.account,
      row.account === OTHER_EXPENSES_ACCOUNT
        ? row.name
        : sideLabel(row, incomeNames, expensesNodeLabel),
      sankeyRoleForId(row.account, roots),
    );
    links.push({
      source: CASH_FLOW_ID,
      target: row.account,
      value: row.value,
    });
  }

  // A category's own ribbon never goes negative; what ran against its side
  // has one ribbon of its own instead, so the hub balances on every dollar
  // and Savings equals Net Profit (w21/112).
  if (refunds >= residue) {
    pushNode(nodes, seen, REFUNDS_ID, refundsLabel, "source");
    links.push({ source: REFUNDS_ID, target: CASH_FLOW_ID, value: refunds });
  }
  if (clawbacks >= residue) {
    pushNode(nodes, seen, CLAWBACKS_ID, clawbacksLabel, "operating");
    links.push({
      source: CASH_FLOW_ID,
      target: CLAWBACKS_ID,
      value: clawbacks,
    });
  }

  // Balance the graph from the links drawn. Conservation runs both ways: a
  // surplus leaves the hub as Savings, and a deficit enters it from savings,
  // or the hub stood taller than everything feeding it (w0/034).
  const linkedIncome = links
    .filter((l) => l.target === CASH_FLOW_ID)
    .reduce((sum, l) => sum + l.value, 0);
  const linkedExpenses = links
    .filter((l) => l.source === CASH_FLOW_ID)
    .reduce((sum, l) => sum + l.value, 0);
  const savings = linkedIncome - linkedExpenses;
  if (savings >= residue) {
    pushNode(nodes, seen, SAVINGS_ID, savingsLabel, "savings");
    links.push({
      source: CASH_FLOW_ID,
      target: SAVINGS_ID,
      value: savings,
    });
  } else if (savings <= -residue) {
    pushNode(nodes, seen, SHORTFALL_ID, savingsLabel, "savings");
    links.push({
      source: SHORTFALL_ID,
      target: CASH_FLOW_ID,
      value: -savings,
    });
  }

  // A category named like a node the chart adds (Savings, the folded Other,
  // Refunds) gets its side named, as one named on both sides does: an
  // `Expenses:Savings` stood beside the surplus's Savings, the two told apart
  // only by color (w21/747).
  const added = new Set(
    nodes.filter((node) => ADDED_IDS.has(node.id)).map((node) => node.label),
  );
  const incomeIds = new Set(incomeRows.map((row) => row.account));
  for (const node of nodes) {
    if (ADDED_IDS.has(node.id) || !added.has(node.label)) continue;
    node.label = incomeIds.has(node.id)
      ? incomeNodeLabel(node.label)
      : expensesNodeLabel(node.label);
  }

  return { nodes, links, totalIncome, totalExpenses };
}

/** The savings the chart draws (its link into the Savings node), or null when it draws none. */
export function sankeySavings(data: SankeyData): number | null {
  const link = data.links.find((candidate) => candidate.target === SAVINGS_ID);
  return link ? link.value : null;
}

/** What the chart draws from savings to cover a deficit, or null when it draws none. */
export function sankeyShortfall(data: SankeyData): number | null {
  const link = data.links.find(
    (candidate) => candidate.source === SHORTFALL_ID,
  );
  return link ? link.value : null;
}

/**
 * The chart's screen-reader summary. The Sankey draws no values, so this is the
 * only way assistive technology learns any magnitude from it: money is
 * formatted like the income/expense chart beside it (with the ledger's
 * currency), and savings is named whenever the chart draws a Savings band —
 * into savings for a surplus, out of it for a deficit.
 */
export function cashFlowChartSummary(
  data: SankeyData,
  currency: string,
  t: (key: string, params?: Record<string, unknown>) => string,
  locale = "en",
): string {
  const money = (value: number) =>
    formatShortMoneyWithCurrency(value, currency, locale);
  const totals = {
    income: money(data.totalIncome),
    expenses: money(data.totalExpenses),
  };
  const savings = sankeySavings(data);
  if (savings !== null) {
    return t("cashFlowChartSummaryWithSavings", {
      ...totals,
      savings: money(savings),
    });
  }
  const shortfall = sankeyShortfall(data);
  return shortfall === null
    ? t("cashFlowChartSummary", totals)
    : t("cashFlowChartSummaryWithShortfall", {
        ...totals,
        shortfall: money(shortfall),
      });
}
