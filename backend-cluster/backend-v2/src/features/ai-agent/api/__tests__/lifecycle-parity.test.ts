import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
jest.mock("@/features/plaid/utils/encryption", () => ({
  decryptToken: () => "fixture-bank-token",
}));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { LedgerMutationResolver } from "@/features/ledger/api/resolvers/ledger-resolver.mutation";
import { LedgerQueryResolver } from "@/features/ledger/api/resolvers/ledger-resolver.query";
import {
  defaultLedgerTemplate,
  ledgerWithMultipleFilesTemplate,
} from "@/features/ledger/utils/ledger-template";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
  AUTHORIZATION_ACTIONS,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";
const config = {
  api: { scopeEnforcement: "enforce" },
  gitea: { hostname: "example.com", externalHttpPort: 443, sshPort: 22 },
} as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.admin"]),
  tokenId: "tok_lifecycle",
};
const seed = {
  id: 42,
  name: "main",
  full_name: "alice/main",
  empty: false,
  private: true,
  size: 42,
  created_at: "2026-01-01",
  updated_at: "2026-09-01",
  description: "books",
  permissions: { admin: true, pull: true, push: true },
};
const fields =
  "id name fullName sshUrl httpUrl empty private size createdAt updatedAt description permissions{admin pull push}";
