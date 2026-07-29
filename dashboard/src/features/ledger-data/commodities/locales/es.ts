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
  "page.commodities.failedToLoadCommoditiesDescription": {
    message:
      "Hubo un error al cargar los datos de productos. Por favor, inténtelo de nuevo más tarde.",
    description: "Error description when commodities fail to load",
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
};

export default esCommodities;
