import "reflect-metadata";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { ApiKeyResolver } from "@/features/apikeys/api/api-key-resolver";
import { ApiKeyWorkflow } from "@/features/apikeys/workflow/api-key-workflow";
import type { IApiKeyService } from "@/features/apikeys/service/api-key-service";
import type { ApiKey } from "@/features/apikeys/data/api-key-model";
import {
  executeCreateApiKey,
  executeListApiKeys,
  executeRevokeApiKey,
} from "@/features/ai-agent/tools/api-key-tools";
import {
  AuthorizationDeniedError,
  AuthorizationService,
  authorizationRequest,
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
  capabilityExempt: false,
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

const service = {
  list: jest.fn(async () => [storedKey]),
  mint: jest.fn(async () => ({ key: storedKey, plaintext: "bcio_secret" })),
  revoke: jest.fn(async () => ({ ...storedKey, revokedAt: new Date() })),
  verify: jest.fn(),
  stampLastUsed: jest.fn(),
} as unknown as jest.Mocked<IApiKeyService>;

const workflow = new ApiKeyWorkflow(
  service,
  new AuthorizationService(relationships),
);
const resolver = new ApiKeyResolver(workflow);
const layers = { workflows: { apiKey: workflow } } as unknown as AppLayers;
const config = {
  env: "test",
  api: { scopeEnforcement: "enforce" },
} as unknown as AppConfig;

const gqlContext = (identity: Identity): IContext =>
  ({
    identity,
    userId: identity.userId,
    getCurrentIdentity: () => identity,
    getAuthorizationRequest: () => authorizationRequest(identity),
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
    await expect(
      executeListApiKeys({ apiKeyWorkflow: workflow, identity: writeOAuth }),
    ).resolves.toMatchObject({ ok: false });
    expect(service.list).not.toHaveBeenCalled();
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
        { apiKeyWorkflow: workflow, identity: adminApiKey },
        input,
      ),
    ).resolves.toMatchObject({ ok: false });
    expect(service.mint).not.toHaveBeenCalled();
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
        { apiKeyWorkflow: workflow, identity: writeOAuth },
        { id: storedKey.id },
      ),
    ).resolves.toMatchObject({ ok: false });
    expect(service.revoke).not.toHaveBeenCalled();
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
      executeListApiKeys({ apiKeyWorkflow: workflow, identity: adminOAuth }),
    ).resolves.toMatchObject({ ok: true });
    expect(service.list).toHaveBeenCalledTimes(3);
  });
});
