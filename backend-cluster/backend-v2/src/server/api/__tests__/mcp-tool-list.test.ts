import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({
  createACP: () => ({}),
}));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "../composition-root";
import { MCP_TOOLS } from "@/features/ai-agent/api/mcp-tools";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";
import type { AppConfig } from "@/config/config";
import type { Identity } from "../identity";
import { z } from "zod";
import {
  PLAN_WORDING,
  STEERING_WORDING,
} from "@/features/ai-agent/api/__tests__/directory-wording";
import { mcpToolSecuritySchemes, VERB_TABLE } from "../op-class";

/**
 * The lean, use-ordered tool list (w2/m27:t005).
 *
 * `tools/list` is paid on every agent session (~12k tokens at the audit's
 * 47 KB), so its order and size are asserted here rather than hoped for:
 * reads first, destructive last, and the whole listing under 25 KB.
 */

const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;

const identity: Identity = {
  userId: "user-123",
  method: "apikey",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_1",
};

/**
 * `tools/list` as it crosses the wire. The client SDK's own parse drops fields
 * its `Tool` type does not know — the top-level `securitySchemes` among them —
 * so byte budgets and wire checks read the raw response.
 */
async function withClient<T>(use: (client: Client) => Promise<T>): Promise<T> {
  const ctx = { identity } as unknown as McpRequestContext;
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = assembleMcpRegistry(ctx, config);
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientTransport);
  try {
    return await use(client);
  } finally {
    await client.close();
    await server.close();
  }
}

const listToolsRaw = () =>
  withClient(
    async (client) =>
      (await client.request(
        { method: "tools/list" },
        z.looseObject({
          tools: z.array(z.looseObject({ name: z.string() })),
        }),
      )) as { tools: Record<string, unknown>[] },
  );

const listTools = () => withClient((client) => client.listTools());

describe("MCP tool list", () => {
  it("describes every tool and prompt without steering the model or naming a plan", async () => {
    // Both connector directories review this text (ADR 019, 2026-10-09
    // amendment): it says what a tool does, never how the model should
    // behave, and never promotes a plan.
    const [{ tools }, { prompts }] = await withClient((client) =>
      Promise.all([client.listTools(), client.listPrompts()]),
    );
    const texts = [
      ...tools.map((t) => [t.name, `${t.title ?? ""} ${t.description ?? ""}`]),
      ...prompts.map((p) => [p.name, p.description ?? ""]),
    ];
    for (const [name, text] of texts) {
      expect({ name, steering: STEERING_WORDING.test(text) }).toEqual({
        name,
        steering: false,
      });
      expect({ name, plan: PLAN_WORDING.test(text) }).toEqual({
        name,
        plan: false,
      });
    }
  });

  // Directory policy withholds these from MCP (ADR 019, 2026-10-09
  // amendment); GraphQL and REST keep them. One table instead of a case per
  // parity suite: nothing is registered, so nothing can reach a service.
  it.each([
    "manageApiKeys",
    "listPublicKeys",
    "managePublicKeys",
    "deleteAccount",
  ])("offers no %s tool and refuses a call by that name", async (name) => {
    await withClient(async (client) => {
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name)).not.toContain(name);
      const result = await client.callTool({ name, arguments: {} });
      expect(result.isError).toBe(true);
    });
  });

  it.each([
    "beancount://account/public-keys",
    "beancount://account/public-key?keyId=1",
    "beancount://configuration/tier-quotas",
    "beancount://account/ai-cfo-usage",
  ])("serves no withheld resource at %s", async (uri) => {
    await withClient(async (client) => {
      const { resourceTemplates } = await client.listResourceTemplates();
      const path = uri.replace(/^beancount:\/\//, "").split("?")[0];
      expect(resourceTemplates.some((t) => t.uriTemplate.includes(path))).toBe(
        false,
      );
      await expect(client.readResource({ uri })).rejects.toThrow();
    });
  });

  it("starts with the read tools agents reach for first", () => {
    expect(MCP_TOOLS.slice(0, 5).map((tool) => tool.name)).toEqual([
      "runBqlQuery",
      "runBqlQueryStructured",
      "listLedgers",
      "checkLedger",
      "getLedgerContext",
    ]);
    for (const tool of MCP_TOOLS.slice(0, 5)) {
      expect(tool.annotations.readOnlyHint).toBe(true);
    }
  });

  it("keeps tools/list lean", async () => {
    // w2/m27 aimed for 25 KB but measured the real floor first: output
    // schemas alone are ~29 KB and ADR 0008 D8 requires them published, and
    // even deleting every output schema leaves ~33 KB — the nine directive
    // shapes behind addLedgerEntries are the shared REST contract and cannot
    // shrink on MCP alone. So the gate pins the achieved size (25 tools, down
    // from 28 with the compat shims gone and descriptions trimmed) instead of
    // an unreachable aspiration: growing it stays a decision.
    //
    // It grew from 61 KB to 63 KB when w4/069 restored `manageApiKeys`'s
    // advertised input — 1.4 KB, of which 0.4 KB is the ISO 8601 pattern for
    // `expiresAt`. w2/m27:t005 believed it had deleted that regex; what it had
    // actually done was publish the whole schema as `properties: {}`, so the
    // savings it recorded were the bug.
    //
    // 64 KB since w2/m32 added `refreshManagedPrices` (1.5 KB): a refresh is
    // an action, so it cannot be a resource. Its output schema types only the
    // three fields an agent acts on and defers the rest to the resource
    // template, which is what kept the growth to 1.5 KB instead of 2.6 KB.
    //
    // 66 KB since w1/m33 (ADR 019 D7) added `listBankConnections` (1.2 KB):
    // a tools-only host cannot otherwise reach the ids the bank tools need.
    // Its description names only the ids and the tools that take them.
    // 67 KB with `listStagedBankTransactions` (1.1 KB), the staged ids
    // `manageBankImport` submit/discard need and `sync` never returns.
    // 68 KB with `listPublicKeys` (0.9 KB), the keyId `managePublicKeys`
    // delete needs.
    //
    // 72 KB since w1/m33 (ADR 019 D2) published each tool's `securitySchemes`
    // twice — top level, where OpenAI's Apps SDK reference places it, and in
    // `_meta`, its documented mirror for clients that read only `_meta` (the
    // official client SDK strips unknown top-level fields): 4.1 KB across 30
    // tools. Measured on the raw response from here on, since the parsed one
    // no longer shows everything an agent pays for.
    const { tools } = await listToolsRaw();
    const bytes = Buffer.byteLength(JSON.stringify(tools), "utf8");
    expect(bytes).toBeLessThan(72 * 1024);
  });

  it("publishes all four annotations on every tool", async () => {
    const { tools } = await listTools();
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(typeof tool.annotations?.readOnlyHint).toBe("boolean");
      expect(typeof tool.annotations?.destructiveHint).toBe("boolean");
      expect(typeof tool.annotations?.idempotentHint).toBe("boolean");
      expect(typeof tool.annotations?.openWorldHint).toBe("boolean");
    }
  });

  it("serves no GraphQL/REST compat shim on MCP", async () => {
    const { tools } = await listTools();
    const names = tools.map((tool) => tool.name);
    expect(names).not.toContain("addLegacyEntries");
    expect(names).not.toContain("listApiKeys");
    expect(names).not.toContain("createApiKey");
    expect(names).not.toContain("revokeApiKey");
    // Withdrawn by directory policy, not folded (ADR 019, 2026-10-09).
    expect(names).not.toContain("manageApiKeys");
  });

  /**
   * A tool's advertised input is the only thing an agent can read before it
   * calls (w4/069). `manageApiKeys` published `{"type":"object",
   * "properties":{}}` for a week because its schema was wrapped in
   * `z.preprocess`, which the SDK's JSON-Schema conversion sees as opaque —
   * the runtime still refused a bad call, so nothing else noticed.
   */
  it("advertises the arguments of every tool that takes some", async () => {
    // The one tool that genuinely takes no arguments; everything else has to
    // publish its fields.
    const noArguments = new Set(["deleteAccount"]);
    const { tools } = await listTools();
    for (const tool of tools) {
      const properties = Object.keys(tool.inputSchema.properties ?? {});
      if (noArguments.has(tool.name)) {
        expect(properties).toEqual([]);
      } else {
        expect({ tool: tool.name, properties }).toEqual({
          tool: tool.name,
          properties: expect.arrayContaining([expect.any(String)]),
        });
      }
    }
  });
});

