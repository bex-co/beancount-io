import type { FocusEvent } from "react";

/**
 * Restore focus to a connected opener (or fallback) when a dialog closes.
 * Mirrors the delete-ledger AlertDialog pattern: prevent Radix's default
 * body restore, then focus a still-mounted element.
 */
export function restoreFocusOnDialogClose(
  event: Event | FocusEvent,
  preferred: HTMLElement | null | undefined,
  fallback?: HTMLElement | null | undefined,
): void {
  const target =
    preferred && document.contains(preferred)
      ? preferred
      : fallback && document.contains(fallback)
        ? fallback
        : null;
  if (!target) return;
  event.preventDefault();
  target.focus();
}
