export interface TranslationEntry {
  message: string;
  description: string;
}

const ruEvents: Record<string, TranslationEntry> = {
  "page.events.description": {
    message: "Description",
    description: "Table column header for description",
  },
  "page.events.events": {
    message: "События",
    description: "Events in the ledger",
  },
  "page.events.eventsCount": {
    message: "События: {filtered} / {total}",
    description: "Count of filtered events out of total",
  },
  "page.events.noEventsFound": {
    message: "События не найдены",
    description: "Empty state title when no events exist",
  },
  "page.events.noEventsFoundForLedger": {
    message: "События в этой книге не найдены.",
    description: "Empty state description for no events",
  },
  "page.events.noEventsMatchFilters": {
    message: "Нет событий, соответствующих вашим текущим фильтрам.",
    description: "Message when filters produce no results",
  },
  "page.events.searchEvents": {
    message: "Поиск событий...",
    description: "Placeholder for event search input",
  },
};

export default ruEvents;
