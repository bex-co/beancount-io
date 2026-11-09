import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "../composition-root";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";
import type { AppConfig } from "@/config/config";

/**
 * w23/m33 — every tool and parameter the surface names must exist.
 *
 * w23/217 shipped a hint that told an agent to overwrite a file "with
 * `replace`", a spelling no published tool has, and nothing noticed: the
 * existing guards check that the docs' tool table, resource URIs and prompt
 * playbooks name real things, and that retired names are gone. This closes the
 * rest — the descriptions, server instructions and prompt text an agent reads,
 * the docs sections an agent follows, and the hints a refusal carries.
 *
 * "Exists" means: a tool name, a prompt name, or a property or enum value in
 * some published input or output schema. The check reads identifiers written in
 * code spans in camelCase or snake_case; one-word spellings such as `replace`
 * are too ordinary to tell from prose, so a hint that misnames a plain word is
 * still the author's to catch.
 */
const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;
const SRC = path.resolve(__dirname, "../../..");
const DOC = readFileSync(path.resolve(SRC, "../docs/mcp.md"), "utf8");

/** camelCase or snake_case identifiers in code spans. */
const CODE_SPAN = /`([a-z]+(?:[A-Z][a-z0-9]+)+|[a-z]+(?:_[a-z0-9]+)+)`/g;
/** The same, escaped inside a TypeScript template literal. */
const ESCAPED_SPAN = /\\`([a-z]+(?:[A-Z][a-z0-9]+)+|[a-z]+(?:_[a-z0-9]+)+)\\`/g;

/** Published text that cites a name its vocabulary cannot see, with why. */
const ALLOWED_PUBLISHED: Record<string, string> = {
  generated_from:
    "a key of getEntryContext's result, whose outputSchema is z.unknown() so the vocabulary cannot see it (entry-context-parity.test.ts)",
};

/** Hint sources that name another surface's operation on purpose. */
const ALLOWED_HINT_SOURCES: Record<string, string> = {
  updateLedgerFile:
    "the GraphQL mutation, named beside the MCP and REST spellings in the create-conflict hint",
  getLedgerDirContent:
    "the GraphQL query, in the hint of GraphQL's getLedgerFile; MCP reads get `listLedgerFiles` instead (file-read-directory-parity.test.ts)",
};

/** Docs that name GraphQL operations next to their MCP counterparts. */
const ALLOWED_DOC_NAMES: Record<string, string> = {
  deleteLedgerFile: "the GraphQL mutation, cited beside REST DELETE",
  getLedgerFile: "the GraphQL query, cited for its exact-bytes behavior",
  queryShell: "the GraphQL query that shares the BQL producer",
};

/** Verbs every MCP tool name starts with. */
const TOOL_VERB =
  /^(list|get|read|run|add|append|create|update|delete|set|remove|rename|sync|import|discard|reconcile|unlink|parse|generate|insert|check|leave|star|unstar|search|link|edit|manage|query|fetch|find)[A-Z]/;

type Corpus = {
  vocabulary: Set<string>;
  published: Record<string, string>;
};

async function load(): Promise<Corpus> {
  const ctx = {
    identity: {
      userId: "usr_1",
      method: "oauth",
      scopes: new Set(["ledger.read"]),
      tokenId: "tok_1",
    },
  } as unknown as McpRequestContext;
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = assembleMcpRegistry(ctx, config);
  await server.connect(serverTransport);
  const client = new Client({ name: "refs", version: "1.0.0" });
  await client.connect(clientTransport);
  try {
    const { tools } = await client.listTools();
    const { prompts } = await client.listPrompts();
    const vocabulary = new Set<string>();
    const walk = (node: unknown): void => {
      if (!node || typeof node !== "object") return;
      for (const [key, value] of Object.entries(node)) {
        if (key === "properties" && value && typeof value === "object") {
          Object.keys(value).forEach((name) => vocabulary.add(name));
        }
        if (key === "enum" && Array.isArray(value)) {
          value.forEach(
            (entry) => typeof entry === "string" && vocabulary.add(entry),
          );
        }
        walk(value);
      }
    };
    for (const tool of tools) {
      vocabulary.add(tool.name);
      walk(tool.inputSchema);
      walk(tool.outputSchema);
    }
    for (const prompt of prompts) {
      vocabulary.add(prompt.name);
      prompt.arguments?.forEach((arg) => vocabulary.add(arg.name));
    }
    const playbooks = await Promise.all(
      prompts.map(async (prompt) => {
        const got = await client.getPrompt({ name: prompt.name });
        return got.messages
          .map((m) => (m.content.type === "text" ? m.content.text : ""))
          .join("\n");
      }),
    );
    return {
      vocabulary,
      published: {
        "tool descriptions": tools.map((t) => t.description ?? "").join("\n"),
        "server instructions": client.getInstructions() ?? "",
        "prompt descriptions": prompts
          .map((p) => p.description ?? "")
          .join("\n"),
        "prompt playbooks": playbooks.join("\n"),
      },
    };
  } finally {
    await client.close();
    await server.close();
  }
}

