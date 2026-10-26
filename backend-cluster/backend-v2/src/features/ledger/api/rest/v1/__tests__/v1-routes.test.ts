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
    getLedgerMetadata: jest.fn(async () => ({ id: "alice/main" })),
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

  it("lets the protected workflow's PDP enforce the ledger pin", async () => {
    server.setIdentity(pinnedReadToken);
    workflows.ledger.getLedgerMetadata.mockRejectedValueOnce(
      new ForbiddenError("credential is pinned to alice/main"),
    );
    const { status } = await call("GET", "/api-gateway/v1/ledgers/alice/other");
    expect(status).toBe(403);
    expect(workflows.ledger.getLedgerMetadata).toHaveBeenCalledWith({
      ledgerId: "alice/other",
      identity: pinnedReadToken,
    });
  });

  it("passes the ledger pin to the shared listing workflow", async () => {
    server.setIdentity(pinnedReadToken);
    const { status, body } = await call("GET", "/api-gateway/v1/ledgers");
    expect(status).toBe(200);
    expect(body).toEqual([{ id: "alice/main" }]);
    expect(workflows.ledger.listLedgers).toHaveBeenCalledWith({
      identity: pinnedReadToken,
      args: { page: undefined, limit: undefined },
    });
    expect(workflows.ledger.getLedgerMetadata).not.toHaveBeenCalled();
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
    expect(workflows.ledger.getLedgerMetadata).toHaveBeenCalledWith({
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

  // w21/553: REST committed "Update <path>" for a create and refused an empty
  // message, where GraphQL committed "Create <path>" and took "" as omitted.
  it("commits Create <path> for a new file and Update <path> for a replacement, and reads an empty message as omitted", async () => {
    server.setIdentity(writeToken);
    const messageOf = (index: number) =>
      (
        services.ledgerRepo.changeFiles.mock.calls as unknown as Array<
          [{ message: string }]
        >
      )[index][0].message;
    const before = services.ledgerRepo.changeFiles.mock.calls.length;
    await call("PUT", `${LEDGER}/files/new.bean`, { content: "; new" });
    await call("PUT", `${LEDGER}/files/new.bean`, {
      content: "; new",
      message: "",
    });
    await call("PUT", `${LEDGER}/files/new.bean`, {
      content: "; edited",
      sha: "sha123",
    });
    await call("PUT", `${LEDGER}/files/new.bean`, {
      content: "; edited",
      sha: "sha123",
      message: "Tidy",
    });
    expect(messageOf(before)).toBe("Create new.bean");
    expect(messageOf(before + 1)).toBe("Create new.bean");
    expect(messageOf(before + 2)).toBe("Update new.bean");
    expect(messageOf(before + 3)).toBe("Tidy");
    const { status } = await call("DELETE", `${LEDGER}/files/new.bean`, {
      message: "",
    });
    expect(status).toBe(200);
    expect(messageOf(before + 4)).toBe("Delete new.bean");
  });

  it("hands the service the caller's UTF-8 text, not an encoding of it (w2/011)", async () => {
    // The bug this pins: the handler forwarded `body.content` verbatim while
    // the service passed it straight to the ledger service, which hands it to
    // Gitea as base64 — so every REST file write failed with "illegal base64
    // data" while the MCP edit tool, which encoded first, worked. The encoding
    // is the service's business; the handler's job is to pass the text along.
    server.setIdentity(writeToken);
    const text = '2026-06-01 * "Caf\u00e9" "au lait"\n';
    await call("PUT", `${LEDGER}/files/main.bean`, { content: text });
    expect(services.ledgerRepo.changeFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: [expect.objectContaining({ content: text })],
      }),
    );
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

  // w23/m3/t002: REST spells the commit message `message`, but the MCP file
  // tools spell it `description` — both work on writes and deletes, while
  // two different texts refuse.
  it.each([
    ["PUT", { content: "; new" }],
    ["DELETE", {}],
  ])(
    "accepts description as the commit message on %s",
    async (method, body) => {
      server.setIdentity(writeToken);
      const before = services.ledgerRepo.changeFiles.mock.calls.length;
      const { status } = await call(method, `${LEDGER}/files/new.bean`, {
        ...body,
        description: "Aliased edit",
      });
      expect(status).toBe(200);
      expect(
        (
          services.ledgerRepo.changeFiles.mock.calls as unknown as Array<
            [{ message: string }]
          >
        )[before][0].message,
      ).toBe("Aliased edit");
    },
  );

  it("refuses conflicting description and message on a file write", async () => {
    server.setIdentity(writeToken);
    const before = services.ledgerRepo.changeFiles.mock.calls.length;
    const { status, body } = await call("PUT", `${LEDGER}/files/new.bean`, {
      content: "; new",
      message: "One text",
      description: "Another text",
    });
    expect(status).toBe(400);
    expect(body).toMatchObject({ error: { code: "BAD_USER_INPUT" } });
    expect(services.ledgerRepo.changeFiles.mock.calls.length).toBe(before);
  });

  // w23/m3/t006: the delete path refuses a conflict the same way.
  it("refuses conflicting description and message on a file delete", async () => {
    server.setIdentity(writeToken);
    const before = services.ledgerRepo.changeFiles.mock.calls.length;
    const { status, body } = await call("DELETE", `${LEDGER}/files/old.bean`, {
      message: "One text",
      description: "Another text",
    });
    expect(status).toBe(400);
    expect(body).toMatchObject({ error: { code: "BAD_USER_INPUT" } });
    expect(services.ledgerRepo.changeFiles.mock.calls.length).toBe(before);
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
