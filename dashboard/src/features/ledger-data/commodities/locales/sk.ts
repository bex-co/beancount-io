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
  "page.commodities.failedToLoadCommoditiesDescription": {
    message:
      "Nastala chyba pri načítavaní údajov o komoditách. Prosím skúste to znova neskôr.",
    description: "Error description when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "Nenašli sa žiadne komodity",
    description: "Empty state title when no commodities exist",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "Táto kniha zatiaľ neobsahuje žiadne údaje o cenách komodít.",
    description: "Empty state description for no commodities",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "Cenová história s {count} dátovými bodmi",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
};

export default skCommodities;
