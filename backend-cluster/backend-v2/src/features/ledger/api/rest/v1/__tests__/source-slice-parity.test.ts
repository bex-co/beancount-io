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
import { FavaApiError } from "@/foundation/fava/api-client";
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

const BALANCE_FAILED =
  "Balance failed for Assets:Cash: expected 49.75 USD, got 73.25 USD (main.bean:84)";
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
    fields: "message deletedCount",
  },
  update: {
    field: "updateLedgerEntrySourceSlice",
    inputType: "UpdateSourceSliceInput",
    path: "",
    method: "PUT",
    fields: "message entryHash newSha256sum newEntryHash",
  },
} as const;
type Operation = keyof typeof operations;
async function fixture(caller = identity) {
  const slices = new Map([
    ["entry1", original],
    ["entry2", "; second\n"],
  ]);
  const state = { writable: true, limited: false, breaks: false };
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  type Ref = {
    entry_hash: string;
    sha256sum: string;
    allowInvalid?: boolean;
    dryRun?: boolean;
  };
  function validate(ref: Ref) {
    const text = slices.get(ref.entry_hash);
    if (text === undefined || hash(text) !== ref.sha256sum)
      throw new BadUserInputError("Stale source fixture");
  }
  // The ledger service's pre-commit projection (w21/m1): an edit or delete
  // that adds a bean-check error is refused unless the caller allows it.
  function refuseBreaking(
    body: { allowInvalid?: boolean },
    action: "update" | "delete",
  ) {
    if (!state.breaks || body.allowInvalid === true) return;
    const subject = action === "update" ? "this edit" : "this deletion";
    const error = `${subject} would introduce 1 new bean-check error: ${BALANCE_FAILED}`;
    throw new FavaApiError(error, 400, {
      error,
      code: "NEW_LEDGER_ERRORS",
      details: { count: 1, detail: BALANCE_FAILED, action },
    });
  }
  const deleteSourceSlice = jest.fn(async (_owner, _name, ref: Ref) => {
    validate(ref);
    refuseBreaking(ref, "delete");
    if (ref.dryRun === true) {
      return envelope({
        message: `Would delete entry ${ref.entry_hash}`,
        entry_hash: ref.entry_hash,
        files: ["main.bean"],
        preview: [
          { path: "main.bean", text: slices.get(ref.entry_hash) ?? "" },
        ],
      });
    }
    slices.delete(ref.entry_hash);
    return envelope({
      message: "Deleted",
      entry_hash: ref.entry_hash,
      files: ["main.bean"],
    });
  });
  const deleteMultiSourceSlices = jest.fn(
    async (
      _owner: string,
      _name: string,
      body: { entries: Ref[]; allowInvalid?: boolean; dryRun?: boolean },
    ) => {
      body.entries.forEach(validate);
      refuseBreaking(body, "delete");
      if (body.dryRun === true) {
        const hashes = body.entries.map((ref) => ref.entry_hash);
        return envelope({
          message: `Would delete ${hashes.length} entries: ${hashes.join(", ")}`,
          deleted_hashes: hashes,
          files: ["main.bean", "2026/imports.bean"],
          preview: body.entries.map((ref) => ({
            path: "main.bean",
            text: slices.get(ref.entry_hash) ?? "",
          })),
        });
      }
      body.entries.forEach((ref) => slices.delete(ref.entry_hash));
      return envelope({
        message: "Deleted",
        deleted_hashes: body.entries.map((ref) => ref.entry_hash),
        // Each rewritten file once, as the ledger service reports them.
        files: ["main.bean", "2026/imports.bean"],
      });
    },
  );
  const updateSourceSlice = jest.fn(
    async (_owner, _name, body: Ref & { new_content: string }) => {
      validate(body);
      refuseBreaking(body, "update");
      // The ledger service's commit-boundary check (w0/m6): the replacement
      // would take a free ledger past its directive limit.
      if (state.limited) {
        const error =
          "This ledger has reached its free-tier limit of 2 directives (this change would bring it to approximately 5). Deleting entries still works and is how to get back under the limit; upgrading removes it entirely.";
        throw new FavaApiError(error, 403, {
          error,
          code: "directive_limit_exceeded",
          details: { limit: 2, current: 5 },
        });
      }
      if (body.dryRun === true) {
        return envelope({
          message: `Would update entry ${body.entry_hash}`,
          entry_hash: "entry1-updated",
          new_sha256sum: hash(body.new_content),
          new_entry_hash: "entry1-updated",
          files: ["2026/imports.bean"],
          preview: [{ path: "2026/imports.bean", text: body.new_content }],
        });
      }
      slices.set(body.entry_hash, body.new_content);
      // The ledger service's wire contract: `entry_hash` is the entry's NEW
      // hash, repeated as `new_entry_hash`. A fake that echoed the request
      // here hid a summary that printed the new hash as the old one (w23/007).
      return envelope({
        message: "Updated",
        entry_hash: "entry1-updated",
        new_sha256sum: hash(body.new_content),
        new_entry_hash: "entry1-updated",
        files: ["2026/imports.bean"],
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
          errors: undefined,
          full: undefined,
        };
      }
      if (surface === "gql") {
        // A preview call selects the dry-run echo, like typed-add's
        // bulkEntries fixture (w23/m7/t002).
        const fields =
          input.dryRun === true
            ? `${spec.fields} dryRun preview { path text }`
            : spec.fields;
        const response = await graphql({
          schema,
          source: `mutation($input:${spec.inputType}!) { ${spec.field}(ledgerId:"alice/main",input:$input) { ${fields} } }`,
          variableValues: { input },
          contextValue: { identity: caller, getCurrentIdentity: () => caller },
        });
        return {
          success: !response.errors,
          result: response.data?.[spec.field],
          errors: response.errors,
          full: undefined,
        };
      }
      // One MCP tool per operation (ADR 019, 2026-10-18).
      const response = await client.callTool({
        name: {
          update: "updateEntrySource",
          delete: "deleteEntrySource",
          delete_many: "deleteEntrySources",
        }[operation],
        arguments: {
          ...input,
          ...(caller.ledgerScope ? {} : { ledger: "alice/main" }),
        },
      });
      return {
        success: !response.isError,
        result: (response.structuredContent as { result?: unknown })?.result,
        errors: undefined,
        full: response.structuredContent,
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
          const emptyValidation = {
            errorsBefore: 0,
            errorsAfter: 0,
            newErrors: [],
          };
          if (operation === "update") {
            expect(f.slices.get("entry1")).toBe("; replacement café\n");
            const updated = {
              message: "Updated",
              entryHash: "entry1-updated",
              newSha256sum: hash("; replacement café\n"),
              newEntryHash: "entry1-updated",
            };
            // REST echoes dryRun with its preview; MCP spells the echo
            // dry_run; GraphQL keeps its narrow selections (w23/m7/t003).
            expect(result.result).toEqual(
              surface === "mcp"
                ? {
                    ...updated,
                    dry_run: false,
                    preview: [],
                    summary:
                      "Updated entry entry1 (new hash entry1-updated). No new bean-check errors.",
                    // w23/042: the file the ledger rewrote, not always [].
                    wrote: [{ path: "2026/imports.bean" }],
                    entryHashes: ["entry1-updated"],
                    validation: emptyValidation,
                  }
                : surface === "rest"
                  ? { ...updated, dryRun: false, preview: [] }
                  : updated,
            );
          } else if (operation === "delete_many") {
            expect(f.slices.has("entry1")).toBe(false);
            const deleted = { message: "Deleted", deletedCount: 2 };
            expect(result.result).toEqual(
              surface === "mcp"
                ? {
                    ...deleted,
                    dry_run: false,
                    preview: [],
                    summary: "Deleted 2 entries. No new bean-check errors.",
                    wrote: [
                      { path: "main.bean" },
                      { path: "2026/imports.bean" },
                    ],
                    entryHashes: ["entry1", "entry2"],
                    validation: emptyValidation,
                  }
                : surface === "rest"
                  ? { ...deleted, dryRun: false, preview: [] }
                  : deleted,
            );
          } else {
            expect(f.slices.has("entry1")).toBe(false);
            const deleted = { message: "Deleted", entryHash: "entry1" };
            expect(result.result).toEqual(
              surface === "mcp"
                ? {
                    ...deleted,
                    dry_run: false,
                    preview: [],
                    summary: "Deleted entry entry1. No new bean-check errors.",
                    wrote: [{ path: "main.bean" }],
                    entryHashes: ["entry1"],
                    validation: emptyValidation,
                  }
                : surface === "rest"
                  ? { ...deleted, dryRun: false, preview: [] }
                  : deleted,
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
    it("accepts the other surface's preview spelling", async () => {
      const f = await fixture();
      const before = [...f.slices];
      try {
        const result = await f.call(surface, operation, {
          ...args(operation),
          // w23/m9/t002: the twin spelling previews exactly like the
          // native one — MCP's dry_run on REST/GraphQL, their dryRun
          // on MCP.
          ...(surface === "mcp" ? { dryRun: true } : { dry_run: true }),
        });
        expect(result.success).toBe(true);
        expect([...f.slices]).toEqual(before);
        const called = Object.values(f.journal).filter(
          (call) => call.mock.calls.length > 0,
        );
        expect(called).toHaveLength(1);
        expect(called[0].mock.calls[0][2]).toMatchObject({ dryRun: true });
      } finally {
        await f.close();
      }
    });
    it("refuses one true and one false preview flag", async () => {
      const f = await fixture();
      try {
        const result = await f.call(surface, operation, {
          ...args(operation),
          dry_run: true,
          dryRun: false,
        });
        expect(result.success).toBe(false);
        for (const call of Object.values(f.journal))
          expect(call).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
    // w23/m9/t007: agreement is not a conflict — both true previews.
    it("accepts both preview spellings when they agree", async () => {
      const f = await fixture();
      const before = [...f.slices];
      try {
        const result = await f.call(surface, operation, {
          ...args(operation),
          dry_run: true,
          dryRun: true,
        });
        expect(result.success).toBe(true);
        expect([...f.slices]).toEqual(before);
        const called = Object.values(f.journal).filter(
          (call) => call.mock.calls.length > 0,
        );
        expect(called).toHaveLength(1);
        expect(called[0].mock.calls[0][2]).toMatchObject({ dryRun: true });
      } finally {
        await f.close();
      }
    });
  });
});

// A preview (w23/m7/t003) resolves the slice and runs every check, threads
// the flag past the ledger hop, reports what it WOULD change, and writes
// nothing: no slice touched, no files echoed, no hashes minted.
describe.each(["rest", "gql", "mcp"])(
  "source-slice preview via %s",
  (surface) => {
    const previewArgs = (operation: Operation): Record<string, unknown> => ({
      ...(args(operation) as Record<string, unknown>),
      ...(surface === "mcp" ? { dry_run: true } : { dryRun: true }),
    });
    const journalKey = (operation: Operation) =>
      operation === "update"
        ? "updateSourceSlice"
        : operation === "delete"
          ? "deleteSourceSlice"
          : "deleteMultiSourceSlices";
    const replacement = "; replacement café\n";
    describe.each(Object.keys(operations) as Operation[])("%s", (operation) => {
      it("previews without writing, threading dryRun past the hop", async () => {
        const f = await fixture();
        const before = [...f.slices];
        try {
          const result = await f.call(
            surface,
            operation,
            previewArgs(operation),
          );
          expect(result.success).toBe(true);
          expect([...f.slices]).toEqual(before);
          // The hop body is the third call argument on every op; the
          // generated client passes a fourth config argument on some.
          const hop = f.journal[journalKey(operation)];
          expect(hop).toHaveBeenCalledTimes(1);
          expect(hop.mock.calls[0][2]).toMatchObject({ dryRun: true });
          const emptyValidation = {
            errorsBefore: 0,
            errorsAfter: 0,
            newErrors: [],
          };
          if (operation === "update") {
            const would = {
              message: "Would update entry entry1",
              entryHash: "entry1-updated",
              newSha256sum: hash(replacement),
              newEntryHash: "entry1-updated",
              ...(surface === "mcp" ? { dry_run: true } : { dryRun: true }),
              preview: [{ path: "2026/imports.bean", text: replacement }],
            };
            expect(result.result).toEqual(
              surface === "mcp"
                ? {
                    ...would,
                    summary:
                      "Would update entry entry1 (new hash entry1-updated). No new bean-check errors.",
                    wrote: [],
                    entryHashes: ["entry1-updated"],
                    validation: emptyValidation,
                  }
                : would,
            );
          } else if (operation === "delete_many") {
            const would = {
              message: "Would delete 2 entries: entry1, entry2",
              deletedCount: 2,
              ...(surface === "mcp" ? { dry_run: true } : { dryRun: true }),
              preview: [
                { path: "main.bean", text: original },
                { path: "main.bean", text: "; second\n" },
              ],
            };
            expect(result.result).toEqual(
              surface === "mcp"
                ? {
                    ...would,
                    summary:
                      "Would delete 2 entries. No new bean-check errors.",
                    wrote: [],
                    entryHashes: ["entry1", "entry2"],
                    validation: emptyValidation,
                  }
                : would,
            );
          } else {
            const would = {
              message: "Would delete entry entry1",
              entryHash: "entry1",
              ...(surface === "mcp" ? { dry_run: true } : { dryRun: true }),
              preview: [{ path: "main.bean", text: original }],
            };
            expect(result.result).toEqual(
              surface === "mcp"
                ? {
                    ...would,
                    summary:
                      "Would delete entry entry1. No new bean-check errors.",
                    wrote: [],
                    entryHashes: ["entry1"],
                    validation: emptyValidation,
                  }
                : would,
            );
          }
        } finally {
          await f.close();
        }
      });
    });
    // The same checks as a commit: an empty replacement is refused by the
    // service guard before the hop, even as a preview.
    it("still refuses an empty replacement on a preview", async () => {
      const f = await fixture();
      const before = [...f.slices];
      try {
        const result = await f.call(surface, "update", {
          ...previewArgs("update"),
          newContent: "  \n",
        });
        expect(result.success).toBe(false);
        expect([...f.slices]).toEqual(before);
        for (const call of Object.values(f.journal))
          expect(call).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
  },
);

// w23/m3/t001: list output spells the hash `entry_hash`, so every entry tool
// accepts that spelling on every surface; two different hashes refuse rather
// than guess.
describe.each(["rest", "gql", "mcp"])("entry_hash alias via %s", (surface) => {
  const snake = (operation: Operation): Record<string, unknown> => {
    const input = args(operation) as Record<string, unknown>;
    if (operation === "delete_many") {
      return {
        entries: (input.entries as Array<Record<string, unknown>>).map(
          ({ entryHash, ...rest }) => ({ ...rest, entry_hash: entryHash }),
        ),
      };
    }
    const { entryHash, ...rest } = input;
    return { ...rest, entry_hash: entryHash };
  };
  describe.each(Object.keys(operations) as Operation[])("%s", (operation) => {
    it("accepts the snake spelling list output uses", async () => {
      const f = await fixture();
      try {
        const result = await f.call(surface, operation, snake(operation));
        expect(result.success).toBe(true);
      } finally {
        await f.close();
      }
    });
  });
  it("refuses two different hashes without touching the ledger", async () => {
    const f = await fixture();
    const before = [...f.slices];
    try {
      const conflict = {
        ...args("delete"),
        entry_hash: "another-entry",
      };
      expect((await f.call(surface, "delete", conflict)).success).toBe(false);
      expect([...f.slices]).toEqual(before);
      for (const call of Object.values(f.journal))
        expect(call).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});

// The ledger service refuses a source-slice update past the directive limit at
// its commit boundary (w0/m6); every surface must refuse it the same way, with
// the limit and the projected count, and change nothing.
describe.each(["rest", "gql", "mcp"])(
  "a source edit past the directive limit via %s",
  (surface) => {
    it("is refused with the limit and the projected count", async () => {
      const f = await fixture();
      f.state.limited = true;
      const before = [...f.slices];
      try {
        const result = await f.call(surface, "update", args("update"));
        expect(result.success).toBe(false);
        expect([...f.slices]).toEqual(before);
        const limit = { resource: "directives", limit: 2, current: 5 };
        const message = expect.stringContaining(
          "free-tier limit of 2 directives",
        );
        if (surface === "rest") {
          expect(result.result).toMatchObject({
            ok: false,
            error: { code: "RESOURCE_LIMIT_REACHED", message, metadata: limit },
          });
        } else if (surface === "gql") {
          // Raw `graphql()` bypasses Apollo's formatError; the error itself
          // carries what formatError copies into `extensions`.
          const refusal = result.errors?.[0]?.originalError as
            | { category?: string; metadata?: unknown }
            | undefined;
          expect(refusal).toMatchObject({
            category: "RESOURCE_LIMIT_REACHED",
            metadata: limit,
          });
        } else {
          expect(result.full).toMatchObject({
            ok: false,
            error: { code: "RESOURCE_LIMIT_REACHED", message },
          });
        }
      } finally {
        await f.close();
      }
    });
  },
);

// A race lost at the ledger (409, w23/m1) must read CONFLICT on every
// surface — the code whose retry loop is re-read + resend — never a silent
// success and never FORBIDDEN.
describe.each(["rest", "gql", "mcp"])(
  "a source edit that loses its race via %s",
  (surface) => {
    it.each(["update", "delete", "delete_many"] as Operation[])(
      "reports a ledger 409 on %s as CONFLICT",
      async (operation) => {
        const f = await fixture();
        const key =
          operation === "update"
            ? "updateSourceSlice"
            : operation === "delete"
              ? "deleteSourceSlice"
              : "deleteMultiSourceSlices";
        f.journal[key].mockRejectedValueOnce(
          new FavaApiError(
            "Entry conflict: it has changed since it was loaded; refresh and retry",
            409,
            { error: "Entry conflict" },
          ),
        );
        const before = [...f.slices];
        try {
          const result = await f.call(surface, operation, args(operation));
          expect(result.success).toBe(false);
          expect([...f.slices]).toEqual(before);
          if (surface === "rest") {
            expect(result.result).toMatchObject({
              ok: false,
              error: { code: "CONFLICT" },
            });
          } else if (surface === "gql") {
            const refusal = result.errors?.[0]?.originalError as
              | { category?: string }
              | undefined;
            expect(refusal?.category).toBe("CONFLICT");
          } else {
            expect(result.full).toMatchObject({
              ok: false,
              error: { code: "CONFLICT" },
            });
          }
        } finally {
          await f.close();
        }
      },
    );
  },
);

// A commit-step failure at the ledger (Gitea 5xx, w23/m1) must read
// retryable on every surface — SERVICE_UNAVAILABLE, never FORBIDDEN for an
// authorized credential, and never a silent success.
describe.each(["rest", "gql", "mcp"])(
  "a source edit whose commit fails at the ledger via %s",
  (surface) => {
    it.each(["update", "delete", "delete_many"] as Operation[])(
      "reports a ledger 503 on %s as SERVICE_UNAVAILABLE",
      async (operation) => {
        const f = await fixture();
        const key =
          operation === "update"
            ? "updateSourceSlice"
            : operation === "delete"
              ? "deleteSourceSlice"
              : "deleteMultiSourceSlices";
        f.journal[key].mockRejectedValueOnce(
          new FavaApiError("Gitea is temporarily unavailable", 503, {
            error: "Gitea is temporarily unavailable",
          }),
        );
        const before = [...f.slices];
        try {
          const result = await f.call(surface, operation, args(operation));
          expect(result.success).toBe(false);
          expect([...f.slices]).toEqual(before);
          if (surface === "rest") {
            expect(result.result).toMatchObject({
              ok: false,
              error: { code: "SERVICE_UNAVAILABLE" },
            });
          } else if (surface === "gql") {
            const refusal = result.errors?.[0]?.originalError as
              | { category?: string }
              | undefined;
            expect(refusal?.category).toBe("SERVICE_UNAVAILABLE");
          } else {
            expect(result.full).toMatchObject({
              ok: false,
              error: { code: "SERVICE_UNAVAILABLE" },
            });
          }
        } finally {
          await f.close();
        }
      },
    );
  },
);

// The ledger service refuses an edit or delete that would add a bean-check
// error (w21/m1). Every surface must refuse it as structured adds are refused
// (w0/m2) — VALIDATION_FAILED naming the new error in newLedgerErrors — change
// nothing, and commit the same request when it carries allowInvalid.
describe.each(["rest", "gql", "mcp"])(
  "a source edit that would break the ledger via %s",
  (surface) => {
    describe.each(Object.keys(operations) as Operation[])("%s", (operation) => {
      const subject = operation === "update" ? "this edit" : "this deletion";

      it("is refused with the new error named, changing nothing", async () => {
        const f = await fixture();
        f.state.breaks = true;
        const before = [...f.slices];
        try {
          const result = await f.call(surface, operation, args(operation));
          expect(result.success).toBe(false);
          expect([...f.slices]).toEqual(before);
          const message = expect.stringContaining(
            `${subject} would introduce 1 new bean-check error: ${BALANCE_FAILED}`,
          );
          const metadata = {
            field: "entry",
            newLedgerErrors: BALANCE_FAILED,
          };
          if (surface === "rest") {
            expect(result.result).toMatchObject({
              ok: false,
              error: { code: "VALIDATION_FAILED", message, metadata },
            });
          } else if (surface === "gql") {
            // Raw `graphql()` bypasses Apollo's formatError, which copies
            // the category and metadata into `extensions`.
            expect(result.errors?.[0]?.originalError).toMatchObject({
              category: "VALIDATION_FAILED",
              message,
              metadata,
            });
          } else {
            // MCP carries the same field (w23/077), past its output schema.
            expect(result.full).toMatchObject({
              ok: false,
              error: {
                code: "VALIDATION_FAILED",
                message,
                hint: expect.stringContaining("allowInvalid: true"),
                newLedgerErrors: BALANCE_FAILED,
              },
            });
          }
        } finally {
          await f.close();
        }
      });

      // A preview runs the same checks (w23/m7/t003): the refusal the
      // ledger returns for a breaking commit refuses the preview too, with
      // the same code and the same named error.
      it("refuses the preview the same way, changing nothing", async () => {
        const f = await fixture();
        f.state.breaks = true;
        const before = [...f.slices];
        try {
          const result = await f.call(surface, operation, {
            ...(args(operation) as Record<string, unknown>),
            ...(surface === "mcp" ? { dry_run: true } : { dryRun: true }),
          });
          expect(result.success).toBe(false);
          expect([...f.slices]).toEqual(before);
          const message = expect.stringContaining(
            `${subject} would introduce 1 new bean-check error: ${BALANCE_FAILED}`,
          );
          const metadata = {
            field: "entry",
            newLedgerErrors: BALANCE_FAILED,
          };
          if (surface === "rest") {
            expect(result.result).toMatchObject({
              ok: false,
              error: { code: "VALIDATION_FAILED", message, metadata },
            });
          } else if (surface === "gql") {
            expect(result.errors?.[0]?.originalError).toMatchObject({
              category: "VALIDATION_FAILED",
              message,
              metadata,
            });
          } else {
            expect(result.full).toMatchObject({
              ok: false,
              error: {
                code: "VALIDATION_FAILED",
                message,
                hint: expect.stringContaining("allowInvalid: true"),
                newLedgerErrors: BALANCE_FAILED,
              },
            });
          }
        } finally {
          await f.close();
        }
      });

      it("commits the same request with allowInvalid", async () => {
        const f = await fixture();
        f.state.breaks = true;
        try {
          const result = await f.call(surface, operation, {
            ...args(operation),
            allowInvalid: true,
          });
          expect(result.success).toBe(true);
          if (operation === "update") {
            expect(f.slices.get("entry1")).toBe("; replacement café\n");
          } else {
            expect(f.slices.has("entry1")).toBe(false);
          }
        } finally {
          await f.close();
        }
      });

      // w23/m9/t003: the allow_invalid twin commits like allowInvalid.
      it("commits the same request with the allow_invalid twin", async () => {
        const f = await fixture();
        f.state.breaks = true;
        try {
          const result = await f.call(surface, operation, {
            ...args(operation),
            allow_invalid: true,
          });
          expect(result.success).toBe(true);
          if (operation === "update") {
            expect(f.slices.get("entry1")).toBe("; replacement café\n");
          } else {
            expect(f.slices.has("entry1")).toBe(false);
          }
        } finally {
          await f.close();
        }
      });

      it("refuses one true and one false errors flag", async () => {
        const f = await fixture();
        f.state.breaks = true;
        const before = [...f.slices];
        try {
          const result = await f.call(surface, operation, {
            ...args(operation),
            allowInvalid: false,
            allow_invalid: true,
          });
          expect(result.success).toBe(false);
          expect([...f.slices]).toEqual(before);
        } finally {
          await f.close();
        }
      });

      // w23/m9/t007: agreement is not a conflict — both true commits.
      it("commits when both errors spellings agree", async () => {
        const f = await fixture();
        f.state.breaks = true;
        try {
          const result = await f.call(surface, operation, {
            ...args(operation),
            allowInvalid: true,
            allow_invalid: true,
          });
          expect(result.success).toBe(true);
          if (operation === "update") {
            expect(f.slices.get("entry1")).toBe("; replacement café\n");
          } else {
            expect(f.slices.has("entry1")).toBe(false);
          }
        } finally {
          await f.close();
        }
      });
    });
  },
);
