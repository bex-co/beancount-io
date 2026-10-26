import "reflect-metadata";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import {
  sessionIdentity,
  startV1TestServer,
  type V1TestServer,
} from "@/server/rest/__tests__/v1-test-server";

const sync = jest.fn(async (..._args: unknown[]) => ({ success: true }));
const change = jest.fn(async () => ({ success: true }));
const submit = jest.fn(async () => ({ success: true, entries: [] }));
const discard = jest.fn(async (..._args: unknown[]) => ({ success: true }));
const reconcile = jest.fn(async (..._args: unknown[]) => ({ success: true }));
const unlink = jest.fn(async (..._args: unknown[]) => ({ success: true }));
const unsynced = jest.fn(async () => []);
let server: V1TestServer;
const ledger = "/api-gateway/v1/ledgers/alice/main";

beforeAll(async () => {
  server = await startV1TestServer(
    {
      services: {
        plaidSync: {
          syncItemTransactions: sync,
          submitTransactionsToLedger: submit,
          deleteTransactions: discard,
        },
        plaidItem: {
          reconcileItemAccounts: reconcile,
          unlinkItem: unlink,
          refreshItemStatus: change,
          updateAccountMapping: change,
          updateAccountCurrency: change,
          getUnsyncedTransactions: unsynced,
        },
      },
    } as unknown as AppLayers,
    { api: { scopeEnforcement: "enforce" } } as AppConfig,
  );
  server.setIdentity(sessionIdentity);
});
afterAll(async () => server.close());
beforeEach(() => jest.clearAllMocks());

it.each([
  // w23/m9/t002: an omitted flag resolves to false; either spelling, or
  // both agreeing, previews the same way.
  ["", false],
  ["?dry_run=false", false],
  ["?dry_run=true", true],
  ["?dryRun=false", false],
  ["?dryRun=true", true],
  ["?dry_run=true&dryRun=true", true],
])(
  "parses the sync preview query %s without truthiness coercion",
  async (query, expected) => {
    const response = await fetch(
      `${server.url}${ledger}/banks/item/sync${query}`,
      {
        method: "POST",
      },
    );
    expect(response.status).toBe(200);
    expect(sync).toHaveBeenCalledTimes(1);
    expect(sync.mock.calls[0]?.at(-1)).toBe(expected);
  },
);

it.each(["dry_run=true&dryRun=false", "dry_run=false&dryRun=true"])(
  "refuses a split preview query %s instead of guessing",
  async (query) => {
    const response = await fetch(
      `${server.url}${ledger}/banks/item/sync?${query}`,
      {
        method: "POST",
      },
    );
    expect(response.status).toBe(400);
    expect(sync).not.toHaveBeenCalled();
  },
);

// w23/m9/t007: every preview route resolves the twin, not just sync —
// each handler carries its own resolve call.
it.each([
  {
    name: "submit",
    method: "POST",
    path: "/bank-transactions/submit",
    body: {
      transactions: [{ transactionId: "ptxn_1", targetAccount: "Assets:Cash" }],
    },
    service: () => submit,
  },
  {
    name: "discard",
    method: "DELETE",
    path: "/bank-transactions",
    body: { transactionIds: ["ptxn_1"] },
    service: () => discard,
  },
  {
    name: "reconcile",
    method: "POST",
    path: "/banks/item/reconcile",
    body: undefined,
    service: () => reconcile,
  },
  {
    name: "unlink",
    method: "DELETE",
    path: "/banks/item",
    body: undefined,
    service: () => unlink,
  },
])(
  "resolves the dryRun twin on the $name route",
  async ({ path, method, body, service }) => {
    const response = await fetch(`${server.url}${ledger}${path}?dryRun=true`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    expect(response.status).toBe(200);
    const mock = service();
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock.mock.calls[0]?.at(-1)).toBe(true);
  },
);

