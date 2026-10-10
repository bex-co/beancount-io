import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
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
  let schema: Awaited<ReturnType<typeof buildSchema>>;

  beforeAll(async () => {
    schema = await buildSchema({
      resolvers: [ApiKeyResolver],
      container: { get: () => resolver },
      globalMiddlewares: [graphqlScopeMiddleware("enforce")],
      validate: true,
    });
    server = await startV1TestServer(layers, config, {
      apiKeys: true,
      ledger: false,
    });
  });

  afterAll(async () => server.close());

  beforeEach(() => jest.clearAllMocks());

  it("denies list before domain work on GraphQL and REST", async () => {
    server.setIdentity(writeOAuth);
    await expect(
      resolver.apiKeys(gqlContext(writeOAuth)),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
    await expect(
      restCall(server, "GET", "/api-gateway/v1/api-keys"),
    ).resolves.toBe(403);
    expect(model.listByUserId).not.toHaveBeenCalled();
  });

  it("denies a non-admin OAuth minter before domain work on both surfaces", async () => {
    const input = { name: "CI", scopes: ["ledger.read"] };
    server.setIdentity(writeOAuth);
    await expect(
      resolver.createApiKey(input, gqlContext(writeOAuth)),
    ).rejects.toThrow('requires the "ledger.admin" scope');
    await expect(
      restCall(server, "POST", "/api-gateway/v1/api-keys", input),
    ).resolves.toBe(403);
    expect(model.create).not.toHaveBeenCalled();
  });

  it("denies key self-replication before domain work on both surfaces", async () => {
    const input = { name: "CI", scopes: ["ledger.read"] };
    server.setIdentity(adminApiKey);
    await expect(
      resolver.createApiKey(input, gqlContext(adminApiKey)),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
    await expect(
      restCall(server, "POST", "/api-gateway/v1/api-keys", input),
    ).resolves.toBe(403);
    expect(model.create).not.toHaveBeenCalled();
  });

  it("denies revoke before domain work on GraphQL and REST", async () => {
    server.setIdentity(writeOAuth);
    await expect(
      resolver.revokeApiKey(storedKey.id, gqlContext(writeOAuth)),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
    await expect(
      restCall(server, "DELETE", `/api-gateway/v1/api-keys/${storedKey.id}`),
    ).resolves.toBe(403);
    expect(model.revoke).not.toHaveBeenCalled();
  });

  it("offers no API-key management on MCP, even to an admin OAuth caller", async () => {
    // Directory policy withholds credentials from MCP (ADR 019, 2026-10-09
    // amendment): the tool is not listed, and calling it by name is refused
    // before any key is read, minted, or revoked.
    const tools = await listMcpTools();
    expect(tools).not.toContain("manageApiKeys");
    expect(tools.some((name) => /api.?key/i.test(name))).toBe(false);
    for (const operation of ["list", "create", "revoke"]) {
      const response = await callMcp("manageApiKeys", {
        operation,
        name: "CI",
        scopes: ["ledger.read"],
        id: storedKey.id,
      });
      expect(response.isError).toBe(true);
    }
    expect(model.listByUserId).not.toHaveBeenCalled();
    expect(model.create).not.toHaveBeenCalled();
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

  it("allows the same admin list decision on both surfaces", async () => {
    server.setIdentity(adminOAuth);
    await expect(
      resolver.apiKeys(gqlContext(adminOAuth)),
    ).resolves.toHaveLength(1);
    await expect(
      restCall(server, "GET", "/api-gateway/v1/api-keys"),
    ).resolves.toBe(200);
    expect(model.listByUserId).toHaveBeenCalledTimes(2);
  });

  async function withMcp<T>(use: (client: Client) => Promise<T>): Promise<T> {
    const mcp = assembleMcpRegistry(
      {
        identity: adminOAuth,
        apiKeyService: service,
      } as unknown as McpRequestContext,
      config,
    );
    const client = new Client({ name: "api-key-parity", version: "1" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(a), mcp.connect(b)]);
    try {
      return await use(client);
    } finally {
      await client.close();
      await mcp.close();
    }
  }

  const callMcp = (name: string, input: Record<string, unknown>) =>
    withMcp((client) => client.callTool({ name, arguments: input }));

  const listMcpTools = () =>
    withMcp(async (client) =>
      (await client.listTools()).tools.map((tool) => tool.name),
    );

  it.each([undefined, "", "ada/personal"])(
    "preserves expiry and inherited restrictions through actual adapters: %s",
    async (ledgerScope) => {
      const caller = { ...adminOAuth, ledgerScope: "ada/personal" };
      const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
      const input = {
        name: "Automation",
        scopes: ["ledger.read"],
        ledgerScope,
        expiresAt,
      };
      server.setIdentity(caller);
      const response = await fetch(`${server.url}/api-gateway/v1/api-keys`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      expect(response.status).toBe(200);
      const rest = (await response.json()) as {
        key: { expiresAt: string; ledgerScope: string };
        plaintext: string;
      };
      const gql = await graphql({
        schema,
        source: `mutation($input: CreateApiKeyInputType!){createApiKey(input:$input){key{expiresAt ledgerScope} plaintext}}`,
        variableValues: { input },
        contextValue: gqlContext(caller),
      });
      expect(gql.errors).toBeUndefined();
      expect(rest.key).toMatchObject({
        expiresAt,
        ledgerScope: "ada/personal",
      });
      expect(gql.data?.createApiKey).toMatchObject({
        key: { expiresAt, ledgerScope: "ada/personal" },
        plaintext: expect.stringMatching(/^bcio_/),
      });
      expect(model.create).toHaveBeenCalledTimes(2);
      for (const [, written] of model.create.mock.calls) {
        expect(written).toMatchObject({
          expiresAt: new Date(expiresAt),
          ledgerScope: "ada/personal",
          scopes: ["ledger.read"],
        });
        expect(written.keyDigest).not.toContain("bcio_");
      }
    },
  );
});
