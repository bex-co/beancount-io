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
  "page.commodities.showPriceHistory": {
    message: "Afficher l'historique des prix de {pair}",
    description: "Bouton pour révéler le tableau des prix datés",
  },
  "page.commodities.hidePriceHistory": {
    message: "Masquer l'historique des prix de {pair}",
    description: "Bouton pour fermer le tableau des prix datés",
  },
  "page.commodities.priceHistoryDate": {
    message: "Date",
    description: "En-tête de colonne des dates",
  },
  "page.commodities.priceHistoryPrice": {
    message: "Prix ({quote})",
    description: "En-tête de colonne des prix dans la devise de cotation",
  },
};

export default frCommodities;
