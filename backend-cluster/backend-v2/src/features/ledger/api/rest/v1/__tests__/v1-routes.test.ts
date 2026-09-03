import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { ForbiddenError } from "@/shared/errors";
import {
  readOnlyToken,
  pinnedReadToken,
  scopelessToken,
  sessionIdentity,
  startV1TestServer,
  writeToken,
  type V1TestServer,
} from "@/server/rest/__tests__/v1-test-server";

/**
 * The v1 surface's behaviour and its failure modes.
 *
 * Happy paths are the cheap half. What matters more is that every endpoint
 * refuses correctly — no caller, wrong scope, malformed input — because those
 * are the paths a published API gets probed on, and the ones no client
 * exercises for us.
 */

const services = {
  ledgerShell: {
    queryShell: jest.fn(async () => ({
      resultType: "table",
      table: {
        types: [{ name: "account", dtype: "str" }],
        rows: [["Assets:Cash"]],
        t: "t",
      },
    })),
    queryShellText: jest.fn(async () => ({ text: "Assets:Cash  10.00 USD" })),
  },
  ledgerJournal: { getJournal: jest.fn(async () => ({ entries: [] })) },
  ledgerAccount: { getAccounts: jest.fn(async () => ["Assets:Cash"]) },
  ledgerFinance: {
    getBalanceSheet: jest.fn(async () => ({ statement: "balance-sheet" })),
    getIncomeStatement: jest.fn(async () => ({
      statement: "income-statement",
    })),
  },
  ledgerRepo: {
    listDirContent: jest.fn(async () => [
      { path: "main.bean", name: "main.bean", type: "file" },
    ]),
    getFilesContent: jest.fn(async () => [
      { path: "main.bean", content: "; ledger", sha: "sha123" },
    ]),
    changeFiles: jest.fn(async () => undefined),
  },
  ledgerEntry: { addBulkEntries: jest.fn(async () => ({ success: true })) },
};

const workflows = {
  ledger: {
    listLedgers: jest.fn(async () => [{ id: "alice/main" }]),
    getLedger: jest.fn(async () => ({ id: "alice/main" })),
  },
};

const layers = {
  database: { db: undefined, models: {} },
  clients: {},
  services,
  workflows,
} as unknown as AppLayers;

const config = {
  env: "test",
  api: { scopeEnforcement: "shadow" },
  jwt: { secret: "test-secret" },
  favaApi: { baseUrl: "http://ledger.invalid" },
} as unknown as AppConfig;

let server: V1TestServer;

const LEDGER = "/api-gateway/v1/ledgers/alice/main";

