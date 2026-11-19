import type { ReactNode } from "react";
import { useQueryRetry } from "@/common/hooks/use-query-retry";
import {
  ReportErrorState,
  ReportLoadingState,
  SkeletonLoadingState,
} from "./state-components";

interface QueryViewProps<T> {
  loading: boolean;
  error?: Error | null;
  data: T | null | undefined;
  /**
   * Custom skeleton that matches the page layout. Falls back to generic
   * spinner. Rendered inside a busy status with the skeleton hidden from
   * assistive technology.
   */
  loadingSlot?: ReactNode;
  /**
   * Explicit error message override. When omitted, the error object itself is
   * mapped to a localized, user-safe message (never the raw error.message).
   */
  errorMessage?: string;
  /** Draw the error without its own card, inside the page's. */
  errorFramed?: boolean;
  /**
   * Offered on the error state as Try Again, usually the query's `refetch`.
   * While the promise it returns is pending, the error state stays, busy
   * (w4/m50).
   */
  onRetry?: () => Promise<unknown> | void;
  /** Returns true when data is present but logically empty (e.g. empty array). */
  isEmpty?: (data: NonNullable<T>) => boolean;
  /** Rendered when isEmpty returns true. */
  emptySlot?: ReactNode;
  /** Rendered when data is non-null/undefined and not empty. */
  children: (data: NonNullable<T>) => ReactNode;
}

export function QueryView<T>({
  loading,
  error,
  data,
  loadingSlot,
  errorMessage,
  errorFramed,
  onRetry,
  isEmpty,
  emptySlot,
  children,
}: QueryViewProps<T>) {
  const { failure, retrying, retry } = useQueryRetry(error ?? undefined, () =>
    Promise.resolve(onRetry?.()),
  );

  // A retry keeps its error state in place; its loading is the busy button.
  if (loading && !retrying) {
    return loadingSlot ? (
      <SkeletonLoadingState>{loadingSlot}</SkeletonLoadingState>
    ) : (
      <ReportLoadingState />
    );
  }

  if (failure) {
    return (
      <ReportErrorState
        message={errorMessage}
        error={failure}
        onRetry={onRetry && retry}
        retrying={retrying}
        framed={errorFramed}
      />
    );
  }

  if (data == null) {
    return emptySlot ?? null;
  }

  if (isEmpty?.(data as NonNullable<T>)) {
    return emptySlot ?? null;
  }

  return <>{children(data as NonNullable<T>)}</>;
}
