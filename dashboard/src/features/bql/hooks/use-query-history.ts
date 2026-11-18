import { useCallback } from "react";
import { useLocalStorageState } from "@/common/hooks/use-local-storage-state";

const STORAGE_KEY = "beancount-query-history";
const MAX_HISTORY_SIZE = 50;

export interface QueryHistoryItem {
  query: string;
  timestamp: number;
}

/**
 * Saved history is browser data: a stored `null` or object would crash the
 * page or hide a result (w4/272). Keep only an array's query strings.
 */
function readHistory(raw: string): string[] {
  const value: unknown = JSON.parse(raw);
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * What is stored right now, read at write time. Each tab's hook state is a
 * snapshot from when it mounted, so applying an add or remove to it alone
 * would write the other tabs' newer entries away (w5/1172). Merging the
 * stored list with this tab's state instead keeps the union: entries only
 * this tab knows about (a write that updated state but never persisted) go
 * first, then everything stored — the same read-at-write-time merge the
 * Overview layout applies to its stored layout.
 */
function readStoredHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    return readHistory(raw);
  } catch {
    return [];
  }
}

/** Newest-first union of the stored list and this tab's state. */
function mergeHistories(stored: string[], memory: string[]): string[] {
  const seen = new Set(stored);
  return [...memory.filter((q) => !seen.has(q)), ...stored];
}

export function useQueryHistory() {
  const [history, setHistory, removeHistory] = useLocalStorageState<string[]>(
    STORAGE_KEY,
    [],
    { deserializer: readHistory },
  );

  const addQuery = useCallback(
    (query: string) => {
      if (!query.trim()) return;

      setHistory((prev) => {
        const merged = mergeHistories(readStoredHistory(), prev);
        const filtered = merged.filter((q) => q !== query);
        return [query, ...filtered].slice(0, MAX_HISTORY_SIZE);
      });
    },
    [setHistory],
  );

  const clearHistory = useCallback(() => {
    removeHistory();
  }, [removeHistory]);

  const removeQuery = useCallback(
    (query: string) => {
      setHistory((prev) =>
        mergeHistories(readStoredHistory(), prev).filter((q) => q !== query),
      );
    },
    [setHistory],
  );

  return {
    history,
    addQuery,
    clearHistory,
    removeQuery,
  };
}
