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
  "page.commodities.showPriceHistory": {
    message: "Toon prijsgeschiedenis voor {pair}",
    description: "Knop om de gedateerde prijstabel te tonen",
  },
  "page.commodities.hidePriceHistory": {
    message: "Verberg prijsgeschiedenis voor {pair}",
    description: "Knop om de gedateerde prijstabel te sluiten",
  },
  "page.commodities.priceHistoryDate": {
    message: "Datum",
    description: "Kolomkop voor prijsdatums",
  },
  "page.commodities.priceHistoryPrice": {
    message: "Prijs ({quote})",
    description: "Kolomkop voor prijzen in de noteringsvaluta",
  },
};

export default nlCommodities;
