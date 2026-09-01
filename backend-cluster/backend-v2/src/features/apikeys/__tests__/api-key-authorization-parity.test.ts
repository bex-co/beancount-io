import "reflect-metadata";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { ApiKeyResolver } from "@/features/apikeys/api/api-key-resolver";
import { ApiKeyService } from "@/features/apikeys/service/api-key-service";
import type {
  ApiKey,
  CreateApiKeyInput,
  IApiKeyModel,
} from "@/features/apikeys/data/api-key-model";
import {
  executeCreateApiKey,
  executeListApiKeys,
  executeRevokeApiKey,
} from "@/features/ai-agent/tools/api-key-tools";
import {
  AuthorizationDeniedError,
  AuthorizationService,
  type IRelationshipEvaluator,
} from "@/server/api/authorization";
import type { Identity } from "@/server/api/identity";
import type { IContext } from "@/server/graphql/context";
import {
  startV1TestServer,
  type V1TestServer,
} from "@/server/rest/__tests__/v1-test-server";

const storedKey = {
  id: "akey_1",
  userId: "usr_alice",
  name: "CI",
  keyDigest: "digest",
  keyPrefix: "bcio_public",
  scopes: ["ledger.read"],
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
} as ApiKey;

const writeOAuth: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.write"]),
};

const adminApiKey: Identity = {
  ...writeOAuth,
  method: "apikey",
  scopes: new Set(["ledger.admin"]),
  tokenId: "akey_caller",
};

const adminOAuth: Identity = {
  ...writeOAuth,
  scopes: new Set(["ledger.admin"]),
};

const relationships: IRelationshipEvaluator = {
  check: jest.fn(async () => true),
};

const model = {
  listByUserId: jest.fn(async () => [storedKey]),
  create: jest.fn(async (_db: never, input: CreateApiKeyInput) => ({
    ...storedKey,
    ...input,
  })),
  revoke: jest.fn(
    async (_db: never, _id: string, _ownerUserId: string, revokedAt: Date) => ({
      ...storedKey,
      revokedAt,
    }),
  ),
  findByDigest: jest.fn(),
  findById: jest.fn(),
  countLiveByUserId: jest.fn(),
  touchLastUsedAt: jest.fn(),
  deleteByUserId: jest.fn(),
} as unknown as jest.Mocked<IApiKeyModel>;

const makeService = (authorization: AuthorizationService) =>
  new ApiKeyService({
    db: {} as never,
    models: { apiKey: model } as never,
    authorization,
    isPremium: async () => true,
  });

const service = makeService(new AuthorizationService(relationships));
const resolver = new ApiKeyResolver(service);
const layers = { services: { apiKey: service } } as unknown as AppLayers;
const config = {
  env: "test",
  api: { scopeEnforcement: "enforce" },
} as unknown as AppConfig;

const gqlContext = (identity: Identity): IContext =>
  ({
    identity,
    userId: identity.userId,
    getCurrentIdentity: () => identity,
    getCurrentUserId: () => identity.userId,
  }) as unknown as IContext;

