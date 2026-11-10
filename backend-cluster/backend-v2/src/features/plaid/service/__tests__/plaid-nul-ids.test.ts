import "reflect-metadata";

jest.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

import { PlaidItemService } from "../plaid-item-service";
import { PlaidSyncService } from "../plaid-sync-service";
import { systemIdentity } from "@/server/api/identity";
import { BadUserInputError } from "@/shared/errors";

/**
 * w23/218 — a NUL byte in a bank id is the caller's mistake. Postgres and the
 * policy evaluator cannot hold U+0000 and answered 500 / "Authorization
 * relationship source unavailable". Every dependency here fails the test if it
 * is reached, so a pass also proves the refusal happens before any lookup.
 */
const untouchable = (name: string) =>
  new Proxy(
    {},
    {
      get: () => () => {
        throw new Error(`${name} must not be reached for a NUL id`);
      },
    },
  );

const authorization = { authorizeOrThrow: jest.fn() };
const models = {
  plaidItem: untouchable("plaidItem"),
  plaidAccount: untouchable("plaidAccount"),
  plaidTransaction: untouchable("plaidTransaction"),
  user: untouchable("user"),
  plaidSyncLog: untouchable("plaidSyncLog"),
};
const identity = systemIdentity("usr_1");
const NUL = "a\u0000b";
const LEDGER = "alice/main";

const item = new PlaidItemService(
  untouchable("plaidClient") as never,
  untouchable("fava") as never,
  models as never,
  {} as never,
  authorization as never,
);
const sync = new PlaidSyncService(
  untouchable("plaidClient") as never,
  untouchable("fava") as never,
  models as never,
  {} as never,
  authorization as never,
);

async function refusal(call: () => Promise<unknown>) {
  const error = await call().then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(BadUserInputError);
  return error as BadUserInputError;
}

const callsWith = (BAD: string) =>
  [
    ["getItem", () => item.getItem(identity, BAD, LEDGER), "itemId"],
    ["getItem without a ledger", () => item.getItem(identity, BAD), "itemId"],
    ["getAccounts", () => item.getAccounts(identity, BAD, LEDGER), "itemId"],
    [
      "getUnsyncedTransactions",
      () => item.getUnsyncedTransactions(identity, BAD, LEDGER),
      "accountId",
    ],
    [
      "suggestCategories",
      () => item.suggestCategories(identity, LEDGER, BAD),
      "accountId",
    ],
    [
      "updateAccountMapping",
      () => item.updateAccountMapping(identity, BAD, "Assets:Cash", LEDGER),
      "accountId",
    ],
    [
      "updateAccountCurrency",
      () => item.updateAccountCurrency(identity, BAD, "USD", LEDGER),
      "accountId",
    ],
    [
      "refreshItemStatus",
      () => item.refreshItemStatus(identity, BAD, LEDGER),
      "itemId",
    ],
    ["unlinkItem", () => item.unlinkItem(identity, BAD, LEDGER), "itemId"],
    [
      "suggestAccountMapping",
      () => item.suggestAccountMapping(identity, LEDGER, BAD),
      "itemId",
    ],
    [
      "syncItemTransactions",
      () => sync.syncItemTransactions(identity, BAD, "manual", LEDGER),
      "itemId",
    ],
    [
      "getUnsyncedTransactionsForCategorization",
      () => sync.getUnsyncedTransactionsForCategorization(identity, BAD),
      "accountId",
    ],
    [
      "deleteTransactions",
      () => sync.deleteTransactions(identity, LEDGER, ["ok", BAD]),
      "transactionIds",
    ],
    [
      "submitTransactionsToLedger",
      () =>
        sync.submitTransactionsToLedger(identity, "alice", "main", [
          { transactionId: BAD, targetAccount: "Expenses:Food" },
        ]),
      "transactionIds",
    ],
  ] as const;

describe.each([
  ["a NUL byte", NUL, "NUL"],
  // w1/189: an empty id was authorized as the ledger-level bank resource.
  ["an empty id", "", "must not be empty"],
  ["a blank id", "  ", "must not be empty"],
])("%s in a bank id is BAD_USER_INPUT (w23/218)", (_kind, bad, says) => {
  beforeEach(() => authorization.authorizeOrThrow.mockClear());

  afterEach(() =>
    expect(authorization.authorizeOrThrow).not.toHaveBeenCalled(),
  );

  // The two reads take accountId as an optional filter, where an empty value
  // already means "no filter" — the dashboard sends one — so only a NUL or a
  // blank id is refused there.
  const optionalFilters = ["getUnsyncedTransactions", "suggestCategories"];
  const calls = callsWith(bad).filter(
    ([name]) => bad !== "" || !optionalFilters.includes(name),
  );
  it.each(calls)("%s names %s", async (_name, call, field) => {
    const error = await refusal(call);
    expect(error.message).toContain(field);
    expect(error.message).toContain(says);
  });
});
