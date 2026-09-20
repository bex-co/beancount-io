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
    message: "Aucun historique de cours trouvé",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message:
      "Ce livre n'enregistre aucun cours, il n'y a donc pas d'historique de taux de change à afficher.",
    description:
      "Empty state description when the ledger records no commodity prices",
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
