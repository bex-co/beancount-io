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
