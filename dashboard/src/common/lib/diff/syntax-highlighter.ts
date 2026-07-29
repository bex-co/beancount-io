import { refractor } from "refractor";
import { tokenize } from "react-diff-view";
import type { HunkData, HunkTokens } from "react-diff-view";
import { beancountGrammar } from "@/common/lib/editor/beancount-syntax";

/**
 * Compatibility shim for refractor v4 with react-diff-view v3.
 *
 * refractor v4 changed highlight() to return a Root node { type, children }
 * instead of an array. react-diff-view v3 still expects the old array format,
 * so we unwrap the children here.
 */
const refractorShim = {
  languages: refractor.languages,
  highlight: (code: string, grammar: unknown) => {
    const root = refractor.highlight(
      code,
      grammar as Parameters<typeof refractor.highlight>[1],
    );
    return (root as { children: unknown[] }).children;
  },
};

// Threshold for disabling syntax highlighting on large diffs (performance)
export const SYNTAX_HIGHLIGHTING_THRESHOLD = 1000;

/**
 * Check if syntax highlighting should be applied based on diff size
 */
export function shouldHighlightDiff(totalLines: number): boolean {
  return totalLines < SYNTAX_HIGHLIGHTING_THRESHOLD;
}

/**
 * Register Beancount language with Refractor
 */
export function registerBeancountSyntax() {
  // Check if already registered
  if (refractor.languages.beancount) {
    return;
  }

  // Register the language directly to Prism languages (refractor uses Prism internally)
  try {
    refractor.languages.beancount = beancountGrammar;
    // Also alias it as 'bean'
    refractor.languages.bean = beancountGrammar;
  } catch (error) {
    console.warn("Failed to register Beancount syntax:", error);
  }
}

/**
 * Tokenize hunks for syntax highlighting
 *
 * @param hunks - Parsed diff hunks from react-diff-view
 * @param oldSource - Full old file content (optional, improves accuracy)
 * @returns Tokenized hunks for rendering or null on failure
 */
export function tokenizeBeancountDiff(
  hunks: HunkData[],
  oldSource?: string,
): HunkTokens | null {
  // Register Beancount if not already done
  registerBeancountSyntax();

  const options = {
    highlight: true,
    refractor: refractorShim,
    language: "beancount",
    ...(oldSource !== undefined ? { oldSource } : {}),
  } as const;

  try {
    return tokenize(
      hunks,
      options as Parameters<typeof tokenize>[1],
    ) as HunkTokens;
  } catch (error) {
    console.warn("Failed to tokenize Beancount diff:", error);
    // Return null on failure
    return null;
  }
}

/**
 * Detect if a filename is a Beancount file
 */
export function isBeancountFile(filename: string): boolean {
  return /\.(bean|beancount)$/i.test(filename);
}
