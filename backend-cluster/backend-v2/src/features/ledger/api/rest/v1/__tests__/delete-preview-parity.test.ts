import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
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

async function fixture() {
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const deleteSpy = jest.fn(async () => envelope({}));
  const getSpy = jest.fn(async () => envelope({ ...CURRENT }));
  const fava = {
    getPublicApiClient: async () => ({
      ledgers: {
        getLedger: getSpy,
        deleteLedger: deleteSpy,
      },
    }),
  };
  const authorizeOrThrow = jest.fn(async () => ({ allowed: true }));
  const authorization = { authorizeOrThrow };
  const models = {
    plaidItem: {
      getByLedgerRepoId: jest.fn(async () => []),
      deleteByLedgerRepoId: jest.fn(async () => {}),
    },
  };
  const db = {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  };
  const workflow = new LedgerWorkflow(
    fava as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    models as never,
    db as never,
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
  const client = new Client({ name: "delete-preview-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  const call = async (surface: string, args: Record<string, unknown>) => {
    if (surface === "rest") {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main`,
        {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(args),
        },
      );
      return {
        success: response.status === 200,
        status: response.status,
        result: (await response.json()) as Record<string, unknown>,
      };
    }
    if (surface === "gql") {
      const result = await graphql({
        schema,
        source: `mutation($dryRun:Boolean,$dry_run:Boolean) { deleteLedger(ledgerId:"alice/main",dryRun:$dryRun,dry_run:$dry_run) { ledgerId dryRun preview { ledgerId name description private empty size warnings } } }`,
        variableValues: args,
        contextValue: { identity, getCurrentIdentity: () => identity },
      });
      return {
        success: !result.errors,
        result: result.data?.deleteLedger as
          | Record<string, unknown>
          | undefined,
        errors: result.errors,
      };
    }
    const result = await client.callTool({
      name: "deleteLedger",
      arguments: { ledger: "alice/main", ...args },
    });
    return {
      success: !result.isError,
      result: (
        result.structuredContent as { result?: Record<string, unknown> }
      )?.result,
    };
  };

  return {
    deleteSpy,
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

// deleteLedger previews the destroy summary on REST, GraphQL, and MCP; the
// preview commits nothing, twins agree-or-refuse alike, and a commit echoes
// dryRun:false with no preview (w23/m13/t003).
describe.each(["rest", "gql", "mcp"])("deleteLedger preview (%s)", (surface) => {
  it("renders the destroy summary and commits nothing", async () => {
    const f = await fixture();
    try {
      const flag = surface === "mcp" ? { dry_run: true } : { dryRun: true };
      const { success, result } = await f.call(surface, { ...flag });
      expect(success).toBe(true);
      expect(f.deleteSpy).not.toHaveBeenCalled();
      // MCP echoes dry_run like every m7 preview; REST and GraphQL echo dryRun.
      const echo = surface === "mcp" ? { dry_run: true } : { dryRun: true };
      expect(result).toMatchObject({
        ledgerId: "alice/main",
        ...echo,
        preview: {
          ledgerId: "alice/main",
          name: "main",
          description: "Old description",
          private: true,
          empty: false,
          size: 10,
        },
      });
      if (surface === "mcp") {
        expect(result).not.toHaveProperty("dryRun");
      } else {
        expect(result).not.toHaveProperty("dry_run");
      }
      expect((result?.preview as { warnings: string[] }).warnings).toEqual([
        "This would permanently delete alice/main, including its full history. This cannot be undone.",
        "Any linked bank connections would be revoked and their synced items removed.",
      ]);
    } finally {
      await f.close();
    }
  });

  it("refuses conflicting twins", async () => {
    const f = await fixture();
    try {
      const { success } = await f.call(surface, {
        dryRun: true,
        dry_run: false,
      });
      expect(success).toBe(false);
      expect(f.deleteSpy).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("commits without the flag and echoes dryRun:false", async () => {
    const f = await fixture();
    try {
      const { success, result } = await f.call(surface, {});
      expect(success).toBe(true);
      expect(f.deleteSpy).toHaveBeenCalledTimes(1);
      expect(f.deleteSpy).toHaveBeenCalledWith("alice", "main");
      expect(result).toMatchObject(
        surface === "mcp" ? { dry_run: false } : { dryRun: false },
      );
      // Absent reads undefined on REST/MCP and null on GraphQL.
      expect(result?.preview ?? undefined).toBeUndefined();
    } finally {
      await f.close();
    }
  });
});

it("rest agrees when both twins are true", async () => {
  const f = await fixture();
  try {
    const { success, result } = await f.call("rest", {
      dryRun: true,
      dry_run: true,
    });
    expect(success).toBe(true);
    expect(f.deleteSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({ dryRun: true });
  } finally {
    await f.close();
  }
});

it("gql accepts the dry_run alias alone", async () => {
  const f = await fixture();
  try {
    const { success, result } = await f.call("gql", { dry_run: true });
    expect(success).toBe(true);
    expect(f.deleteSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ledgerId: "alice/main",
      dryRun: true,
      preview: { ledgerId: "alice/main", name: "main" },
    });
  } finally {
    await f.close();
  }
});

it("mcp accepts the dryRun alias alone", async () => {
  const f = await fixture();
  try {
    const { success, result } = await f.call("mcp", { dryRun: true });
    expect(success).toBe(true);
    expect(f.deleteSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ledgerId: "alice/main",
      dry_run: true,
      preview: { ledgerId: "alice/main", name: "main" },
    });
  } finally {
    await f.close();
  }
});

it("rest refuses a preview for an unknown ledger without destroying", async () => {
  const f = await fixture();
  try {
    f.getSpy.mockRejectedValueOnce(
      new FavaApiError("Not Found", 404, { success: false, error: "Not Found" }),
    );
    const { success, status } = await f.call("rest", { dryRun: true });
    expect(success).toBe(false);
    expect(status).toBe(404);
    expect(f.deleteSpy).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("rest refuses an unauthorized preview without reading or destroying", async () => {
  const f = await fixture();
  try {
    f.authorizeOrThrow.mockRejectedValueOnce(
      new ForbiddenError("no delete access"),
    );
    const { success, status } = await f.call("rest", { dryRun: true });
    expect(success).toBe(false);
    expect(status).toBe(403);
    expect(f.getSpy).not.toHaveBeenCalled();
    expect(f.deleteSpy).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});
