import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { PlaidItemService } from "@/features/plaid/service/plaid-item-service";
import { PlaidQueryResolver } from "@/features/plaid/api/resolvers/plaid-resolver.query";
import { PlaidMutationResolver } from "@/features/plaid/api/resolvers/plaid-resolver.mutation";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { formatError } from "@/server/graphql/format-error";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

/**
 * w23/004. `banks/{itemId}` looked the item up before authorizing and ignored
 * the ledger in its path: a missing id answered BAD_USER_INPUT "Plaid Item
 * not found" while an existing foreign one answered the concealed NOT_FOUND,
 * a credential without bank authority learned which ids exist, and another
 * ledger's bank was returned under this ledger's URI.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const REPOS: Record<string, number> = { "alice/main": 1, "alice/other": 2 };
const ITEMS = {
  pitm_main: { userId: "usr_alice", ledgerRepoId: 1 },
  pitm_other: { userId: "usr_alice", ledgerRepoId: 2 },
  pitm_bob: { userId: "usr_bob", ledgerRepoId: 1 },
} as const;
const admin: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_admin",
};
const readWrite: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  tokenId: "tok_rw",
  ledgerScope: "alice/main",
};

const stored = (id: keyof typeof ITEMS) => ({
  id,
  itemId: `plaid-${id}`,
  institutionId: "ins_1",
  institutionName: "Fixture Bank",
  status: "active",
  createdAt: new Date("2026-10-01T00:00:00Z"),
  updatedAt: new Date("2026-10-01T00:00:00Z"),
  ...ITEMS[id],
});

let currentResolver: PlaidQueryResolver;
let currentMutation: PlaidMutationResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [PlaidQueryResolver, PlaidMutationResolver],
    container: {
      get: (ctor) =>
        ctor === PlaidMutationResolver ? currentMutation : currentResolver,
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

async function fixture(identity: Identity) {
  const getById = jest.fn(async (_db: unknown, id: string) =>
    id in ITEMS ? stored(id as keyof typeof ITEMS) : null,
  );
  const fava = {
    getAdminClient: () => ({
      ledgers: {
        getLedger: async (owner: string, name: string) => ({
          data: { success: true, data: { id: REPOS[`${owner}/${name}`] } },
        }),
      },
      admin: {
        getLedgerByRepoId: async (repoId: number) => ({
          data: {
            success: true,
            data: {
              full_name: Object.keys(REPOS).find((k) => REPOS[k] === repoId),
            },
          },
        }),
      },
    }),
  };
  const gitea = {
    getUserApiClient: async () => ({
      repos: {
        repoGet: async (owner: string, name: string) => ({
          data: {
            id: REPOS[`${owner}/${name}`],
            permissions: { admin: true, push: true, pull: true },
          },
        }),
      },
    }),
  };
  const getAccountById = jest.fn(async (_db: unknown, id: string) =>
    id === "pacc_main"
      ? { id, plaidItemId: "pitm_main", accountName: "Checking" }
      : null,
  );
  const updateForItem = jest.fn(async () => true);
  const models = {
    plaidItem: { getById },
    plaidAccount: { getById: getAccountById, updateForItem },
  };
  const authorization = new AuthorizationService(
    new SourceBackedRelationshipEvaluator(
      {} as never,
      models as never,
      gitea as never,
      fava as never,
    ),
    jest.fn(),
  );
  const service = new PlaidItemService(
    {} as never,
    fava as never,
    models as never,
    {} as never,
    authorization,
  );
  currentResolver = new PlaidQueryResolver(service);
  currentMutation = new PlaidMutationResolver(service, {} as never);
  const rest = await startV1TestServer(
    { services: { plaidItem: service } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    {
      identity,
      services: { plaidItem: service },
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "bank-item-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    getById,
    getAccountById,
    updateForItem,
    /** Map a bank account on each surface; each result's code, or `ok`. */
    map: async (accountId: string) => {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/bank-accounts/${accountId}/mapping`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ledgerAccount: "Assets:Bank" }),
        },
      );
      const restCode =
        response.status === 200
          ? "ok"
          : ((await response.json()) as { error: { code: string } }).error.code;
      const tool = await client.callTool({
        name: "mapBankAccount",
        arguments: {
          ledger: "alice/main",
          account_id: accountId,
          ledger_account: "Assets:Bank",
        },
      });
      const mcpCode = tool.isError
        ? (tool.structuredContent as { error: { code: string } }).error.code
        : "ok";
      const gql = await graphql({
        schema,
        source: `mutation { updatePlaidAccountMapping(accountId: ${JSON.stringify(accountId)}, ledgerAccount: "Assets:Bank", ledgerId: "alice/main") }`,
        contextValue: { identity, getCurrentIdentity: () => identity },
      });
      const gqlError = gql.errors?.[0];
      const gqlCode = gqlError
        ? formatError(gqlError.toJSON(), gqlError).extensions?.code
        : "ok";
      return { rest: restCode, mcp: mcpCode, gql: gqlCode };
    },
    rest: async (id: string, ledger = "alice/main") => {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/${ledger}/banks/${id}`,
      );
      const body = (await response.json()) as {
        id?: string;
        error?: { code: string; message: string };
      };
      return { status: response.status, body };
    },
    mcp: (id: string, ledger = "alice/main") =>
      client.readResource({ uri: `beancount://${ledger}/banks/${id}` }),
    gql: async (id: string) => {
      const result = await graphql({
        schema,
        source: `query($id: String!) { getPlaidItem(id: $id) { id } }`,
        variableValues: { id },
        contextValue: { identity, getCurrentIdentity: () => identity },
      });
      return result;
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

const gqlCode = (result: Awaited<ReturnType<typeof graphql>>) => {
  const error = result.errors?.[0];
  if (!error) throw new Error("Expected a GraphQL error");
  return formatError(error.toJSON(), error).extensions?.code;
};

describe("one linked bank on REST, MCP and GraphQL", () => {
  it("returns the ledger's own bank on every surface", async () => {
    const f = await fixture(admin);
    try {
      const rest = await f.rest("pitm_main");
      expect(rest.status).toBe(200);
      expect(rest.body.id).toBe("pitm_main");
      const mcp = await f.mcp("pitm_main");
      const content = mcp.contents[0];
      if (!("text" in content)) throw new Error("Expected text");
      expect(JSON.parse(content.text).id).toBe("pitm_main");
      const gql = await f.gql("pitm_main");
      expect(gql.errors).toBeUndefined();
      expect(gql.data).toEqual({ getPlaidItem: { id: "pitm_main" } });
    } finally {
      await f.close();
    }
  });

  it.each([
    ["a missing id", "pitm_missing"],
    ["another user's bank on this ledger", "pitm_bob"],
  ])(
    "conceals %s as the same NOT_FOUND on every surface",
    async (_case, id) => {
      const f = await fixture(admin);
      try {
        const rest = await f.rest(id);
        expect(rest.status).toBe(404);
        expect(rest.body.error).toMatchObject({
          code: "NOT_FOUND",
          message: "Bank connection not found",
        });
        await expect(f.mcp(id)).rejects.toMatchObject({
          data: { code: "NOT_FOUND" },
        });
        expect(gqlCode(await f.gql(id))).toBe("NOT_FOUND");
        expect((await f.gql(id)).errors?.[0]?.message).toBe(
          "Bank connection not found",
        );
      } finally {
        await f.close();
      }
    },
  );

  it("does not return another ledger's bank under this ledger's path", async () => {
    const f = await fixture(admin);
    try {
      const rest = await f.rest("pitm_other");
      expect(rest.status).toBe(404);
      expect(rest.body.error).toMatchObject({
        code: "NOT_FOUND",
        message: "Bank connection not found",
      });
      await expect(f.mcp("pitm_other")).rejects.toMatchObject({
        data: { code: "NOT_FOUND" },
      });
      // Under its own ledger it is still reachable, and GraphQL, which names
      // no ledger, resolves the item's own.
      expect((await f.rest("pitm_other", "alice/other")).status).toBe(200);
      expect((await f.gql("pitm_other")).data).toEqual({
        getPlaidItem: { id: "pitm_other" },
      });
    } finally {
      await f.close();
    }
  });

  it("refuses a credential without bank authority before looking the id up", async () => {
    const f = await fixture(readWrite);
    try {
      for (const id of ["pitm_main", "pitm_missing"]) {
        const rest = await f.rest(id);
        expect(rest.status).toBe(403);
        expect(rest.body.error?.code).toBe("FORBIDDEN");
        await expect(f.mcp(id)).rejects.toMatchObject({
          data: { code: "FORBIDDEN" },
        });
      }
      expect(f.getById).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});

/**
 * w23/024. The account-level bank tools looked the account up before
 * authorizing: a credential without bank authority was told "Account not
 * found" (BAD_USER_INPUT) for a missing id, an argument error for a scope
 * problem, and the answer differed by whether the id existed.
 */
describe("mapping a bank account on REST, MCP and GraphQL", () => {
  it("maps the ledger's own account", async () => {
    const f = await fixture(admin);
    try {
      expect(await f.map("pacc_main")).toEqual({
        rest: "ok",
        mcp: "ok",
        gql: "ok",
      });
      expect(f.updateForItem).toHaveBeenCalledTimes(3);
    } finally {
      await f.close();
    }
  });

  it("answers a missing account with the concealed NOT_FOUND", async () => {
    const f = await fixture(admin);
    try {
      expect(await f.map("nope")).toEqual({
        rest: "NOT_FOUND",
        mcp: "NOT_FOUND",
        gql: "NOT_FOUND",
      });
      expect(f.updateForItem).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("refuses a credential without bank authority before any lookup", async () => {
    const f = await fixture(readWrite);
    try {
      for (const accountId of ["pacc_main", "nope"])
        expect(await f.map(accountId)).toEqual({
          rest: "FORBIDDEN",
          mcp: "FORBIDDEN",
          gql: "FORBIDDEN",
        });
      expect(f.getAccountById).not.toHaveBeenCalled();
      expect(f.updateForItem).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
