export interface TranslationEntry {
  message: string;
  description: string;
}

const jaEvents: Record<string, TranslationEntry> = {
  "page.events.description": {
    message: "説明",
    description: "Table column header for description",
  },
  "page.events.events": {
    message: "イベント",
    description: "Events in the ledger",
  },
  "page.events.eventsCount": {
    message: "{total}件中{filtered}件のイベント",
    description: "Count of filtered events out of total",
  },
  "page.events.failedToLoadEvents": {
    message: "イベントの読み込みに失敗しました",
    description: "Error title when events fail to load",
  },
  "page.events.noEventsFound": {
    message: "イベントが見つかりません",
    description: "Empty state title when no events exist",
  },
  "page.events.noEventsFoundForLedger": {
    message: "この元帳のイベントが見つかりません。",
    description: "Empty state description for no events",
  },
  "page.events.noEventsMatchFilters": {
    message: "現在のフィルターに一致するイベントがありません。",
    description: "Message when filters produce no results",
  },
  "page.events.searchEvents": {
    message: "イベントを検索...",
    description: "Placeholder for event search input",
  },
};

export default jaEvents;
