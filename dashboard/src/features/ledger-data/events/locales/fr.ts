export interface TranslationEntry {
  message: string;
  description: string;
}

const frEvents: Record<string, TranslationEntry> = {
  "page.events.description": {
    message: "Description",
    description: "Table column header for description",
  },
  "page.events.events": {
    message: "Événements",
    description: "Events in the ledger",
  },
  "page.events.eventsCount": {
    message: "{filtered} événements sur {total}",
    description: "Count of filtered events out of total",
  },
  "page.events.failedToLoadEvents": {
    message: "Échec du chargement des événements",
    description: "Error title when events fail to load",
  },
  "page.events.noEventsFound": {
    message: "Aucun événement trouvé",
    description: "Empty state title when no events exist",
  },
  "page.events.noEventsFoundForLedger": {
    message: "Aucun événement trouvé pour ce grand livre.",
    description: "Empty state description for no events",
  },
  "page.events.noEventsMatchFilters": {
    message: "Aucun événement ne correspond à vos filtres actuels.",
    description: "Message when filters produce no results",
  },
  "page.events.searchEvents": {
    message: "Rechercher des événements...",
    description: "Placeholder for event search input",
  },
};

export default frEvents;
