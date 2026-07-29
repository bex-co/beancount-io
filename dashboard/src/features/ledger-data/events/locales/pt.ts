export interface TranslationEntry {
  message: string;
  description: string;
}

const ptEvents: Record<string, TranslationEntry> = {
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
    message: "Falha ao Carregar Eventos",
    description: "Error title when events fail to load",
  },
  "page.events.noEventsFound": {
    message: "Nenhum Evento Encontrado",
    description: "Empty state title when no events exist",
  },
  "page.events.noEventsFoundForLedger": {
    message: "Nenhum evento encontrado para este livro-razão.",
    description: "Empty state description for no events",
  },
  "page.events.noEventsMatchFilters": {
    message: "Nenhum evento corresponde aos seus filtros atuais.",
    description: "Message when filters produce no results",
  },
  "page.events.searchEvents": {
    message: "Pesquisar eventos...",
    description: "Placeholder for event search input",
  },
};

export default ptEvents;
