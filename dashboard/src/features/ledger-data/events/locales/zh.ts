export interface TranslationEntry {
  message: string;
  description: string;
}

const zhEvents: Record<string, TranslationEntry> = {
  "page.events.description": {
    message: "Description",
    description: "Table column header for description",
  },
  "page.events.events": {
    message: "事件",
    description: "Events in the ledger",
  },
  "page.events.eventsCount": {
    message: "{filtered} 个事件，共 {total} 个",
    description: "Count of filtered events out of total",
  },
  "page.events.failedToLoadEvents": {
    message: "加载事件失败",
    description: "Error title when events fail to load",
  },
  "page.events.noEventsFound": {
    message: "未找到事件",
    description: "Empty state title when no events exist",
  },
  "page.events.noEventsFoundForLedger": {
    message: "此账本未找到事件。",
    description: "Empty state description for no events",
  },
  "page.events.noEventsMatchFilters": {
    message: "没有事件符合你当前的筛选条件。",
    description: "Message when filters produce no results",
  },
  "page.events.searchEvents": {
    message: "搜索事件...",
    description: "Placeholder for event search input",
  },
};

export default zhEvents;
