import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({
  createACP: () => ({}),
}));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "../composition-root";
import { MCP_PROMPTS } from "@/features/ai-agent/api/mcp-prompts";
import { MCP_TOOLS } from "@/features/ai-agent/api/mcp-tools";
import { isMcpHandshakeRequest } from "../rate-limit";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";
import type { AppConfig } from "@/config/config";
import type { Identity } from "../identity";

/**
 * The prompt surface (w2/008).
 *
 * Hosted agents cannot see `skills/`, so the ledger playbooks reach them as
 * MCP prompts or not at all. What is asserted here is what the field audit
 * found agents getting wrong unaided: that the playbooks are advertised, that
 * they name tools that actually exist, that they carry the refusals (no
 * invented accounts, no fabricated entries, no unconfirmed writes), and that a
 * pinned credential is told its ledger rather than told to go find one.
 */

const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;

const unpinned: Identity = {
  userId: "user-123",
  method: "apikey",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_1",
};

const pinned: Identity = { ...unpinned, ledgerScope: "alice/personal" };

/** A prompt message carries text or it is not a playbook. */
function textOf(content: { type: string }): string {
  expect(content.type).toBe("text");
  return (content as unknown as { text: string }).text;
}

async function withClient<T>(
  identity: Identity,
  run: (client: Client) => Promise<T>,
): Promise<T> {
  const ctx = { identity } as unknown as McpRequestContext;
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = assembleMcpRegistry(ctx, config);
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientTransport);
  try {
    return await run(client);
  } finally {
    await client.close();
    await server.close();
  }
}

describe("MCP prompts", () => {
  it("advertises the prompts capability and the four ledger playbooks", async () => {
    const listed = await withClient(pinned, (client) => client.listPrompts());
    expect(listed.prompts.map((prompt) => prompt.name).sort()).toEqual([
      "categorize-imports",
      "close-month",
      "reconcile-account",
      "spending-report",
    ]);
    for (const prompt of listed.prompts) {
      expect(prompt.description).toBeTruthy();
    }
  });

  it("returns a playbook when the caller supplies no argument values", async () => {
    // Every argument is optional, so a client that knows nothing but the
    // prompt's name still gets a usable procedure. (`arguments: {}` rather
    // than omitted: the SDK parses `params.arguments` against the declared
    // shape and rejects `undefined` for any prompt that declares arguments at
    // all — upstream behaviour, identical for every server, not a contract of
    // ours.)
    for (const descriptor of MCP_PROMPTS) {
      const result = await withClient(pinned, (client) =>
        client.getPrompt({ name: descriptor.name, arguments: {} }),
      );
      const [message] = result.messages;
      expect(message.role).toBe("user");
      // Substantive enough to be a procedure rather than a title.
      expect(textOf(message.content).length).toBeGreaterThan(500);
    }
  });

  it("names only tools and resources this server actually exposes", async () => {
    const toolNames = new Set(MCP_TOOLS.map((tool) => tool.name));
    for (const descriptor of MCP_PROMPTS) {
      const text = descriptor.build({}, pinned);
      // Backticked identifiers in camelCase are tool references; a playbook
      // that names a tool we removed sends the agent somewhere that 404s.
      for (const [, cited] of text.matchAll(/`([a-z]+[A-Z][A-Za-z]+)`/g)) {
        expect(toolNames.has(cited)).toBe(true);
      }
      for (const [, uri] of text.matchAll(/beancount:\/\/(\S+)/g)) {
        expect(uri).toMatch(/^\{owner\}\/\{name\}\//);
      }
    }
  });

  it("carries the refusals that make a playbook safe to hand an agent", async () => {
    for (const descriptor of MCP_PROMPTS) {
      const text = descriptor.build({}, pinned);
      if (descriptor.name === "spending-report") {
        expect(text).toMatch(/read-only/i);
        expect(text).toMatch(/never estimate/i);
        continue;
      }
      expect(text).toMatch(/never invent an account/i);
      expect(text).toMatch(/fabricate|never write before an explicit yes/i);
      expect(text).toMatch(/newErrors|checkLedger/);
    }
  });

  it("tells a pinned credential its ledger and an unpinned one to select one", async () => {
    for (const descriptor of MCP_PROMPTS) {
      expect(descriptor.build({}, pinned)).toContain("alice/personal");
      const open = descriptor.build({}, unpinned);
      expect(open).toContain("listLedgers");
      expect(open).toContain("ledger: owner/name");
    }
  });

  it("folds the caller's arguments into the playbook", async () => {
    const close = await withClient(pinned, (client) =>
      client.getPrompt({
        name: "close-month",
        arguments: { month: "2026-06" },
      }),
    );
    expect(textOf(close.messages[0].content)).toContain("2026-06");

    const reconcile = await withClient(pinned, (client) =>
      client.getPrompt({
        name: "reconcile-account",
        arguments: {
          account: "Assets:Bank:Checking",
          statement: "2026-06-01,-12.34,COFFEE",
        },
      }),
    );
    const text = textOf(reconcile.messages[0].content);
    expect(text).toContain("Assets:Bank:Checking");
    expect(text).toContain("COFFEE");
  });

  it("refuses to route a pinned credential at a ledger outside its pin", async () => {
    // The prompt is text, so selection here is advisory — but a playbook that
    // echoed an unreachable ledger would read as an instruction, and the agent
    // would spend its first calls discovering by 403 what this line can say.
    for (const descriptor of MCP_PROMPTS) {
      const text = descriptor.build({ ledger: "mallory/secret" }, pinned);
      expect(text).toContain("outside this credential's ledger restriction");
      expect(text).toContain("alice/personal");
    }
    // An unpinned credential may select freely.
    expect(MCP_PROMPTS[0].build({ ledger: "bob/books" }, unpinned)).toContain(
      "bob/books",
    );
  });

  it("charges prompts/get but not prompts/list", () => {
    expect(isMcpHandshakeRequest({ method: "prompts/list" })).toBe(true);
    expect(isMcpHandshakeRequest({ method: "prompts/get" })).toBe(false);
  });
});
