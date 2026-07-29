import { z } from "zod";

export const OPEN_ACCOUNT_ACTION = "open-account" as const;
export const NEW_ENTRY_ACTION = "new-entry" as const;

export const JOURNAL_DIRECTIVE_ACTIONS = [
  "transaction",
  "balance",
  "note",
  "account",
] as const;

export type JournalDirectiveAction = (typeof JOURNAL_DIRECTIVE_ACTIONS)[number];

export interface AccountsActionSearch {
  action?: typeof OPEN_ACCOUNT_ACTION;
}

export interface JournalActionSearch {
  account?: string;
  filter?: string;
  time?: string;
  action?: typeof NEW_ENTRY_ACTION;
  directive?: JournalDirectiveAction;
}

export const OPEN_ACCOUNT_ACTION_SEARCH = {
  action: OPEN_ACCOUNT_ACTION,
} satisfies AccountsActionSearch;

export const NEW_TRANSACTION_ACTION_SEARCH = {
  action: NEW_ENTRY_ACTION,
  directive: "transaction",
} satisfies JournalActionSearch;

export function isJournalDirectiveAction(
  value: unknown,
): value is JournalDirectiveAction {
  return JOURNAL_DIRECTIVE_ACTIONS.some((directive) => directive === value);
}

export const accountsActionSearchSchema = z
  .object({ action: z.unknown().optional() })
  .transform(
    ({ action }): AccountsActionSearch =>
      action === OPEN_ACCOUNT_ACTION ? { action } : {},
  );

export const journalActionSearchSchema = z
  .object({
    account: z.string().optional().catch(undefined),
    filter: z.string().optional().catch(undefined),
    time: z.string().optional().catch(undefined),
    action: z.unknown().optional(),
    directive: z.unknown().optional(),
  })
  .transform((raw): JournalActionSearch => {
    const search: JournalActionSearch = {};

    if (raw.account) search.account = raw.account;
    if (raw.filter) search.filter = raw.filter;
    if (raw.time) search.time = raw.time;

    if (
      raw.action === NEW_ENTRY_ACTION &&
      (raw.directive === undefined || isJournalDirectiveAction(raw.directive))
    ) {
      search.action = NEW_ENTRY_ACTION;
      if (isJournalDirectiveAction(raw.directive)) {
        search.directive = raw.directive;
      }
    }

    return search;
  });