const tokens = (text: string, pattern: RegExp): string[] => [
  ...new Set([...text.matchAll(pattern)].map((m) => m[1])),
];

/** The docs an agent follows: connection through tool reference, minus history. */
function agentDocs(): string {
  const start = DOC.indexOf("## Connect a client");
  const end = DOC.indexOf("\n## Resources");
  let section = DOC.slice(start, end);
  // The renames section names the retired spellings on purpose.
  const renamed = section.indexOf("### Tools renamed");
  if (renamed >= 0) {
    const next = section.indexOf("\n### ", renamed + 5);
    section =
      section.slice(0, renamed) + (next >= 0 ? section.slice(next) : "");
  }
  return section;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory())
      return name === "__tests__" ? [] : sourceFiles(full);
    return name.endsWith(".ts") && !name.endsWith(".test.ts") ? [full] : [];
  });
}

describe("names the MCP surface cites resolve to something it publishes (w23/m33)", () => {
  let corpus: Corpus;
  beforeAll(async () => {
    corpus = await load();
  });

  it("every name in a tool description, the server instructions and prompt text exists", () => {
    const unknown = Object.entries(corpus.published).flatMap(([where, text]) =>
      tokens(text, CODE_SPAN)
        .filter(
          (name) =>
            !corpus.vocabulary.has(name) && !(name in ALLOWED_PUBLISHED),
        )
        .map((name) => `${name} (in ${where})`),
    );
    expect(unknown).toEqual([]);
  });

  it("every tool-shaped name in the docs an agent follows is a published tool", () => {
    const unknown = tokens(agentDocs(), CODE_SPAN)
      .filter((name) => TOOL_VERB.test(name))
      .filter((name) => !corpus.vocabulary.has(name))
      .filter((name) => !(name in ALLOWED_DOC_NAMES));
    expect(unknown).toEqual([]);
  });

  it("every name in a source hint exists, or is another surface's operation on purpose", () => {
    const unknown = new Map<string, string[]>();
    for (const file of [
      ...sourceFiles(path.join(SRC, "features")),
      ...sourceFiles(path.join(SRC, "shared")),
    ]) {
      let text = readFileSync(file, "utf8");
      if (!/hint/i.test(text)) continue;
      // Comments name implementation details, not what an agent is told.
      text = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      for (const name of [
        ...tokens(text, ESCAPED_SPAN),
        ...[...text.matchAll(/"[^"\n]*`([^`\n]+)`[^"\n]*"/g)]
          .map((m) => m[1])
          .filter((n) =>
            /^(?:[a-z]+(?:[A-Z][a-z0-9]+)+|[a-z]+(?:_[a-z0-9]+)+)$/.test(n),
          ),
      ]) {
        if (corpus.vocabulary.has(name) || name in ALLOWED_HINT_SOURCES)
          continue;
        unknown.set(name, [
          ...(unknown.get(name) ?? []),
          path.relative(SRC, file),
        ]);
      }
    }
    expect(Object.fromEntries(unknown)).toEqual({});
  });

  it("every allow-list entry is still needed, so the lists cannot rot", () => {
    const publishedText = Object.values(corpus.published).join("\n");
    const stalePublished = Object.keys(ALLOWED_PUBLISHED).filter(
      (name) => !publishedText.includes(`\`${name}\``),
    );
    const staleDocs = Object.keys(ALLOWED_DOC_NAMES).filter(
      (name) => !agentDocs().includes(`\`${name}\``),
    );
    expect({ stalePublished, staleDocs }).toEqual({
      stalePublished: [],
      staleDocs: [],
    });
  });
});
