import { useEffect } from "react";

/**
 * Tell a dialog whether its form holds unsaved input, so dismissing it can
 * ask first (w2/123). An unmounted form holds nothing.
 */
export function useReportDirty(
  dirty: boolean,
  onDirtyChange?: (dirty: boolean) => void,
): void {
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);
}
