import "reflect-metadata";

const counts = new Map<string, number>();
jest.mock("@/foundation/redis/redis-counter", () => ({
  incrementInWindow: async (key: string) => {
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    return { count, resetInMs: 60_000 };
  },
}));
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import type { RouterContext } from "@koa/router";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "../composition-root";
import { restRateLimitMiddleware } from "@/server/rest/rate-limit-middleware";
import { graphqlRateLimitMiddleware } from "@/server/graphql/rate-limit-middleware";
import {
  CLASS_BUDGETS,
  PREVIEW_BUDGET_MULTIPLIER,
  clearRateLimitShadows,
  consume,
  isPreviewRequest,
} from "../rate-limit";
import { RateLimitedError } from "@/shared/errors";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";
import type { AppConfig } from "@/config/config";
import type { Identity } from "../identity";

/**
 * w23/m26 — a `dry_run`/`dryRun` preview of a write draws on its own bucket,
 * wider than the write budget, on REST, GraphQL and MCP; a commit keeps its
 * limit; exhausting one bucket never blocks the other. The three surfaces are
 * driven through their real limiter middleware, on the one verb
 * (`appendLedgerText`) all three spell.
 */
const identity: Identity = {
  userId: "usr_preview",
  method: "apikey",
  scopes: new Set(["ledger.read", "ledger.write"]),
  tokenId: "tok_preview",
};
const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;
const WRITE = CLASS_BUDGETS.write.max;
const PREVIEW = WRITE * PREVIEW_BUDGET_MULTIPLIER;

type Call = (preview: boolean) => Promise<"ok" | "limited">;

const rest: Call = async (preview) => {
  const ctx = {
    method: "POST",
    path: "/api-gateway/v1/ledgers/a/b/directives/text",
    ip: "10.0.0.1",
    state: { identity },
    request: { body: { text: "x", ...(preview ? { dryRun: true } : {}) } },
    matched: [
      {
        methods: ["POST"],
        path: "/api-gateway/v1/ledgers/{owner}/{name}/directives/text",
      },
    ],
    set: jest.fn(),
  } as unknown as RouterContext;
  try {
    await restRateLimitMiddleware()(ctx, async () => undefined);
    return "ok";
  } catch (error) {
    if (error instanceof RateLimitedError) return "limited";
    throw error;
  }
};

const graphql: Call = async (preview) => {
  try {
    await graphqlRateLimitMiddleware()(
      {
        args: {
          ledgerId: "a/b",
          text: "x",
          ...(preview ? { dryRun: true } : {}),
        },
        context: { identity, clientIp: "10.0.0.1" },
        info: {
          parentType: { name: "Mutation" },
          fieldName: "appendLedgerText",
          path: {},
        },
      } as never,
      async () => "resolved",
    );
    return "ok";
  } catch (error) {
    if (error instanceof RateLimitedError) return "limited";
    throw error;
  }
};

let client: Client;
let server: ReturnType<typeof assembleMcpRegistry>;
beforeAll(async () => {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  server = assembleMcpRegistry(
    { identity } as unknown as McpRequestContext,
    config,
  );
  await server.connect(serverTransport);
  client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientTransport);
});
afterAll(async () => {
  await client.close();
  await server.close();
});

const mcp: Call = async (preview) => {
  const result = (await client.callTool({
    name: "appendLedgerText",
    arguments: {
      text: "x",
      ledger: "a/b",
      ...(preview ? { dry_run: true } : {}),
    },
  })) as { structuredContent?: { error?: { code?: string } } };
  // Past the gate the service-less context fails; only the gate's answer matters.
  return result.structuredContent?.error?.code === "RATE_LIMITED"
    ? "limited"
    : "ok";
};

beforeEach(() => {
  counts.clear();
  clearRateLimitShadows();
});

describe.each([
  ["REST", rest],
  ["GraphQL", graphql],
  ["MCP", mcp],
] as const)("%s", (_surface, call) => {
  it("lets previews run past the write budget and stops them at the preview budget", async () => {
    for (let i = 0; i < PREVIEW; i += 1) {
      expect(await call(true)).toBe("ok");
    }
    expect(WRITE).toBeLessThan(PREVIEW);
    expect(await call(true)).toBe("limited");
  });

  it("keeps the commit budget separate in both directions", async () => {
    for (let i = 0; i < PREVIEW; i += 1) await call(true);
    expect(await call(true)).toBe("limited");
    // The exhausted preview bucket does not block a commit...
    for (let i = 0; i < WRITE; i += 1) expect(await call(false)).toBe("ok");
    expect(await call(false)).toBe("limited");
    // ...and the exhausted commit bucket does not block a preview on a fresh window.
    counts.clear();
    clearRateLimitShadows();
    for (let i = 0; i < WRITE; i += 1) await call(false);
    expect(await call(false)).toBe("limited");
    expect(await call(true)).toBe("ok");
  });
});

describe("what earns the preview bucket", () => {
  const write = (args: { preview?: boolean; opId?: string }) =>
    consume({
      opId: args.opId ?? "MCP appendLedgerText",
      identity,
      ip: "mcp",
      preview: args.preview,
    });

  it("is a boolean true on either spelling and nothing else", () => {
    expect(isPreviewRequest({ dry_run: true })).toBe(true);
    expect(isPreviewRequest({ dryRun: true })).toBe(true);
    for (const value of ["true", 1, "yes", null, false, undefined, {}]) {
      expect(isPreviewRequest({ dry_run: value })).toBe(false);
      expect(isPreviewRequest({ dryRun: value })).toBe(false);
    }
    expect(isPreviewRequest(undefined)).toBe(false);
    expect(isPreviewRequest("dry_run")).toBe(false);
    expect(isPreviewRequest([{ dry_run: true }])).toBe(false);
  });

  it("scales an op's own lower budget instead of replacing it", async () => {
    // generateTempAssetUploadUrl is a deliberately small write budget (10): a
    // preview of it earns three times that, never the generic 180.
    const opId = "GQL Mutation.generateTempAssetUploadUrl";
    const commit = await write({ opId });
    const preview = await write({ opId, preview: true });
    expect(commit.budget.max).toBe(10);
    expect(preview.budget.max).toBe(10 * PREVIEW_BUDGET_MULTIPLIER);
  });

  it("does not widen a read or an admin op", async () => {
    const read = await write({ opId: "GQL Query.listLedgers", preview: true });
    expect(read.budget.max).toBe(CLASS_BUDGETS.read.max);
    const admin = await write({ opId: "MCP deleteLedger", preview: true });
    expect(admin.budget.max).toBe(CLASS_BUDGETS.admin.max);
  });
});
