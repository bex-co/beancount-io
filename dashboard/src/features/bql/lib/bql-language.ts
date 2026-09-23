import type * as monacoType from "monaco-editor";

/**
 * The query editor's own Monaco language. It used to borrow the built-in
 * "sql" language, whose line-comment token is `--` — which BQL rejects — and
 * whose configuration loads lazily, so on a first visit it registered after
 * ours and won. A language nothing else registers has one configuration: ours.
 */
export const BQL_LANGUAGE_ID = "bql";

/**
 * No `lineComment`: with only a block pair, Monaco's Toggle Line Comment falls
 * back to `/* … *\/`, the one comment form the engine accepts.
 */
export const BQL_LANGUAGE_CONFIGURATION: monacoType.languages.LanguageConfiguration =
  {
    comments: {
      blockComment: ["/*", "*/"],
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
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  };

const BQL_MONARCH_LANGUAGE: monacoType.languages.IMonarchLanguage = {
  ignoreCase: true,
  keywords: [
    "select",
    "distinct",
    "from",
    "where",
    "group",
    "by",
    "order",
    "asc",
    "desc",
    "limit",
    "having",
    "pivot",
    "as",
    "and",
    "or",
    "not",
    "in",
    "is",
    "null",
    "true",
    "false",
    "balances",
    "journal",
    "print",
    "at",
    "open",
    "close",
    "clear",
    "on",
  ],
  tokenizer: {
    root: [
      [/\/\*/, "comment", "@comment"],
      [/\d{4}-\d{2}-\d{2}/, "number"],
      [/\d+(?:\.\d+)?/, "number"],
      [/'(?:[^'\\]|\\.)*'/, "string"],
      [/"(?:[^"\\]|\\.)*"/, "string"],
      [/'(?:[^'\\]|\\.)*$/, "string.invalid"],
      [/"(?:[^"\\]|\\.)*$/, "string.invalid"],
      [
        /[A-Za-z_][\w.:-]*/,
        { cases: { "@keywords": "keyword", "@default": "identifier" } },
      ],
      [/[<>=!~]=?|[+\-*/%]/, "operator"],
      [/[,;()[\]{}]/, "delimiter"],
      [/\s+/, "white"],
    ],
    comment: [
      [/[^*]+/, "comment"],
      [/\*\//, "comment", "@pop"],
      [/\*/, "comment"],
    ],
  },
};

/**
 * Register the BQL language and its configuration. The language id is
 * registered once per Monaco instance; the configuration and tokenizer are
 * returned as disposables so a remount replaces them instead of stacking.
 */
export function registerBqlLanguage(
  monaco: typeof monacoType,
): monacoType.IDisposable[] {
  if (
    !monaco.languages
      .getLanguages()
      .some((language) => language.id === BQL_LANGUAGE_ID)
  ) {
    monaco.languages.register({ id: BQL_LANGUAGE_ID });
  }
  return [
    monaco.languages.setLanguageConfiguration(
      BQL_LANGUAGE_ID,
      BQL_LANGUAGE_CONFIGURATION,
    ),
    monaco.languages.setMonarchTokensProvider(
      BQL_LANGUAGE_ID,
      BQL_MONARCH_LANGUAGE,
    ),
  ];
}