/**
 * Per-tool `securitySchemes` (ADR 019 D2): derived from `VERB_TABLE`, never
 * hand-written, published top-level and mirrored in `_meta`.
 */
describe("MCP tool security schemes", () => {
  it("publishes each tool's derived scheme top-level and in _meta", async () => {
    const { tools } = await listToolsRaw();
    expect(tools).toHaveLength(MCP_TOOLS.length);
    for (const tool of tools) {
      const expected = mcpToolSecuritySchemes(String(tool.name));
      expect(tool.securitySchemes).toEqual(expected);
      expect(
        (tool._meta as { securitySchemes?: unknown }).securitySchemes,
      ).toEqual(expected);
    }
  });

  it("asks for the scope of the tool's most privileged verb", () => {
    expect(mcpToolSecuritySchemes("runBqlQuery")).toEqual([
      { type: "oauth2", scopes: ["ledger.read"] },
    ]);
    expect(mcpToolSecuritySchemes("manageBankImport")).toEqual([
      { type: "oauth2", scopes: ["ledger.write"] },
    ]);
    // A grouped tool whose branches span classes declares the strongest.
    const classes = new Set(
      VERB_TABLE.filter((e) => e.mcp === "manageLedgers").map((e) => e.class),
    );
    expect(classes.has("admin")).toBe(true);
    expect(mcpToolSecuritySchemes("manageLedgers")).toEqual([
      { type: "oauth2", scopes: ["ledger.admin"] },
    ]);
    expect(
      mcpToolSecuritySchemes("mixed", [
        { mcp: "mixed", class: "read" },
        { mcp: "mixed", class: "admin" },
        { mcp: "mixed", class: "write" },
      ]),
    ).toEqual([{ type: "oauth2", scopes: ["ledger.admin"] }]);
  });

  it("declares OAuth without a scope for session-only tools, and allows anonymous public ones", () => {
    expect(
      mcpToolSecuritySchemes("sessionOnly", [
        { mcp: "sessionOnly", class: "session-only" },
      ]),
    ).toEqual([{ type: "oauth2" }]);
    expect(
      mcpToolSecuritySchemes("open", [{ mcp: "open", class: "public" }]),
    ).toEqual([{ type: "noauth" }, { type: "oauth2" }]);
  });
});
