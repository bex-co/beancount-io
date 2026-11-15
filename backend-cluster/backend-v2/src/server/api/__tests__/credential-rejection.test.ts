/**
 * w23/070: REST answered a bearer token it refused — issued for MCP, expired,
 * malformed — with "send `Authorization: Bearer <token>`", the header the
 * caller had just sent, so an agent retried it instead of switching
 * credentials. GraphQL said "Authentication required" the same way.
 *
 * w31/025: the reads a public ledger serves anonymously still said
 * "Authentication required" to a refused credential on a private ledger,
 * because their refusal is raised for the anonymous principal, below the
 * transport that knew a credential had been sent.
 *
 * w31/026: the ai-agent routes and the OAuth consent approval authenticate
 * through `resolveAuthUser`, which still said "Authentication required" to a
 * refused credential.
 */
import "reflect-metadata";

// The ai-agent routes transitively load the harness ESM packages, whose
// `import.meta.url` Jest's CommonJS transform cannot evaluate. No request here
// reaches them.
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({
  createACP: () => ({}),
}));

import http from "node:http";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import Router from "@koa/router";
import { graphql, type GraphQLSchema } from "graphql";
import { buildSchema } from "type-graphql";
import { SignJWT, exportJWK, generateKeyPair, type CryptoKey } from "jose";
import type { AppConfig } from "@/config/config";
import type { AppLayers, DatabaseLayer } from "@/foundation/composition";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import { setupAiAgentRoutes } from "@/features/ai-agent/api";
import { CommitsResolver } from "@/features/gitea/commits/api/commits-resolver";
import { CommitsService } from "@/features/gitea/commits/service/commits-service";
import { LedgerAssetQueryResolver } from "@/features/ledger/api/resolvers/ledger-asset-resolver";
import { LedgerDataQueryResolver } from "@/features/ledger/api/resolvers/ledger-data-resolver.query";
import { LedgerAssetService } from "@/features/ledger/service/ledger-asset-service";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { AuthorizationService } from "@/server/api/authorization";
import { credentialRejection } from "@/server/api/identity";
import { createContext } from "@/server/graphql/context";
import { authenticatedMiddleware } from "@/server/graphql/authenticated";
import { formatError } from "@/server/graphql/format-error";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import { restIdentityMiddleware } from "@/server/rest/identity-middleware";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import { asyncContext } from "@/shared/async-context";

const ISSUER = "https://beancount.io";
const MCP_TOKEN = /issued for the MCP endpoint/;
const REFUSED = /not accepted: it is expired, revoked, malformed/;
const ABSENT = "This endpoint requires a credential";

let privateKey: CryptoKey;
let config: AppConfig;
const tokens: Record<string, string> = {};

const mint = (audience: string, expiresAt: string | number = "1h") =>
  new SignJWT({ scope: "ledger.read" })
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .setIssuer(ISSUER)
    .setSubject("usr_qa")
    .setIssuedAt()
    .setAudience(audience)
    .setExpirationTime(expiresAt)
    .sign(privateKey);

beforeAll(async () => {
  const pair = await generateKeyPair("ES256", { extractable: true });
  privateKey = pair.privateKey;
  const pub = await exportJWK(pair.publicKey);
  pub.kid = "test-key";
  pub.alg = "ES256";
  config = {
    api: { scopeEnforcement: "enforce" },
    oauth: { issuer: ISSUER, jwks: { keys: [pub] } },
  } as unknown as AppConfig;
  tokens.mcp = await mint(`${ISSUER}/api-gateway/mcp`);
  tokens.expired = await mint(
    `${ISSUER}/v1`,
    Math.floor(Date.now() / 1000) - 60,
  );
});

