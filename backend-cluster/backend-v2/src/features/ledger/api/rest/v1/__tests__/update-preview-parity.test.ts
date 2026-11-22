import "reflect-metadata";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerMutationResolver } from "../../../resolvers/ledger-resolver.mutation";
import { FavaApiError } from "@/foundation/fava";
import { ForbiddenError } from "@/shared/errors";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";
import { MAKE_PUBLIC_WARNING } from "@/features/ledger/utils/ledger-visibility";
import { formatError } from "@/server/graphql/format-error";

const config = {
  api: { scopeEnforcement: "enforce" },
  gitea: { hostName: "gitea", httpPort: 3000 },
} as unknown as AppConfig;
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
    validate: true,
  });
});

const CURRENT = {
  id: 1,
  name: "main",
  full_name: "alice/main",
  description: "Old description",
  private: true,
  empty: false,
  size: 10,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const OTHER = {
  ...CURRENT,
  id: 2,
  name: "example",
  full_name: "alice/example",
  description: null,
};

/**
 * What the host answers each name with, through the ledger service: a ledger
 * by its name, and a renamed ledger's former name with the ledger it now
 * names (w23/061). `main` was once `main-2025`; `example` was once `books`.
 * Any other name is free.
 */
const BY_NAME: Record<string, typeof CURRENT | typeof OTHER> = {
  main: CURRENT,
  "main-2025": CURRENT,
  example: OTHER,
  books: OTHER,
};

/**
 * The ledger service's answers to a rename commit onto a taken name, as its
 * `nameTakenError` and error envelope put them on the wire.
 */
const COMMIT_REFUSALS: Record<string, () => FavaApiError> = {
  example: () => {
    const error =
      "A ledger with the name 'example' already exists. Please choose a different name.";
    return new FavaApiError(error, 400, {
      success: false,
      error,
      code: null,
      details: null,
    });
  },
  books: () => {
    const error =
      "'books' is the former name of alice/example: links to it redirect there, so the name stays reserved. Choose a different name.";
    return new FavaApiError(error, 400, {
      success: false,
      error,
      code: "LEDGER_NAME_RESERVED",
      details: { name: "books", redirects_to: "alice/example" },
    });
  },
};

async function fixture() {
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const updateSpy = jest.fn(
    async (_owner: string, _name: string, update: { name?: string }) => {
      const refusal = update.name && COMMIT_REFUSALS[update.name];
      if (refusal) throw refusal();
      return envelope({ ...CURRENT });
    },
  );
  const getSpy = jest.fn(async (_owner: string, name: string) => {
    const ledger = BY_NAME[name];
    if (!ledger) {
      throw new FavaApiError("Not Found", 404, {
        success: false,
        error: "Not Found",
      });
    }
    return envelope({ ...ledger });
  });
  const fava = {
    getPublicApiClient: async () => ({
      ledgers: {
        getLedger: getSpy,
        updateLedger: updateSpy,
      },
    }),
  };
  const authorizeOrThrow = jest.fn(async () => ({ allowed: true }));
  const authorization = { authorizeOrThrow };
  const workflow = new LedgerWorkflow(
    fava as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    config,
    authorization as never,
  );
  resolver = new LedgerMutationResolver(workflow);
  const rest = await startV1TestServer(
    { workflows: { ledger: workflow } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    {
      identity,
      ledgerWorkflow: workflow,
      services: {},
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "update-preview-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  const call = async (surface: string, args: Record<string, unknown>) => {
    if (surface === "rest") {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(args),
        },
      );
      const result = (await response.json()) as Record<string, unknown>;
      return {
        success: response.status === 200,
        status: response.status,
        result,
        error:
          response.status === 200
            ? undefined
            : { status: response.status, ...(result.error as object) },
      };
    }
    if (surface === "gql") {
      const result = await graphql({
        schema,
        source: `mutation($name:String,$description:String,$private:Boolean,$dryRun:Boolean,$dry_run:Boolean) { updateLedger(ledgerId:"alice/main",name:$name,description:$description,private:$private,dryRun:$dryRun,dry_run:$dry_run) { name private dryRun preview { name { from to } description { from to } private { from to } warnings } } }`,
        variableValues: args,
        contextValue: { identity, getCurrentIdentity: () => identity },
      });
      const error = result.errors?.[0];
      const formatted = error && formatError(error.toJSON(), error);
      return {
        success: !result.errors,
        result: result.data?.updateLedger as
          | Record<string, unknown>
          | undefined,
        errors: result.errors,
        error: formatted && {
          message: formatted.message,
          extensions: formatted.extensions,
        },
      };
    }
    const result = await client.callTool({
      name: "updateLedger",
      arguments: args,
    });
    const content = result.structuredContent as
      | { result?: Record<string, unknown>; error?: Record<string, unknown> }
      | undefined;
    return {
      success: !result.isError,
      result: content?.result,
      error: content?.error,
    };
  };

  return {
    updateSpy,
    getSpy,
    authorizeOrThrow,
    call,
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

// updateLedger previews the current→new diff on REST, GraphQL, and MCP;
// the preview commits nothing, twins agree-or-refuse alike, and a commit
// echoes dryRun:false with no preview (w23/m13/t002).
describe.each(["rest", "gql", "mcp"])(
  "updateLedger preview (%s)",
  (surface) => {
    it("renders the diff and commits nothing", async () => {
      const f = await fixture();
      try {
        const flag = surface === "mcp" ? { dry_run: true } : { dryRun: true };
        const { success, result } = await f.call(surface, {
          name: "renamed",
          private: false,
          ...flag,
        });
        expect(success).toBe(true);
        expect(f.updateSpy).not.toHaveBeenCalled();
        // MCP echoes dry_run like every m7 preview; REST and GraphQL echo dryRun.
        const echo = surface === "mcp" ? { dry_run: true } : { dryRun: true };
        expect(result).toMatchObject({
          name: "main",
          private: true,
          ...echo,
          preview: {
            name: { from: "main", to: "renamed" },
            private: { from: true, to: false },
          },
        });
        if (surface === "mcp") {
          expect(result).not.toHaveProperty("dryRun");
        } else {
          expect(result).not.toHaveProperty("dry_run");
        }
        expect((result?.preview as { warnings: string[] }).warnings).toContain(
          MAKE_PUBLIC_WARNING,
        );
      } finally {
        await f.close();
      }
    });

    it("refuses conflicting twins", async () => {
      const f = await fixture();
      try {
        const { success } = await f.call(surface, {
          name: "renamed",
          dryRun: true,
          dry_run: false,
        });
        expect(success).toBe(false);
        expect(f.updateSpy).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });

    it("commits without the flag and echoes dryRun:false", async () => {
      const f = await fixture();
      try {
        const { success, result } = await f.call(surface, {
          description: "New description",
        });
        expect(success).toBe(true);
        expect(f.updateSpy).toHaveBeenCalledTimes(1);
        expect(f.updateSpy).toHaveBeenCalledWith("alice", "main", {
          name: undefined,
          description: "New description",
          private: undefined,
        });
        expect(result).toMatchObject(
          surface === "mcp" ? { dry_run: false } : { dryRun: false },
        );
        // Absent reads undefined on REST/MCP and null on GraphQL.
        expect(result?.preview ?? undefined).toBeUndefined();
      } finally {
        await f.close();
      }
    });
  },
);

/** Where each surface carries the commit's name refusal. */
function nameConflict(surface: string, reasonCode: string) {
  if (surface === "rest") {
    return { status: 409, code: "CONFLICT", metadata: { reasonCode } };
  }
  if (surface === "gql")
    return { extensions: { code: "CONFLICT", reasonCode } };
  // MCP's envelope carries the category and the reason's own hint.
  return { code: "CONFLICT", hint: expect.stringContaining("different") };
}

// A rename preview runs the commit's name check (w31/006): a name another
// ledger holds, and another ledger's former name, are refused exactly as the
// commit refuses them; the ledger's own former name stays free, and its
// current name is no rename at all.
describe.each(["rest", "gql", "mcp"])(
  "updateLedger rename preview (%s)",
  (surface) => {
    const flag = surface === "mcp" ? { dry_run: true } : { dryRun: true };

    it.each([
      ["a name another ledger holds", "example", "LEDGER_NAME_ALREADY_EXISTS"],
      ["another ledger's former name", "books", "LEDGER_NAME_RESERVED"],
    ])("refuses %s as the commit does", async (_case, name, reasonCode) => {
      const f = await fixture();
      try {
        const preview = await f.call(surface, { name, ...flag });
        expect(preview.success).toBe(false);
        expect(f.updateSpy).not.toHaveBeenCalled();

        const commit = await f.call(surface, { name });
        expect(commit.success).toBe(false);
        expect(f.updateSpy).toHaveBeenCalledTimes(1);

        expect(preview.error).toMatchObject(nameConflict(surface, reasonCode));
        expect(preview.error).toEqual(commit.error);
      } finally {
        await f.close();
      }
    });

    it("keeps the ledger's own former name free", async () => {
      const f = await fixture();
      try {
        const { success, result } = await f.call(surface, {
          name: "main-2025",
          ...flag,
        });
        expect(success).toBe(true);
        expect(f.updateSpy).not.toHaveBeenCalled();
        expect(result).toMatchObject({
          preview: { name: { from: "main", to: "main-2025" } },
        });
      } finally {
        await f.close();
      }
    });

    it("renders the current name as no rename", async () => {
      const f = await fixture();
      try {
        const { success, result } = await f.call(surface, {
          name: "main",
          description: "New description",
          ...flag,
        });
        expect(success).toBe(true);
        expect(f.updateSpy).not.toHaveBeenCalled();
        const preview = result?.preview as {
          name?: unknown;
          description?: unknown;
          warnings: string[];
        };
        expect(preview.name ?? undefined).toBeUndefined();
        expect(preview.description).toEqual({
          from: "Old description",
          to: "New description",
        });
        expect(preview.warnings).toEqual([]);
      } finally {
        await f.close();
      }
    });
  },
);

it("rest refuses a rename preview whose name check fails, not as a free name", async () => {
  const f = await fixture();
  try {
    f.getSpy.mockImplementation(async (_owner: string, name: string) => {
      if (name === "main") {
        return { data: { success: true, data: { ...CURRENT } } };
      }
      throw new FavaApiError("Forbidden", 403, {
        success: false,
        error: "Forbidden",
      });
    });
    const { success, status } = await f.call("rest", {
      name: "renamed",
      dryRun: true,
    });
    expect(success).toBe(false);
    expect(status).toBe(403);
    expect(f.updateSpy).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("rest agrees when both twins are true", async () => {
  const f = await fixture();
  try {
    const { success, result } = await f.call("rest", {
      name: "renamed",
      dryRun: true,
      dry_run: true,
    });
    expect(success).toBe(true);
    expect(f.updateSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({ dryRun: true });
  } finally {
    await f.close();
  }
});

it("gql accepts the dry_run alias alone", async () => {
  const f = await fixture();
  try {
    const { success, result } = await f.call("gql", {
      name: "renamed",
      dry_run: true,
    });
    expect(success).toBe(true);
    expect(f.updateSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dryRun: true,
      preview: { name: { from: "main", to: "renamed" } },
    });
  } finally {
    await f.close();
  }
});

it("mcp accepts the dryRun alias alone", async () => {
  const f = await fixture();
  try {
    const { success, result } = await f.call("mcp", {
      name: "renamed",
      dryRun: true,
    });
    expect(success).toBe(true);
    expect(f.updateSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dry_run: true,
      preview: { name: { from: "main", to: "renamed" } },
    });
  } finally {
    await f.close();
  }
});

it("rest refuses a preview for an unknown ledger without writing", async () => {
  const f = await fixture();
  try {
    f.getSpy.mockRejectedValueOnce(
      new FavaApiError("Not Found", 404, {
        success: false,
        error: "Not Found",
      }),
    );
    const { success, status } = await f.call("rest", {
      name: "renamed",
      dryRun: true,
    });
    expect(success).toBe(false);
    expect(status).toBe(404);
    expect(f.updateSpy).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("rest refuses an unauthorized preview without reading or writing", async () => {
  const f = await fixture();
  try {
    f.authorizeOrThrow.mockRejectedValueOnce(
      new ForbiddenError("no update access"),
    );
    const { success, status } = await f.call("rest", {
      name: "renamed",
      dryRun: true,
    });
    expect(success).toBe(false);
    expect(status).toBe(403);
    expect(f.getSpy).not.toHaveBeenCalled();
    expect(f.updateSpy).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});
