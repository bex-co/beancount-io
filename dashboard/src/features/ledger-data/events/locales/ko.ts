export interface TranslationEntry {
  message: string;
  description: string;
}

const koEvents: Record<string, TranslationEntry> = {
  "page.events.description": {
    message: "설명",
    description: "Table column header for description",
  },
  "page.events.events": {
    message: "이벤트",
    description: "Events in the ledger",
  },
  "page.events.eventsCount": {
    message: "이벤트: {filtered} / {total}",
    description: "Count of filtered events out of total",
  },
  "page.events.noEventsFound": {
    message: "이벤트가 없습니다",
    description: "Empty state title when no events exist",
  },
  "page.events.noEventsFoundForLedger": {
    message: "이 장부에서 이벤트를 찾을 수 없습니다.",
    description: "Empty state description for no events",
  },
  "page.events.noEventsMatchFilters": {
    message: "현재 필터에 맞는 이벤트가 없습니다.",
    description: "Message when filters produce no results",
  },
  "page.events.searchEvents": {
    message: "이벤트 검색...",
    description: "Placeholder for event search input",
  },
};

export default koEvents;
