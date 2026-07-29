import { categorizeAccount } from "./account-categorizer";

export interface SankeyColorScheme {
  income: string;
  cashFlow: string;
  expenses: string;
  investing: string;
  financing: string;
  savings: string;
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
      investing: "#e068d8", // --chart-4 magenta - investing activities
      financing: "#f94144", // --chart-8 red - debt/financing
      savings: "#00afaf", // --chart-6 teal - surplus
    };
  }

  return {
    income: "#008455", // --chart-2 sea green - money in
    cashFlow: "#2b7e00", // --chart-1 brand green - central hub
    expenses: "#c25500", // --chart-5 orange - operating outflows
    investing: "#ad36a7", // --chart-4 magenta - investing activities
    financing: "#d40924", // --chart-8 red - debt/financing
    savings: "#007f7f", // --chart-6 teal - surplus
  };
}

/**
 * Get color for a specific Sankey node based on its account name
 */
export function getSankeyNodeColor(nodeName: string, isDark: boolean): string {
  const colors = getSankeyColorScheme(isDark);

  // Special nodes
  if (nodeName === "Cash Flow") return colors.cashFlow;
  if (nodeName === "Savings") return colors.savings;

  // Categorize by account type
  const category = categorizeAccount(nodeName);

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
