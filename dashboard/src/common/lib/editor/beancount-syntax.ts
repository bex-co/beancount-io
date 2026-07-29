/**
 * Beancount language definition for Refractor (Prism)
 *
 * This mirrors the Monaco tokenization in monaco-beancount-language-vscode.ts
 * but uses Prism's pattern structure instead of Monaco's Monarch language.
 *
 * Reference:
 * - Prism language patterns: https://prismjs.com/extending.html
 * - Monaco language: /src/common/lib/editor/monaco-beancount-language-vscode.ts
 */

export const beancountGrammar = {
  comment: {
    pattern: /;.*/,
    greedy: true,
  },

  // Date (YYYY-MM-DD at line start or after whitespace)
  constant: [
    {
      pattern: /\b\d{4}-\d{2}-\d{2}\b/,
      alias: "date",
    },
  ],

  // Keywords (directives)
  keyword:
    /\b(?:include|plugin|pushtag|poptag|option|commodity|balance|open|close|pad|note|document|price|event|query|custom)\b/,

  // Account root types
  "constant-language": {
    pattern: /\b(?:Assets|Liabilities|Equity|Income|Expenses)\b/,
    alias: "account-root",
  },

  // Full account names (hierarchical with colons)
  variable: {
    pattern:
      /\b(?:Assets|Liabilities|Equity|Income|Expenses)(?::[A-Z0-9][A-Za-z0-9_-]*)+\b/,
    alias: "account",
  },

  // String (double-quoted with escapes)
  string: {
    pattern: /"(?:[^"\\]|\\.)*"/,
    greedy: true,
    inside: {
      escape: /\\./,
    },
  },

  // Currency codes (commodities) - uppercase letters, numbers, apostrophes, periods, dashes
  symbol: {
    pattern: /\b[A-Z][A-Z0-9_'.-]*\b/,
    alias: "currency",
  },

  // Tags (#something)
  tag: /#[A-Za-z0-9_-]+/,

  // Links (^something)
  link: /\^[A-Za-z0-9_-]+/,

  // Numbers (with optional commas and decimals)
  number: /[+-]?[0-9]+(?:,[0-9]{3})*(?:\.[0-9]*)?/,

  // Operators
  operator: /[+\-*/=]/,

  // Punctuation
  punctuation: /[{}[\]()]/,
};
