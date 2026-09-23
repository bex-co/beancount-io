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
  "page.commodities.managedSources": {
    message: "Sources de prix gérées",
    description:
      "Title of the panel listing managed price feeds the ledger includes",
  },
  "page.commodities.managedSourcesDescription": {
    message:
      "Prix que ce registre inclut depuis une source gérée. Ils sont actualisés toutes les quelques minutes ; vos propres entrées de prix sont prioritaires.",
    description: "Description of the managed price sources panel",
  },
  "page.commodities.freshness.recent": {
    message: "À jour",
    description:
      "Freshness badge: the managed feed was observed within the last ten minutes",
  },
  "page.commodities.freshness.stale": {
    message: "Obsolète",
    description:
      "Freshness badge: the managed feed's latest price is older than ten minutes",
  },
  "page.commodities.freshness.unavailable": {
    message: "Indisponible",
    description:
      "Freshness badge: no valid price has been received from the managed feed",
  },
  "page.commodities.observedAt": {
    message: "Observé {time}",
    description:
      "When the feed's latest price was observed. {time} is a formatted date and time.",
  },
  "page.commodities.nextRefreshAt": {
    message: "Prochaine actualisation {time}",
    description:
      "When the feed will next be re-fetched. {time} is a formatted date and time.",
  },
  "page.commodities.neverObserved": {
    message: "Aucun prix reçu pour l'instant",
    description: "Shown when a managed feed has never delivered a valid price",
  },
  "page.commodities.lastError": {
    message: "Dernière erreur : {error}",
    description:
      "Why the last refresh of a managed feed failed. {error} is the technical cause.",
  },
  "page.commodities.refreshPrices": {
    message: "Actualiser les prix",
    description: "Button that re-fetches the ledger's managed price feeds now",
  },
  "page.commodities.refreshingPrices": {
    message: "Actualisation…",
    description: "Refresh button label while the refresh is in progress",
  },
  "page.commodities.refreshPricesFailed": {
    message: "Impossible d'actualiser les prix",
    description: "Toast shown when refreshing managed prices fails",
  },
};

export default frCommodities;
