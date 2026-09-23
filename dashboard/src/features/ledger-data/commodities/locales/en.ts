export interface TranslationEntry {
  message: string;
  description: string;
}

const enCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "Commodities",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "Failed to Load Commodities",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "No Price History Found",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message:
      "This ledger records no commodity prices, so there is no exchange-rate history to show.",
    description:
      "Empty state description when the ledger records no commodity prices",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "Price history with {count} data points",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.showPriceHistory": {
    message: "Show price history for {pair}",
    description: "Button to reveal the dated price table for a commodity pair",
  },
  "page.commodities.hidePriceHistory": {
    message: "Hide price history for {pair}",
    description:
      "Button to collapse the dated price table for a commodity pair",
  },
  "page.commodities.priceHistoryDate": {
    message: "Date",
    description: "Column header for price history dates",
  },
  "page.commodities.priceHistoryPrice": {
    message: "Price ({quote})",
    description: "Column header for price values in the quote currency",
  },
  "page.commodities.managedSources": {
    message: "Managed price sources",
    description:
      "Title of the panel listing managed price feeds the ledger includes",
  },
  "page.commodities.managedSourcesDescription": {
    message:
      "Prices this ledger includes from a managed feed. They refresh every few minutes; your own price entries take precedence.",
    description: "Description of the managed price sources panel",
  },
  "page.commodities.freshness.recent": {
    message: "Up to date",
    description:
      "Freshness badge: the managed feed was observed within the last ten minutes",
  },
  "page.commodities.freshness.stale": {
    message: "Stale",
    description:
      "Freshness badge: the managed feed's latest price is older than ten minutes",
  },
  "page.commodities.freshness.unavailable": {
    message: "Unavailable",
    description:
      "Freshness badge: no valid price has been received from the managed feed",
  },
  "page.commodities.observedAt": {
    message: "Observed {time}",
    description:
      "When the feed's latest price was observed. {time} is a formatted date and time.",
  },
  "page.commodities.nextRefreshAt": {
    message: "Next refresh {time}",
    description:
      "When the feed will next be re-fetched. {time} is a formatted date and time.",
  },
  "page.commodities.neverObserved": {
    message: "No price received yet",
    description: "Shown when a managed feed has never delivered a valid price",
  },
  "page.commodities.lastError": {
    message: "Last error: {error}",
    description:
      "Why the last refresh of a managed feed failed. {error} is the technical cause.",
  },
  "page.commodities.refreshPrices": {
    message: "Refresh prices",
    description: "Button that re-fetches the ledger's managed price feeds now",
  },
  "page.commodities.refreshingPrices": {
    message: "Refreshing…",
    description: "Refresh button label while the refresh is in progress",
  },
  "page.commodities.refreshPricesFailed": {
    message: "Could not refresh prices",
    description: "Toast shown when refreshing managed prices fails",
  },
};

export default enCommodities;
