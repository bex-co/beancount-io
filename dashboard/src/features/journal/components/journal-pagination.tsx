import type React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/common/components/ui/pagination";

interface JournalPaginationProps {
  total: number;
  limit: number;
  offset: number;
  setOffset: React.Dispatch<React.SetStateAction<number>>;
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
}: JournalPaginationProps) {
  // Show when there are more pages or we're not on the first page
  if (!(total > limit + offset || offset > 0)) return null;

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let p = start; p <= end; p++) pages.push(p);

  const items: React.ReactNode[] = [];
  if (start > 1) {
    items.push(
      <PaginationItem key={1}>
        <PaginationLink
          isActive={currentPage === 1}
          onClick={() => setOffset(0)}
        >
          1
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
          onClick={() => setOffset((p - 1) * limit)}
        >
          {p}
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
          onClick={() => setOffset((totalPages - 1) * limit)}
        >
          {totalPages}
        </PaginationLink>
      </PaginationItem>,
    );
  }

  return (
    <div className="mt-4">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
              aria-disabled={offset === 0}
            />
          </PaginationItem>
          {items}
          <PaginationItem>
            <PaginationNext
              onClick={() =>
                setOffset((prev) =>
                  prev + limit >= total ? prev : prev + limit,
                )
              }
              aria-disabled={offset + limit >= total}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
