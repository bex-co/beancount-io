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
    message: "Событиеs",
    description: "Events in the ledger",
  },
  "page.events.eventsCount": {
    message: "{filtered} из {total} событий",
    description: "Count of filtered events out of total",
  },
  "page.events.failedToLoadEvents": {
    message: "Не удалось загрузить события",
    description: "Error title when events fail to load",
  },
  "page.events.noEventsFound": {
    message: "События не найдены",
    description: "Empty state title when no events exist",
  },
  "page.events.noEventsFoundForLedger": {
    message: "События не найдены for this ledger.",
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
