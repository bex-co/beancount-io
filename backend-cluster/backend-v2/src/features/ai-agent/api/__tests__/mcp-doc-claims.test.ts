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
import { ENTRY_WRITE_ATTEMPTS } from "@/features/ledger/utils/entry-write-race";
import { MAX_BQL_QUERY_BYTES } from "@/features/ledger/utils/bql-query-size-limit";
import { HOST_DEFAULT_LIMIT } from "@/shared/host-page";
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
  /** `serverInfo.version` from a deployment given no commit. */
  serverVersion: string;
  /** `serverInfo.version` from one given `DOC_REVISION`. */
  serverVersionWithRevision: string;
}

/** A commit whose first seven characters are the one docs/mcp.md writes out. */
const DOC_REVISION = "2144cdbb2e6f0a1b3c4d5e6f708192a3b4c5d6e7";

async function serve(revision?: string): Promise<Served> {
  const server = assembleMcpRegistry(
    { identity, services: {}, llmService: {} } as unknown as McpRequestContext,
    { ...config, revision } as AppConfig,
  );
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "doc-claims", version: "1.0.0" });
  await Promise.all([client.connect(a), server.connect(b)]);
  try {
    const { tools } = await client.listTools();
    return {
      tools: new Map(tools.map((tool) => [tool.name, tool])),
      capabilities: client.getServerCapabilities() ?? {},
      serverVersion: client.getServerVersion()?.version ?? "",
      serverVersionWithRevision: "",
    };
  } finally {
    await client.close();
    await server.close();
  }
}

/** The tools and capabilities, plus the version a deployment reports with and without a commit. */
async function serveBoth(): Promise<Served> {
  const [without, withRevision] = await Promise.all([
    serve(),
    serve(DOC_REVISION),
  ]);
  return { ...without, serverVersionWithRevision: withRevision.serverVersion };
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
    // w31/009: the guide said there was no query-length ceiling after
    // MAX_BQL_QUERY_BYTES shipped; the served BQL tools state the same cap.
    id: "a BQL query is at most 262144 bytes",
    doc: "up to 262144 bytes (256 KiB of UTF-8) of query text",
    violations: (s) => [
      ...(MAX_BQL_QUERY_BYTES === 262_144 ? [] : ["MAX_BQL_QUERY_BYTES"]),
      ...["runBqlQuery", "runBqlQueryStructured"].filter(
        (name) =>
          !s.tools.get(name)?.description?.includes("up to 262144 bytes"),
      ),
    ],
  },
  {
    // w31/012: search sends HOST_DEFAULT_LIMIT when `limit` is omitted.
    id: "ledger search without a limit reads pages of 30",
    doc: "without a `limit` it reads pages of 30",
    violations: () => (HOST_DEFAULT_LIMIT === 30 ? [] : ["HOST_DEFAULT_LIMIT"]),
  },
  {
    id: "an entry write retries a lost race up to 3 attempts",
    doc: "commit on top of it, up to 3 attempts",
    violations: () =>
      ENTRY_WRITE_ATTEMPTS === 3 ? [] : ["ENTRY_WRITE_ATTEMPTS"],
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
    id: "a deployment that knows its commit appends it to serverInfo.version as build metadata",
    doc: "semver build metadata (`1.0.0+2144cdb`)",
    violations: (s) =>
      s.serverVersionWithRevision === "1.0.0+2144cdb"
        ? []
        : [`serverInfo.version is ${s.serverVersionWithRevision}`],
  },
  {
    id: "a deployment that was given no commit reports a plain 1.0.0",
    doc: 'says `"revision": "unknown"` and a plain `1.0.0`',
    violations: (s) =>
      s.serverVersion === "1.0.0"
        ? []
        : [`serverInfo.version is ${s.serverVersion}`],
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
  // w31/005: renameAccount takes allowInvalid.
  "Bank, rename, and lifecycle writes take no errors flag",
  "MCP key creation advertises",
  "`deleteLedger` accepts only `ledger`",
  // w1/232: a later page carries no balances from before it.
  "so each one loads on its own",
  // w31/009: a BQL query is capped at MAX_BQL_QUERY_BYTES.
  "There is no query-length ceiling to write around",
  // w31/012: a page sent without a size reads a page of HOST_DEFAULT_LIMIT.
  "but no `limit` carry no signal",
];

let served: Served;
beforeAll(async () => {
  served = await serveBoth();
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

  it("fails the build-metadata claims when the served version changes", () => {
    const build = CLAIMS.find((claim) => claim.id.includes("build metadata"));
    const plain = CLAIMS.find((claim) => claim.id.includes("plain 1.0.0"));

    expect(
      build?.violations({ ...served, serverVersionWithRevision: "1.0.0" }),
    ).toEqual(["serverInfo.version is 1.0.0"]);
    expect(
      plain?.violations({ ...served, serverVersion: "1.0.0+2144cdb" }),
    ).toEqual(["serverInfo.version is 1.0.0+2144cdb"]);
  });
});
