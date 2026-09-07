import {
  LegacyEntryWorkflow,
  type LegacyEntryInput,
} from "@/features/ledger/workflow/legacy-entry-workflow";
import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerLegacyMutationResolver } from "../../../resolvers/ledger-legacy-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import {
  LedgerEntryService,
  createLedgerEntryWriter,
} from "@/features/ledger/service/ledger-entry-service";
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
let resolver: LedgerLegacyMutationResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerLegacyMutationResolver, HealthResolver],
    container: {
      get: (target) =>
        target === LedgerLegacyMutationResolver
          ? resolver
          : new HealthResolver(),
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

const entries: LegacyEntryInput[] = [
  {
    type: "Transaction",
    date: "2026-09-01",
    flag: "*",
    meta: {
      filename: "ignored.bean",
      lineno: 999,
      __tolerances__: { USD: 0.01 },
    },
    narration: "Legacy Café",
    payee: "Café",
    postings: [
      { account: "Assets:Cash", amount: "1,000.25 EUR" },
      { account: "Equity:Opening", amount: "-1,000.25 EUR" },
    ],
  },
];
async function fixture(caller = identity, ledgerId?: string | null) {
  const committed: unknown[] = [];
  const state = { writable: true, failCommit: false };
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const write = jest.fn(async (_owner, _name, body) => {
    if (state.failCommit) throw new Error("Fixture commit refused");
    committed.push(...body.entries);
    return envelope(null);
  });
  const createFile = jest.fn();
  const fava = {
    getAdminClient: () => ({
      ledgers: { getLedger: async () => envelope({ id: 42, private: true }) },
    }),
    getApiContext: async () => ({
      favaApiClient: {
        ledgers: {
          listLedgers: async () =>
            envelope([
              { full_name: "alice/main" },
              { full_name: "alice/second" },
            ]),
        },
        collaborators: {
          getLedgerCollaboratorPermission: async () =>
            envelope({ permission: state.writable ? "write" : "read" }),
        },
      },
    }),
    getPublicApiClient: async () => ({
      entries: { addBulkEntries: write },
      reports: {
        getLedgerBcioOptions: async () =>
          envelope({ default_file: "main.bean" }),
      },
      ledgers: {
        getLedgerFile: async () => envelope({ path: "main.bean" }),
        createLedgerFile: createFile,
      },
    }),
  };
  const models = {
    user: {
      getUserByUsername: async () => ({ id: "usr_owner" }),
      getById: async () => ({ id: caller.userId, ledger_username: "alice" }),
    },
  };
  const service = new LedgerEntryService(
    createLedgerEntryWriter(fava as never),
    new AuthorizationService(
      new SourceBackedRelationshipEvaluator(
        {} as never,
        models as never,
        {} as never,
        fava as never,
      ),
    ),
  );
  const workflow = new LegacyEntryWorkflow(
    fava as never,
    service,
    new AuthorizationService(
      new SourceBackedRelationshipEvaluator(
        {} as never,
        models as never,
        {} as never,
        fava as never,
      ),
    ),
  );
  resolver = new LedgerLegacyMutationResolver(workflow);
  const rest = await startV1TestServer(
    { workflows: { legacyEntry: workflow } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(caller);
  const server = assembleMcpRegistry(
    {
      identity: caller,
      legacyEntryWorkflow: workflow,
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "structured-entry-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    committed,
    state,
    write,
    createFile,
    call: async (surface: string, batch = entries) => {
      if (surface === "rest") {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/legacy/entries`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ entriesInput: batch, ledgerId }),
          },
        );
        return {
          success: response.status === 200,
          result: await response.json(),
        };
      }
      if (surface === "gql") {
        const response = await graphql({
          schema,
          source:
            "mutation($entries:[EntryInput!]!,$ledgerId:String) { addEntries(ledgerId:$ledgerId,entriesInput:$entries) { success data } }",
          variableValues: { entries: batch, ledgerId },
          contextValue: {
            identity: caller,
            getCurrentIdentity: () => caller,
            platform: "web",
          },
        });
        return {
          success: !response.errors,
          result: response.data?.addEntries,
        };
      }
      const response = await client.callTool({
        name: "addLegacyEntries",
        arguments: {
          entriesInput: batch,
          ...(ledgerId === undefined ? {} : { ledgerId }),
        },
      });
      return {
        success: !response.isError,
        result: (response.structuredContent as { result?: unknown })?.result,
      };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

it.each([
  { caller: identity, ledgerId: undefined },
  { caller: { ...identity, ledgerScope: undefined }, ledgerId: "alice/main" },
  { caller: { ...identity, ledgerScope: undefined }, ledgerId: null },
])(
  "preserves legacy mapping and ledger selection for %j",
  async ({ caller, ledgerId }) => {
    const batches: unknown[][] = [];
    for (const surface of ["rest", "gql", "mcp"]) {
      const f = await fixture(caller, ledgerId);
      try {
        expect(await f.call(surface)).toEqual({
          success: true,
          result: { data: "", success: true },
        });
        expect(f.committed).toHaveLength(1);
        expect(f.committed[0]).toMatchObject({
          type: "transaction",
          filename: "main.bean",
          item: {
            narration: "Legacy Café",
            postings: [
              {
                account: "Assets:Cash",
                units: { number: "1000.25", currency: "EUR" },
              },
              {
                account: "Equity:Opening",
                units: { number: "-1000.25", currency: "EUR" },
              },
            ],
          },
        });
        expect(
          (f.committed[0] as { item: { meta?: unknown } }).item.meta,
        ).toBeUndefined();
        expect(f.write.mock.calls[0]?.slice(0, 2)).toEqual(["alice", "main"]);
        expect(f.createFile).not.toHaveBeenCalled();
        batches.push(f.committed);
      } finally {
        await f.close();
      }
    }
    expect(batches[1]).toEqual(batches[0]);
    expect(batches[2]).toEqual(batches[0]);
  },
);

describe.each(["rest", "gql", "mcp"])("legacy entries via %s", (surface) => {
  it("rejects unsupported legacy directives before a commit", async () => {
    const f = await fixture();
    try {
      expect(
        (await f.call(surface, [{ ...entries[0]!, type: "Note" }])).success,
      ).toBe(false);
      expect(f.write).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  it("refuses a target outside the credential pin", async () => {
    const f = await fixture(identity, "other/books");
    try {
      expect((await f.call(surface)).success).toBe(false);
      expect(f.write).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  it("refuses revoked write access", async () => {
    const f = await fixture();
    f.state.writable = false;
    try {
      expect((await f.call(surface)).success).toBe(false);
      expect(f.write).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
