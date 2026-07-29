import type * as monaco from "monaco-editor";

/**
 * Beancount language configuration for Monaco Editor
 * Based on the Prism.js language definition from beancount-cms
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

  keywords: [
    "include",
    "plugin",
    "pushtag",
    "option",
    "commodity",
    "balance",
    "open",
    "close",
    "pad",
    "note",
    "document",
    "price",
    "event",
    "query",
    "custom",
  ],

  accountRoots: ["Assets", "Liabilities", "Equity", "Income", "Expenses"],

  operators: ["+", "-", "*", "/", "="],

  // The main tokenizer
  tokenizer: {
    root: [
      // Comments
      [/;.*$/, "comment"],

      // Date at line start (YYYY-MM-DD)
      [/^\d{4}-\d{2}-\d{2}/, "constant"],

      // Keywords (directives)
      [
        /\b(include|plugin|pushtag|option|commodity|balance|open|close|pad|note|document|price|event|query|custom)\b/,
        "keyword",
      ],

      // Account roots
      [
        /\b(Assets|Liabilities|Equity|Income|Expenses)\b(?=:)/,
        "constant.language",
      ],

      // Full account names (hierarchical)
      [
        /\b(Assets|Liabilities|Equity|Income|Expenses)(?::[A-Z0-9][A-Za-z0-9_-]*)+\b/,
        "variable",
      ],

      // Strings
      [/"([^"\\]|\\.)*$/, "string.invalid"], // incomplete string
      [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],

      // Tags (#something)
      [/#[A-Za-z0-9_-]+/, "type"],

      // Links (^something)
      [/\^[A-Za-z0-9_-]+/, "type"],

      // Currency codes (uppercase identifiers)
      [/\b[A-Z][A-Z0-9_'.-]*\b/, "type.identifier"],

      // Numbers (with optional commas and decimals)
      [/[+-]?[0-9]+(?:,[0-9]{3})*(?:\.[0-9]*)?/, "number"],

      // Operators
      [/[+\-*/=]/, "operator"],

      // Whitespace
      { include: "@whitespace" },
    ],

    string: [
      [/[^\\"]+/, "string"],
      [/\\./, "string.escape"],
      [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
    ],

    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/;.*$/, "comment"],
    ],
  },
};

/**
 * Dark theme colors for Beancount
 */
const beancountDarkThemeRules: monaco.editor.ITokenThemeRule[] = [
  { token: "comment.beancount", foreground: "6A9955", fontStyle: "italic" },
  { token: "keyword.beancount", foreground: "C586C0", fontStyle: "bold" },
  { token: "constant.beancount", foreground: "4FC1FF" },
  { token: "constant.language.beancount", foreground: "4EC9B0" },
  { token: "variable.beancount", foreground: "9CDCFE" },
  { token: "string.beancount", foreground: "CE9178" },
  { token: "string.quote.beancount", foreground: "CE9178" },
  { token: "string.escape.beancount", foreground: "D7BA7D" },
  { token: "string.invalid.beancount", foreground: "F44747" },
  { token: "type.beancount", foreground: "4EC9B0" },
  { token: "type.identifier.beancount", foreground: "DCDCAA" },
  { token: "number.beancount", foreground: "B5CEA8" },
  { token: "operator.beancount", foreground: "D4D4D4" },
];

/**
 * Light theme colors for Beancount
 */
const beancountLightThemeRules: monaco.editor.ITokenThemeRule[] = [
  { token: "comment.beancount", foreground: "008000", fontStyle: "italic" }, // Green
  { token: "keyword.beancount", foreground: "AF00DB", fontStyle: "bold" }, // Purple
  { token: "constant.beancount", foreground: "0000FF" }, // Blue (dates)
  { token: "constant.language.beancount", foreground: "267F99" }, // Dark teal (account roots)
  { token: "variable.beancount", foreground: "001080" }, // Dark blue (full account names)
  { token: "string.beancount", foreground: "A31515" }, // Dark red
  { token: "string.quote.beancount", foreground: "A31515" }, // Dark red
  { token: "string.escape.beancount", foreground: "EE0000" }, // Red
  { token: "string.invalid.beancount", foreground: "CD3131" }, // Red
  { token: "type.beancount", foreground: "267F99" }, // Dark teal (tags, links)
  { token: "type.identifier.beancount", foreground: "795E26" }, // Brown (currency codes)
  { token: "number.beancount", foreground: "098658" }, // Dark green
  { token: "operator.beancount", foreground: "000000" }, // Black
];

// Track if language has been registered
let isRegistered = false;

/**
 * Register the Beancount language with Monaco Editor
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

    isRegistered = true;
  } catch (error) {
    console.error("Error registering Beancount language:", error);
  }
}
