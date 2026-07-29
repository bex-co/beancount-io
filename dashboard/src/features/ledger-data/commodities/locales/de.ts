export interface TranslationEntry {
  message: string;
  description: string;
}

const deCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "Währungen",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "Währungen konnten nicht geladen werden",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.failedToLoadCommoditiesDescription": {
    message:
      "Beim Laden der Währungsdaten ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
    description: "Error description when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "Keine Währungen gefunden",
    description: "Empty state title when no commodities exist",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "Dieses Hauptbuch enthält noch keine Währungskursdaten.",
    description: "Empty state description for no commodities",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "Kursverlauf mit {count} Datenpunkten",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
};

export default deCommodities;
