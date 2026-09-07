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
let server: V1TestServer;
const ledger = "/api-gateway/v1/ledgers/alice/main";

beforeAll(async () => {
  server = await startV1TestServer(
    {
      services: {
        plaidSync: { syncItemTransactions: sync },
        plaidItem: {
          refreshItemStatus: change,
          updateAccountMapping: change,
          updateAccountCurrency: change,
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
  ["", undefined],
  ["?dry_run=false", false],
  ["?dry_run=true", true],
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
      const response = await fetch(
        `${server.url}${ledger}${path}${location === "query" ? "?dry_run=true" : ""}`,
        {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            location === "body" ? { ...body, dry_run: true } : body,
          ),
        },
      );
      expect(response.status).toBe(400);
      expect(change).not.toHaveBeenCalled();
    },
  );

  it.each(["", "?dry_run=false"])(
    "still executes with query %s",
    async (query) => {
      const response = await fetch(`${server.url}${ledger}${path}${query}`, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(200);
      expect(change).toHaveBeenCalledTimes(1);
    },
  );
});
