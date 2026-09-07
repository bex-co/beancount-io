import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { graphql } from "graphql";
import { buildSchema } from "type-graphql";
import { UserProfileResolver } from "../user-profile-resolver";
import { UserProfileService } from "../../service/user-profile-service";
import { SOCIAL_READS } from "../social-read-routes";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity = {
  userId: "usr_reader",
  method: "oauth" as const,
  scopes: new Set<string>(),
  ledgerScope: "someone/restricted",
};
const username = "élise + café/ledger";
const users = ["alice", "bob", "carol"].map((login) => ({
  login,
  full_name: `Name ${login}`,
  avatar_url: `https://example.test/${login}`,
  description: "Bookkeeping",
}));
const repos = ["books", "sample", "demo"].map((name) => ({
  name,
  full_name: `alice/${name}`,
  description: "Examples",
  private: false,
  stars_count: 12,
  updated_at: "2026-09-01T10:15:00.000Z",
}));
let resolver: UserProfileResolver;
let schemaPromise: ReturnType<typeof buildSchema>;

async function fixture(outage = false) {
  const fetchPage = jest.fn(
    async (
      kind: string,
      target: string,
      opts: { page: number; limit: number },
    ) => {
      expect(target).toBe(username);
      if (outage) throw new Error("Upstream unavailable");
      const all = kind === "repos" ? repos : users;
      const start = (opts.page - 1) * opts.limit;
      return { data: all.slice(start, start + opts.limit) };
    },
  );
  const service = new UserProfileService(
    {
      getAdminApiClient: () => ({
        users: {
          userListFollowers: (
            target: string,
            opts: { page: number; limit: number },
          ) => fetchPage("followers", target, opts),
          userListFollowing: (
            target: string,
            opts: { page: number; limit: number },
          ) => fetchPage("following", target, opts),
          userListStarred: (
            target: string,
            opts: { page: number; limit: number },
          ) => fetchPage("repos", target, opts),
        },
      }),
    } as never,
    {} as never,
    {} as never,
    {} as never,
  );
  resolver = new UserProfileResolver(service);
  schemaPromise ??= buildSchema({
    resolvers: [UserProfileResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const rest = await startV1TestServer(
    { services: { userProfile: service } } as unknown as AppLayers,
    config,
  );
  const mcp = assembleMcpRegistry(
    { identity, socialService: service } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "social-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), mcp.connect(b)]);
  return {
    fetchPage,
    compare: async (
      read: (typeof SOCIAL_READS)[number],
      page?: number,
      limit?: number,
    ) => {
      const query = new URLSearchParams({ username });
      if (page !== undefined) query.set("page", String(page));
      if (limit !== undefined) query.set("limit", String(limit));
      const r = await fetch(
        `${rest.url}/api-gateway/v1/social/${read.path}?${query}`,
      );
      expect(r.status).toBe(200);
      const data = await r.json();
      const selection =
        read.path === "starred-repositories"
          ? "repositories{name fullName description isPrivate updatedAt starsCount}"
          : "users{username fullName avatarUrl bio}";
      const args = `username:${JSON.stringify(username)}${page === undefined ? "" : `,page:${page}`}${limit === undefined ? "" : `,limit:${limit}`}`;
      const g = await graphql({
        schema,
        source: `{${read.method}(${args}){${selection} total}}`,
        contextValue: {},
      });
      expect(g.errors).toBeUndefined();
      expect(g.data?.[read.method]).toEqual(data);
      const result = await client.readResource({
        uri: `beancount://social/${read.path}?${query}`,
      });
      const content = result.contents[0];
      expect("text" in content && JSON.parse(content.text)).toEqual(data);
      return data;
    },
    close: async () => {
      await client.close();
      await mcp.close();
      await rest.close();
    },
  };
}

describe("public social lists across real REST, GraphQL, and MCP adapters", () => {
  it.each(SOCIAL_READS)(
    "$name preserves default and explicit pages",
    async (read) => {
      const f = await fixture();
      try {
        expect(await f.compare(read)).toMatchObject({ total: 3 });
        expect(f.fetchPage.mock.calls.map(([, , opts]) => opts)).toEqual([
          { page: 1, limit: 20 },
          { page: 1, limit: 20 },
          { page: 1, limit: 20 },
        ]);
        const page = await f.compare(read, 2, 1);
        expect(page).toMatchObject({ total: 1 });
        expect(
          read.path === "starred-repositories"
            ? page.repositories[0].name
            : page.users[0].username,
        ).toBe(read.path === "starred-repositories" ? "sample" : "bob");
        expect(await f.compare(read, 9, 1)).toMatchObject({ total: 0 });
      } finally {
        await f.close();
      }
    },
  );
  it.each(SOCIAL_READS)(
    "$name preserves the existing empty-page fallback on outage",
    async (read) => {
      const f = await fixture(true);
      try {
        expect(await f.compare(read)).toEqual(
          read.path === "starred-repositories"
            ? { repositories: [], total: 0 }
            : { users: [], total: 0 },
        );
        expect(f.fetchPage).toHaveBeenCalledTimes(3);
      } finally {
        await f.close();
      }
    },
  );
});
