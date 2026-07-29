import type * as monaco from "monaco-editor";

/**
 * Beancount language configuration for Monaco Editor
 * Based on the official VS Code Beancount extension by Lencerf
 * Source: https://github.com/Lencerf/vscode-beancount
 */

export const beancountLanguageConfig: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: ";",
  },
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
  ],
  surroundingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
  ],
};

export const beancountTokenProvider: monaco.languages.IMonarchLanguage = {
  tokenPostfix: ".beancount",

  // The main tokenizer - matching Prism.js patterns from beancount-cms
  tokenizer: {
    root: [
      // Comments
      [/;.*/, "comment.beancount"],

      // Date (YYYY-MM-DD at line start) - alias: constant
      [/^\d{4}-\d{2}-\d{2}/, "constant.beancount"],

      // Account (full hierarchical) - alias: variable
      [
        /\b(Assets|Liabilities|Equity|Income|Expenses)(?::[A-Z0-9][A-Za-z0-9_-]*)+\b/,
        "variable.beancount",
      ],

      // Account root - alias: constant-language
      [
        /\b(Assets|Liabilities|Equity|Income|Expenses)\b/,
        "constant.language.beancount",
      ],

      // String (double-quoted, with escapes)
      [/"([^"\\]|\\.)*$/, "string.invalid.beancount"], // incomplete string
      [/"/, { token: "string.beancount", bracket: "@open", next: "@string" }],

      // Currency (commodities) - alias: symbol
      [/\b[A-Z][A-Z0-9_'.-]*\b/, "symbol.beancount"],

      // Number (with optional commas and decimals) - alias: number
      [/[+-]?[0-9]+(?:,[0-9]{3})*(?:\.[0-9]*)?/, "number.beancount"],

      // Keywords (directives) - alias: keyword
      [
        /\b(include|plugin|pushtag|option|commodity|balance|open|close|pad|note|document|price|event|query|custom)\b/,
        "keyword.beancount",
      ],

      // Link (^something) - alias: symbol
      [/\^[A-Za-z0-9_-]+/, "symbol.beancount"],

      // Tag (#something) - alias: symbol
      [/#[A-Za-z0-9_-]+/, "symbol.beancount"],

      // Operators
      [/[+\-*/=]/, "operator.beancount"],

      // Whitespace
      { include: "@whitespace" },
    ],

    string: [
      [/[^\\"]+/, "string.beancount"],
      [/\\./, "string.escape.beancount"],
      [/"/, { token: "string.beancount", bracket: "@close", next: "@pop" }],
    ],

    whitespace: [
      [/[ \t\r\n]+/, "white.beancount"],
      [/;.*/, "comment.beancount"],
    ],
  },
};

/**
 * Theme rules matching Prism.js aliases from beancount-cms
 * Based on VS Code's default dark theme colors
 */
const beancountDarkThemeRules: monaco.editor.ITokenThemeRule[] = [
  // comment - italic green
  { token: "comment.beancount", foreground: "6A9955", fontStyle: "italic" },

  // constant (dates) - light blue
  { token: "constant.beancount", foreground: "4FC1FF" },

  // constant-language (account roots: Assets, Liabilities, etc.) - teal
  {
    token: "constant.language.beancount",
    foreground: "4EC9B0",
    fontStyle: "bold",
  },

  // variable (full account names) - light blue
  { token: "variable.beancount", foreground: "9CDCFE" },

  // string - orange
  { token: "string.beancount", foreground: "CE9178" },
  { token: "string.escape.beancount", foreground: "D7BA7D" },
  { token: "string.invalid.beancount", foreground: "F44747" },

  // symbol (currency, tags, links) - teal/yellow
  { token: "symbol.beancount", foreground: "DCDCAA" },

  // number - light green
  { token: "number.beancount", foreground: "B5CEA8" },

  // keyword (directives) - purple/bold
  { token: "keyword.beancount", foreground: "C586C0", fontStyle: "bold" },

  // operator - light gray
  { token: "operator.beancount", foreground: "D4D4D4" },
];

/**
 * Light theme rules matching Prism.js aliases
 */
const beancountLightThemeRules: monaco.editor.ITokenThemeRule[] = [
  // comment - italic green
  { token: "comment.beancount", foreground: "008000", fontStyle: "italic" },

  // constant (dates) - blue
  { token: "constant.beancount", foreground: "0000FF" },

  // constant-language (account roots) - dark teal
  {
    token: "constant.language.beancount",
    foreground: "267F99",
    fontStyle: "bold",
  },

  // variable (full account names) - dark blue
  { token: "variable.beancount", foreground: "001080" },

  // string - dark red
  { token: "string.beancount", foreground: "A31515" },
  { token: "string.escape.beancount", foreground: "EE0000" },
  { token: "string.invalid.beancount", foreground: "CD3131" },

  // symbol (currency, tags, links) - brown
  { token: "symbol.beancount", foreground: "795E26" },

  // number - dark green
  { token: "number.beancount", foreground: "098658" },

  // keyword (directives) - purple/bold
  { token: "keyword.beancount", foreground: "AF00DB", fontStyle: "bold" },

  // operator - black
  { token: "operator.beancount", foreground: "000000" },
];

// Track if language has been registered
let isRegistered = false;

/**
 * Register the Beancount language with Monaco Editor
 * Using patterns from the official VS Code Beancount extension
 */
export function registerBeancountLanguage(monacoInstance: typeof monaco) {
  // Only register once to avoid errors
  if (isRegistered) {
    return;
  }

  const monacoToUse = monacoInstance;

  try {
    // Register the language
    monacoToUse.languages.register({
      id: "beancount",
      extensions: [".bean", ".beancount"],
      aliases: ["Beancount", "beancount"],
    });

    // Set the language configuration
    monacoToUse.languages.setLanguageConfiguration(
      "beancount",
      beancountLanguageConfig,
    );

    // Set the token provider
    monacoToUse.languages.setMonarchTokensProvider(
      "beancount",
      beancountTokenProvider,
    );

    // Define custom theme for Beancount with dark theme
    monacoToUse.editor.defineTheme("beancount-dark", {
      base: "vs-dark",
      inherit: true,
      rules: beancountDarkThemeRules,
      colors: {},
    });

    // Define custom theme for Beancount with light theme
    monacoToUse.editor.defineTheme("beancount-light", {
      base: "vs",
      inherit: true,
      rules: beancountLightThemeRules,
      colors: {},
    });

    // Register folding range provider for org-mode style headers
    // Folds sections that start with *, **, ***, etc.
    monacoToUse.languages.registerFoldingRangeProvider("beancount", {
      provideFoldingRanges: (model) => {
        const ranges: monaco.languages.FoldingRange[] = [];
        const lineCount = model.getLineCount();
        const MAXDEPTH = 100;

        /**
         * Get the header level of a line (number of asterisks at start)
         * Returns MAXDEPTH if not a header line
         */
        function headerLevel(line: string): number {
          const match = /^\*+/.exec(line);
          return match ? match[0].length : MAXDEPTH;
        }

        for (let i = 1; i <= lineCount; i++) {
          const line = model.getLineContent(i);
          const level = headerLevel(line);

          // If this is a header line, find where this section ends
          if (level !== MAXDEPTH) {
            let end = i;

            // Look for the next header at the same or higher level
            for (let j = i + 1; j <= lineCount; j++) {
              const nextLine = model.getLineContent(j);
              const nextLevel = headerLevel(nextLine);

              if (nextLevel <= level) {
                // Found a header at same or higher level, stop here
                break;
              }
              end = j;
            }

            // Only create fold range if there's content to fold
            if (end > i) {
              ranges.push({
                start: i,
                end: end,
                kind: monacoToUse.languages.FoldingRangeKind.Region,
              });
            }
          }
        }

        return ranges;
      },
    });

    isRegistered = true;
  } catch (error) {
    console.error("Error registering Beancount language:", error);
  }
}
