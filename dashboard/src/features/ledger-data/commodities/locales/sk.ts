export interface TranslationEntry {
  message: string;
  description: string;
}

const skCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "Komodity",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "Nepodarilo sa načítať komodity",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "Nenašla sa žiadna história cien",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message:
      "Táto kniha neobsahuje žiadne ceny, takže niet histórie výmenných kurzov na zobrazenie.",
    description:
      "Empty state description when the ledger records no commodity prices",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "Cenová história s {count} dátovými bodmi",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.showPriceHistory": {
    message: "Zobraziť históriu cien pre {pair}",
    description: "Tlačidlo na otvorenie tabuľky cien s dátumami",
  },
  "page.commodities.hidePriceHistory": {
    message: "Skryť históriu cien pre {pair}",
    description: "Tlačidlo na zatvorenie tabuľky cien s dátumami",
  },
  "page.commodities.priceHistoryDate": {
    message: "Dátum",
    description: "Hlavička stĺpca dátumov",
  },
  "page.commodities.priceHistoryPrice": {
    message: "Cena ({quote})",
    description: "Hlavička stĺpca cien v kotovanej mene",
  },
};

export default skCommodities;
