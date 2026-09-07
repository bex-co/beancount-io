import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerJournalMutationResolver } from "../../../resolvers/ledger-journal-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { createHash } from "node:crypto";
import { BadUserInputError } from "@/shared/errors";
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
let resolver: LedgerJournalMutationResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerJournalMutationResolver, HealthResolver],
    container: {
      get: (target) =>
        target === LedgerJournalMutationResolver
          ? resolver
          : new HealthResolver(),
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const original = '2026-09-01 * "Café" "Breakfast"\n';
const operations = {
  delete: {
    field: "deleteLedgerEntrySourceSlice",
    inputType: "DeleteSourceSliceInput",
    path: "/delete",
    method: "POST",
    fields: "message entryHash",
  },
  delete_many: {
    field: "deleteMultipleLedgerEntrySourceSlices",
    inputType: "DeleteMultiSourceSlicesInput",
    path: "/delete-many",
    method: "POST",
    fields: "message deletedHashes",
  },
  update: {
    field: "updateLedgerEntrySourceSlice",
    inputType: "UpdateSourceSliceInput",
    path: "",
    method: "PUT",
    fields: "message entryHash newSha256sum",
  },
} as const;
type Operation = keyof typeof operations;
async function fixture(caller = identity) {
  const slices = new Map([
    ["entry1", original],
    ["entry2", "; second\n"],
  ]);
  const state = { writable: true };
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  type Ref = { entry_hash: string; sha256sum: string };
  function validate(ref: Ref) {
    const text = slices.get(ref.entry_hash);
    if (text === undefined || hash(text) !== ref.sha256sum)
      throw new BadUserInputError("Stale source fixture");
  }
  const deleteSourceSlice = jest.fn(async (_owner, _name, ref: Ref) => {
    validate(ref);
    slices.delete(ref.entry_hash);
    return envelope({ message: "Deleted", entry_hash: ref.entry_hash });
  });
  const deleteMultiSourceSlices = jest.fn(
    async (_owner, _name, body: { entries: Ref[] }) => {
      body.entries.forEach(validate);
      body.entries.forEach((ref) => slices.delete(ref.entry_hash));
      return envelope({
        message: "Deleted",
        deleted_hashes: body.entries.map((ref) => ref.entry_hash),
      });
    },
  );
  const updateSourceSlice = jest.fn(
    async (_owner, _name, body: Ref & { new_content: string }) => {
      validate(body);
      slices.set(body.entry_hash, body.new_content);
      return envelope({
        message: "Updated",
        entry_hash: body.entry_hash,
        new_sha256sum: hash(body.new_content),
      });
    },
  );
  const journal = {
    deleteSourceSlice,
    deleteMultiSourceSlices,
    updateSourceSlice,
  };
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
    getPublicApiClient: async () => ({ journal }),
  };
  const models = {
    user: {
      getUserByUsername: async () => ({ id: "usr_owner" }),
      getById: async () => ({ id: caller.userId, ledger_username: "alice" }),
    },
  };
  const service = new LedgerJournalService(
    fava as never,
    new AuthorizationService(
      new SourceBackedRelationshipEvaluator(
        {} as never,
        models as never,
        {} as never,
        fava as never,
      ),
    ),
  );
  resolver = new LedgerJournalMutationResolver(service);
  const rest = await startV1TestServer(
    { services: { ledgerJournal: service } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(caller);
  const server = assembleMcpRegistry(
    {
      identity: caller,
      services: { ledgerJournal: service },
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "source-slice-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    slices,
    state,
    journal,
    client,
    call: async (
      surface: string,
      operation: Operation,
      input: Record<string, unknown>,
    ) => {
      const spec = operations[operation];
      if (surface === "rest") {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/entry-source${spec.path}`,
          {
            method: spec.method,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(input),
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
          source: `mutation($input:${spec.inputType}!) { ${spec.field}(ledgerId:"alice/main",input:$input) { ${spec.fields} } }`,
          variableValues: { input },
          contextValue: { identity: caller, getCurrentIdentity: () => caller },
        });
        return {
          success: !response.errors,
          result: response.data?.[spec.field],
        };
      }
      const response = await client.callTool({
        name: "editEntrySource",
        arguments: {
          operation,
          ...input,
          ...(caller.ledgerScope ? {} : { ledger: "alice/main" }),
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
const args = (operation: Operation, stale = false) =>
  operation === "delete_many"
    ? {
        entries: [
          { entryHash: "entry1", sha256sum: hash(original) },
          {
            entryHash: "entry2",
            sha256sum: stale ? "stale" : hash("; second\n"),
          },
        ],
      }
    : {
        entryHash: "entry1",
        sha256sum: stale ? "stale" : hash(original),
        ...(operation === "update"
          ? { newContent: "; replacement café\n" }
          : {}),
      };

describe.each(["rest", "gql", "mcp"])("source edits via %s", (surface) => {
  describe.each(Object.keys(operations) as Operation[])("%s", (operation) => {
    it.each([identity, { ...identity, ledgerScope: undefined }])(
      "preserves effects and output for %j",
      async (caller) => {
        const f = await fixture(caller);
        try {
          const result = await f.call(surface, operation, args(operation));
          expect(result.success).toBe(true);
          if (operation === "update") {
            expect(f.slices.get("entry1")).toBe("; replacement café\n");
            expect(result.result).toEqual({
              message: "Updated",
              entryHash: "entry1",
              newSha256sum: hash("; replacement café\n"),
            });
          } else {
            expect(f.slices.has("entry1")).toBe(false);
            expect(result.result).toEqual(
              operation === "delete_many"
                ? { message: "Deleted", deletedHashes: ["entry1", "entry2"] }
                : { message: "Deleted", entryHash: "entry1" },
            );
          }
          expect(f.slices.has("entry2")).toBe(operation !== "delete_many");
        } finally {
          await f.close();
        }
      },
    );
    it("refuses a stale hash without any partial change", async () => {
      const f = await fixture();
      const before = [...f.slices];
      try {
        expect(
          (await f.call(surface, operation, args(operation, true))).success,
        ).toBe(false);
        expect([...f.slices]).toEqual(before);
      } finally {
        await f.close();
      }
    });
    it("refuses revoked access before the ledger write", async () => {
      const f = await fixture();
      f.state.writable = false;
      try {
        expect(
          (await f.call(surface, operation, args(operation))).success,
        ).toBe(false);
        for (const call of Object.values(f.journal))
          expect(call).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
    it("refuses unexpected preview or branch arguments", async () => {
      const f = await fixture();
      try {
        expect(
          (
            await f.call(surface, operation, {
              ...args(operation),
              dry_run: true,
            })
          ).success,
        ).toBe(false);
        for (const call of Object.values(f.journal))
          expect(call).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
  });
});
