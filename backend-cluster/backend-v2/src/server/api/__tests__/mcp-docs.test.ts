import { readFileSync } from "node:fs";
import path from "node:path";

import { MCP_TOOLS } from "@/features/ai-agent/api/mcp-tools";
import {
  MCP_RESOURCES,
  queryTemplateFor,
} from "@/features/ai-agent/api/mcp-resources";

/**
 * `docs/mcp.md` is the customer contract for this surface (w4/071).
 *
 * It described three `beancount://legacy/...` resources for a week after
 * `b6bbd37e` deleted them, because two later edits to the same file had no
 * reason to re-read the paragraphs they were not touching. Prompts already get
 * this check — `mcp-prompt-list.test.ts` fails when a playbook names a tool or
 * resource that does not exist — and the document is the other place an agent
 * reads the surface from.
 */
const DOC = readFileSync(
  path.resolve(__dirname, "../../../../docs/mcp.md"),
  "utf8",
);

/** Every backticked identifier of a given shape, deduplicated. */
const cited = (pattern: RegExp): string[] => [
  ...new Set([...DOC.matchAll(pattern)].map(([, value]) => value)),
];

/**
 * A template with its query parameters sorted. RFC 6570 query expansion is
 * unordered, so the document is free to read `{?q,…,page,limit}` while the
 * descriptor declares pagination first — a guard that failed on that would be
 * noise, and noise is what gets a guard deleted.
 */
function canonical(uri: string): string {
  return uri.replace(
    /\{\?([^}]*)\}$/,
    (_, names: string) => `{?${names.split(",").sort().join(",")}}`,
  );
}

describe("docs/mcp.md describes the surface this server serves", () => {
  it("cites no resource URI that is not a registered template", () => {
    const templates = MCP_RESOURCES.map((descriptor) =>
      queryTemplateFor(descriptor),
    );
    const advertised = new Set(templates.map((t) => canonical(t.toString())));
    const unregistered = cited(/`(beancount:\/\/[^`\s]+)`/g).filter((uri) => {
      // `beancount://` and `beancount://{owner}/{name}/` name the scheme and
      // the ledger-scoped prefix, not a resource.
      if (uri.endsWith("/")) return false;
      if (advertised.has(canonical(uri))) return false;
      // A worked example is a concrete URI rather than a template spelling.
      return !templates.some((template) => template.match(uri));
    });
    expect(unregistered).toEqual([]);
  });

  it("cites no tool this server does not expose", () => {
    const names = new Set(MCP_TOOLS.map((tool) => tool.name));
    const table = DOC.slice(DOC.indexOf("| `runBqlQuery"));
    const unknown = cited(/^\| `([a-z]+[A-Z][A-Za-z]+)`/gm)
      .filter((name) => table.includes(`| \`${name}\``))
      .filter((name) => !names.has(name));
    expect(unknown).toEqual([]);
  });
});
