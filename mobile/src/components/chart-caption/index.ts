import { fontSizes, fontWeights } from "@/common/theme";

/**
 * Caption above a balance chart: the same inset and type as the chart's own
 * header, which it sits directly above, with the chevron trailing the last
 * line of a wrapped status. Shared by `BalanceChartCard` (whose own header
 * budgets 90 for the caption line) and `AccountChartsCard` (70, without it).
 */
export const chartCaptionStyles = {
  caption: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    marginBottom: 2,
  },
  captionText: {
    flexShrink: 1,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
  },
  captionChevron: {
    marginStart: 2,
    marginBottom: 2,
  },
} as const;
