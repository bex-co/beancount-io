import { useCallback, useEffect } from "react";
import { useLocalStorageState } from "@/common/hooks/use-local-storage-state";

const LEGACY_STORAGE_KEY = "beancount-query-history";
const SIGNED_OUT_KEY = `${LEGACY_STORAGE_KEY}:signed-out`;
const MAX_HISTORY_SIZE = 50;

/**
 * One browser can serve several users in turn, and sign-out must not leak
 * the first user's queries to the next visitor (w5/1130): a signed-in user's
 * history lives under their own key, and signed-out readers of a shared
 * ledger get one of their own. `encodeURIComponent` never writes a `:`, so no
 * user id can collide with the signed-out key.
 */
export function queryHistoryKey(userId?: string | null): string {
  return userId
    ? `${LEGACY_STORAGE_KEY}.${encodeURIComponent(userId)}`
    : SIGNED_OUT_KEY;
}

function isQueryHistoryKey(key: string): boolean {
  return (
    key === LEGACY_STORAGE_KEY ||
    key.startsWith(`${LEGACY_STORAGE_KEY}.`) ||
    key === SIGNED_OUT_KEY
  );
}

/**
 * Sign-out leaves no query text behind (w5/1130): remove every stored BQL
 * history, the signing-out user's, any left by a session that expired without
 * reaching the logout page, and the unscoped bucket every user shared before
 * the history was keyed per user.
 */
export function clearStoredQueryHistories(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null && isQueryHistoryKey(key)) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    // Storage unavailable: there is nothing stored to leak.
  }
}

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
function readStoredHistory(storageKey: string): string[] | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw === null ? [] : readHistory(raw);
  } catch {
    return null;
  }
}

/**
 * The BQL history for one identity: pass the signed-in user's id so their
 * queries never surface for whoever signs in next on the same browser. The
 * key is captured per mount — a sign-out replaces the document, so the hook
 * never has to switch buckets mid-session.
 */
export function useQueryHistory(userId?: string | null) {
  const storageKey = queryHistoryKey(userId);
  const [history, setHistory, removeHistory] = useLocalStorageState<string[]>(
    storageKey,
    [],
    { deserializer: readHistory },
  );

  // The unscoped bucket mixes every earlier user's queries and cannot be
  // attributed to one, so it is dropped rather than adopted (w5/1130).
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Storage unavailable: nothing to drop.
    }
  }, []);

  const addQuery = useCallback(
    (query: string) => {
      if (!query.trim()) return;

      setHistory((prev) => {
        const base = readStoredHistory(storageKey) ?? prev;
        const filtered = base.filter((q) => q !== query);
        return [query, ...filtered].slice(0, MAX_HISTORY_SIZE);
      });
    },
    [setHistory, storageKey],
  );

  const clearHistory = useCallback(() => {
    removeHistory();
  }, [removeHistory]);

  const removeQuery = useCallback(
    (query: string) => {
      setHistory((prev) =>
        (readStoredHistory(storageKey) ?? prev).filter((q) => q !== query),
      );
    },
    [setHistory, storageKey],
  );

  return {
    history,
    addQuery,
    clearHistory,
    removeQuery,
  };
}
