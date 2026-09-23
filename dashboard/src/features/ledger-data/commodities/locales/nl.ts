export interface TranslationEntry {
  message: string;
  description: string;
}

const nlCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "Grondstoffen",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "Grondstoffen laden mislukt",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "Geen koershistorie gevonden",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message:
      "Dit grootboek bevat geen koersen, dus er is geen wisselkoershistorie om te tonen.",
    description:
      "Empty state description when the ledger records no commodity prices",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "Prijsgeschiedenis met {count} datapunten",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.showPriceHistory": {
    message: "Toon prijsgeschiedenis voor {pair}",
    description: "Knop om de gedateerde prijstabel te tonen",
  },
  "page.commodities.hidePriceHistory": {
    message: "Verberg prijsgeschiedenis voor {pair}",
    description: "Knop om de gedateerde prijstabel te sluiten",
  },
  "page.commodities.priceHistoryDate": {
    message: "Datum",
    description: "Kolomkop voor prijsdatums",
  },
  "page.commodities.priceHistoryPrice": {
    message: "Prijs ({quote})",
    description: "Kolomkop voor prijzen in de noteringsvaluta",
  },
  "page.commodities.managedSources": {
    message: "Beheerde prijsbronnen",
    description:
      "Title of the panel listing managed price feeds the ledger includes",
  },
  "page.commodities.managedSourcesDescription": {
    message:
      "Prijzen die dit grootboek uit een beheerde bron opneemt. Ze worden om de paar minuten vernieuwd; je eigen prijsboekingen gaan voor.",
    description: "Description of the managed price sources panel",
  },
  "page.commodities.freshness.recent": {
    message: "Actueel",
    description:
      "Freshness badge: the managed feed was observed within the last ten minutes",
  },
  "page.commodities.freshness.stale": {
    message: "Verouderd",
    description:
      "Freshness badge: the managed feed's latest price is older than ten minutes",
  },
  "page.commodities.freshness.unavailable": {
    message: "Niet beschikbaar",
    description:
      "Freshness badge: no valid price has been received from the managed feed",
  },
  "page.commodities.observedAt": {
    message: "Waargenomen {time}",
    description:
      "When the feed's latest price was observed. {time} is a formatted date and time.",
  },
  "page.commodities.nextRefreshAt": {
    message: "Volgende vernieuwing {time}",
    description:
      "When the feed will next be re-fetched. {time} is a formatted date and time.",
  },
  "page.commodities.neverObserved": {
    message: "Nog geen prijs ontvangen",
    description: "Shown when a managed feed has never delivered a valid price",
  },
  "page.commodities.lastError": {
    message: "Laatste fout: {error}",
    description:
      "Why the last refresh of a managed feed failed. {error} is the technical cause.",
  },
  "page.commodities.refreshPrices": {
    message: "Prijzen vernieuwen",
    description: "Button that re-fetches the ledger's managed price feeds now",
  },
  "page.commodities.refreshingPrices": {
    message: "Bezig met vernieuwen…",
    description: "Refresh button label while the refresh is in progress",
  },
  "page.commodities.refreshPricesFailed": {
    message: "Prijzen konden niet worden vernieuwd",
    description: "Toast shown when refreshing managed prices fails",
  },
};

export default nlCommodities;
