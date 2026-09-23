export interface TranslationEntry {
  message: string;
  description: string;
}

const skCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "Komodity",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "Nepodarilo sa načítať komodity",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "Nenašla sa žiadna história cien",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message:
      "Táto kniha neobsahuje žiadne ceny, takže niet histórie výmenných kurzov na zobrazenie.",
    description:
      "Empty state description when the ledger records no commodity prices",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "Cenová história s {count} dátovými bodmi",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.showPriceHistory": {
    message: "Zobraziť históriu cien pre {pair}",
    description: "Tlačidlo na otvorenie tabuľky cien s dátumami",
  },
  "page.commodities.hidePriceHistory": {
    message: "Skryť históriu cien pre {pair}",
    description: "Tlačidlo na zatvorenie tabuľky cien s dátumami",
  },
  "page.commodities.priceHistoryDate": {
    message: "Dátum",
    description: "Hlavička stĺpca dátumov",
  },
  "page.commodities.priceHistoryPrice": {
    message: "Cena ({quote})",
    description: "Hlavička stĺpca cien v kotovanej mene",
  },
  "page.commodities.managedSources": {
    message: "Spravované zdroje cien",
    description:
      "Title of the panel listing managed price feeds the ledger includes",
  },
  "page.commodities.managedSourcesDescription": {
    message:
      "Ceny, ktoré táto kniha preberá zo spravovaného zdroja. Obnovujú sa každých pár minút; vaše vlastné cenové záznamy majú prednosť.",
    description: "Description of the managed price sources panel",
  },
  "page.commodities.freshness.recent": {
    message: "Aktuálne",
    description:
      "Freshness badge: the managed feed was observed within the last ten minutes",
  },
  "page.commodities.freshness.stale": {
    message: "Zastarané",
    description:
      "Freshness badge: the managed feed's latest price is older than ten minutes",
  },
  "page.commodities.freshness.unavailable": {
    message: "Nedostupné",
    description:
      "Freshness badge: no valid price has been received from the managed feed",
  },
  "page.commodities.observedAt": {
    message: "Zistené {time}",
    description:
      "When the feed's latest price was observed. {time} is a formatted date and time.",
  },
  "page.commodities.nextRefreshAt": {
    message: "Ďalšie obnovenie {time}",
    description:
      "When the feed will next be re-fetched. {time} is a formatted date and time.",
  },
  "page.commodities.neverObserved": {
    message: "Zatiaľ nebola prijatá žiadna cena",
    description: "Shown when a managed feed has never delivered a valid price",
  },
  "page.commodities.lastError": {
    message: "Posledná chyba: {error}",
    description:
      "Why the last refresh of a managed feed failed. {error} is the technical cause.",
  },
  "page.commodities.refreshPrices": {
    message: "Obnoviť ceny",
    description: "Button that re-fetches the ledger's managed price feeds now",
  },
  "page.commodities.refreshingPrices": {
    message: "Obnovuje sa…",
    description: "Refresh button label while the refresh is in progress",
  },
  "page.commodities.refreshPricesFailed": {
    message: "Ceny sa nepodarilo obnoviť",
    description: "Toast shown when refreshing managed prices fails",
  },
};

export default skCommodities;
