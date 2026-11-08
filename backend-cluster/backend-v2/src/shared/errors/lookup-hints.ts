/**
 * What to do next after a lookup misses, for the resources the MCP category
 * fallback does not fit. That fallback (`mcp-errors.ts`) points a NOT_FOUND at
 * ledgers, files and entry hashes; for a bank connection, a pull request, a
 * commit, a branch or a user it would send an agent to the wrong list.
 *
 * Passed as the third `NotFoundError` argument, so REST and GraphQL carry the
 * same sentence as MCP. Each one names where the id comes from and does not
 * reveal whether the resource exists for someone else.
 */
export const BANK_NOT_FOUND_HINT =
  "Use the `item_id` and `account_id` that `listBankConnections` returns.";

export const PULL_REQUEST_NOT_FOUND_HINT =
  "Pass the number of an existing pull request in this ledger; `beancount://{owner}/{name}/pull-request` reads one by number.";

export const COMMIT_NOT_FOUND_HINT =
  "Pass a commit SHA that `beancount://{owner}/{name}/commits` lists for the branch.";

export const BRANCH_NOT_FOUND_HINT =
  "Check the branch name; `beancount://{owner}/{name}/commits{?branch}` takes an existing branch, and the default is `main`.";

export const USER_NOT_FOUND_HINT =
  "Check the username spelling; it is the owner part of an `owner/name` ledger id.";

export const ARCHIVE_NOT_FOUND_HINT =
  "Name an existing branch, tag or commit with its format, such as `main.zip` or `v1.tar.gz`.";

export const CALLER_ACCOUNT_NOT_FOUND_HINT =
  "The credential's own account no longer exists: sign in again, or use a key from an account that does.";

export const LEDGER_OWNER_NOT_FOUND_HINT =
  "The ledger's owner account no longer exists, so the ledger cannot take this write; `listLedgers` shows the ledgers you can still reach.";

/** A retry after a timed-out import meets this: the first call landed, the second is refused. */
export const ALREADY_IMPORTED_HINT =
  "If this follows an import that timed out, it already landed: confirm with `listLedgerEntries` or `checkLedger` and do not import it again.";
