export interface TranslationEntry {
  message: string;
  description: string;
}

const esCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "Productos",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "Error al Cargar Productos",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "No se encontró historial de precios",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message:
      "Este libro no registra precios de divisas ni valores, así que no hay historial de tipos de cambio que mostrar.",
    description:
      "Empty state description when the ledger records no commodity prices",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "Historial de precios con {count} puntos de datos",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.showPriceHistory": {
    message: "Mostrar historial de precios de {pair}",
    description: "Botón para revelar la tabla de precios fechados",
  },
  "page.commodities.hidePriceHistory": {
    message: "Ocultar historial de precios de {pair}",
    description: "Botón para cerrar la tabla de precios fechados",
  },
  "page.commodities.priceHistoryDate": {
    message: "Fecha",
    description: "Encabezado de columna de fechas",
  },
  "page.commodities.priceHistoryPrice": {
    message: "Precio ({quote})",
    description: "Encabezado de columna de precios en la moneda de cotización",
  },
};

export default esCommodities;
