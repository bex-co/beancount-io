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
    message: "Geen koershistorie gevonden",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message:
      "Dit grootboek bevat geen koersen, dus er is geen wisselkoershistorie om te tonen.",
    description:
      "Empty state description when the ledger records no commodity prices",
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
