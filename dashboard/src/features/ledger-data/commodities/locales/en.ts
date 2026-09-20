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
};

export default enCommodities;
