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
 * What is stored right now, read at write time, or null when storage cannot
 * be read. Each tab's hook state is a snapshot from when it mounted, so an add
 * or remove applied to it would write the other tabs' newer entries away and
 * bring back the ones they deleted (w5/1172). Applying it to the stored list
 * instead keeps every tab's queries and every tab's deletions. This tab's own
 * state is the base only when storage is unavailable.
 */
function readStoredHistory(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? [] : readHistory(raw);
  } catch {
    return null;
  }
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
        const base = readStoredHistory() ?? prev;
        const filtered = base.filter((q) => q !== query);
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
        (readStoredHistory() ?? prev).filter((q) => q !== query),
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
