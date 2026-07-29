export interface TranslationEntry {
  message: string;
  description: string;
}

const caEvents: Record<string, TranslationEntry> = {
  "page.events.description": {
    message: "Description",
    description: "Table column header for description",
  },
  "page.events.events": {
    message: "Esdeveniments",
    description: "Events in the ledger",
  },
  "page.events.eventsCount": {
    message: "{filtered} de {total} esdeveniments",
    description: "Count of filtered events out of total",
  },
  "page.events.failedToLoadEvents": {
    message: "No s'han pogut carregar els esdeveniments",
    description: "Error title when events fail to load",
  },
  "page.events.noEventsFound": {
    message: "No Events Found",
    description: "Empty state title when no events exist",
  },
  "page.events.noEventsFoundForLedger": {
    message: "No events found for this ledger.",
    description: "Empty state description for no events",
  },
  "page.events.noEventsMatchFilters": {
    message: "No events match your current filters.",
    description: "Message when filters produce no results",
  },
  "page.events.searchEvents": {
    message: "Historial de preus amb {count} punts de dades",
    description: "Placeholder for event search input",
  },
};

export default caEvents;
