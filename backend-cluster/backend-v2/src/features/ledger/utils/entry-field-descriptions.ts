/**
 * One sentence per structured-entry field (w23/m6/t004). REST publishes
 * these through the zod schemas' OpenAPI descriptions (which MCP inherits
 * with the shared schema) and GraphQL through the matching `@Field`
 * descriptions, so all three surfaces document the same contract.
 */
export const POSTING_COST_DESCRIPTION =
  "Lot basis `{number currency [, date] [, label]}`; needs units like price";

export const POSTING_PRICE_DESCRIPTION =
  "Per-unit price (`@` annotation); exclusive with the total price";

export const POSTING_TOTAL_PRICE_DESCRIPTION =
  "Total price (`@@`); exclusive with the per-unit price";

export const POSTING_TAGS_DESCRIPTION =
  "Refused: beancount postings have no tag slot; put tags on the transaction instead";

export const POSTING_LINKS_DESCRIPTION =
  "Refused: beancount postings have no link slot; put links on the transaction instead";

export const POSTING_META_DESCRIPTION =
  "Posting metadata, written beneath the posting";

/** The `meta` of every directive but a posting (w23/m43); the same words on each surface. */
export const DIRECTIVE_META_DESCRIPTION =
  "Metadata written beneath the directive; every value is a string, written quoted as given";

/** The `unchanged` flag of an entry edit's result (w23/m43); the same words on each surface. */
export const UNCHANGED_EDIT_DESCRIPTION =
  "True when the edit leaves the entry's text as it was: nothing was written and no commit was made.";

export const OPEN_BOOKING_DESCRIPTION = "Booking method for the account";

export const BALANCE_TOLERANCE_DESCRIPTION =
  "Explicit balance tolerance as a plain decimal";

export const PAD_SOURCE_DESCRIPTION = "Account to pad from";
