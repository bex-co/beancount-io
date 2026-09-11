export type BqlSnippetRange = {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
};

export type BqlSnippetWord = {
  word: string;
  startColumn: number;
  endColumn: number;
};

export const BQL_QUERY_SNIPPETS = [
  {
    label: "select * from accounts",
    insertText: "select * from accounts",
    documentation: "Select all accounts",
  },
  {
    label: "select * from entries",
    insertText: "select * from entries",
    documentation: "Select all entries",
  },
  {
    label: "select * from transactions",
    insertText: "select * from transactions",
    documentation: "Select all transactions",
  },
  {
    label: "select * from balances",
    insertText: "select * from balances",
    documentation: "Select all balances",
  },
] as const;

/**
 * Whole-query snippets replace the typed word (e.g. `sel` → full SELECT), not
 * insert at the cursor. Suppress them when the line already has other statement
 * text so we do not splice a SELECT into the middle of a query.
 */
export function shouldOfferBqlQuerySnippets(
  lineContent: string,
  word: BqlSnippetWord,
): boolean {
  const before = lineContent.slice(0, word.startColumn - 1);
  const after = lineContent.slice(word.endColumn - 1);
  return before.trim() === "" && after.trim() === "";
}

export function bqlQuerySnippetRange(
  lineNumber: number,
  word: BqlSnippetWord,
): BqlSnippetRange {
  return {
    startLineNumber: lineNumber,
    endLineNumber: lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };
}
