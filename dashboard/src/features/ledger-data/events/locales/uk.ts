export interface TranslationEntry {
  message: string;
  description: string;
}

const ukEvents: Record<string, TranslationEntry> = {
  "page.events.description": {
    message: "Description",
    description: "Table column header for description",
  },
  "page.events.events": {
    message: "Події",
    description: "Events in the ledger",
  },
  "page.events.eventsCount": {
    message: "{filtered} з {total} подій",
    description: "Count of filtered events out of total",
  },
  "page.events.failedToLoadEvents": {
    message: "Не вдалося завантажити події",
    description: "Error title when events fail to load",
  },
  "page.events.noEventsFound": {
    message: "Подій не знайдено",
    description: "Empty state title when no events exist",
  },
  "page.events.noEventsFoundForLedger": {
    message: "Для цієї книги не знайдено подій.",
    description: "Empty state description for no events",
  },
  "page.events.noEventsMatchFilters": {
    message: "Жодна подія не відповідає поточним фільтрам.",
    description: "Message when filters produce no results",
  },
  "page.events.searchEvents": {
    message: "Пошук events...",
    description: "Placeholder for event search input",
  },
};

export default ukEvents;
