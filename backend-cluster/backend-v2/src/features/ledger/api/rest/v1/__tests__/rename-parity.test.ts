import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerMutationResolver } from "../../../resolvers/ledger-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
let resolver: LedgerMutationResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerMutationResolver, HealthResolver],
    container: {
      get: (target) =>
        target === LedgerMutationResolver ? resolver : new HealthResolver(),
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

async function fixture(caller = identity) {
  const files = new Map([
    ["old.bean", "; Café\n"],
    ["occupied.bean", "; existing\n"],
  ]);
  const state = { writable: true };
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const change = jest.fn(async (_owner, _name, options) => {
    const op = options.files[0];
    if (!files.has(op.from_path) || files.has(op.path))
      throw new Error("Fixture repository conflict");
    files.set(op.path, files.get(op.from_path)!);
    files.delete(op.from_path);
    return envelope({});
  });
  const fava = {
    getAdminClient: () => ({
      ledgers: { getLedger: async () => envelope({ id: 42, private: true }) },
    }),
    getApiContext: async () => ({
      favaApiClient: {
        collaborators: {
          getLedgerCollaboratorPermission: async () =>
            envelope({ permission: state.writable ? "write" : "read" }),
        },
      },
    }),
    getPublicApiClient: async () => ({
      ledgers: { changeLedgerFiles: change },
    }),
  };
  const models = {
    user: {
      getUserByUsername: async () => ({ id: "usr_owner" }),
      getById: async () => ({ id: caller.userId, ledger_username: "alice" }),
    },
  };
  const authorization = new AuthorizationService(
    new SourceBackedRelationshipEvaluator(
      {} as never,
      models as never,
      {} as never,
      fava as never,
    ),
  );
  const workflow = new LedgerWorkflow(
    fava as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    config,
    authorization,
  );
  resolver = new LedgerMutationResolver(workflow);
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
  const client = new Client({ name: "rename-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    files,
    state,
    change,
    call: async (surface: string, oldPath: string, newPath: string) => {
      const args = { oldPath, newPath, message: "Move café file" };
      if (surface === "rest") {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/rename-file`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(args),
          },
        );
        return {
          success: response.status === 200,
          result: await response.json(),
        };
      }
      if (surface === "gql") {
        const result = await graphql({
          schema,
          source:
            'mutation($oldPath:String!,$newPath:String!,$message:String!) { renameLedgerFile(ledgerId:"alice/main",oldPath:$oldPath,newPath:$newPath,message:$message) { oldPath newPath } }',
          variableValues: args,
          contextValue: { identity: caller, getCurrentIdentity: () => caller },
        });
        return {
          success: !result.errors,
          result: result.data?.renameLedgerFile,
        };
      }
      const result = await client.callTool({
        name: "renameLedgerFile",
        arguments: {
          ...args,
          ...(caller.ledgerScope ? {} : { ledger: "alice/main" }),
        },
      });
      return {
        success: !result.isError,
        result: (result.structuredContent as { result?: unknown })?.result,
      };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe.each(["rest", "gql", "mcp"])("rename via %s", (surface) => {
  it.each([identity, { ...identity, ledgerScope: undefined }])(
    "moves the contents with the supplied message for %j",
    async (caller) => {
      const f = await fixture(caller);
      try {
        expect(await f.call(surface, "old.bean", "folder/new.bean")).toEqual({
          success: true,
          result: { oldPath: "old.bean", newPath: "folder/new.bean" },
        });
        expect([...f.files]).toEqual([
          ["occupied.bean", "; existing\n"],
          ["folder/new.bean", "; Café\n"],
        ]);
        expect(f.change).toHaveBeenCalledWith("alice", "main", {
          files: [
            {
              operation: "create",
              path: "folder/new.bean",
              from_path: "old.bean",
            },
          ],
          message: "Move café file",
        });
      } finally {
        await f.close();
      }
    },
  );
  it.each(["occupied.bean", "../escape.bean", "/absolute.bean"])(
    "refuses target %s without losing source contents",
    async (target) => {
      const f = await fixture();
      const before = [...f.files];
      try {
        expect((await f.call(surface, "old.bean", target)).success).toBe(false);
        expect([...f.files]).toEqual(before);
        if (target !== "occupied.bean") expect(f.change).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it("refuses revoked write access before a repository mutation", async () => {
    const f = await fixture();
    f.state.writable = false;
    try {
      expect((await f.call(surface, "old.bean", "new.bean")).success).toBe(
        false,
      );
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  it("refuses read-only credentials before a repository mutation", async () => {
    const f = await fixture({ ...identity, scopes: new Set(["ledger.read"]) });
    try {
      expect((await f.call(surface, "old.bean", "new.bean")).success).toBe(
        false,
      );
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
