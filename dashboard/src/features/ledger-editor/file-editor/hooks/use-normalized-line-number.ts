import { useMemo } from "react";

/**
 * Custom hook to normalize line number to be within valid bounds
 * @param lineNumber - The line number to normalize (can be undefined or out of bounds)
 * @param content - The file content to calculate total lines from
 * @returns Normalized line number within [1, totalLines], or undefined if invalid
 */
export function useNormalizedLineNumber(
  lineNumber: number | undefined,
  content: string,
): number | undefined {
  return useMemo(() => {
    if (!lineNumber || lineNumber <= 0) {
      return undefined;
    }

    // Calculate total number of lines in the file
    const totalLines = content ? content.split("\n").length : 0;

    if (totalLines === 0) {
      return undefined;
    }

    // Clamp lineNumber to be within [1, totalLines]
    return Math.min(Math.max(1, lineNumber), totalLines);
  }, [lineNumber, content]);
}
