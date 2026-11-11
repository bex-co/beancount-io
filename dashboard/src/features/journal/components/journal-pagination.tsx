import {
  useLayoutEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/common/components/ui/pagination";
import { useTranslations } from "@/common/hooks/use-translations";
import { useFormatCount } from "@/common/hooks/use-format-count";

interface JournalPaginationProps {
  total: number;
  limit: number;
  offset: number;
  setOffset: Dispatch<SetStateAction<number>>;
  loading?: boolean;
  resultCount?: number;
  scopeKey?: string;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Reusable pagination component for journal tables
 * Displays pagination controls when there are multiple pages
 */
export function JournalPagination({
  total,
  limit,
  offset,
  setOffset,
  loading = false,
  resultCount = Math.min(limit, Math.max(0, total - offset)),
  scopeKey = "",
  fallbackFocusRef,
}: JournalPaginationProps) {
  const { t } = useTranslations();
  const formatCount = useFormatCount();
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<{
    offset: number;
    scopeKey: string;
    button: HTMLButtonElement;
    ownsFocus: boolean;
  } | null>(null);
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useLayoutEffect(() => {
    const request = requestRef.current;
    if (!request) return;
    if (request.scopeKey !== scopeKey) {
      requestRef.current = null;
      return;
    }
    if (loading || offset === request.offset) return;
    requestRef.current = null;
    const active = document.activeElement;
    if (
      !request.ownsFocus ||
      (active !== request.button && active !== document.body)
    )
      return;
    if (
      !request.button.isConnected ||
      request.button.disabled ||
      currentPage > totalPages
    ) {
      const target =
        containerRef.current?.querySelector<HTMLButtonElement>(
          '[aria-current="page"]',
        ) ?? fallbackFocusRef?.current;
      target?.focus();
    }
  }, [loading, offset, scopeKey, currentPage, totalPages, fallbackFocusRef]);

  const changePage = (
    event: MouseEvent<HTMLButtonElement>,
    value: SetStateAction<number>,
  ) => {
    const next = typeof value === "function" ? value(offset) : value;
    if (loading || requestRef.current || next === offset) return;
    requestRef.current = {
      offset,
      scopeKey,
      button: event.currentTarget,
      ownsFocus: document.activeElement === event.currentTarget,
    };
    setOffset(value);
  };

  // Show when there are more pages or we're not on the first page.
  if (!(total > limit + offset || offset > 0)) return null;

  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let p = start; p <= end; p++) pages.push(p);

  const items: ReactNode[] = [];
  if (start > 1) {
    items.push(
      <PaginationItem key={1}>
        <PaginationLink
          isActive={currentPage === 1}
          onClick={(event) => changePage(event, 0)}
          aria-disabled={loading || undefined}
        >
          {formatCount(1)}
        </PaginationLink>
      </PaginationItem>,
    );
    if (start > 2) {
      items.push(
        <PaginationItem key="start-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }
  }
  for (const p of pages) {
    items.push(
      <PaginationItem key={p}>
        <PaginationLink
          isActive={p === currentPage}
          onClick={(event) => changePage(event, (p - 1) * limit)}
          aria-disabled={loading || undefined}
        >
          {formatCount(p)}
        </PaginationLink>
      </PaginationItem>,
    );
  }
  if (end < totalPages) {
    if (end < totalPages - 1) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }
    items.push(
      <PaginationItem key={totalPages}>
        <PaginationLink
          isActive={currentPage === totalPages}
          onClick={(event) => changePage(event, (totalPages - 1) * limit)}
          aria-disabled={loading || undefined}
        >
          {formatCount(totalPages)}
        </PaginationLink>
      </PaginationItem>,
    );
  }

  return (
    <div
      ref={containerRef}
      className="mt-4"
      onBlurCapture={(event) => {
        if (event.relatedTarget && requestRef.current)
          requestRef.current.ownsFocus = false;
      }}
    >
      <span
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {!loading && resultCount > 0
          ? t("common.showingResultsRange", {
              first: formatCount(offset + 1),
              last: formatCount(Math.min(offset + resultCount, total)),
              total: formatCount(total),
            })
          : ""}
      </span>
      <Pagination aria-busy={loading}>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={(event) =>
                changePage(event, (prev) => Math.max(0, prev - limit))
              }
              disabled={!loading && offset === 0}
              aria-disabled={loading || undefined}
            />
          </PaginationItem>
          {items}
          <PaginationItem>
            <PaginationNext
              onClick={(event) =>
                changePage(event, (prev) =>
                  prev + limit >= total ? prev : prev + limit,
                )
              }
              disabled={!loading && offset + limit >= total}
              aria-disabled={loading || undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
