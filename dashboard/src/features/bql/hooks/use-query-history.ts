import { useCallback } from "react";
import { useLocalStorageState } from "@/common/hooks/use-local-storage-state";

const STORAGE_KEY = "beancount-query-history";
const MAX_HISTORY_SIZE = 50;

export interface QueryHistoryItem {
  query: string;
  timestamp: number;
}

export function useQueryHistory() {
  const [history, setHistory, removeHistory] = useLocalStorageState<string[]>(
    STORAGE_KEY,
    [],
  );

  const addQuery = useCallback(
    (query: string) => {
      if (!query.trim()) return;

      setHistory((prev) => {
        const filtered = prev.filter((q) => q !== query);
        const updated = [query, ...filtered];
        return updated.slice(0, MAX_HISTORY_SIZE);
      });
    },
    [setHistory],
  );

  const clearHistory = useCallback(() => {
    removeHistory();
  }, [removeHistory]);

  const removeQuery = useCallback(
    (query: string) => {
      setHistory((prev) => prev.filter((q) => q !== query));
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
