const fetchMock = jest.fn();
jest.mock("node-fetch", () => ({
  __esModule: true,
  default: (...args: unknown[]) => fetchMock(...args),
}));

import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import {
  makeFakeCache,
  readOnlyToken,
  scopelessToken,
  startV1TestServer,
  type V1TestServer,
} from "@/server/rest/__tests__/v1-test-server";

/**
 * The two-step archive download, over HTTP.
 *
 * `archive-ticket.test.ts` covers the credential itself; this covers the pair
 * of routes that mint and spend it — including the property the whole exercise
 * exists for: the download route reads no bearer token, and the URL it hands
 * out stops working the moment it is used.
 */

const cache = makeFakeCache();

const layers = {
  database: {
    db: undefined,
    models: {
      user: {
        getById: jest.fn(async () => ({
          ledger_username: "alice",
          ledger_password: "secret",
        })),
        getUserByUsername: jest.fn(async () => undefined),
      },
    },
  },
  clients: { cacheHelper: cache.helper },
  services: {
    ledgerRepo: { listDirContent: jest.fn(async () => []) },
  },
  workflows: {},
} as unknown as AppLayers;

const config = {
  env: "test",
  api: { scopeEnforcement: "shadow" },
  jwt: { secret: "test-secret" },
  favaApi: { baseUrl: "http://ledger.invalid/" },
} as unknown as AppConfig;

let server: V1TestServer;
const LEDGER = "/api-gateway/v1/ledgers/alice/main";

beforeAll(async () => {
  server = await startV1TestServer(layers, config);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  server.setIdentity(readOnlyToken);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    headers: {
      get: (name: string) =>
        name === "content-type" ? "application/zip" : null,
    },
    body: "ZIPBYTES",
  });
});

async function mintTicket() {
  const response = await fetch(`${server.url}${LEDGER}/archive-tickets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ archive: "gitea-main.zip" }),
  });
  return {
    status: response.status,
    body: (await response.json()) as { url: string; expiresAt: string },
  };
}

describe("v1 archive tickets", () => {
  it("mints a single-use URL for a caller who can read the ledger", async () => {
    const { status, body } = await mintTicket();
    expect(status).toBe(200);
    expect(body.url).toContain(`${LEDGER}/archive/gitea-main.zip?ticket=`);
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("refuses to mint for a token with no scopes", async () => {
    server.setIdentity(scopelessToken);
    const { status } = await mintTicket();
    expect(status).toBe(403);
  });

  it("rejects a traversal archive name before minting a ticket", async () => {
    const response = await fetch(`${server.url}${LEDGER}/archive-tickets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ archive: "../../private-ledger" }),
    });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("downloads with the ticket and no credential of any kind", async () => {
    const { body } = await mintTicket();
    // No identity at all — the point of the ticket.
    server.setIdentity(undefined);

    const response = await fetch(`${server.url}${body.url}`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ZIPBYTES");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://ledger.invalid/ledgers/alice/main/archive/gitea-main.zip",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("refuses the second use of the same URL", async () => {
    const { body } = await mintTicket();
    server.setIdentity(undefined);

    await fetch(`${server.url}${body.url}`);
    const replay = await fetch(`${server.url}${body.url}`);

    expect(replay.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuses a ticket carried to another ledger's URL", async () => {
    const { body } = await mintTicket();
    server.setIdentity(undefined);
    const query = body.url.slice(body.url.indexOf("?"));

    const response = await fetch(
      `${server.url}/api-gateway/v1/ledgers/bob/main/archive/gitea-main.zip${query}`,
    );
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a download with no ticket at all", async () => {
    server.setIdentity(undefined);
    const response = await fetch(
      `${server.url}${LEDGER}/archive/gitea-main.zip`,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_FAILED" },
    });
  });

  it("accepts no JWT in the query string on the v1 path", async () => {
    server.setIdentity(undefined);
    const response = await fetch(
      `${server.url}${LEDGER}/archive/gitea-main.zip?token=a.jwt.value`,
    );
    // Not 200: the parameter the old endpoint honoured is not a credential here.
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports an archive the ledger service does not have as 404", async () => {
    const { body } = await mintTicket();
    server.setIdentity(undefined);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: { get: () => null },
    });

    const response = await fetch(`${server.url}${body.url}`);
    expect(response.status).toBe(404);
  });
});
