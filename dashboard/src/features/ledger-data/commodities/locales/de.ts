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
  "page.commodities.noCommoditiesFound": {
    message: "Keine Kurshistorie gefunden",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message:
      "Dieses Journal enthält keine Kursnotierungen, daher gibt es keine Wechselkurshistorie anzuzeigen.",
    description:
      "Empty state description when the ledger records no commodity prices",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "Kursverlauf mit {count} Datenpunkten",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.showPriceHistory": {
    message: "Preishistorie für {pair} anzeigen",
    description: "Schaltfläche zum Öffnen der datierten Preistabelle",
  },
  "page.commodities.hidePriceHistory": {
    message: "Preishistorie für {pair} ausblenden",
    description: "Schaltfläche zum Schließen der datierten Preistabelle",
  },
  "page.commodities.priceHistoryDate": {
    message: "Datum",
    description: "Spaltentitel für Preisdaten",
  },
  "page.commodities.priceHistoryPrice": {
    message: "Preis ({quote})",
    description: "Spaltentitel für Preise in der Notierungswährung",
  },
};

export default deCommodities;
