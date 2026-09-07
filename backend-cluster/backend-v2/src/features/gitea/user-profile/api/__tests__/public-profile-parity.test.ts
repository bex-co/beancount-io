import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { graphql } from "graphql";
import { buildSchema } from "type-graphql";
import { UserProfileResolver } from "../user-profile-resolver";
import { UserProfileService } from "../../service/user-profile-service";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";
import type { Identity } from "@/server/api/identity";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_ada",
  method: "oauth",
  scopes: new Set(),
  ledgerScope: "ada/personal",
};
const date = "2026-09-01T00:00:00.000Z";
const repo = {
  name: "public",
  full_name: "ada/public",
  description: "Public ledger",
  private: false,
  created_at: date,
  updated_at: date,
};
const privateRepo = {
  ...repo,
  name: "private",
  full_name: "ada/private",
  private: true,
};
const fields =
  "profile{username fullName avatarUrl bio location website followersCount followingCount starredReposCount created} isFollowing activities{id type content createdAt repoName repoFullName} repositories{name fullName description isPrivate createdAt updatedAt}";
let resolver: UserProfileResolver;
let schemaPromise: ReturnType<typeof buildSchema>;

async function fixture(
  caller: Identity | undefined,
  failure?: "profile" | "activities",
) {
  const privateReads = jest.fn();
  const activity = {
    id: 1,
    op_type: "commit_repo",
    created: date,
    repo: privateRepo,
  };
  const publicClient = {
    users: {
      userGet: async (username: string) => {
        if (failure === "profile") throw new Error("Profile unavailable");
        return {
          data: {
            login: username,
            full_name: "Ada",
            avatar_url: "https://example.test/avatar",
            description: "Books",
            location: "Paris",
            website: "https://example.test",
            followers_count: 3,
            following_count: 4,
            starred_repos_count: 5,
            created: date,
          },
        };
      },
      userListActivityFeeds: async () => ({ data: [] }),
      userListRepos: async (_username: string, opts: { limit: number }) => {
        expect(opts.limit).toBe(50);
        return { data: [repo] };
      },
    },
  };
  const factory = {
    getAnonymousApiClient: () => publicClient,
    getUserApiClient: async (userId: string) => {
      expect(userId).toBe("usr_ada");
      return {
        user: { userCurrentCheckFollowing: async () => ({ status: 204 }) },
        users: {
          userListActivityFeeds: async (
            _username: string,
            opts: { limit: number },
          ) => {
            privateReads("activities");
            expect(opts.limit).toBe(20);
            if (failure === "activities")
              throw new Error("Activity source unavailable");
            return { data: [activity] };
          },
          userListRepos: async (_username: string, opts: { limit: number }) => {
            privateReads("repositories");
            expect(opts.limit).toBe(50);
            return { data: [repo, privateRepo] };
          },
        },
      };
    },
  };
  const service = new UserProfileService(
    factory as never,
    { user: { getById: async () => ({ ledger_username: "ada" }) } } as never,
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
  rest.setIdentity(caller);
  const mcp = assembleMcpRegistry(
    {
      identity: caller ?? identity,
      socialService: service,
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "public-profile-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), mcp.connect(b)]);
  return {
    privateReads,
    rest: (username: string) =>
      fetch(
        `${rest.url}/api-gateway/v1/social/profile?${new URLSearchParams({ username })}`,
      ),
    gql: (username: string) =>
      graphql({
        schema,
        source: `{getUserProfile(username:${JSON.stringify(username)}){${fields}}}`,
        contextValue: { identity: caller, userId: caller?.userId },
      }),
    read: async (username: string) => {
      const r = await client.readResource({
        uri: `beancount://social/profile?${new URLSearchParams({ username })}`,
      });
      const c = r.contents[0];
      if (!("text" in c)) throw new Error("Expected JSON");
      return JSON.parse(c.text);
    },
    close: async () => {
      await client.close();
      await mcp.close();
      await rest.close();
    },
  };
}

describe("public profile enrichment across adapters", () => {
  it.each(["ada", "other + café"])(
    "preserves authenticated visibility for %s",
    async (username) => {
      const f = await fixture(identity);
      try {
        const r = await f.rest(username);
        expect(r.status).toBe(200);
        const profile = await r.json();
        expect(profile.profile).toMatchObject({
          username,
          followersCount: 3,
          starredReposCount: 5,
          created: date,
        });
        expect(profile.isFollowing).toBe(true);
        const g = await f.gql(username);
        expect(g.errors).toBeUndefined();
        expect(g.data?.getUserProfile).toEqual(profile);
        expect(await f.read(username)).toEqual(profile);
        expect(profile.repositories).toHaveLength(username === "ada" ? 2 : 1);
        expect(profile.activities).toHaveLength(username === "ada" ? 1 : 0);
        if (username !== "ada") expect(f.privateReads).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it("keeps anonymous views public and maps absent follow status to GraphQL null", async () => {
    const f = await fixture(undefined);
    try {
      const r = await f.rest("ada");
      expect(r.status).toBe(200);
      const profile = await r.json();
      expect(profile.isFollowing).toBeUndefined();
      expect(profile.activities).toEqual([]);
      expect(profile.repositories).toHaveLength(1);
      const g = await f.gql("ada");
      expect(g.errors).toBeUndefined();
      expect(g.data?.getUserProfile).toEqual({ ...profile, isFollowing: null });
      expect(f.privateReads).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  it("preserves partial enrichment on an activity-source failure", async () => {
    const f = await fixture(identity, "activities");
    try {
      const profile = await (await f.rest("ada")).json();
      expect(profile.activities).toEqual([]);
      expect(profile.repositories).toHaveLength(2);
      expect((await f.gql("ada")).data?.getUserProfile).toEqual(profile);
      expect(await f.read("ada")).toEqual(profile);
    } finally {
      await f.close();
    }
  });
  it("fails every adapter when the profile itself cannot be read", async () => {
    const f = await fixture(identity, "profile");
    try {
      expect((await f.rest("ada")).status).toBe(500);
      expect((await f.gql("ada")).errors).toBeDefined();
      await expect(f.read("ada")).rejects.toThrow();
      expect(f.privateReads).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
