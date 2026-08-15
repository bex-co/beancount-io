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
    message: "No Commodities Found",
    description: "Empty state title when no commodities exist",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "No commodities are available in this ledger.",
    description: "Empty state description for no commodities",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "Price history with {count} data points",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
};

export default enCommodities;