// Each credential a caller can send, and how its refusal must read.
const cases = () =>
  [
    [
      "an MCP-audience token",
      { authorization: `Bearer ${tokens.mcp}` },
      MCP_TOKEN,
    ],
    [
      "an expired token",
      { authorization: `Bearer ${tokens.expired}` },
      REFUSED,
    ],
    [
      "a malformed bearer",
      { authorization: "Bearer garbage.token.value" },
      REFUSED,
    ],
    ["an unknown API key", { "x-api-key": "bcio_not_a_real_key" }, REFUSED],
    [
      "an unknown key sent as a bearer",
      { authorization: `Bearer bcio_${"0".repeat(32)}` },
      REFUSED,
    ],
    ["a malformed API key", { "x-api-key": "qa-garbage" }, REFUSED],
  ] as const;

describe("credentialRejection", () => {
  it("names nothing for a request with no credential header", async () => {
    expect(await credentialRejection({ headers: {} }, config)).toBeUndefined();
    // A browser's expired session keeps its sign-in refusal.
    expect(
      await credentialRejection({ headers: { cookie: "token=stale" } }, config),
    ).toBeUndefined();
  });

  it("tells each refused credential apart from a missing one", async () => {
    for (const [, headers, message] of cases()) {
      expect(await credentialRejection({ headers }, config)).toMatch(message);
    }
  });
});

