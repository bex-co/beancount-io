import { createViewSearchSchema } from "@/common/lib/navigation/view-search";

/** How the Net Worth card presents its figures. */
export const NET_WORTH_VIEWS = ["chart", "table"] as const;

export type NetWorthView = (typeof NET_WORTH_VIEWS)[number];

export const DEFAULT_NET_WORTH_VIEW: NetWorthView = "chart";

/**
 * The overview returns a spinner while loading and deliberately keeps no prior
 * cards, so this choice cannot live in the card's own state: a shared
 * account/filter/time edit would flip it back to the chart.
 */
export const overviewSearchSchema = createViewSearchSchema(
  NET_WORTH_VIEWS,
  DEFAULT_NET_WORTH_VIEW,
);
