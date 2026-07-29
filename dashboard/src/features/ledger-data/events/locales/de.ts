export interface TranslationEntry {
  message: string;
  description: string;
}

const deEvents: Record<string, TranslationEntry> = {
  "page.events.description": {
    message: "Description",
    description: "Table column header for description",
  },
  "page.events.events": {
    message: "Ereignisse",
    description: "Events in the ledger",
  },
  "page.events.eventsCount": {
    message: "{filtered} von {total} Ereignissen",
    description: "Count of filtered events out of total",
  },
  "page.events.failedToLoadEvents": {
    message: "Ereignisse konnten nicht geladen werden",
    description: "Error title when events fail to load",
  },
  "page.events.noEventsFound": {
    message: "Keine Ereignisse gefunden",
    description: "Empty state title when no events exist",
  },
  "page.events.noEventsFoundForLedger": {
    message: "Keine Ereignisse für dieses Hauptbuch gefunden.",
    description: "Empty state description for no events",
  },
  "page.events.noEventsMatchFilters": {
    message: "Keine Ereignisse entsprechen Ihren aktuellen Filtern.",
    description: "Message when filters produce no results",
  },
  "page.events.searchEvents": {
    message: "Ereignisse suchen...",
    description: "Placeholder for event search input",
  },
};

export default deEvents;