const envelope = (data: unknown) => ({ data: { success: true, data } });
let resolvers: Map<unknown, object>;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;
type Surface = "rest" | "mcp" | "gql";
const surfaces: Surface[] = ["rest", "mcp", "gql"];
async function fixture(caller = identity) {
  const records = new Map<string, typeof seed>([["alice/main", { ...seed }]]);
  let bankRows = [{ id: "fixture_item", accessToken: "fixture-encrypted" }];
  const events: string[] = [];
  const repoGet = jest.fn(async (owner: string, name: string) => {
    const r = records.get(`${owner}/${name}`);
    if (!r) throw { status: 404 };
    return { data: r };
  });
  const evaluator = new SourceBackedRelationshipEvaluator(
    {} as never,
    {} as never,
    { getUserApiClient: async () => ({ repos: { repoGet } }) } as never,
    {} as never,
  );
  const authorization = new AuthorizationService(evaluator, jest.fn());
  const authorize = jest.spyOn(authorization, "authorizeOrThrow");
  const list = jest.fn(async () => envelope([...records.values()]));
  const create = jest.fn(
    async (input: {
      name: string;
      description?: string | null;
      private?: boolean | null;
      files: Record<string, string>;
    }) => {
      const value = {
        ...seed,
        id: 43,
        name: input.name,
        full_name: `alice/${input.name}`,
        description: input.description ?? "",
        private: input.private ?? false,
      };
      records.set(value.full_name, value);
      return envelope(value);
    },
  );
  const update = jest.fn(
    async (
      owner: string,
      name: string,
      input: {
        name?: string | null;
        description?: string | null;
        private?: boolean | null;
      },
    ) => {
      const id = `${owner}/${name}`;
      const old = records.get(id)!;
      const value = {
        ...old,
        name: input.name ?? old.name,
        description: input.description ?? old.description,
        private: input.private ?? old.private,
      };
      value.full_name = `${owner}/${value.name}`;
      records.delete(id);
      records.set(value.full_name, value);
      return envelope(value);
    },
  );
  const get = jest.fn(async (owner: string, name: string) =>
    envelope(records.get(`${owner}/${name}`)),
  );
  const remove = jest.fn(async (owner: string, name: string) => {
    events.push("repository-delete");
    records.delete(`${owner}/${name}`);
    return envelope(null);
  });
  const ledgers = {
    listLedgers: list,
    createLedger: create,
    updateLedger: update,
    getLedger: get,
    deleteLedger: remove,
  };
  const getApiContext = jest.fn(async () => ({ favaApiClient: { ledgers } }));
  const getPublicApiClient = jest.fn(async () => ({ ledgers }));
  const subscriptions = jest.fn(async () => [{ status: "active" }]);
  const deleteBankRows = jest.fn(async () => {
    events.push("local-bank-delete");
    bankRows = [];
  });
  const removeItem = jest.fn(async () => {
    events.push("bank-revoke");
  });
  const db = {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const prior = bankRows;
      try {
        return await fn({});
      } catch (error) {
        bankRows = prior;
        throw error;
      }
    },
  };
  const models = {
    user: { getById: async () => ({ ledger_username: "alice" }) },
    paidCustomer: {
      findByUserIdWithActivePeriod: async () => null,
      findByUserId: async () => [],
    },
    plaidItem: {
      getByLedgerRepoId: async () => bankRows,
      deleteByLedgerRepoId: deleteBankRows,
    },
  };
  const workflow = new LedgerWorkflow(
    { getApiContext, getPublicApiClient } as never,
    {} as never,
    { removeItem } as never,
    { listSubscriptions: subscriptions } as never,
    {} as never,
    models as never,
    db as never,
    config,
    authorization,
  );
  resolvers = new Map<unknown, object>([
    [LedgerMutationResolver, new LedgerMutationResolver(workflow)],
    [LedgerQueryResolver, new LedgerQueryResolver(workflow)],
  ]);
  schemaPromise ??= buildSchema({
    resolvers: [LedgerMutationResolver, LedgerQueryResolver],
    container: { get: (ctor) => resolvers.get(ctor) },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const rest = await startV1TestServer(
    { workflows: { ledger: workflow } } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(caller);
  const server = assembleMcpRegistry(
    {
      identity: caller,
      ledgerWorkflow: workflow,
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "lifecycle-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    records,
    events,
    bankRows: () => bankRows,
    create,
    update,
    remove,
    removeItem,
    get,
    subscriptions,
    deleteBankRows,
    authorize,
    getApiContext,
    getPublicApiClient,
    repoGet,
    client,
    call: async (
      surface: Surface,
      operation: "create" | "update" | "delete",
      input: Record<string, unknown> = {},
      ledgerId = "alice/main",
    ) => {
      if (surface === "rest") {
        const suffix =
          operation === "create"
            ? ""
            : `/${ledgerId.split("/").map(encodeURIComponent).join("/")}`;
        const r = await fetch(`${rest.url}/api-gateway/v1/ledgers${suffix}`, {
          method: { create: "POST", update: "PUT", delete: "DELETE" }[
            operation
          ],
          ...(operation !== "delete" && {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          }),
        });
        return { failed: !r.ok, data: await r.json(), status: r.status };
      }
      if (surface === "mcp") {
        const r = await client.callTool({
          name: "manageLedgers",
          arguments: {
            operation,
            ...(operation !== "create" && { ledger: ledgerId }),
            ...input,
          },
        });
        return {
          failed: r.isError === true,
          data: (r.structuredContent as { result?: unknown } | undefined)
            ?.result,
        };
      }
      const args = { ...(operation !== "create" && { ledgerId }), ...input };
      const formatted = Object.entries(args)
        .map(
          ([k, v]) =>
            `${k}:${k === "template" && v !== null ? v : JSON.stringify(v)}`,
        )
        .join(",");
      const field = `${operation}Ledger`;
      const r = await graphql({
        schema,
        source: `mutation{${field}(${formatted}){${operation === "delete" ? "ledgerId" : fields}}}`,
        contextValue: { identity: caller, getCurrentIdentity: () => caller },
      });
      return { failed: Boolean(r.errors), data: r.data?.[field] };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}
function expected(name: string, description: string, privateValue: boolean) {
  return {
    id: `alice/${name}`,
    name,
    fullName: `alice/${name}`,
    sshUrl: `ssh://git@example.com:22/alice/${name}.git`,
    httpUrl: `https://example.com/alice/${name}.git`,
    empty: false,
    private: privateValue,
    size: 42,
    createdAt: seed.created_at,
    updatedAt: seed.updated_at,
    description,
    permissions: seed.permissions,
  };
}
describe("ledger lifecycle through actual adapters and workflow", () => {
  it.each(surfaces)(
    "creates both templates and updates repository state via %s",
    async (surface) => {
      const f = await fixture();
      try {
        for (const template of [undefined, "SAMPLE"]) {
          const name = template ? "sample" : "starter";
          const result = await f.call(surface, "create", {
            name,
            description: "café",
            private: false,
            ...(template && { template }),
          });
          expect(result.failed).toBe(false);
          expect(result.data).toEqual(expected(name, "café", false));
          expect(f.create.mock.calls.at(-1)?.[0].files).toEqual(
            template ? ledgerWithMultipleFilesTemplate : defaultLedgerTemplate,
          );
        }
        const result = await f.call(surface, "update", {
          name: "renamed",
          description: "",
          private: false,
        });
        expect(result.failed).toBe(false);
        expect(result.data).toEqual(expected("renamed", "", false));
        expect(f.records.has("alice/main")).toBe(false);
        expect(f.records.get("alice/renamed")?.private).toBe(false);
        expect(f.authorize.mock.calls.map(([v]) => v.action)).toEqual([
          AUTHORIZATION_ACTIONS.LEDGER_CREATE,
          AUTHORIZATION_ACTIONS.LEDGER_CREATE,
          AUTHORIZATION_ACTIONS.LEDGER_ADMINISTRATION_UPDATE,
        ]);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "preserves nullable lifecycle inputs via %s",
    async (surface) => {
      const f = await fixture();
      try {
        expect(
          (
            await f.call(surface, "create", {
              name: "nullable",
              description: null,
              private: null,
              template: null,
            })
          ).failed,
        ).toBe(false);
        expect(f.create.mock.calls[0][0]).toMatchObject({
          description: null,
          private: null,
        });
        expect(
          (
            await f.call(surface, "update", {
              name: null,
              description: null,
              private: null,
            })
          ).failed,
        ).toBe(false);
        expect(f.update.mock.calls[0][2]).toEqual({
          name: null,
          description: null,
          private: null,
        });
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "deletes repository and linked-bank metadata in the existing order via %s",
    async (surface) => {
      const f = await fixture();
      try {
        const r = await f.call(surface, "delete");
        expect(r.failed).toBe(false);
        expect(r.data).toEqual({ ledgerId: "alice/main" });
        expect(f.records.size).toBe(0);
        expect(f.bankRows()).toEqual([]);
        expect(f.events).toEqual([
          "bank-revoke",
          "local-bank-delete",
          "repository-delete",
        ]);
        expect(f.removeItem).toHaveBeenCalledWith("fixture-bank-token");
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "rolls back local cleanup when repository deletion fails via %s",
    async (surface) => {
      const f = await fixture();
      f.remove.mockRejectedValue(new Error("repository unavailable"));
      try {
        expect((await f.call(surface, "delete")).failed).toBe(true);
        expect(f.records.has("alice/main")).toBe(true);
        expect(f.bankRows()).toHaveLength(1);
        expect(f.events).toEqual(["bank-revoke", "local-bank-delete"]);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "tolerates remote bank cleanup failure as GraphQL does via %s",
    async (surface) => {
      const f = await fixture();
      f.removeItem.mockRejectedValue(new Error("bank unavailable"));
      try {
        expect((await f.call(surface, "delete")).failed).toBe(false);
        expect(f.records.size).toBe(0);
        expect(f.bankRows()).toEqual([]);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "enforces ledger quota before creating any repository via %s",
    async (surface) => {
      const f = await fixture();
      f.subscriptions.mockResolvedValue([]);
      try {
        expect(
          (await f.call(surface, "create", { name: "over-limit" })).failed,
        ).toBe(true);
        expect(f.create).not.toHaveBeenCalled();
        expect(f.records.size).toBe(1);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "refuses all lifecycle operations without admin authority via %s",
    async (surface) => {
      const f = await fixture({
        ...identity,
        scopes: new Set(["ledger.write"]),
      });
      try {
        for (const operation of ["create", "update", "delete"] as const)
          expect(
            (
              await f.call(
                surface,
                operation,
                operation === "create" ? { name: "denied" } : {},
              )
            ).failed,
          ).toBe(true);
        expect(f.getApiContext).not.toHaveBeenCalled();
        expect(f.getPublicApiClient).not.toHaveBeenCalled();
        expect(f.removeItem).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "keeps account creation distinct from pinned-ledger changes via %s",
    async (surface) => {
      const f = await fixture({ ...identity, ledgerScope: "other/books" });
      try {
        expect(
          (await f.call(surface, "create", { name: "account-new" })).failed,
        ).toBe(false);
        for (const operation of ["update", "delete"] as const)
          expect((await f.call(surface, operation)).failed).toBe(true);
        expect(f.update).not.toHaveBeenCalled();
        expect(f.remove).not.toHaveBeenCalled();
        expect(f.removeItem).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "rejects invalid ledger names without side effects via %s",
    async (surface) => {
      const f = await fixture();
      try {
        for (const name of ["Bad Name", "a".repeat(101), ""])
          for (const operation of ["create", "update"] as const)
            expect((await f.call(surface, operation, { name })).failed).toBe(
              true,
            );
        expect(f.create).not.toHaveBeenCalled();
        expect(f.update).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it("rejects unknown MCP branches and incompatible arguments", async () => {
    const f = await fixture();
    try {
      for (const args of [
        { operation: "invalid" },
        { operation: "create" },
        { operation: "create", name: "new", ledger: "alice/main" },
        { operation: "update", ledger: "alice/main", template: "SAMPLE" },
        { operation: "delete", ledger: "alice/main", name: "other" },
        { operation: "delete", ledger: "alice/main", dry_run: true },
      ])
        expect(
          (await f.client.callTool({ name: "manageLedgers", arguments: args }))
            .isError,
        ).toBe(true);
      expect(f.create).not.toHaveBeenCalled();
      expect(f.update).not.toHaveBeenCalled();
      expect(f.remove).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  it.each(surfaces)(
    "refuses revoked administrative relationships and source outages via %s",
    async (surface) => {
      const f = await fixture();
      try {
        f.records.get("alice/main")!.permissions = {
          ...seed.permissions,
          admin: false,
        };
        for (const operation of ["update", "delete"] as const)
          expect((await f.call(surface, operation)).failed).toBe(true);
        f.repoGet.mockRejectedValue(new Error("repository source unavailable"));
        for (const operation of ["update", "delete"] as const)
          expect((await f.call(surface, operation)).failed).toBe(true);
        expect(f.update).not.toHaveBeenCalled();
        expect(f.remove).not.toHaveBeenCalled();
        expect(f.removeItem).not.toHaveBeenCalled();
        expect(f.getPublicApiClient).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "preserves best-effort metadata lookup during deletion via %s",
    async (surface) => {
      const f = await fixture();
      f.get.mockRejectedValue(new Error("metadata unavailable"));
      try {
        expect((await f.call(surface, "delete")).failed).toBe(false);
        expect(f.records.size).toBe(0);
        expect(f.bankRows()).toHaveLength(1);
        expect(f.removeItem).not.toHaveBeenCalled();
        expect(f.deleteBankRows).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it("uses a pinned target when the MCP mutation omits ledger", async () => {
    const f = await fixture({ ...identity, ledgerScope: "alice/main" });
    try {
      const result = await f.client.callTool({
        name: "manageLedgers",
        arguments: { operation: "update", description: "pinned" },
      });
      expect(result.isError).not.toBe(true);
      expect(f.records.get("alice/main")?.description).toBe("pinned");
    } finally {
      await f.close();
    }
  });
});
