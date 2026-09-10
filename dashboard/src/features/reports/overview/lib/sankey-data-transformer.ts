import { extractAccountAtDepth } from "./account-categorizer";
import { sumBalanceRecords } from "@/features/reports/export/model";
import type { CashFlowStatement } from "@/features/reports/cash-flow/lib/model";

/**
 * Stable node ids for the two nodes that are not accounts. They are ids, not
 * labels — the component translates them at render time — and the `__…__`
 * shape keeps them from ever colliding with a beancount account path.
 */
export const SANKEY_HUB_NODE = "__hub__";
export const SANKEY_CASH_NODE = "__cash__";

export type SankeyNodeKind = "hub" | "cash" | "account";

export type SankeyNode = {
  /** Account path, or one of the two stable ids above. */
  name: string;
  kind: SankeyNodeKind;
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
  /**
   * Units that carry movement in this period but have no price path to the
   * presentation currency, sorted. They are disclosed under the chart — never
   * summed into it and never silently dropped.
   */
  unshownUnits: string[];
};

interface TransformOptions {
  /**
   * The period's cash-flow statement. Only `rows` and `netChange` are read:
   * by the double-entry identity `netChange` equals the sum of every row, and
   * that is exactly what makes inflow equal outflow below.
   */
  statement?: CashFlowStatement;
  /** The single unit every link value is expressed in. */
  primaryCurrency: string;
  depth?: 1 | 2 | 3;
}

const ZERO_DECIMAL = /^[+-]?0+(?:\.0+)?$/;

function isZero(amount: string | undefined): boolean {
  return amount === undefined || ZERO_DECIMAL.test(amount.trim());
}

/**
 * Project a cash-flow statement onto a Sankey.
 *
 * One hub node, one node per account (rolled up to `depth`), and one node for
 * the net change in cash & equivalents. A node's aggregate decides its side:
 * positive is money reaching the hub, negative is money leaving it. Nothing is
 * dropped for being negative, so the two sides balance exactly — the cash node
 * absorbs the difference, which is what it means.
 *
 * Amounts stay exact decimal strings through aggregation (`sumBalanceRecords`)
 * and become JS numbers only when a link is emitted, because that is the only
 * form ECharts accepts.
 */
export function transformToSankeyData(options: TransformOptions): SankeyData {
  const { statement, primaryCurrency, depth = 2 } = options;

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const unshownUnits = new Set<string>();

  if (!statement) {
    return { nodes, links, unshownUnits: [] };
  }

  const byPath = new Map<string, Record<string, unknown>[]>();

  statement.rows.forEach((row) => {
    Object.entries(row.amounts).forEach(([unit, amount]) => {
      if (unit !== primaryCurrency && !isZero(amount)) {
        unshownUnits.add(unit);
      }
    });

    const amount = row.amounts[primaryCurrency];
    if (isZero(amount)) return;

    const path = extractAccountAtDepth(row.accountPath, depth);
    const bucket = byPath.get(path) ?? [];
    if (bucket.length === 0) byPath.set(path, bucket);
    bucket.push({ [primaryCurrency]: amount });
  });

  Object.entries(statement.netChange).forEach(([unit, amount]) => {
    if (unit !== primaryCurrency && !isZero(amount)) {
      unshownUnits.add(unit);
    }
  });

  byPath.forEach((amounts, path) => {
    const total = sumBalanceRecords(amounts)[primaryCurrency];
    if (isZero(total)) return;

    const value = Number(total);
    nodes.push({ name: path, kind: "account" });
    links.push(
      value > 0
        ? { source: path, target: SANKEY_HUB_NODE, value }
        : { source: SANKEY_HUB_NODE, target: path, value: -value },
    );
  });

  const netChange = statement.netChange[primaryCurrency];
  if (!isZero(netChange)) {
    const value = Number(netChange);
    nodes.push({ name: SANKEY_CASH_NODE, kind: "cash" });
    links.push(
      value > 0
        ? { source: SANKEY_HUB_NODE, target: SANKEY_CASH_NODE, value }
        : { source: SANKEY_CASH_NODE, target: SANKEY_HUB_NODE, value: -value },
    );
  }

  if (links.length > 0) {
    nodes.unshift({ name: SANKEY_HUB_NODE, kind: "hub" });
  }

  return { nodes, links, unshownUnits: [...unshownUnits].sort() };
}
