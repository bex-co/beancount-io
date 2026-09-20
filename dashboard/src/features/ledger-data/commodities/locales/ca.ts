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
};

export default caCommodities;
