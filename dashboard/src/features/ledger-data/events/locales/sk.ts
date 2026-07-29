export interface TranslationEntry {
  message: string;
  description: string;
}

const skEvents: Record<string, TranslationEntry> = {
  "page.events.description": {
    message: "Description",
    description: "Table column header for description",
  },
  "page.events.events": {
    message: "Udalosti",
    description: "Events in the ledger",
  },
  "page.events.eventsCount": {
    message: "{filtered} z {total} udalostí",
    description: "Count of filtered events out of total",
  },
  "page.events.failedToLoadEvents": {
    message: "Nepodarilo sa načítať udalosti",
    description: "Error title when events fail to load",
  },
  "page.events.noEventsFound": {
    message: "Nenašli sa žiadne udalosti",
    description: "Empty state title when no events exist",
  },
  "page.events.noEventsFoundForLedger": {
    message: "Pre túto knihu neboli nájdené žiadne udalosti.",
    description: "Empty state description for no events",
  },
  "page.events.noEventsMatchFilters": {
    message: "Žiadne udalosti nezodpovedajú vašim aktuálnym filtrom.",
    description: "Message when filters produce no results",
  },
  "page.events.searchEvents": {
    message: "Hľadať udalosti...",
    description: "Placeholder for event search input",
  },
};

export default skEvents;
