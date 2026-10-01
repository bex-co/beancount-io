import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { graphql } from "graphql";
import { buildSchema } from "type-graphql";
import { FeedResolver } from "../feed-resolver";
import { FeedService } from "../../service/feed-service";
import { FeedSource } from "../feed-resolver.types";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const caller: Identity = {
  userId: "usr_ada",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
};
let resolver: FeedResolver;
let schemaPromise: ReturnType<typeof buildSchema>;
const item = {
  id: "release",
  title: "Release",
  link: "https://example.test/release",
  publishedAt: new Date("2026-09-01T00:00:00Z"),
  source: FeedSource.CHANGELOG,
};
async function fixture(identity: Identity = caller) {
  const getById = jest.fn(async () => ({ id: "usr_ada", locale: "zh" }));
  const cacheGet = jest.fn(async (key: string) =>
    key.includes("changelog") ? [item] : [],
  );
  const service = new FeedService(
    { get: cacheGet } as never,
    {} as never,
    {} as never,
    { user: { getById } } as never,
    {} as never,
    new AuthorizationService(
      new SourceBackedRelationshipEvaluator(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      ),
    ),
  );
  resolver = new FeedResolver(service);
  schemaPromise ??= buildSchema({
    resolvers: [FeedResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const rest = await startV1TestServer(
    { services: { feed: service } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const mcp = assembleMcpRegistry(
    { identity, feedService: service } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "feed-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), mcp.connect(b)]);
  return {
    getById,
    cacheGet,
    rest: (suffix = "") =>
      fetch(`${rest.url}/api-gateway/v1/account/feed${suffix}`),
    gql: (args = "") =>
      graphql({
        schema,
        source: `{getFeed${args}{items{id title link publishedAt source} total hasMore}}`,
        contextValue: {
          identity,
          userId: identity.userId,
          getCurrentIdentity: () => identity,
        },
      }),
    read: async (suffix = "") => {
      const r = await client.readResource({
        uri: `beancount://account/feed${suffix}`,
      });
      const c = r.contents[0];
      if (!("text" in c)) throw new Error("Expected JSON feed");
      return JSON.parse(c.text);
    },
    close: async () => {
      await client.close();
      await mcp.close();
      await rest.close();
    },
  };
}

describe("feed OAuth authorization across actual adapters", () => {
  it.each(["oauth", "session"] as const)(
    "allows the caller's feed with %s",
    async (method) => {
      const f = await fixture({
        ...caller,
        method,
        scopes: method === "session" ? new Set() : caller.scopes,
      });
      try {
        const r = await f.rest("?source=changelog");
        expect(r.status).toBe(200);
        const expected = {
          items: [{ ...item, publishedAt: item.publishedAt.toISOString() }],
          total: 1,
          hasMore: false,
        };
        expect(await r.json()).toEqual(expected);
        const gql = await f.gql('(source: "changelog")');
        expect(gql.errors).toBeUndefined();
        expect(gql.data?.getFeed).toEqual(expected);
        expect(await f.read("?source=changelog")).toEqual(expected);
        expect(await (await f.rest()).json()).toEqual(expected);
        expect((await f.gql()).data?.getFeed).toEqual(expected);
        expect(await f.read()).toEqual(expected);
        expect(f.getById).toHaveBeenCalledWith(expect.anything(), "usr_ada");
        expect(f.cacheGet).toHaveBeenCalledWith("feed:changelog:zh");
      } finally {
        await f.close();
      }
    },
  );
  it("preserves locale, source, and pagination", async () => {
    const f = await fixture();
    try {
      const expected = { items: [], total: 1, hasMore: false };
      expect(
        await (
          await f.rest("?source=CHANGELOG&locale=en&offset=1&limit=2")
        ).json(),
      ).toEqual(expected);
      expect(
        (
          await f.gql(
            '(source: "CHANGELOG", locale: "en", offset: 1, limit: 2)',
          )
        ).data?.getFeed,
      ).toEqual(expected);
      expect(
        await f.read("?source=CHANGELOG&locale=en&offset=1&limit=2"),
      ).toEqual(expected);
      expect(f.cacheGet).toHaveBeenCalledWith("feed:changelog:en");
    } finally {
      await f.close();
    }
  });
  it.each([
    ["API key", { ...caller, method: "apikey" }],
    ["missing read scope", { ...caller, scopes: new Set() }],
    ["ledger-pinned OAuth", { ...caller, ledgerScope: "ada/personal" }],
  ] as const)("denies %s before source work", async (_name, identity) => {
    const f = await fixture(identity as Identity);
    try {
      expect((await f.rest()).status).toBe(403);
      expect((await f.gql()).errors).toBeDefined();
      await expect(f.read()).rejects.toThrow();
      expect(f.getById).not.toHaveBeenCalled();
      expect(f.cacheGet).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  it("rejects invalid sources consistently", async () => {
    const f = await fixture();
    try {
      expect((await f.rest("?source=unknown")).status).toBe(400);
      expect((await f.gql('(source: "unknown")')).errors).toBeDefined();
      await expect(f.read("?source=unknown")).rejects.toThrow();
      expect(f.cacheGet).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
