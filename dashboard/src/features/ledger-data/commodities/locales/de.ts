export interface TranslationEntry {
  message: string;
  description: string;
}

const deCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "Waren",
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
  "page.commodities.priceHistoryDataPoints_one": {
    message: "Kursverlauf mit {count} Datenpunkt",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.priceHistoryDataPoints_other": {
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
  "page.commodities.managedSources": {
    message: "Verwaltete Preisquellen",
    description:
      "Title of the panel listing managed price feeds the ledger includes",
  },
  "page.commodities.managedSourcesDescription": {
    message:
      "Preise, die dieses Journal aus einer verwalteten Quelle einbindet. Sie werden alle paar Minuten aktualisiert; eigene Preiseinträge haben Vorrang.",
    description: "Description of the managed price sources panel",
  },
  "page.commodities.freshness.recent": {
    message: "Aktuell",
    description:
      "Freshness badge: the managed feed's newest price is at most seven days old",
  },
  "page.commodities.freshness.stale": {
    message: "Veraltet",
    description:
      "Freshness badge: the managed feed's newest price is more than seven days old",
  },
  "page.commodities.freshness.unavailable": {
    message: "Nicht verfügbar",
    description:
      "Freshness badge: no valid price has been received from the managed feed",
  },
  "page.commodities.latestPriceDate": {
    message: "Letzter Kurs {date}",
    description:
      "Date of the managed feed's newest price. {date} is a formatted date.",
  },
  "page.commodities.nextRefreshAt": {
    message: "Nächste Aktualisierung {time}",
    description:
      "When the feed will next be re-fetched. {time} is a formatted date and time.",
  },
  "page.commodities.neverObserved": {
    message: "Noch kein Preis empfangen",
    description: "Shown when a managed feed has never delivered a valid price",
  },
  "page.commodities.lastError": {
    message: "Letzter Fehler: {error}",
    description:
      "Why the last refresh of a managed feed failed. {error} is the technical cause.",
  },
  "page.commodities.refreshPrices": {
    message: "Preise aktualisieren",
    description: "Button that re-fetches the ledger's managed price feeds now",
  },
  "page.commodities.refreshingPrices": {
    message: "Wird aktualisiert…",
    description: "Refresh button label while the refresh is in progress",
  },
  "page.commodities.refreshPricesFailed": {
    message: "Preise konnten nicht aktualisiert werden",
    description: "Toast shown when refreshing managed prices fails",
  },
  "page.commodities.chartsReloadFailed": {
    message:
      "Die Preise wurden aktualisiert, aber die Diagramme konnten nicht neu geladen werden.",
    description:
      "Shown on the managed price sources card when a refresh was acknowledged but reading the price charts again failed",
  },
  "page.commodities.reloadCharts": {
    message: "Diagramme neu laden",
    description:
      "Button that reads the price charts again after a failed reload, without refreshing the managed feeds",
  },
};

export default deCommodities;