const restCall = async (
  server: V1TestServer,
  method: string,
  path: string,
  body?: unknown,
) => {
  const response = await fetch(`${server.url}${path}`, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return response.status;
};

describe("API-key authorization parity", () => {
  let server: V1TestServer;

  beforeAll(async () => {
    server = await startV1TestServer(layers, config, {
      apiKeys: true,
      ledger: false,
    });
  });

  afterAll(async () => server.close());

  beforeEach(() => jest.clearAllMocks());

  it("denies list before domain work on GraphQL, REST, and MCP", async () => {
    server.setIdentity(writeOAuth);
    await expect(
      resolver.apiKeys(gqlContext(writeOAuth)),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
    await expect(
      restCall(server, "GET", "/api-gateway/v1/api-keys"),
    ).resolves.toBe(403);
    const mcp = await executeListApiKeys({
      apiKeyService: service,
      identity: writeOAuth,
    });
    expect(mcp).toMatchObject({
      ok: false,
      error: expect.stringContaining('requires the "ledger.admin" scope'),
    });
    expect(model.listByUserId).not.toHaveBeenCalled();
  });

  it("denies a non-admin OAuth minter before domain work on every surface", async () => {
    const input = { name: "CI", scopes: ["ledger.read"] };
    server.setIdentity(writeOAuth);
    await expect(
      resolver.createApiKey(input, gqlContext(writeOAuth)),
    ).rejects.toThrow('requires the "ledger.admin" scope');
    await expect(
      restCall(server, "POST", "/api-gateway/v1/api-keys", input),
    ).resolves.toBe(403);
    await expect(
      executeCreateApiKey(
        { apiKeyService: service, identity: writeOAuth },
        input,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining('requires the "ledger.admin" scope'),
    });
    expect(model.create).not.toHaveBeenCalled();
  });

  it("denies key self-replication before domain work on every surface", async () => {
    const input = { name: "CI", scopes: ["ledger.read"] };
    server.setIdentity(adminApiKey);
    await expect(
      resolver.createApiKey(input, gqlContext(adminApiKey)),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
    await expect(
      restCall(server, "POST", "/api-gateway/v1/api-keys", input),
    ).resolves.toBe(403);
    await expect(
      executeCreateApiKey(
        { apiKeyService: service, identity: adminApiKey },
        input,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining("cannot mint another API key"),
    });
    expect(model.create).not.toHaveBeenCalled();
  });

  it("denies revoke before domain work on GraphQL, REST, and MCP", async () => {
    server.setIdentity(writeOAuth);
    await expect(
      resolver.revokeApiKey(storedKey.id, gqlContext(writeOAuth)),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
    await expect(
      restCall(server, "DELETE", `/api-gateway/v1/api-keys/${storedKey.id}`),
    ).resolves.toBe(403);
    await expect(
      executeRevokeApiKey(
        { apiKeyService: service, identity: writeOAuth },
        { id: storedKey.id },
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining('requires the "ledger.admin" scope'),
    });
    expect(model.revoke).not.toHaveBeenCalled();
  });

  it("conceals a blank REST revoke id as not found", async () => {
    server.setIdentity(adminOAuth);
    await expect(
      restCall(server, "DELETE", "/api-gateway/v1/api-keys/%20"),
    ).resolves.toBe(404);
    expect(model.revoke).not.toHaveBeenCalled();
  });

  it("surfaces a relationship-source failure as 503 without revoking", async () => {
    const unavailableService = makeService(
      new AuthorizationService({
        check: async () => {
          throw new Error("database unavailable");
        },
      }),
    );
    const unavailableServer = await startV1TestServer(
      {
        services: { apiKey: unavailableService },
      } as unknown as AppLayers,
      config,
      { apiKeys: true, ledger: false },
    );
    try {
      unavailableServer.setIdentity(adminOAuth);
      await expect(
        restCall(
          unavailableServer,
          "DELETE",
          `/api-gateway/v1/api-keys/${storedKey.id}`,
        ),
      ).resolves.toBe(503);
      expect(model.revoke).not.toHaveBeenCalled();
    } finally {
      await unavailableServer.close();
    }
  });

  it("allows the same admin list decision on all three surfaces", async () => {
    server.setIdentity(adminOAuth);
    await expect(
      resolver.apiKeys(gqlContext(adminOAuth)),
    ).resolves.toHaveLength(1);
    await expect(
      restCall(server, "GET", "/api-gateway/v1/api-keys"),
    ).resolves.toBe(200);
    await expect(
      executeListApiKeys({ apiKeyService: service, identity: adminOAuth }),
    ).resolves.toMatchObject({ ok: true });
    expect(model.listByUserId).toHaveBeenCalledTimes(3);
  });
});
