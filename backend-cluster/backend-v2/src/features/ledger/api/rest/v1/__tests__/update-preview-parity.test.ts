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
  const updateSpy = jest.fn(async () => envelope({ ...CURRENT }));
  const getSpy = jest.fn(async () => envelope({ ...CURRENT }));
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
      return {
        success: response.status === 200,
        status: response.status,
        result: (await response.json()) as Record<string, unknown>,
      };
    }
    if (surface === "gql") {
      const result = await graphql({
        schema,
        source: `mutation($name:String,$description:String,$private:Boolean,$dryRun:Boolean,$dry_run:Boolean) { updateLedger(ledgerId:"alice/main",name:$name,description:$description,private:$private,dryRun:$dryRun,dry_run:$dry_run) { name private dryRun preview { name { from to } description { from to } private { from to } warnings } } }`,
        variableValues: args,
        contextValue: { identity, getCurrentIdentity: () => identity },
      });
      return {
        success: !result.errors,
        result: result.data?.updateLedger as
          | Record<string, unknown>
          | undefined,
        errors: result.errors,
      };
    }
    const result = await client.callTool({
      name: "updateLedger",
      arguments: args,
    });
    return {
      success: !result.isError,
      result: (
        result.structuredContent as { result?: Record<string, unknown> }
      )?.result,
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
describe.each(["rest", "gql", "mcp"])("updateLedger preview (%s)", (surface) => {
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
      expect(
        (result?.preview as { warnings: string[] }).warnings,
      ).toContain("This would make the ledger public, readable by anyone.");
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
      new FavaApiError("Not Found", 404, { success: false, error: "Not Found" }),
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
