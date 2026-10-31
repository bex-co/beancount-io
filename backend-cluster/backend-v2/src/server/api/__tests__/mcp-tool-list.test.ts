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
import { mcpToolSecuritySchemes } from "../op-class";
import annotationReview from "../../../../docs/marketplace-submissions/openai/tool-annotations.json";
import { PREVIEW_FLAG_DESCRIPTION } from "@/features/ledger/utils/preview-flag-description";

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

const SELECTOR = /^(operation|op|action|verb|command|method)$/i;

/** Every property in a JSON Schema whose name says it picks an operation. */
function selectorPaths(schema: unknown, at = "$"): string[] {
  if (Array.isArray(schema))
    return schema.flatMap((item, i) => selectorPaths(item, `${at}[${i}]`));
  if (!schema || typeof schema !== "object") return [];
  return Object.entries(schema).flatMap(([key, value]) => {
    if (key !== "properties" || !value || typeof value !== "object")
      return selectorPaths(value, `${at}.${key}`);
    return Object.entries(value).flatMap(([name, property]) => [
      ...(SELECTOR.test(name) ? [`${at}.${name}`] : []),
      ...selectorPaths(property, `${at}.${name}`),
    ]);
  });
}

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

  it("carries every tool's title in its annotations, where the directory reads it", async () => {
    // Claude's connector portal flags a tool whose `annotations.title` is
    // missing even when the top-level `title` is set.
    const { tools } = await listTools();
    for (const tool of tools) {
      expect({ name: tool.name, title: tool.annotations?.title }).toEqual({
        name: tool.name,
        title: tool.title,
      });
      expect(tool.title?.trim().length).toBeGreaterThan(0);
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
    //
    // 96 KB since w1/m38 split the grouped tools into one tool per operation
    // (ADR 019, 2026-10-18), measured at 96,458 bytes across 43 tools: the
    // two bank tools became eight, and ledger lifecycle, collaborators, pull
    // requests, file edits, and entry-source edits became three each. Each
    // entry-source tool publishes only its own result shape; the shared
    // union would have put the list about 8 KB over this line.
    //
    // 104 KB since w3/m53 (ADR021) added the 44th tool, previewLedgerSetup,
    // and the setup specification on createLedger: measured at 100,992 bytes
    // across 44 tools after trimming the setup schema's descriptions.
    //
    // 105 KB since w23/m2/t004 documented the journal filter language on the
    // `listLedgerEntries` filter property (syntax, fields, quoting rules):
    // measured at 106,896 bytes. The description is the shared
    // JOURNAL_FILTER_DESCRIPTION every surface publishes, so trimming it on
    // MCP alone would fork the contract the parity tests pin.
    //
    // 106 KB since w23/m3/t001–t002 aliased `entry_hash` on the four entry
    // tools and `message`/`description` across the file tools: measured at
    // 107,718 bytes. Each alias carries one sentence naming the spelling's
    // home surface, which is the guidance the milestone exists to publish.
    //
    // 107 KB since w23/m4/t003 published the delete-guard rule on
    // `deleteLedgerFiles`: measured at 108,640 bytes (baseline 108,286
    // before the shared DELETE_INCLUDE_GUARD_DESCRIPTION). The description
    // is the shared constant every surface publishes, so trimming it on
    // MCP alone would fork the contract the parity tests pin.
    //
    // 108 KB since w23/m6/t010 added the `pad` entry variant and the
    // posting `totalPrice` field to the shared entry schema: measured at
    // 110,078 bytes. Both are typed-API surface the parity tests pin, so
    // trimming them on MCP alone would fork the contract.
    //
    // 110 KB since w23/m7/t003 added the `dry_run` flag and the preview
    // sentence to the three entry-source tools: measured at 111,798 bytes.
    // The flag is typed-API surface the parity tests pin, so trimming it
    // on MCP alone would fork the contract.
    //
    // 111 KB since w23/m8/t002-t003 aliased the bank id arguments toward
    // camelCase: measured at 112,847 bytes. The aliases are typed-API
    // surface the parity tests pin, so trimming them on MCP alone would
    // fork the contract.
    //
    // 112 KB since w23/m9/t002 twinned the preview flag as dryRun on the
    // fourteen listed write tools: measured at 114,071 bytes. Each twin carries
    // one sentence naming the spelling's home surface, which is the
    // guidance the milestone exists to publish.
    //
    // 113 KB since w23/m11/t002 twinned the object-key arguments on the
    // parse tools: measured at 114,778 bytes. Each twin carries one
    // sentence naming the spelling's home surface, which is the guidance
    // the milestone exists to publish.
    //
    // 115 KB since w23/m13/t002 gave updateLedger the m7 preview dialect:
    // measured at 117,221 bytes. The input twins plus updateLedger's own
    // output (the ledger shape echoing dry_run with the rendered preview)
    // are the guidance agents need to preview before committing.
    //
    // 116 KB since w23/m13/t004 gave the three collaborator tools the same
    // dialect: measured at 118,721 bytes. Same guidance, three more tools,
    // plus the star exclusion rationale.
    //
    // 117 KB since w23/140 twinned the nested entry keys: measured at
    // 118,989 bytes. The source_account/total_price aliases plus their
    // descriptions are the guidance snake_case callers need to stop dying
    // in strict validation.
    //
    // 118 KB since w23/158 documented the time clamp's open preservation:
    // measured at 119,811 bytes. The preserved-opens sentence is the
    // guidance agents need to stop reading `total` as in-window rows.
    //
    // 119 KB since w23/173 stated the one-of rule on the eight bank tools'
    // and three file tools' alias pairs: measured at 120,961 bytes. "one is
    // required" on the alias field is the guidance agents need, since the
    // schema keeps both spellings optional (the owner chose documentation
    // over a required-ness change, w23/172).
    const { tools } = await listToolsRaw();
    const bytes = Buffer.byteLength(JSON.stringify(tools), "utf8");
    expect(bytes).toBeLessThan(119 * 1024);
  });

  // w23/173: the schema keeps both spellings of an alias pair optional (the
  // owner chose documentation over a required-ness change, w23/172), so the
  // listing itself has to say that one of them is required.
  it.each([
    ["syncBankTransactions", "item_id"],
    ["reconcileBankAccounts", "item_id"],
    ["refreshBankConnection", "item_id"],
    ["unlinkBankConnection", "item_id"],
    ["mapBankAccount", "account_id"],
    ["mapBankAccount", "ledger_account"],
    ["setBankAccountCurrency", "account_id"],
    ["discardStagedBankTransactions", "transaction_ids"],
    ["createLedgerFiles", "message"],
    ["updateLedgerFiles", "message"],
    ["deleteLedgerFiles", "message"],
  ])("says one of the pair is required on %s.%s", async (name, alias) => {
    const { tools } = await listToolsRaw();
    const input = tools.find((entry) => entry.name === name)?.inputSchema as
      | { properties?: Record<string, { description?: string }> }
      | undefined;
    expect(input?.properties?.[alias]?.description).toContain(
      "one is required",
    );
  });

  // w23/m7/t006: every mutation preview flag is advertised where agents
  // look — tools/list — not just accepted when sent. Both hosts read the
  // same listing, so this pins the instructions Claude Code and Codex see.
  it.each([
    "addLedgerEntries",
    "updateEntrySource",
    "deleteEntrySource",
    "deleteEntrySources",
    "renameLedgerFile",
    // w23/m13/t002: lifecycle previews join the same dialect.
    "updateLedger",
  ])("advertises the dry_run preview flag on %s", async (name) => {
    const { tools } = await listToolsRaw();
    const tool = tools.find((entry) => entry.name === name);
    expect(tool?.description).toContain("dry_run previews without committing");
    const input = tool?.inputSchema as
      | { properties?: Record<string, { description?: string }> }
      | undefined;
    expect(input?.properties?.dry_run?.description).toBe(
      PREVIEW_FLAG_DESCRIPTION,
    );
    // w23/m9/t002: the dryRun twin is advertised alongside, naming home.
    expect(input?.properties?.dryRun?.description).toBe(
      "Alias of dry_run, as REST and GraphQL spell it.",
    );
    const output = tool?.outputSchema as
      | {
          properties?: Record<string, { properties?: Record<string, unknown> }>;
        }
      | undefined;
    // The echo and the preview the flag returns.
    expect(Object.keys(output?.properties?.result?.properties ?? {})).toEqual(
      expect.arrayContaining(["dry_run", "preview"]),
    );
  });

  it("exposes each operation as its own tool, never behind a selector argument", async () => {
    // OpenAI's app-directory scan refuses a tool that "appears to execute
    // operations that are not individually exposed" (ADR 019, 2026-10-18).
    // A dispatcher shows itself as an argument naming which operation to run,
    // at the top level or inside each item of a batch.
    const { tools } = await listTools();
    const selectors = tools.flatMap((tool) =>
      selectorPaths(tool.inputSchema).map((path) => `${tool.name}: ${path}`),
    );
    expect(selectors).toEqual([]);
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

  it("keeps the complete reviewer annotation matrix equal to tools/list", async () => {
    const { tools } = await listToolsRaw();
    const hints = [
      "readOnlyHint",
      "destructiveHint",
      "idempotentHint",
      "openWorldHint",
    ] as const;
    // The reviewer contract is authored from the service effects, rather
    // than generated from the descriptors. New tools and changed hints must
    // receive the same complete review before their public snapshot changes.
    const actual = Object.fromEntries(
      tools.map((tool) => [
        tool.name,
        Object.fromEntries(
          hints.map((hint) => [
            hint,
            (tool.annotations as Record<string, unknown>)?.[hint],
          ]),
        ),
      ]),
    );
    expect(actual).toEqual(
      Object.fromEntries(
        annotationReview.tools.map((tool) => [tool.name, tool.annotations]),
      ),
    );
  });

  // Review semantics follow every allowed branch, including removal hidden
  // behind a rename, receipt promotion, bank sync, or personal toggle.
  it.each([
    "renameLedgerFile",
    "insertReceiptTransaction",
    "syncBankTransactions",
    "setLedgerStar",
  ])("advertises destructive effects on %s", async (name) => {
    const { tools } = await listToolsRaw();
    expect(tools.find((tool) => tool.name === name)?.annotations).toMatchObject(
      {
        readOnlyHint: false,
        destructiveHint: true,
      },
    );
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
/**
 * Tools this server used to serve. Each is gone for a recorded reason, so its
 * name must neither answer a call nor be suggested by anything the server
 * says: a description naming one sends the model to a dead end.
 */
const RETIRED_TOOLS = [
  // Split into one tool per operation (ADR 019, 2026-10-18; w1/m38).
  "editLedgerFiles",
  "editEntrySource",
  "manageBankImport",
  "manageBankConnection",
  "managePullRequests",
  "manageLedgers",
  "manageLedgerCollaborators",
  // Renamed for what it does: a merge, not a review verdict (w1/172).
  "approvePullRequest",
  // Withdrawn by directory policy (ADR 019, 2026-10-09; w1/m36).
  "manageApiKeys",
  "listPublicKeys",
  "managePublicKeys",
  "deleteAccount",
];

describe("retired MCP tools", () => {
  it.each(RETIRED_TOOLS)(
    "answers %s as an unknown tool and points at tools/list",
    async (name) => {
      const result = await withClient((client) =>
        client.callTool({ name, arguments: {} }),
      );
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toMatchObject({
        ok: false,
        error: {
          code: "NOT_FOUND",
          hint: expect.stringContaining("tools/list"),
        },
      });
    },
  );

  it("are named by no tool, resource, or instruction the server publishes", async () => {
    const served = await withClient(async (client) => [
      JSON.stringify(await client.listTools()),
      JSON.stringify(await client.listResourceTemplates()),
      JSON.stringify(await client.listResources()),
      JSON.stringify(await client.listPrompts()),
      client.getInstructions() ?? "",
    ]);
    const text = served.join("\n");
    expect(
      RETIRED_TOOLS.filter((name) => new RegExp(`\\b${name}\\b`).test(text)),
    ).toEqual([]);
  });
});

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
    expect(mcpToolSecuritySchemes("syncBankTransactions")).toEqual([
      { type: "oauth2", scopes: ["ledger.write"] },
    ]);
    expect(mcpToolSecuritySchemes("unlinkBankConnection")).toEqual([
      { type: "oauth2", scopes: ["ledger.admin"] },
    ]);
    expect(mcpToolSecuritySchemes("deleteLedger")).toEqual([
      { type: "oauth2", scopes: ["ledger.admin"] },
    ]);
    // A tool binding several verbs of different classes declares the strongest.
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
