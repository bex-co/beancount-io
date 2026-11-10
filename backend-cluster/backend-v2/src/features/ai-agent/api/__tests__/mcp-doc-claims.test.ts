import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import {
  MAX_BQL_TEXT_BYTES,
  MAX_STRUCTURED_BQL_ROWS,
} from "../../tools/bql-query-tool";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "../mcp-context";

/**
 * w23/m37 — the values docs/mcp.md states are the values the endpoint serves.
 *
 * w23/m33 made every tool and parameter the docs name resolve; it did not
 * check what the docs *say about* them. Eight lines went stale that way
 * (w1/200): "update and delete offer no preview" after the previews shipped,
 * a tool count, a flag the file tools "do not take". Each claim below pairs
 * a sentence the document must still contain with the served fact it states,
 * read through an SDK client from `tools/list` and `initialize`. Change a
 * documented default, limit or capability and one side fails, naming the claim.
 * `STALE` lists phrases that were wrong once and must not return.
 */
const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;
const identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_1",
};

/** The document with every run of whitespace folded, so a claim survives re-wrapping. */
const DOC_PATH = path.resolve(__dirname, "../../../../../docs/mcp.md");
const DOC = readFileSync(DOC_PATH, "utf8");
const FLAT = DOC.replace(/\s+/g, " ");

interface Served {
  tools: Map<string, Tool>;
  capabilities: NonNullable<ReturnType<Client["getServerCapabilities"]>>;
}

async function serve(): Promise<Served> {
  const server = assembleMcpRegistry(
    { identity, services: {}, llmService: {} } as unknown as McpRequestContext,
    config,
  );
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "doc-claims", version: "1.0.0" });
  await Promise.all([client.connect(a), server.connect(b)]);
  try {
    const { tools } = await client.listTools();
    return {
      tools: new Map(tools.map((tool) => [tool.name, tool])),
      capabilities: client.getServerCapabilities() ?? {},
    };
  } finally {
    await client.close();
    await server.close();
  }
}

const properties = (tool: Tool | undefined): string[] =>
  Object.keys((tool?.inputSchema.properties as object | undefined) ?? {});

const publishes = (served: Served, names: string[], ...keys: string[]) =>
  names.filter((name) => {
    const own = properties(served.tools.get(name));
    return !keys.some((key) => own.includes(key));
  });

interface Claim {
  id: string;
  /** A sentence the document must contain, whitespace-folded. */
  doc: string;
  /** The names that fail the claim against the served contract; empty holds. */
  violations: (served: Served) => string[];
}

const CLAIMS: Claim[] = [
  {
    id: "lifecycle and collaborator tools take dry_run",
    doc: "`updateLedger` and `deleteLedger` take `dry_run`",
    violations: (s) =>
      publishes(
        s,
        [
          "updateLedger",
          "deleteLedger",
          "setLedgerCollaborator",
          "removeLedgerCollaborator",
          "leaveLedger",
        ],
        "dry_run",
        "dryRun",
      ),
  },
  {
    id: "file writes take allow_invalid",
    doc: "`deleteLedgerFiles` take `allow_invalid`",
    violations: (s) =>
      publishes(
        s,
        ["createLedgerFiles", "updateLedgerFiles", "deleteLedgerFiles"],
        "allow_invalid",
        "allowInvalid",
      ),
  },
  {
    id: "listLedgers limit is at most 100",
    doc: "`page`, `limit` (at most 100)",
    violations: (s) => {
      const limit = (
        s.tools.get("listLedgers")?.inputSchema.properties as
          | Record<string, { maximum?: number }>
          | undefined
      )?.limit;
      return limit?.maximum === 100 ? [] : ["listLedgers.limit.maximum"];
    },
  },
  {
    id: "BQL text is cut at 1,000 rows or 100 KB",
    doc: "cut at 1,000 rows or 100 KB",
    violations: () =>
      MAX_STRUCTURED_BQL_ROWS === 1000 && MAX_BQL_TEXT_BYTES === 100_000
        ? []
        : ["MAX_STRUCTURED_BQL_ROWS / MAX_BQL_TEXT_BYTES"],
  },
  {
    id: "the endpoint pushes no list-change notifications",
    doc: "advertises `listChanged: false` for tools, resources and prompts",
    violations: (s) =>
      (["tools", "resources", "prompts"] as const).filter(
        (key) => s.capabilities[key]?.listChanged !== false,
      ),
  },
  {
    id: "MCP has no API-key tool",
    doc: "MCP has no API-key tool",
    violations: (s) =>
      [...s.tools.keys()].filter((name) => /api.?key/i.test(name)),
  },
];

/** Phrases that were wrong against the served contract, and must stay out. */
const STALE = [
  "update and delete offer no preview",
  "preview is not supported",
  "instead of forty-three",
  "`AI edit: {description}`",
  "File, bank, rename, and lifecycle writes take no errors flag",
  "MCP key creation advertises",
  "`deleteLedger` accepts only `ledger`",
  // w1/232: a later page carries no balances from before it.
  "so each one loads on its own",
];

let served: Served;
beforeAll(async () => {
  served = await serve();
});

describe("docs/mcp.md claims about the served contract", () => {
  it.each(CLAIMS)("states and matches: $id", ({ doc, violations }) => {
    expect(FLAT).toContain(doc);
    expect(violations(served)).toEqual([]);
  });

  it.each(STALE)("no longer says %s", (phrase) => {
    expect(FLAT).not.toContain(phrase);
  });

  it("names every served tool somewhere in the document", () => {
    const missing = [...served.tools.keys()].filter(
      (name) => !DOC.includes(`\`${name}\``),
    );
    expect(missing).toEqual([]);
  });

  it("keeps every row of the Tools table to three cells", () => {
    const lines = DOC.slice(DOC.indexOf("\n## Tools\n")).split("\n");
    const first = lines.findIndex((line) => line.startsWith("| Tool"));
    const table = lines.slice(first).slice(
      0,
      lines.slice(first).findIndex((line) => !line.startsWith("|")),
    );
    // An unescaped `|` inside a cell splits it into an extra column.
    const cells = table.map(
      (line) => line.replace(/\\\|/g, "").split("|").length - 2,
    );
    expect(cells.length).toBeGreaterThan(30);
    expect(new Set(cells)).toEqual(new Set([3]));
  });

  it("fails a claim when the served fact changes", () => {
    const lie = { ...served, tools: new Map(served.tools) };
    lie.tools.delete("updateLedger");
    expect(CLAIMS[0].violations(lie)).toContain("updateLedger");
  });
});
