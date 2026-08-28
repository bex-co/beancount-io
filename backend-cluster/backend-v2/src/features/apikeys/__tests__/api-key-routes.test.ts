import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { Identity } from "@/server/api/identity";
import {
  startV1TestServer,
  type V1TestServer,
} from "@/server/rest/__tests__/v1-test-server";
import { PremiumRequiredError } from "@/shared/errors";

/**
 * Key management over REST, through the real middleware chain.
 *
 * The response bodies are the point: a list endpoint that leaked a digest, or a
 * mint response missing its one-and-only plaintext, would both pass a test that
 * only checked status codes.
 */

const session: Identity = {
  userId: "usr_1",
  method: "session",
  scopes: new Set(),
  capabilityExempt: true,
};

const fromKey: Identity = {
  userId: "usr_1",
  method: "apikey",
  scopes: new Set(["ledger.admin"]),
  tokenId: "akey_1",
  capabilityExempt: false,
};

const storedKey = {
  id: "akey_1",
  userId: "usr_1",
  name: "CI",
  keyDigest: "digest-that-must-not-leak",
  keyPrefix: "bcio_7wXzK9mN",
  scopes: ["ledger.read"],
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const apiKeyService = {
  list: jest.fn(async () => [storedKey]),
  mint: jest.fn(async () => ({ key: storedKey, plaintext: "bcio_secret" })),
  revoke: jest.fn(async () => ({ ...storedKey, revokedAt: new Date() })),
};

const layers = {
  services: { apiKey: apiKeyService },
} as unknown as AppLayers;

const config = {
  env: "test",
  api: { scopeEnforcement: "shadow" },
} as unknown as AppConfig;

let server: V1TestServer;

beforeAll(async () => {
  server = await startV1TestServer(layers, config, {
    apiKeys: true,
    ledger: false,
  });
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  server.setIdentity(session);
  jest.clearAllMocks();
});

const call = async (method: string, path: string, body?: unknown) => {
  const response = await fetch(`${server.url}${path}`, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
};

describe("GET /api-gateway/v1/api-keys", () => {
  it("lists keys by prefix and never by digest", async () => {
    const { status, body } = await call("GET", "/api-gateway/v1/api-keys");
    expect(status).toBe(200);
    expect(JSON.stringify(body)).not.toContain(storedKey.keyDigest);
    expect(body).toEqual([
      expect.objectContaining({ id: "akey_1", keyPrefix: "bcio_7wXzK9mN" }),
    ]);
  });

  it("refuses an anonymous caller", async () => {
    server.setIdentity(undefined);
    const { status } = await call("GET", "/api-gateway/v1/api-keys");
    expect(status).toBe(401);
  });
});

describe("POST /api-gateway/v1/api-keys", () => {
  it("returns the plaintext exactly once, alongside the key", async () => {
    const { status, body } = await call("POST", "/api-gateway/v1/api-keys", {
      name: "CI",
      scopes: ["ledger.read"],
    });
    expect(status).toBe(200);
    expect(body).toMatchObject({ plaintext: "bcio_secret" });
    expect(JSON.stringify(body)).not.toContain(storedKey.keyDigest);
  });

  it("rejects a scope outside the vocabulary before reaching the service", async () => {
    const { status, body } = await call("POST", "/api-gateway/v1/api-keys", {
      name: "CI",
      scopes: ["ledger.superuser"],
    });
    expect(status).toBe(400);
    expect(body).toMatchObject({ error: { code: "VALIDATION_FAILED" } });
    expect(apiKeyService.mint).not.toHaveBeenCalled();
  });

  it("rejects an empty scope list", async () => {
    const { status } = await call("POST", "/api-gateway/v1/api-keys", {
      name: "CI",
      scopes: [],
    });
    expect(status).toBe(400);
  });

  it("rejects an empty ledger scope before reaching the service", async () => {
    // The service normalizes a blank too; the boundary rejects it so a client
    // sending `""` learns it sent nothing rather than silently inheriting.
    const { status, body } = await call("POST", "/api-gateway/v1/api-keys", {
      name: "CI",
      scopes: ["ledger.read"],
      ledgerScope: "",
    });
    expect(status).toBe(400);
    expect(body).toMatchObject({ error: { code: "VALIDATION_FAILED" } });
    expect(apiKeyService.mint).not.toHaveBeenCalled();
  });

  it("surfaces the paid-plan refusal as 402", async () => {
    apiKeyService.mint.mockRejectedValueOnce(
      new PremiumRequiredError("API keys"),
    );
    const { status, body } = await call("POST", "/api-gateway/v1/api-keys", {
      name: "CI",
      scopes: ["ledger.read"],
    });
    expect(status).toBe(402);
    expect(body).toMatchObject({ error: { code: "PREMIUM_REQUIRED" } });
  });

  it("passes an API-key caller through to the service, which refuses it", async () => {
    // The no-self-perpetuation rule lives in the service so it holds on all
    // three surfaces; the adapter's job is only not to bypass it.
    server.setIdentity(fromKey);
    await call("POST", "/api-gateway/v1/api-keys", {
      name: "CI",
      scopes: ["ledger.read"],
    });
    expect(apiKeyService.mint).toHaveBeenCalledWith(
      expect.objectContaining({ method: "apikey" }),
      expect.anything(),
    );
  });
});

describe("DELETE /api-gateway/v1/api-keys/{id}", () => {
  it("revokes by id", async () => {
    const { status, body } = await call(
      "DELETE",
      "/api-gateway/v1/api-keys/akey_1",
    );
    expect(status).toBe(200);
    expect(body).toMatchObject({ id: "akey_1" });
    expect(apiKeyService.revoke).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "usr_1" }),
      "akey_1",
    );
  });
});
