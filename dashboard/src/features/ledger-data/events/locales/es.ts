export interface TranslationEntry {
  message: string;
  description: string;
}

const esEvents: Record<string, TranslationEntry> = {
  "page.events.description": {
    message: "Description",
    description: "Table column header for description",
  },
  "page.events.events": {
    message: "Eventos",
    description: "Events in the ledger",
  },
  "page.events.eventsCount": {
    message: "{filtered} de {total} eventos",
    description: "Count of filtered events out of total",
  },
  "page.events.failedToLoadEvents": {
    message: "Error al Cargar Eventos",
    description: "Error title when events fail to load",
  },
  "page.events.noEventsFound": {
    message: "No se Encontraron Eventos",
    description: "Empty state title when no events exist",
  },
  "page.events.noEventsFoundForLedger": {
    message: "No se encontraron eventos para este libro mayor.",
    description: "Empty state description for no events",
  },
  "page.events.noEventsMatchFilters": {
    message: "Ningún evento coincide con sus filtros actuales.",
    description: "Message when filters produce no results",
  },
  "page.events.searchEvents": {
    message: "Buscar eventos...",
    description: "Placeholder for event search input",
  },
};

export default esEvents;
