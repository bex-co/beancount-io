// Match the absolute end, including trailing newlines that `$` alone permits.
// Existing Gitea usernames may contain dots and uppercase letters.
export const LEDGER_OWNER_PATTERN = /^(?!\.{1,2}$)[A-Za-z0-9_.-]+(?![\s\S])/;
export const LEDGER_NAME_PATTERN = /^[a-z0-9_-]{1,100}(?![\s\S])/;
export const LEDGER_OWNER_RULE =
  "Owner slug must contain only letters, digits, dots, underscores, or hyphens and cannot be . or ..";
export const LEDGER_NAME_RULE =
  "Ledger name slug must contain 1-100 lowercase letters, digits, underscores, or hyphens";
