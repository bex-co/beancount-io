import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { MCP_TOOLS } from "../mcp-tools";
import { mcpOutputSchema, toolOutputSchema } from "../../tools/types";
import { ForbiddenError } from "@/shared/errors";
import type { AppConfig } from "@/config/config";
import type { ToolContext } from "../../tools/types";

const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;

function toolCtx(ledgerShell: unknown): ToolContext {
  return {
    services: { ledgerShell, ledgerRepo: {}, apiKey: {} },
    identity: {
      userId: "usr_1",
      method: "oauth",
      scopes: new Set([
        "ledger.read",
        "ledger.write",
        "apikey.read",
        "apikey.write",
      ]),
      tokenId: "tok_1",
      ledgerScope: "alice/main",
      capabilityExempt: false,
    },
    ledgerId: "alice/main",
    llmService: {},
    ledgerReceiptWorkflow: {},
  } as unknown as ToolContext;
}

async function connectClient(ctx: ToolContext) {
  const server = assembleMcpRegistry(ctx, config);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "1.0.0" });
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

/**
 * ADR 0007 D8. The assertions run against a real `tools/list` response rather
 * than against `MCP_TOOLS`, because the question is what a *client* receives:
 * the SDK normalizes a tool's `outputSchema` before publishing it, and the
 * failure mode this guards is precisely one the descriptor table cannot show —
 * registering the tools' own `toolOutputSchema` union publishes nothing at all.
 */
describe("MCP tools publish their output contract", () => {
  it("every tool arrives with a non-empty outputSchema", async () => {
    const { client, close } = await connectClient(toolCtx({}));
    const { tools } = await client.listTools();

    expect(tools).toHaveLength(MCP_TOOLS.length);
    const undeclared = tools.filter((t) => !t.outputSchema).map((t) => t.name);
    expect(undeclared).toEqual([]);
    await close();
  });

  it("the published schema describes the uniform ok/result/error envelope", async () => {
    const { client, close } = await connectClient(toolCtx({}));
    const { tools } = await client.listTools();

    const bql = tools.find((t) => t.name === "runBqlQuery");
    expect(bql?.outputSchema).toMatchObject({
      type: "object",
      properties: {
        ok: { type: "boolean" },
        result: { type: "string" },
        error: { type: "string" },
      },
      required: ["ok"],
    });
    await close();
  });

  it("a successful call returns structuredContent matching what it published", async () => {
    const { client, close } = await connectClient(
      toolCtx({ queryShellText: async () => "Assets:Cash 100 USD" }),
    );

    const result = await client.callTool({
      name: "runBqlQuery",
      arguments: { query: "BALANCES" },
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({ ok: true });
    await close();
  });

  /**
   * The two rules have to compose: D6 marks a `{ ok: false }` payload as an
   * error result, and the SDK skips output validation for an error result. If
   * they did not, publishing a schema would start rejecting every refusal.
   */
  it("a refusal still returns, carrying isError rather than failing validation", async () => {
    const { client, close } = await connectClient(
      toolCtx({
        queryShellText: async () => {
          throw new ForbiddenError("You no longer have access to this ledger");
        },
      }),
    );

    const result = await client.callTool({
      name: "runBqlQuery",
      arguments: { query: "BALANCES" },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({
      ok: false,
      error: "You no longer have access to this ledger",
    });
    await close();
  });
});

/**
 * The derivation itself. `mcpOutputSchema` exists because the MCP SDK
 * normalizes a discriminated union to `undefined` — publishing no schema *and*
 * breaking every call. These pin the two properties that make the workaround
 * safe: it accepts both branches of the real envelope, and it fails loudly
 * rather than silently if `toolOutputSchema`'s shape ever changes.
 */
describe("mcpOutputSchema", () => {
  it("accepts both branches of the envelope it replaces", () => {
    const schema = mcpOutputSchema(toolOutputSchema(z.string()));

    expect(schema.safeParse({ ok: true, result: "hi" }).success).toBe(true);
    expect(schema.safeParse({ ok: false, error: "nope" }).success).toBe(true);
    expect(schema.safeParse({ result: "no ok field" }).success).toBe(false);
  });

  it("carries the tool's own result type rather than widening it to unknown", () => {
    const schema = mcpOutputSchema(toolOutputSchema(z.number()));

    expect(schema.safeParse({ ok: true, result: 42 }).success).toBe(true);
    expect(schema.safeParse({ ok: true, result: "not a number" }).success).toBe(
      false,
    );
  });

  it("throws at construction when there is no success branch to derive from", () => {
    const noSuccessBranch = z.discriminatedUnion("ok", [
      z.object({ ok: z.literal(false), error: z.string() }),
      z.object({ ok: z.literal(true), payload: z.string() }),
    ]);

    expect(() =>
      mcpOutputSchema(
        noSuccessBranch as unknown as ReturnType<typeof toolOutputSchema>,
      ),
    ).toThrow(/no `\{ ok: true, result \}` branch/);
  });
});
