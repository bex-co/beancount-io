const LEGACY_STORAGE_KEY = "beancount-query-history";
const SIGNED_OUT_KEY = `${LEGACY_STORAGE_KEY}:signed-out`;

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

/**
 * The unscoped bucket mixes every earlier user's queries and cannot be
 * attributed to one, so it is dropped rather than adopted (w5/1130).
 */
export function removeLegacyQueryHistoryBucket(): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage unavailable: nothing to drop.
  }
}