async function call(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const response = await fetch(`${server.url}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: response.status, body: parsed as never, text };
}

beforeAll(async () => {
  server = await startV1TestServer(layers, config);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  server.setIdentity(sessionIdentity);
  jest.clearAllMocks();
});

describe("v1 authentication and scope", () => {
  it("refuses an anonymous caller with 401", async () => {
    server.setIdentity(undefined);
    const { status, body } = await call("GET", "/api-gateway/v1/ledgers");
    expect(status).toBe(401);
    expect(body).toMatchObject({
      ok: false,
      error: { code: "UNAUTHENTICATED" },
    });
  });

  it("translates a catalog denial from the protected workflow", async () => {
    server.setIdentity(scopelessToken);
    workflows.ledger.listLedgers.mockRejectedValueOnce(
      new ForbiddenError("requires ledger.read"),
    );
    const { status, body } = await call("GET", "/api-gateway/v1/ledgers");
    expect(status).toBe(403);
    expect(body).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(workflows.ledger.listLedgers).toHaveBeenCalledWith({
      identity: scopelessToken,
      args: {},
    });
  });

  it("refuses a read-only token on a write op", async () => {
    server.setIdentity(readOnlyToken);
    services.ledgerEntry.addBulkEntries.mockRejectedValueOnce(
      new ForbiddenError("requires ledger.write"),
    );
    const { status } = await call("POST", `${LEDGER}/entries`, {
      entries: [
        {
          type: "open",
          entry: {
            date: "2026-01-01",
            account: "Assets:Cash",
            currencies: ["USD"],
          },
        },
      ],
    });
    expect(status).toBe(403);
    expect(services.ledgerEntry.addBulkEntries).toHaveBeenCalled();
  });

  it("admits a write token on a write op", async () => {
    server.setIdentity(writeToken);
    const { status } = await call("POST", `${LEDGER}/entries`, {
      entries: [
        {
          type: "open",
          entry: {
            date: "2026-01-01",
            account: "Assets:Cash",
            currencies: ["USD"],
          },
        },
      ],
    });
    expect(status).toBe(200);
    expect(services.ledgerEntry.addBulkEntries).toHaveBeenCalled();
  });

  it("admits a read token on a read op", async () => {
    server.setIdentity(readOnlyToken);
    const { status } = await call("GET", `${LEDGER}/accounts`);
    expect(status).toBe(200);
  });

  it("refuses a ledger-pinned token on a different ledger before the handler", async () => {
    server.setIdentity(pinnedReadToken);
    const { status } = await call(
      "GET",
      "/api-gateway/v1/ledgers/alice/other",
    );
    expect(status).toBe(403);
    expect(workflows.ledger.getLedger).not.toHaveBeenCalled();
  });

  it("limits ledger listing to the credential's pinned ledger", async () => {
    server.setIdentity(pinnedReadToken);
    const { status, body } = await call("GET", "/api-gateway/v1/ledgers");
    expect(status).toBe(200);
    expect(body).toEqual([{ id: "alice/main" }]);
    expect(workflows.ledger.getLedger).toHaveBeenCalledWith({
      ledgerId: "alice/main",
      identity: pinnedReadToken,
    });
    expect(workflows.ledger.listLedgers).not.toHaveBeenCalled();
  });
});

describe("v1 request validation", () => {
  it("rejects a body that does not match the published schema", async () => {
    const { status, body } = await call("POST", `${LEDGER}/entries`, {
      entries: [{ type: "open", entry: { date: "not-a-date", account: "A" } }],
    });
    expect(status).toBe(400);
    expect(body).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_FAILED" },
    });
    expect(services.ledgerEntry.addBulkEntries).not.toHaveBeenCalled();
  });

  it("rejects an out-of-range query parameter", async () => {
    const { status, body } = await call(
      "GET",
      "/api-gateway/v1/ledgers?limit=0",
    );
    expect(status).toBe(400);
    expect(body).toMatchObject({ error: { code: "VALIDATION_FAILED" } });
  });

  it("rejects an unknown statement name", async () => {
    const { status } = await call("GET", `${LEDGER}/statements/cash-flow`);
    expect(status).toBe(400);
  });

  it("rejects an empty BQL query", async () => {
    const { status } = await call("POST", `${LEDGER}/query`, { query: "" });
    expect(status).toBe(400);
    expect(services.ledgerShell.queryShell).not.toHaveBeenCalled();
  });
});

describe("v1 reads", () => {
  it("lists ledgers", async () => {
    const { status, body } = await call(
      "GET",
      "/api-gateway/v1/ledgers?page=1&limit=20",
    );
    expect(status).toBe(200);
    expect(body).toEqual([{ id: "alice/main" }]);
    expect(workflows.ledger.listLedgers).toHaveBeenCalledWith({
      identity: sessionIdentity,
      args: { page: 1, limit: 20 },
    });
  });

  it("addresses one ledger by owner and name, never by an encoded id", async () => {
    const { status } = await call("GET", LEDGER);
    expect(status).toBe(200);
    expect(workflows.ledger.getLedger).toHaveBeenCalledWith({
      ledgerId: "alice/main",
      identity: sessionIdentity,
    });
  });

  it("returns the BQL table by default", async () => {
    const { status, body } = await call("POST", `${LEDGER}/query`, {
      query: "SELECT account",
    });
    expect(status).toBe(200);
    expect(body).toMatchObject({ resultType: "table" });
    expect(services.ledgerShell.queryShellText).not.toHaveBeenCalled();
  });

  it("returns shell text when the caller asks for text/plain", async () => {
    const { status, text } = await call(
      "POST",
      `${LEDGER}/query`,
      { query: "SELECT account" },
      { accept: "text/plain" },
    );
    expect(status).toBe(200);
    expect(text).toBe("Assets:Cash  10.00 USD");
    expect(services.ledgerShell.queryShell).not.toHaveBeenCalled();
  });

  it("passes journal narrowing through to the service", async () => {
    const { status } = await call(
      "GET",
      `${LEDGER}/journal?account=Assets:Cash&limit=10`,
    );
    expect(status).toBe(200);
    expect(services.ledgerJournal.getJournal).toHaveBeenCalledWith({
      ledgerId: "alice/main",
      identity: expect.objectContaining({ userId: "usr_session" }),
      query: { account: "Assets:Cash", limit: 10 },
    });
  });

  it("serves both statements from one route", async () => {
    await call("GET", `${LEDGER}/statements/balance-sheet`);
    await call("GET", `${LEDGER}/statements/income-statement`);
    expect(services.ledgerFinance.getBalanceSheet).toHaveBeenCalledTimes(1);
    expect(services.ledgerFinance.getIncomeStatement).toHaveBeenCalledTimes(1);
  });
});

describe("v1 files", () => {
  it("lists a directory", async () => {
    const { status, body } = await call("GET", `${LEDGER}/files?dir=2026`);
    expect(status).toBe(200);
    expect(body).toEqual([
      { path: "main.bean", name: "main.bean", type: "file" },
    ]);
    expect(services.ledgerRepo.listDirContent).toHaveBeenCalledWith(
      expect.objectContaining({ ledgerId: "alice/main", dirPath: "2026" }),
    );
  });

  it("reads a nested file path with slashes intact", async () => {
    const { status, body } = await call(
      "GET",
      `${LEDGER}/files/2026/january.bean`,
    );
    expect(status).toBe(200);
    expect(body).toMatchObject({ sha: "sha123" });
    expect(services.ledgerRepo.getFilesContent).toHaveBeenCalledWith(
      expect.objectContaining({ paths: ["2026/january.bean"] }),
    );
  });

  it("404s a file the ledger does not have", async () => {
    services.ledgerRepo.getFilesContent.mockResolvedValueOnce([]);
    const { status, body } = await call("GET", `${LEDGER}/files/missing.bean`);
    expect(status).toBe(404);
    expect(body).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  it("creates a file when no sha is supplied and updates when one is", async () => {
    server.setIdentity(writeToken);
    await call("PUT", `${LEDGER}/files/2026/january.bean`, {
      content: "; new",
    });
    await call("PUT", `${LEDGER}/files/2026/january.bean`, {
      content: "; edited",
      sha: "sha123",
    });
    const calls = services.ledgerRepo.changeFiles.mock
      .calls as unknown as Array<
      [{ operations: Array<Record<string, unknown>> }]
    >;
    expect(calls[0][0].operations[0]).toMatchObject({ operation: "create" });
    expect(calls[1][0].operations[0]).toMatchObject({
      operation: "update",
      sha: "sha123",
    });
  });

  it("deletes a file", async () => {
    server.setIdentity(writeToken);
    const { status } = await call("DELETE", `${LEDGER}/files/old.bean`, {});
    expect(status).toBe(200);
    expect(services.ledgerRepo.changeFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: [expect.objectContaining({ operation: "delete" })],
      }),
    );
  });

  it("refuses a file write from a read-only token", async () => {
    server.setIdentity(readOnlyToken);
    services.ledgerRepo.changeFiles.mockRejectedValueOnce(
      new ForbiddenError("requires ledger.write"),
    );
    const { status } = await call("PUT", `${LEDGER}/files/a.bean`, {
      content: "x",
    });
    expect(status).toBe(403);
    expect(services.ledgerRepo.changeFiles).toHaveBeenCalled();
  });
});
