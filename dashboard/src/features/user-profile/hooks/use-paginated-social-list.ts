import { useCallback, useRef, useState } from "react";
import { useLazyQuery, useQuery } from "@apollo/client/react";
import type { DocumentNode, OperationVariables } from "@apollo/client";

export const SOCIAL_PAGE_SIZE = 20;

type PageResult<TItem> = {
  items: TItem[];
};

type Continuation<TItem> = {
  extras: TItem[];
  page: number;
  hasMore: boolean;
};

function dedupeByIdentity<TItem>(
  items: TItem[],
  identityKey: (item: TItem) => string,
): TItem[] {
  const seen = new Set<string>();
  const merged: TItem[] = [];
  for (const item of items) {
    const key = identityKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

/**
 * Paginate a social list under the existing API contract: `total` is the
 * returned page size, not the collection size. Continuation is `pageLength ===
 * limit`; an empty/short page ends the list.
 */
export function usePaginatedSocialList<
  TItem,
  TData,
  TVariables extends OperationVariables & {
    username: string;
    page: number;
    limit: number;
  },
>({
  document,
  username,
  enabled,
  selectPage,
  identityKey,
}: {
  document: DocumentNode;
  username: string;
  enabled: boolean;
  selectPage: (data: TData | undefined) => PageResult<TItem> | null;
  identityKey: (item: TItem) => string;
}) {
  const [profileKey, setProfileKey] = useState(username);
  const [continuation, setContinuation] = useState<Continuation<TItem> | null>(
    null,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);
  const usernameRef = useRef(username);

  if (username !== profileKey) {
    setProfileKey(username);
    usernameRef.current = username;
    requestIdRef.current += 1;
    setContinuation(null);
    setLoadingMore(false);
    setLoadMoreError(null);
  }

  const { data, loading, error, refetch } = useQuery<TData, TVariables>(
    document,
    {
      variables: {
        username,
        page: 1,
        limit: SOCIAL_PAGE_SIZE,
      } as TVariables,
      skip: !username || !enabled,
    },
  );

  const [fetchPage] = useLazyQuery<TData, TVariables>(document, {
    fetchPolicy: "network-only",
  });

  const firstPage = enabled ? (selectPage(data)?.items ?? []) : [];
  const extras = continuation?.extras ?? [];
  const items = dedupeByIdentity([...firstPage, ...extras], identityKey);
  const hasMore =
    continuation?.hasMore ?? (enabled && firstPage.length === SOCIAL_PAGE_SIZE);
  const page = continuation?.page ?? 1;

  const loadMore = useCallback(async () => {
    if (!enabled || !username || loadingMore || !hasMore) return;

    const nextPage = page + 1;
    const requestId = ++requestIdRef.current;
    const expectedUsername = username;
    setLoadingMore(true);
    setLoadMoreError(null);

    try {
      const result = await fetchPage({
        variables: {
          username: expectedUsername,
          page: nextPage,
          limit: SOCIAL_PAGE_SIZE,
        } as TVariables,
      });

      if (
        requestId !== requestIdRef.current ||
        expectedUsername !== usernameRef.current
      ) {
        return;
      }

      if (result.error) {
        setLoadMoreError(result.error);
        return;
      }

      const pageItems = selectPage(result.data)?.items ?? [];
      setContinuation((current) => ({
        extras: [...(current?.extras ?? []), ...pageItems],
        page: nextPage,
        hasMore: pageItems.length === SOCIAL_PAGE_SIZE,
      }));
    } catch (err) {
      if (
        requestId !== requestIdRef.current ||
        expectedUsername !== usernameRef.current
      ) {
        return;
      }
      setLoadMoreError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingMore(false);
      }
    }
  }, [enabled, fetchPage, hasMore, loadingMore, page, selectPage, username]);

  return {
    items,
    /** Last returned page size from the API (legacy field). */
    total: firstPage.length,
    loading: Boolean(enabled && loading && items.length === 0),
    loadingMore,
    hasMore,
    error: error ?? null,
    loadMoreError,
    loadMore,
    retryLoadMore: loadMore,
    refetch,
  };
}
