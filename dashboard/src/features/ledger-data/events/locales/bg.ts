export interface TranslationEntry {
  message: string;
  description: string;
}

const bgEvents: Record<string, TranslationEntry> = {
  "page.events.description": {
    message: "Description",
    description: "Table column header for description",
  },
  "page.events.events": {
    message: "Събития",
    description: "Events in the ledger",
  },
  "page.events.eventsCount": {
    message: "{filtered} от {total} събития",
    description: "Count of filtered events out of total",
  },
  "page.events.failedToLoadEvents": {
    message: "Неуспешно зареждане на събитията",
    description: "Error title when events fail to load",
  },
  "page.events.noEventsFound": {
    message: "Няма намерени събития",
    description: "Empty state title when no events exist",
  },
  "page.events.noEventsFoundForLedger": {
    message: "Няма намерени събития за тази книга.",
    description: "Empty state description for no events",
  },
  "page.events.noEventsMatchFilters": {
    message: "Няма събития, които съответстват на текущите филтри.",
    description: "Message when filters produce no results",
  },
  "page.events.searchEvents": {
    message: "Търсене на събития...",
    description: "Placeholder for event search input",
  },
};

export default bgEvents;
