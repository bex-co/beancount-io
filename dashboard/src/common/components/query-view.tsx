import type { ReactNode } from "react";
import { ReportErrorState, ReportLoadingState } from "./state-components";

interface QueryViewProps<T> {
  loading: boolean;
  error?: Error | null;
  data: T | null | undefined;
  /** Custom skeleton that matches the page layout. Falls back to generic spinner. */
  loadingSlot?: ReactNode;
  /**
   * Explicit error message override. When omitted, the error object itself is
   * mapped to a localized, user-safe message (never the raw error.message).
   */
  errorMessage?: string;
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
  isEmpty,
  emptySlot,
  children,
}: QueryViewProps<T>) {
  if (loading) {
    return loadingSlot ?? <ReportLoadingState />;
  }

  if (error) {
    return <ReportErrorState message={errorMessage} error={error} />;
  }

  if (data == null) {
    return emptySlot ?? null;
  }

  if (isEmpty?.(data as NonNullable<T>)) {
    return emptySlot ?? null;
  }

  return <>{children(data as NonNullable<T>)}</>;
}
