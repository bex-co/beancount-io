import { CombinedGraphQLErrors } from "@apollo/client/errors";

/** A localized explanation for the ledger's refusal of an entry's new text. */
export interface SingleEntryRefusal {
  key: string;
  params?: Record<string, string>;
}

/**
 * The ledger refuses replacement text that is not exactly one dated directive
 * (w23/036) and new control characters (w21/816), in English that names API
 * fields and calls ("newContent holds 2 entries; … use updateLedgerFiles").
 * Entry Context showed only "information provided is invalid" for them
 * (w2/112). Only the refused keyword and a `U+XXXX` code are interpolated.
 */
const REFUSALS: [RegExp, (match: RegExpExecArray) => SingleEntryRefusal][] = [
  [
    /\bdate line is indented; a dated directive starts at column zero\b/,
    () => ({ key: "journal.entryRefusal.dateIndented" }),
  ],
  [/\bholds no entry;/, () => ({ key: "journal.entryRefusal.useDelete" })],
  [
    /\bis empty; delete the entry\b/,
    () => ({ key: "journal.entryRefusal.useDelete" }),
  ],
  [
    /\bholds \d+ entries; edit them one at a time\b/,
    () => ({ key: "journal.entryRefusal.oneAtATime" }),
  ],
  [
    /\bmust be one dated directive:/,
    () => ({ key: "journal.entryRefusal.indentPostings" }),
  ],
  [
    /`(option|plugin|include)` configures the ledger and is not an entry\b/,
    (match) => ({
      key: "journal.entryRefusal.notAnEntry",
      params: { keyword: match[1] },
    }),
  ],
  [
    /\bcontains the control character (U\+[0-9A-F]{4,6}), which the ledger cannot store as text\b/,
    (match) => ({
      key: "journal.entryRefusal.controlCharacter",
      params: { code: match[1] },
    }),
  ],
];

export function getSingleEntryRefusal(
  error: unknown,
): SingleEntryRefusal | null {
  if (!CombinedGraphQLErrors.is(error)) return null;
  for (const item of error.errors) {
    if (item.extensions?.code !== "BAD_USER_INPUT") continue;
    for (const [pattern, describe] of REFUSALS) {
      const match = pattern.exec(item.message);
      if (match) return describe(match);
    }
  }
  return null;
}
