import { LedgerArchiveService } from "@/features/ledger/service/ledger-archive-service";
import {
  closed,
  startArchiveOrigin,
  type ArchiveOrigin,
} from "@/features/ledger/service/__tests__/archive-origin";

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
  gitea: { internalBaseUrl: "" },
} as unknown as AppConfig;

const apiKeyIdentity: Identity = {
  userId: "usr_api_key",
  method: "apikey",
  scopes: new Set(["ledger.read"]),
  tokenId: "akey_read",
};

let server: V1TestServer;
let origin: ArchiveOrigin;
const LEDGER = "/api-gateway/v1/ledgers/alice/main";
const ARCHIVE = `${LEDGER}/archive/gitea-main.zip`;

beforeAll(async () => {
  origin = await startArchiveOrigin();
  config.gitea.internalBaseUrl = origin.url;
  layers.services.ledgerArchive = new LedgerArchiveService(
    layers.database.models,
    layers.database.db,
    config,
    layers.services.authorization,
  );
  server = await startV1TestServer(layers, config);
});

afterAll(async () => {
  await server.close();
  await origin.close();
});

beforeEach(() => {
  jest.clearAllMocks();
  server.setIdentity(readOnlyToken);
  authorizeOrThrow.mockResolvedValue({ allowed: true });
  origin.reset();
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
    expect(origin.requests.map((r) => r.url)).toEqual([
      "/api/v1/repos/alice/main/archive/gitea-main.zip",
    ]);
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="main.zip"',
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("ends the Gitea request when the caller hangs up mid-download", async () => {
    origin.serve((_req, res) => {
      // A large archive: one chunk now, the rest never — only the caller ends it.
      res.setHeader("Content-Type", "application/zip");
      res.write(Buffer.alloc(64 * 1024));
    });
    const caller = new AbortController();
    const response = await fetch(`${server.url}${ARCHIVE}`, {
      signal: caller.signal,
    });
    await response.body!.getReader().read();
    const upstream = closed(origin.requests[0]);
    caller.abort();
    expect(await upstream).toBe("closed");
  });

  it("refuses an anonymous caller", async () => {
    server.setIdentity(undefined);
    const response = await fetch(`${server.url}${ARCHIVE}`);

    expect(response.status).toBe(401);
    expect(origin.requests).toHaveLength(0);
  });

  it("refuses a token without read scope", async () => {
    server.setIdentity(scopelessToken);
    authorizeOrThrow.mockRejectedValueOnce(new ForbiddenError("requires read"));
    const response = await fetch(`${server.url}${ARCHIVE}`);

    expect(response.status).toBe(403);
    expect(authorizeOrThrow).toHaveBeenCalled();
    expect(origin.requests).toHaveLength(0);
  });

  it("refuses a caller without ledger read access", async () => {
    authorizeOrThrow.mockRejectedValueOnce(new ForbiddenError("no access"));
    const response = await fetch(`${server.url}${ARCHIVE}`);

    expect(response.status).toBe(403);
    expect(origin.requests).toHaveLength(0);
  });

  it("rejects a traversal archive name before reading upstream", async () => {
    const response = await fetch(
      `${server.url}${LEDGER}/archive/${encodeURIComponent("../../private-ledger")}`,
    );

    expect(response.status).toBe(400);
    expect(authorizeOrThrow).not.toHaveBeenCalled();
    expect(origin.requests).toHaveLength(0);
  });

  it("does not accept a credential from the query string", async () => {
    server.setIdentity(undefined);
    const response = await fetch(`${server.url}${ARCHIVE}?token=a.jwt.value`);

    // The route declares no query, so the key is refused before any
    // credential is looked for (w1/218).
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        message: expect.stringContaining("token"),
      },
    });
    expect(origin.requests).toHaveLength(0);
  });

  it("reports an archive Gitea does not have as 404", async () => {
    origin.serve((_req, res) => {
      res.statusCode = 404;
      res.end();
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
    expect(origin.requests).toHaveLength(0);
  });
});
