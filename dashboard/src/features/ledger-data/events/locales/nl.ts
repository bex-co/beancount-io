export interface TranslationEntry {
  message: string;
  description: string;
}

const nlEvents: Record<string, TranslationEntry> = {
  "page.events.description": {
    message: "Description",
    description: "Table column header for description",
  },
  "page.events.events": {
    message: "Gebeurtenissen",
    description: "Events in the ledger",
  },
  "page.events.eventsCount": {
    message: "{filtered} van {total} gebeurtenissen",
    description: "Count of filtered events out of total",
  },
  "page.events.failedToLoadEvents": {
    message: "Gebeurtenissen laden mislukt",
    description: "Error title when events fail to load",
  },
  "page.events.noEventsFound": {
    message: "Geen gebeurtenissen gevonden",
    description: "Empty state title when no events exist",
  },
  "page.events.noEventsFoundForLedger": {
    message: "Geen gebeurtenissen gevonden voor dit grootboek.",
    description: "Empty state description for no events",
  },
  "page.events.noEventsMatchFilters": {
    message: "Geen gebeurtenissen komen overeen met uw huidige filters.",
    description: "Message when filters produce no results",
  },
  "page.events.searchEvents": {
    message: "Gebeurtenissen zoeken...",
    description: "Placeholder for event search input",
  },
};

export default nlEvents;
