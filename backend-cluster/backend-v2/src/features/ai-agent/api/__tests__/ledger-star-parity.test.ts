import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { LedgerMutationResolver } from "@/features/ledger/api/resolvers/ledger-resolver.mutation";
import { LedgerQueryResolver } from "@/features/ledger/api/resolvers/ledger-resolver.query";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { MCP_TOOLS } from "../mcp-tools";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_ada",
  method: "oauth",
  scopes: new Set(["ledger.write"]),
  ledgerScope: "ada/books",
};
const surfaces = ["rest", "gql", "mcp"] as const;
let mutation: LedgerMutationResolver;
let query: LedgerQueryResolver;
let schemaPromise: ReturnType<typeof buildSchema>;
async function fixture(caller = identity) {
  const stars = new Set<string>();
  const state = { readable: true, unavailable: false, writeFailure: false };
  const write = jest.fn(
    async (starred: boolean, owner: string, name: string) => {
      if (state.writeFailure) throw new Error("Upstream write failed");
      const key = `${caller.userId}:${owner}/${name}`;
      if (starred) stars.add(key);
      else stars.delete(key);
    },
  );
  const repoGet = jest.fn(async () => {
    if (state.unavailable) throw new Error("Ledger source unavailable");
    return { data: { success: true, data: { id: 42, private: true } } };
  });
  const models = {
    user: {
      getUserByUsername: async () => ({ id: "usr_owner" }),
      getById: async () => ({ id: caller.userId, ledger_username: "reader" }),
    },
  };
  const fava = {
    getAdminClient: () => ({ ledgers: { getLedger: repoGet } }),
    getApiContext: async () => ({
      favaApiClient: {
        collaborators: {
          getLedgerCollaboratorPermission: async () => ({
            data: {
              success: true,
              data: { permission: state.readable ? "read" : "none" },
            },
          }),
        },
      },
    }),
  };
  const factory = {
    getUserApiClient: async (userId: string) => {
      expect(userId).toBe(caller.userId);
      return {
        repos: { repoGet },
        user: {
          userCurrentPutStar: (owner: string, name: string) =>
            write(true, owner, name),
          userCurrentDeleteStar: (owner: string, name: string) =>
            write(false, owner, name),
          // Gitea answers 204 when starred and 404 when not.
          userCurrentCheckStarring: async (owner: string, name: string) => {
            if (!stars.has(`${caller.userId}:${owner}/${name}`))
              throw { status: 404 };
            return { status: 204 };
          },
        },
      };
    },
  };
  const authorization = new AuthorizationService(
    new SourceBackedRelationshipEvaluator(
      {} as never,
      models as never,
      factory as never,
      fava as never,
    ),
  );
  const ledgerRecord = {
    id: 42,
    name: "books",
    full_name: "ada/books",
    empty: false,
    private: true,
    size: 1,
    created_at: "2026-01-01",
    updated_at: "2026-09-01",
    description: "",
    permissions: { admin: false, pull: true, push: true },
  };
  const favaFactory = {
    getPublicApiClient: async () => ({
      ledgers: {
        getLedger: async () => ({
          data: { success: true, data: ledgerRecord },
        }),
      },
    }),
  };
  const workflow = new LedgerWorkflow(
    favaFactory as never,
    factory as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { ...config, gitea: { hostname: "example.com", sshPort: 22 } } as never,
    authorization,
  );
  mutation = new LedgerMutationResolver(workflow);
  query = new LedgerQueryResolver(workflow);
  const health = new HealthResolver();
  schemaPromise ??= buildSchema({
    resolvers: [HealthResolver, LedgerMutationResolver, LedgerQueryResolver],
    container: {
      get: (ctor) =>
        ctor === HealthResolver
          ? health
          : ctor === LedgerQueryResolver
            ? query
            : mutation,
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const rest = await startV1TestServer(
    { workflows: { ledger: workflow } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(caller);
  const server = assembleMcpRegistry(
    {
      identity: caller,
      ledgerWorkflow: workflow,
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "star-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    stars,
    state,
    write,
    repoGet,
    client,
    url: rest.url,
    schema,
    call: async (
      surface: (typeof surfaces)[number],
      starred: boolean,
      target = "ada/books",
    ) => {
      if (surface === "rest") {
        const r = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/${target}/star`,
          { method: starred ? "PUT" : "DELETE" },
        );
        return { refused: !r.ok, result: await r.json() };
      }
      if (surface === "gql") {
        const method = starred ? "starLedger" : "unstarLedger";
        const r = await graphql({
          schema,
          source: `mutation{${method}(ledgerId:${JSON.stringify(target)}){success isStarred message}}`,
          contextValue: { identity: caller, getCurrentIdentity: () => caller },
        });
        return { refused: Boolean(r.errors), result: r.data?.[method] };
      }
      const r = await client.callTool({
        name: "setLedgerStar",
        arguments: { starred, ledger: target },
      });
      return {
        refused: Boolean(r.isError),
        result: (r.structuredContent as { result?: unknown } | undefined)
          ?.result,
      };
    },
    /** The caller's star state as each surface's `getLedger` reports it. */
    read: async (surface: (typeof surfaces)[number]) => {
      if (surface === "rest") {
        const r = await fetch(`${rest.url}/api-gateway/v1/ledgers/ada/books`);
        expect(r.status).toBe(200);
        return ((await r.json()) as { isStarred?: boolean }).isStarred;
      }
      if (surface === "gql") {
        const r = await graphql({
          schema,
          source: `{getLedger(ledgerId:"ada/books"){fullName isStarred}}`,
          contextValue: { identity: caller, getCurrentIdentity: () => caller },
        });
        expect(r.errors).toBeUndefined();
        return (r.data?.getLedger as { isStarred?: boolean }).isStarred;
      }
      const r = await client.readResource({
        uri: "beancount://ada/books/metadata",
      });
      const content = r.contents[0];
      if (!("text" in content)) throw new Error("Expected metadata text");
      return (JSON.parse(content.text) as { isStarred?: boolean }).isStarred;
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

/**
 * w23/009. GraphQL resolved `isStarred` as a field; REST `getLedger` and the
 * MCP `metadata` resource serialized the workflow's ledger without it, so a
 * star set through them could never be read back there.
 */
describe("star state reads back on every surface", () => {
  it.each(surfaces)(
    "a star set via %s reads as isStarred on REST, GraphQL and MCP",
    async (writer) => {
      const f = await fixture();
      try {
        for (const surface of surfaces)
          expect(await f.read(surface)).toBe(false);
        expect((await f.call(writer, true)).refused).toBe(false);
        for (const surface of surfaces)
          expect(await f.read(surface)).toBe(true);
        expect((await f.call(writer, false)).refused).toBe(false);
        for (const surface of surfaces)
          expect(await f.read(surface)).toBe(false);
      } finally {
        await f.close();
      }
    },
  );
});

describe("ledger star changes through actual transports and live relationship checks", () => {
  it.each(surfaces)(
    "%s stars and unstars with read access and write capability",
    async (surface) => {
      const f = await fixture();
      try {
        expect(await f.call(surface, true)).toMatchObject({
          refused: false,
          result: { success: true, isStarred: true },
        });
        expect([...f.stars]).toEqual(["usr_ada:ada/books"]);
        expect(await f.call(surface, true)).toMatchObject({
          result: { success: true },
        });
        expect(f.stars.size).toBe(1);
        expect(await f.call(surface, false)).toMatchObject({
          refused: false,
          result: { success: true, isStarred: false },
        });
        expect(f.stars.size).toBe(0);
        expect(f.repoGet).toHaveBeenCalledTimes(3);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "%s preserves failed-write results without a mutation",
    async (surface) => {
      const f = await fixture();
      try {
        f.state.writeFailure = true;
        expect((await f.call(surface, true)).result).toMatchObject({
          success: false,
          isStarred: false,
        });
        expect((await f.call(surface, false)).result).toMatchObject({
          success: false,
          isStarred: true,
        });
        expect(f.stars.size).toBe(0);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)("%s rechecks revocation before unstar", async (surface) => {
    const f = await fixture();
    try {
      await f.call(surface, true);
      f.state.readable = false;
      expect((await f.call(surface, false)).refused).toBe(true);
      expect(f.write).toHaveBeenCalledTimes(1);
      expect(f.stars.size).toBe(1);
    } finally {
      await f.close();
    }
  });
  it.each(surfaces)(
    "%s refuses wrong pins, insufficient scope, and relationship outages",
    async (surface) => {
      const f = await fixture({
        ...identity,
        scopes: new Set(["ledger.read"]),
      });
      try {
        expect((await f.call(surface, true)).refused).toBe(true);
        expect(f.write).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
      const g = await fixture();
      try {
        expect((await g.call(surface, true, "ada/other")).refused).toBe(true);
        g.state.unavailable = true;
        expect((await g.call(surface, true)).refused).toBe(true);
        expect(g.write).not.toHaveBeenCalled();
      } finally {
        await g.close();
      }
    },
  );
  it("names the immediate personal-state change and preview exclusion", async () => {
    // The exclusion is unchanged; reversibility is not evidence that the
    // unstar branch is additive or non-destructive (w6/m11/t008).
    const tool = MCP_TOOLS.find((t) => t.name === "setLedgerStar");
    expect(tool?.description).toContain("No dry_run");
    expect(tool?.description).toContain(
      "false removes an existing star relationship",
    );
  });

  it("refuses the preview flag on REST and offers none on GraphQL or MCP", async () => {
    const f = await fixture();
    try {
      for (const method of ["PUT", "DELETE"]) {
        const r = await fetch(
          `${f.url}/api-gateway/v1/ledgers/ada/books/star`,
          {
            method,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ dryRun: true }),
          },
        );
        expect(r.status).toBe(400);
      }
      expect(f.write).not.toHaveBeenCalled();
      for (const method of ["starLedger", "unstarLedger"]) {
        const r = await graphql({
          schema: f.schema,
          source: `mutation{${method}(ledgerId:"ada/books",dryRun:true){success}}`,
          contextValue: { identity, getCurrentIdentity: () => identity },
        });
        expect(r.errors?.length).toBeGreaterThan(0);
      }
      const tools = await f.client.listTools();
      const input = tools.tools.find((t) => t.name === "setLedgerStar")
        ?.inputSchema as unknown as { properties?: Record<string, unknown> };
      expect(input.properties).not.toHaveProperty("dry_run");
      expect(input.properties).not.toHaveProperty("dryRun");
    } finally {
      await f.close();
    }
  });

  it("defaults MCP to the pin and rejects unknown preview arguments", async () => {
    const f = await fixture();
    try {
      expect(
        (
          await f.client.callTool({
            name: "setLedgerStar",
            arguments: { starred: true },
          })
        ).isError,
      ).not.toBe(true);
      expect([...f.stars]).toEqual(["usr_ada:ada/books"]);
      expect(
        (
          await f.client.callTool({
            name: "setLedgerStar",
            arguments: { starred: false, dry_run: true },
          })
        ).isError,
      ).toBe(true);
      expect(f.write).toHaveBeenCalledTimes(1);
    } finally {
      await f.close();
    }
  });
});
