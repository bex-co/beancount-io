import type * as monaco from "monaco-editor";
import type { BeancountError } from "@/graphql/definitions";
export {
  alignAmounts,
  toggleComment,
  foldAll,
  unfoldAll,
} from "@/common/lib/editor/monaco-beancount-actions";

/**
 * Transform Beancount errors to Monaco editor markers
 */
export const beancountErrorsToMarkers = (
  errors: BeancountError[],
  monaco: typeof import("monaco-editor"),
): monaco.editor.IMarkerData[] => {
  return errors
    .filter((error) => error.lineno != null)
    .map((error) => ({
      severity: monaco.MarkerSeverity.Error,
      startLineNumber: error.lineno!,
      startColumn: 1,
      endLineNumber: error.lineno!,
      endColumn: Number.MAX_VALUE,
      message: error.message,
      source: "beancount",
    }));
};

type FindControllerLike = {
  getState?: () => { isRevealed?: boolean };
};

/** True when Monaco's Find/Replace widget is open for this editor. */
export function isMonacoFindWidgetVisible(
  editor: { getContribution: (id: string) => unknown } | null | undefined,
): boolean {
  const contribution = editor?.getContribution(
    "editor.contrib.findController",
  ) as FindControllerLike | null | undefined;
  return contribution?.getState?.().isRevealed === true;
}

/** True when Escape belongs to a dialog/menu rather than file cancel. */
export function isEscapeOwnedByOverlay(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('[role="dialog"]') ||
    target.closest('[role="menu"]') ||
    target.closest("[data-radix-popper-content-wrapper]"),
  );
}

/**
 * Document-level Escape should cancel edit only when Monaco Find and overlays
 * do not own the key.
 */
export function shouldCancelEditOnEscape(
  editor: { getContribution: (id: string) => unknown } | null | undefined,
  target: EventTarget | null,
): boolean {
  if (isMonacoFindWidgetVisible(editor)) return false;
  if (isEscapeOwnedByOverlay(target)) return false;
  return true;
}
