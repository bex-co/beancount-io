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
  "page.commodities.failedToLoadCommoditiesDescription": {
    message: "Error en carregar les monedes",
    description: "Error description when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "Carregant esdeveniments...",
    description: "Empty state title when no commodities exist",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "Carregant resultats de la consulta...",
    description: "Empty state description for no commodities",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "Historial de preus amb {count} punts de dades",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
};

export default caCommodities;
