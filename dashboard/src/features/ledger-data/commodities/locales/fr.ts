export interface TranslationEntry {
  message: string;
  description: string;
}

const frCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "Devises",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "Échec du chargement des devises",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.failedToLoadCommoditiesDescription": {
    message:
      "Une erreur s'est produite lors du chargement des données des matières premières. Veuillez réessayer plus tard.",
    description: "Error description when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "Aucune devise trouvée",
    description: "Empty state title when no commodities exist",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "No commodities are available in this ledger.",
    description: "Empty state description for no commodities",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "Historique des prix avec {count} points de données",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
};

export default frCommodities;
