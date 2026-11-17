import { categorizeAccount } from "./account-categorizer";
import {
  CASH_FLOW_NODE,
  SAVINGS_NODE,
  SHORTFALL_NODE,
} from "./sankey-data-transformer";
import type { AccountRoots } from "@/features/reports/cash-flow/lib/account-roots";

export interface SankeyColorScheme {
  income: string;
  cashFlow: string;
  expenses: string;
  investing: string;
  financing: string;
  savings: string;
  /** Cash drawn down to pay for more than came in: neither income nor loss. */
  reserve: string;
}

/**
 * Get color scheme for Sankey diagram based on theme.
 *
 * Intentionally feature-local rather than using common/lib/chart/color.ts:
 *   1. ECharts needs concrete hex values — the common module reads CSS vars at
 *      runtime and cannot be called during SSR.
 *   2. The color roles (income, expenses, investing…) are Sankey-domain concepts
 *      that don't belong in a generic chart-color module.
 * Keep these hex values in sync with the --chart-N fallbacks in color.ts.
 */
export function getSankeyColorScheme(isDark: boolean): SankeyColorScheme {
  if (isDark) {
    return {
      income: "#00bb85", // --chart-2 sea green - money in
      cashFlow: "#5fc535", // --chart-1 brand green - central hub
      expenses: "#f3813f", // --chart-5 orange - operating outflows
      investing: "#719def", // --chart-7 blue - investing activities
      financing: "#f94144", // --chart-8 red - debt/financing
      savings: "#00afaf", // --chart-6 teal - surplus
      reserve: "#9ba197", // warm grey - cash on hand drawn down
    };
  }

  return {
    income: "#008455", // --chart-2 sea green - money in
    cashFlow: "#2b7e00", // --chart-1 brand green - central hub
    expenses: "#c25500", // --chart-5 orange - operating outflows
    investing: "#426ec2", // --chart-7 blue - investing activities
    financing: "#d40924", // --chart-8 red - debt/financing
    savings: "#007f7f", // --chart-6 teal - surplus
    reserve: "#7c8279", // warm grey - cash on hand drawn down
  };
}

/**
 * Get color for a specific Sankey node based on its account name.
 * Optional open-directive `meta` (cash-flow-role declarations) keeps the
 * color consistent with the category the node was placed in.
 */
export function getSankeyNodeColor(
  nodeName: string,
  isDark: boolean,
  meta?: Record<string, unknown> | null,
  roots?: AccountRoots,
): string {
  const colors = getSankeyColorScheme(isDark);

  // Special nodes. What a period pays out beyond its inflows comes from cash
  // already on hand: grey, so it reads as neither income nor a loss.
  if (nodeName === CASH_FLOW_NODE) return colors.cashFlow;
  if (nodeName === SAVINGS_NODE) return colors.savings;
  if (nodeName === SHORTFALL_NODE) return colors.reserve;

  // Categorize by account type
  const category = categorizeAccount(nodeName, meta, roots);

  switch (category) {
    case "source":
      return colors.income;
    case "operating":
      return colors.expenses;
    case "investing":
      return colors.investing;
    case "financing":
      return colors.financing;
    default:
      return colors.cashFlow;
  }
}

/**
 * `hex` moved `amount` (0–1) of the way to white: a lighter shade of the same
 * hue, for a translucent link that would otherwise darken into mud.
 */
export function tintColor(hex: string, amount: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const value = parseInt(match[1], 16);
  const channel = (shift: number) => {
    const c = (value >> shift) & 0xff;
    return Math.round(c + (255 - c) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}
