export interface TranslationEntry {
  message: string;
  description: string;
}

const nlCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "Grondstoffen",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "Grondstoffen laden mislukt",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.failedToLoadCommoditiesDescription": {
    message:
      "Er is een fout opgetreden bij het laden van de grondstoffengegevens. Probeer het later opnieuw.",
    description: "Error description when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "Geen grondstoffen gevonden",
    description: "Empty state title when no commodities exist",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "Dit grootboek heeft nog geen grondstoffenprijsgegevens.",
    description: "Empty state description for no commodities",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "Prijsgeschiedenis met {count} datapunten",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
};

export default nlCommodities;
