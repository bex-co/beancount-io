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
    message: "No se Encontraron Productos",
    description: "Empty state title when no commodities exist",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "Este libro mayor aún no tiene datos de precios de productos.",
    description: "Empty state description for no commodities",
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
