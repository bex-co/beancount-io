import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { graphql } from "graphql";
import { buildSchema, registerEnumType } from "type-graphql";
import { AccountResolver } from "../account-resolver";
import { AccountService } from "../../service/account-service";
import { ReportStatus } from "../../utils/report-status";
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
  scopes: new Set(),
  ledgerScope: "ada/personal",
};
const surfaces = ["rest", "gql", "mcp"] as const;
let resolver: AccountResolver;
let schemaPromise: ReturnType<typeof buildSchema>;
registerEnumType(ReportStatus, { name: "ReportStatus" });

async function fixture(identity = caller, failure?: "billing" | "ledger") {
  const rows = new Set(["user", "paid", "jwt", "plaid", "email", "other-user"]);
  const effects: string[] = [];
  const remove = (table: string) => async (_tx: unknown, userId: string) => {
    expect(userId).toBe("usr_ada");
    effects.push(table);
    rows.delete(table);
  };
  const getById = jest.fn(async () => ({
    id: "usr_ada",
    ledger_username: "ada",
  }));
  const models = {
    user: { getById, deleteByUserId: remove("user") },
    paidCustomer: {
      findByUserId: async () => [{ id: "paid" }],
      deleteByUserId: remove("paid"),
    },
    jwt: { deleteByUserId: remove("jwt") },
    plaidItem: { getByUserId: async () => [], deleteByUserId: remove("plaid") },
    emailToken: {
      deleteByUserId: async (userId: string) => remove("email")(null, userId),
    },
  };
  const cancel = jest.fn(async () => {
    effects.push("cancel");
    return { success: failure !== "billing" };
  });
  const db = {
    transaction: async (run: (tx: unknown) => Promise<void>) => {
      const before = new Set(rows);
      try {
        await run({});
      } catch (error) {
        rows.clear();
        for (const row of before) rows.add(row);
        throw error;
      }
    },
  };
  const deleteLedgerUser = jest.fn(async (username: string) => {
    expect(username).toBe("ada");
    effects.push("ledger");
    if (failure === "ledger") throw new Error("Ledger service unavailable");
  });
  const service = new AccountService(
    models as never,
    db as never,
    {
      listSubscriptions: async () => [
        { id: "sub_live", clientId: "client", status: "active" },
        { id: "sub_ended", clientId: "client", status: "canceled" },
      ],
      deleteSubscription: cancel,
    } as never,
    {
      getAdminClient: () => ({ admin: { deleteUser: deleteLedgerUser } }),
    } as never,
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
  resolver = new AccountResolver(service);
  schemaPromise ??= buildSchema({
    resolvers: [AccountResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const rest = await startV1TestServer(
    { services: { account: service } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const mcp = assembleMcpRegistry(
    { identity, accountService: service } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "account-delete-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), mcp.connect(b)]);
  return {
    rows,
    url: rest.url,
    effects,
    cancel,
    getById,
    client,
    delete: async (surface: (typeof surfaces)[number]) => {
      if (surface === "rest") {
        const r = await fetch(`${rest.url}/api-gateway/v1/account`, {
          method: "DELETE",
        });
        return { success: r.ok, result: await r.json() };
      }
      if (surface === "gql") {
        const r = await graphql({
          schema,
          source: "mutation{deleteAccount}",
          contextValue: {
            identity,
            userId: identity.userId,
            getCurrentIdentity: () => identity,
          },
        });
        return { success: !r.errors, result: r.data?.deleteAccount };
      }
      const r = await client.callTool({ name: "deleteAccount", arguments: {} });
      return {
        success: !r.isError,
        result: (r.structuredContent as { result?: boolean } | undefined)
          ?.result,
      };
    },
    close: async () => {
      await client.close();
      await mcp.close();
      await rest.close();
    },
  };
}

describe("account deletion through real transports and the existing cleanup service", () => {
  it.each(surfaces)(
    "%s preserves OAuth eligibility and all cleanup effects",
    async (surface) => {
      const f = await fixture();
      try {
        expect(await f.delete(surface)).toEqual({
          success: true,
          result: true,
        });
        expect(f.effects).toEqual([
          "cancel",
          "plaid",
          "paid",
          "jwt",
          "user",
          "ledger",
          "email",
        ]);
        expect([...f.rows]).toEqual(["other-user"]);
        expect(f.cancel).toHaveBeenCalledTimes(1);
        expect(f.cancel).toHaveBeenCalledWith("sub_live", "usr_ada", "client");
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "%s rejects API keys before any account lookup or cleanup",
    async (surface) => {
      const f = await fixture({
        ...caller,
        method: "apikey",
        scopes: new Set(["ledger.admin"]),
      });
      try {
        expect((await f.delete(surface)).success).toBe(false);
        expect(f.effects).toEqual([]);
        expect(f.getById).not.toHaveBeenCalled();
        expect([...f.rows]).toEqual([
          "user",
          "paid",
          "jwt",
          "plaid",
          "email",
          "other-user",
        ]);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "%s stops at failed subscription cancellation",
    async (surface) => {
      const f = await fixture(caller, "billing");
      try {
        expect((await f.delete(surface)).success).toBe(false);
        expect(f.effects).toEqual(["cancel"]);
        expect([...f.rows]).toEqual([
          "user",
          "paid",
          "jwt",
          "plaid",
          "email",
          "other-user",
        ]);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "%s rolls back local rows when ledger-user deletion fails",
    async (surface) => {
      const f = await fixture(caller, "ledger");
      try {
        expect((await f.delete(surface)).success).toBe(false);
        expect([...f.rows]).toEqual([
          "user",
          "paid",
          "jwt",
          "plaid",
          "email",
          "other-user",
        ]);
        expect(f.effects).toEqual([
          "cancel",
          "plaid",
          "paid",
          "jwt",
          "user",
          "ledger",
        ]);
      } finally {
        await f.close();
      }
    },
  );
  it("rejects target selectors instead of deleting a different account", async () => {
    const f = await fixture();
    try {
      const r = await f.client.callTool({
        name: "deleteAccount",
        arguments: { userId: "other-user" },
      });
      expect(r.isError).toBe(true);
      const rest = await fetch(
        `${f.url}/api-gateway/v1/account?userId=other-user`,
        { method: "DELETE" },
      );
      expect(rest.status).toBe(400);
      expect(f.getById).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