it.each(["0", "1", "yes", "", "true&dry_run=false"])(
  "refuses malformed preview value %s before invoking sync",
  async (value) => {
    const response = await fetch(
      `${server.url}${ledger}/banks/item/sync?dry_run=${value}`,
      {
        method: "POST",
      },
    );
    expect(response.status).toBe(400);
    expect(sync).not.toHaveBeenCalled();
  },
);

describe.each([
  { method: "POST", path: "/banks/item/refresh", body: {} },
  {
    method: "PUT",
    path: "/bank-accounts/account/mapping",
    body: { ledgerAccount: "Assets:Checking" },
  },
  {
    method: "PUT",
    path: "/bank-accounts/account/currency",
    body: { currency: "USD" },
  },
])("$path without a preview contract", ({ method, path, body }) => {
  it.each(["query", "body"])(
    "rejects a preview in the %s before any write",
    async (location) => {
      // w23/m9/t002: both flag spellings are rejected when true.
      const queries =
        location === "query" ? ["?dry_run=true", "?dryRun=true"] : [""];
      for (const query of queries) {
        const response = await fetch(`${server.url}${ledger}${path}${query}`, {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            location === "body" ? { ...body, dry_run: true } : body,
          ),
        });
        expect(response.status).toBe(400);
        expect(change).not.toHaveBeenCalled();
      }
    },
  );

  it.each([
    "",
    "?dry_run=false",
    "?dryRun=false",
    "?dry_run=false&dryRun=false",
  ])("still executes with query %s", async (query) => {
    const response = await fetch(`${server.url}${ledger}${path}${query}`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(200);
    expect(change).toHaveBeenCalledTimes(1);
  });
});

// w23/m8/t005: REST takes the camelCase spelling only — the snake_case
// aliases are MCP-only (docs/mcp.md bank import workflow). Strict bodies
// refuse the snake keys; the lenient account query drops them (see below).
// Each case first proves the camelCase call works, so the snake case cannot
// pass vacuously.
describe("REST bank spelling", () => {
  it("refuses a snake_case mapping body", async () => {
    const ok = await fetch(
      `${server.url}${ledger}/bank-accounts/account/mapping`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ledgerAccount: "Assets:Checking" }),
      },
    );
    expect(ok.status).toBe(200);
    expect(change).toHaveBeenCalledTimes(1);
    const refused = await fetch(
      `${server.url}${ledger}/bank-accounts/account/mapping`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ledger_account: "Assets:Checking" }),
      },
    );
    expect(refused.status).toBe(400);
    expect(change).toHaveBeenCalledTimes(1);
  });

  it("refuses snake_case submit items", async () => {
    const ok = await fetch(`${server.url}${ledger}/bank-transactions/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        transactions: [{ transactionId: "t1", targetAccount: "Expenses:Food" }],
      }),
    });
    expect(ok.status).toBe(200);
    expect(submit).toHaveBeenCalledTimes(1);
    const refused = await fetch(
      `${server.url}${ledger}/bank-transactions/submit`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transactions: [
            { transaction_id: "t1", target_account: "Expenses:Food" },
          ],
        }),
      },
    );
    expect(refused.status).toBe(400);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  // Unlike the strict bodies above, the account query is lenient: an
  // unknown key is dropped and the call runs unfiltered. MCP strictifies
  // this same schema, so only REST behaves this way (follow-up note).
  // w23/112: the query schema is strict now — a mistyped filter key is
  // refused instead of silently returning the unfiltered list.
  it("refuses a snake_case staged query instead of ignoring it", async () => {
    const ok = await fetch(
      `${server.url}${ledger}/bank-transactions/unsynced?accountId=acc_1`,
    );
    expect(ok.status).toBe(200);
    expect(unsynced).toHaveBeenLastCalledWith(
      expect.anything(),
      "acc_1",
      expect.anything(),
    );
    const refused = await fetch(
      `${server.url}${ledger}/bank-transactions/unsynced?account_id=acc_1`,
    );
    expect(refused.status).toBe(400);
    expect(await refused.json()).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: expect.stringContaining("account_id"),
      },
    });
    expect(unsynced).toHaveBeenCalledTimes(1);
  });
});
