const fetchMock = jest.fn();
jest.mock("node-fetch", () => ({
  __esModule: true,
  default: (...args: unknown[]) => fetchMock(...args),
}));

import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { Identity } from "@/server/api/identity";
import { ForbiddenError } from "@/shared/errors";
import {
  readOnlyToken,
  scopelessToken,
  sessionIdentity,
  startV1TestServer,
  type V1TestServer,
} from "@/server/rest/__tests__/v1-test-server";

const authorizeOrThrow = jest.fn(async () => ({ allowed: true }));

const layers = {
  database: {
    db: undefined,
    models: {
      user: {
        getById: jest.fn(async () => ({
          ledger_username: "alice",
          ledger_password: "secret",
        })),
      },
    },
  },
  clients: { favaClientFactory: {} },
  services: {
    authorization: { authorizeOrThrow },
  },
  workflows: {},
} as unknown as AppLayers;

const config = {
  env: "test",
  api: { scopeEnforcement: "shadow" },
  favaApi: { baseUrl: "http://ledger.invalid/" },
} as unknown as AppConfig;

const apiKeyIdentity: Identity = {
  userId: "usr_api_key",
  method: "apikey",
  scopes: new Set(["ledger.read"]),
  tokenId: "akey_read",
};

let server: V1TestServer;
const LEDGER = "/api-gateway/v1/ledgers/alice/main";
const ARCHIVE = `${LEDGER}/archive/gitea-main.zip`;

beforeAll(async () => {
  server = await startV1TestServer(layers, config);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  jest.clearAllMocks();
  server.setIdentity(readOnlyToken);
  authorizeOrThrow.mockResolvedValue({ allowed: true });
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    headers: {
      get: (name: string) => {
        if (name === "content-type") return "application/zip";
        if (name === "content-disposition") {
          return 'attachment; filename="main.zip"';
        }
        return null;
      },
    },
    body: "ZIPBYTES",
  });
});

describe("v1 archive download", () => {
  it.each([
    ["OAuth bearer identity", readOnlyToken],
    ["browser session identity", sessionIdentity],
    ["personal API key identity", apiKeyIdentity],
  ])("downloads with a standard %s", async (_label, identity) => {
    server.setIdentity(identity);

    const response = await fetch(`${server.url}${ARCHIVE}`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ZIPBYTES");
    expect(authorizeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        principal: identity,
        action: "ledger.archive.read",
        resource: "ledger:alice/main",
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://ledger.invalid/ledgers/alice/main/archive/gitea-main.zip",
      expect.objectContaining({ method: "GET" }),
    );
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="main.zip"',
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("refuses an anonymous caller", async () => {
    server.setIdentity(undefined);
    const response = await fetch(`${server.url}${ARCHIVE}`);

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a token without read scope", async () => {
    server.setIdentity(scopelessToken);
    authorizeOrThrow.mockRejectedValueOnce(new ForbiddenError("requires read"));
    const response = await fetch(`${server.url}${ARCHIVE}`);

    expect(response.status).toBe(403);
    expect(authorizeOrThrow).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a caller without ledger read access", async () => {
    authorizeOrThrow.mockRejectedValueOnce(new ForbiddenError("no access"));
    const response = await fetch(`${server.url}${ARCHIVE}`);

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a traversal archive name before reading upstream", async () => {
    const response = await fetch(
      `${server.url}${LEDGER}/archive/${encodeURIComponent("../../private-ledger")}`,
    );

    expect(response.status).toBe(400);
    expect(authorizeOrThrow).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not accept a credential from the query string", async () => {
    server.setIdentity(undefined);
    const response = await fetch(`${server.url}${ARCHIVE}?token=a.jwt.value`);

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports an archive the ledger service does not have as 404", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: { get: () => null },
    });
    const response = await fetch(`${server.url}${ARCHIVE}`);

    expect(response.status).toBe(404);
  });

  it("removes the archive-ticket mint endpoint", async () => {
    const response = await fetch(`${server.url}${LEDGER}/archive-tickets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ archive: "gitea-main.zip" }),
    });

    expect(response.status).toBe(404);
    expect(authorizeOrThrow).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