describe("REST", () => {
  it("answers each refused credential with its own 401", async () => {
    const rest = await startV1TestServer({} as AppLayers, config, {
      ledger: true,
      apiKeys: false,
      social: false,
      accountReads: false,
      configuration: false,
    });
    const years = (headers: Record<string, string>) =>
      fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/years`, {
        headers,
      }).then(async (response) => ({
        status: response.status,
        body: (await response.json()) as {
          error: { code: string; message: string };
        },
      }));
    try {
      const absent = await years({});
      expect(absent.status).toBe(401);
      expect(absent.body.error.message).toContain(ABSENT);
      for (const [, headers, message] of cases()) {
        const refused = await years(headers);
        expect(refused.status).toBe(401);
        expect(refused.body.error).toMatchObject({ code: "UNAUTHENTICATED" });
        expect(refused.body.error.message).toMatch(message);
      }
    } finally {
      await rest.close();
    }
  });
});

// Resolves no credential: every header sent is refused.
const database = {
  db: {},
  models: {
    jwt: { verify: async () => null },
    apiKey: { findByDigest: async () => undefined },
    user: { getById: async () => undefined },
  },
} as unknown as DatabaseLayer;

describe("GraphQL", () => {
  const refusal = async (headers: Record<string, string>) => {
    const context = await createContext({ headers }, database, config);
    const messages: string[] = [];
    for (const refuse of [
      () => context.getCurrentIdentity(),
      () => authenticatedMiddleware({ context } as never, async () => {}),
    ]) {
      try {
        await refuse();
      } catch (error) {
        messages.push((error as Error).message);
      }
    }
    return messages;
  };

  it("keeps its sign-in refusals for a request with no credential", async () => {
    expect(await refusal({})).toEqual([
      "Authentication required",
      "Access denied! Please login to continue!",
    ]);
  });

  it("refuses each credential with REST's wording", async () => {
    for (const [, headers, message] of cases()) {
      const messages = await refusal(headers);
      expect(messages).toHaveLength(2);
      for (const text of messages) expect(text).toMatch(message);
    }
  });
});

describe("public-capable reads of a private ledger (w31/025)", () => {
  const PRIVATE = "alice/private";
  const PUBLIC = "open/example";
  const NO_CREDENTIAL = "Authentication required";
  const ok = (data: unknown) =>
    Promise.resolve({ data: { success: true, data } });
  // The real PDP over a relationship graph in which only the public ledger is
  // readable by everyone, so the anonymous principal is refused the private one.
  const authorization = new AuthorizationService(
    { check: async ({ object }) => object === `ledger:${PUBLIC}` },
    () => {},
  );
  const fava = {
    getPublicApiClient: async () => ({
      reports: { getLedgerYears: () => ok(["2026"]) },
    }),
    getAdminClient: () => ({
      ledgers: { getLedger: () => ok({}) },
      // Repository 7 is the private ledger; no ledger has repository 8.
      admin: {
        getLedgerByRepoId: (id: number) =>
          id === 7
            ? ok({ full_name: PRIVATE })
            : Promise.resolve({ data: { success: false, error: "missing" } }),
      },
    }),
  } as unknown as IFavaClientFactory;
  const ledgerAsset = () =>
    new LedgerAssetService(
      fava,
      {} as never,
      { oauth: { issuer: ISSUER } } as AppConfig,
      authorization,
    );
  const resolvers = new Map<unknown, unknown>([
    [
      LedgerDataQueryResolver,
      new LedgerDataQueryResolver(new LedgerDataService(fava, authorization)),
    ],
    [
      CommitsResolver,
      new CommitsResolver(new CommitsService({} as never, authorization)),
    ],
    [LedgerAssetQueryResolver, new LedgerAssetQueryResolver(ledgerAsset())],
  ]);
  let schema: GraphQLSchema;

  beforeAll(async () => {
    schema = await buildSchema({
      resolvers: [
        LedgerDataQueryResolver,
        CommitsResolver,
        LedgerAssetQueryResolver,
      ],
      container: { get: (resolver) => resolvers.get(resolver) },
      globalMiddlewares: [graphqlScopeMiddleware("enforce")],
      validate: false,
    });
  });

  /** One GraphQL request as the server runs it: in its request context. */
  const gql = (
    headers: Record<string, string>,
    source: string,
    variableValues: Record<string, unknown>,
  ) =>
    asyncContext.run({ requestId: "w31-025" }, async () =>
      graphql({
        schema,
        source,
        variableValues,
        contextValue: await createContext({ headers }, database, config),
      }),
    );
  /** The one refusal a read answered, as a client receives it. */
  const refusal = async (
    result: Awaited<ReturnType<typeof gql>>,
  ): Promise<{ code: unknown; message: string }> => {
    expect(result.errors).toHaveLength(1);
    const error = result.errors![0];
    return {
      code: formatError(error.toJSON(), error).extensions?.code,
      message: error.message,
    };
  };
  // Each read of the private ledger `$l`.
  const reads = [
    ["getLedgerYears", `query($l: String!) { getLedgerYears(ledgerId: $l) }`],
    ["listCommits", `query($l: String!) { listCommits(ledgerId: $l) { sha } }`],
    [
      "getLedgerArchiveDownloadUrl",
      `query($l: String!) { getLedgerArchiveDownloadUrl(ledgerId: $l) { downloadUrl } }`,
    ],
  ] as const;

  it.each(reads)(
    "GraphQL %s keeps asking a request with no credential for one",
    async (_field, source) => {
      expect(await refusal(await gql({}, source, { l: PRIVATE }))).toEqual({
        code: "UNAUTHENTICATED",
        message: NO_CREDENTIAL,
      });
    },
  );

  it.each(reads)(
    "GraphQL %s says a refused credential was refused",
    async (_field, source) => {
      for (const [, headers, message] of cases()) {
        const answer = await refusal(
          await gql(headers, source, { l: PRIVATE }),
        );
        expect(answer.code).toBe("UNAUTHENTICATED");
        expect(answer.message).toMatch(message);
      }
    },
  );

  it("GraphQL still serves a public ledger to a refused credential", async () => {
    for (const [, headers] of cases()) {
      const result = await gql(
        headers,
        `query($l: String!) { getLedgerYears(ledgerId: $l) }`,
        { l: PUBLIC },
      );
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({ getLedgerYears: ["2026"] });
    }
  });

  it("GraphQL answers a repository ID nothing has as it answers a private one", async () => {
    const asset = (headers: Record<string, string>, ledgerRepoId: number) =>
      gql(
        headers,
        `query($id: Int!) { getLedgerAssetDownloadUrl(ledgerRepoId: $id, filename: "a.pdf") { downloadUrl } }`,
        { id: ledgerRepoId },
      ).then(refusal);
    for (const [headers, message] of [
      [{}, new RegExp(`^${NO_CREDENTIAL}$`)],
      ...cases().map(([, sent, refused]) => [sent, refused] as const),
    ] as const) {
      const missing = await asset(headers, 8);
      expect(missing.code).toBe("UNAUTHENTICATED");
      expect(missing.message).toMatch(message);
      expect(await asset(headers, 7)).toEqual(missing);
    }
  });

  it("REST archive-download-url answers each case with its own 401", async () => {
    const rest = await startV1TestServer(
      { services: { ledgerAsset: ledgerAsset() } } as unknown as AppLayers,
      config,
      {
        ledger: true,
        apiKeys: false,
        social: false,
        accountReads: false,
        configuration: false,
      },
    );
    const archiveUrl = (ledger: string, headers: Record<string, string>) =>
      fetch(
        `${rest.url}/api-gateway/v1/ledgers/${ledger}/archive-download-url`,
        {
          headers,
        },
      ).then(async (response) => ({
        status: response.status,
        body: (await response.json()) as {
          error?: { code: string; message: string };
        },
      }));
    try {
      expect(await archiveUrl(PRIVATE, {})).toEqual({
        status: 401,
        body: expect.objectContaining({
          error: { code: "UNAUTHENTICATED", message: NO_CREDENTIAL },
        }),
      });
      for (const [, headers, message] of cases()) {
        const refused = await archiveUrl(PRIVATE, headers);
        expect(refused.status).toBe(401);
        expect(refused.body.error?.code).toBe("UNAUTHENTICATED");
        expect(refused.body.error?.message).toMatch(message);
        // Anonymous access to a public ledger is unchanged.
        expect((await archiveUrl(PUBLIC, headers)).status).toBe(200);
      }
    } finally {
      await rest.close();
    }
  });
});

describe("routes that authenticate through resolveAuthUser (w31/026)", () => {
  const NO_CREDENTIAL = "Authentication required";
  const body = {
    messages: [{ role: "user", content: "What did I spend on rent?" }],
    ledgerId: "alice/main",
    conversationId: "conversation-1",
  };
  const routes = [
    "/api-gateway/agent",
    "/api-gateway/sandbox-agent",
    "/api-gateway/ai/openai/chat/completions",
  ];
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    // The production order: the error adapter outermost, then the shared
    // identity resolver, then the routes as `setupAiAgentRoutes` mounts them.
    const router = new Router();
    router.use(restErrorMiddleware());
    router.use(restIdentityMiddleware({ database } as AppLayers, config));
    setupAiAgentRoutes(
      router,
      { database, services: {}, workflows: {} } as unknown as AppLayers,
      config,
    );
    const app = new Koa();
    app.silent = true;
    app.use(bodyParser());
    app.use(router.routes()).use(router.allowedMethods());
    server = http.createServer(app.callback());
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const { port } = server.address() as { port: number };
    url = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const post = (path: string, headers: Record<string, string>) =>
    fetch(`${url}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }).then(async (response) => ({
      status: response.status,
      challenge: response.headers.get("www-authenticate"),
      body: (await response.json()) as {
        error: { code: string; message: string };
      },
    }));

  it.each(routes)(
    "%s keeps asking a request with no credential for one",
    async (path) => {
      const absent = await post(path, {});
      expect(absent.status).toBe(401);
      expect(absent.body.error).toEqual({
        code: "UNAUTHENTICATED",
        message: NO_CREDENTIAL,
      });
      expect(absent.challenge).not.toContain("invalid_token");
    },
  );

  it.each(routes)("%s says a refused credential was refused", async (path) => {
    for (const [, headers, message] of cases()) {
      const refused = await post(path, headers);
      expect(refused.status).toBe(401);
      expect(refused.body.error.code).toBe("UNAUTHENTICATED");
      expect(refused.body.error.message).toMatch(message);
      expect(refused.challenge).toContain('error="invalid_token"');
    }
  });
});
