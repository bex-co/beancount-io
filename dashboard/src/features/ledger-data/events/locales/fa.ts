export interface TranslationEntry {
  message: string;
  description: string;
}

const faEvents: Record<string, TranslationEntry> = {
  "page.events.description": {
    message: "Description",
    description: "Table column header for description",
  },
  "page.events.events": {
    message: "رویدادها",
    description: "Events in the ledger",
  },
  "page.events.eventsCount": {
    message: "{filtered} از {total} رویداد",
    description: "Count of filtered events out of total",
  },
  "page.events.failedToLoadEvents": {
    message: "بارگذاری رویدادها ناموفق بود",
    description: "Error title when events fail to load",
  },
  "page.events.noEventsFound": {
    message: "رویدادی یافت نشد",
    description: "Empty state title when no events exist",
  },
  "page.events.noEventsFoundForLedger": {
    message: "هیچ رویدادی برای این دفتر یافت نشد.",
    description: "Empty state description for no events",
  },
  "page.events.noEventsMatchFilters": {
    message: "هیچ رویدادی با فیلترهای انتخابی شما مطابقت ندارد.",
    description: "Message when filters produce no results",
  },
  "page.events.searchEvents": {
    message: "جستجوی رویدادها...",
    description: "Placeholder for event search input",
  },
};

export default faEvents;
