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
  "page.commodities.managedSources": {
    message: "Fuentes de precios gestionadas",
    description:
      "Title of the panel listing managed price feeds the ledger includes",
  },
  "page.commodities.managedSourcesDescription": {
    message:
      "Precios que este libro incluye desde una fuente gestionada. Se actualizan cada pocos minutos; tus propias entradas de precio tienen prioridad.",
    description: "Description of the managed price sources panel",
  },
  "page.commodities.freshness.recent": {
    message: "Actualizado",
    description:
      "Freshness badge: the managed feed was observed within the last ten minutes",
  },
  "page.commodities.freshness.stale": {
    message: "Desactualizado",
    description:
      "Freshness badge: the managed feed's latest price is older than ten minutes",
  },
  "page.commodities.freshness.unavailable": {
    message: "No disponible",
    description:
      "Freshness badge: no valid price has been received from the managed feed",
  },
  "page.commodities.observedAt": {
    message: "Observado {time}",
    description:
      "When the feed's latest price was observed. {time} is a formatted date and time.",
  },
  "page.commodities.nextRefreshAt": {
    message: "Próxima actualización {time}",
    description:
      "When the feed will next be re-fetched. {time} is a formatted date and time.",
  },
  "page.commodities.neverObserved": {
    message: "Aún no se ha recibido ningún precio",
    description: "Shown when a managed feed has never delivered a valid price",
  },
  "page.commodities.lastError": {
    message: "Último error: {error}",
    description:
      "Why the last refresh of a managed feed failed. {error} is the technical cause.",
  },
  "page.commodities.refreshPrices": {
    message: "Actualizar precios",
    description: "Button that re-fetches the ledger's managed price feeds now",
  },
  "page.commodities.refreshingPrices": {
    message: "Actualizando…",
    description: "Refresh button label while the refresh is in progress",
  },
  "page.commodities.refreshPricesFailed": {
    message: "No se pudieron actualizar los precios",
    description: "Toast shown when refreshing managed prices fails",
  },
};

export default esCommodities;
