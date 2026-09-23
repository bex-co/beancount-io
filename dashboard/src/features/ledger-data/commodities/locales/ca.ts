export interface TranslationEntry {
  message: string;
  description: string;
}

const caCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "Monedes",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "Error en carregar les entrades del compte",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "No s'ha trobat cap historial de preus",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message:
      "Aquest llibre no registra preus de cap divisa ni valor, de manera que no hi ha historial de canvi per mostrar.",
    description:
      "Empty state description when the ledger records no commodity prices",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "Historial de preus amb {count} punts de dades",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.showPriceHistory": {
    message: "Mostra l'historial de preus de {pair}",
    description: "Botó per revelar la taula de preus datats",
  },
  "page.commodities.hidePriceHistory": {
    message: "Amaga l'historial de preus de {pair}",
    description: "Botó per tancar la taula de preus datats",
  },
  "page.commodities.priceHistoryDate": {
    message: "Data",
    description: "Capçalera de columna de dates",
  },
  "page.commodities.priceHistoryPrice": {
    message: "Preu ({quote})",
    description: "Capçalera de columna de preus en la moneda de cotització",
  },
  "page.commodities.managedSources": {
    message: "Fonts de preus gestionades",
    description:
      "Title of the panel listing managed price feeds the ledger includes",
  },
  "page.commodities.managedSourcesDescription": {
    message:
      "Preus que aquest llibre inclou d'una font gestionada. S'actualitzen cada pocs minuts; les vostres pròpies entrades de preu tenen prioritat.",
    description: "Description of the managed price sources panel",
  },
  "page.commodities.freshness.recent": {
    message: "Actualitzat",
    description:
      "Freshness badge: the managed feed was observed within the last ten minutes",
  },
  "page.commodities.freshness.stale": {
    message: "Obsolet",
    description:
      "Freshness badge: the managed feed's latest price is older than ten minutes",
  },
  "page.commodities.freshness.unavailable": {
    message: "No disponible",
    description:
      "Freshness badge: no valid price has been received from the managed feed",
  },
  "page.commodities.observedAt": {
    message: "Observat {time}",
    description:
      "When the feed's latest price was observed. {time} is a formatted date and time.",
  },
  "page.commodities.nextRefreshAt": {
    message: "Propera actualització {time}",
    description:
      "When the feed will next be re-fetched. {time} is a formatted date and time.",
  },
  "page.commodities.neverObserved": {
    message: "Encara no s'ha rebut cap preu",
    description: "Shown when a managed feed has never delivered a valid price",
  },
  "page.commodities.lastError": {
    message: "Darrer error: {error}",
    description:
      "Why the last refresh of a managed feed failed. {error} is the technical cause.",
  },
  "page.commodities.refreshPrices": {
    message: "Actualitza els preus",
    description: "Button that re-fetches the ledger's managed price feeds now",
  },
  "page.commodities.refreshingPrices": {
    message: "S'està actualitzant…",
    description: "Refresh button label while the refresh is in progress",
  },
  "page.commodities.refreshPricesFailed": {
    message: "No s'han pogut actualitzar els preus",
    description: "Toast shown when refreshing managed prices fails",
  },
};

export default caCommodities;
