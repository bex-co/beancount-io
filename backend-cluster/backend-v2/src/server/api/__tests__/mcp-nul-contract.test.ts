import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import { assembleMcpRegistry } from "../composition-root";
import { MCP_TOOLS } from "@/features/ai-agent/api/mcp-tools";
import { NUL_EXEMPT_PATHS } from "@/shared/nul-exempt-paths";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";
import type { AppConfig } from "@/config/config";
import type { Identity } from "../identity";

/**
 * w23/m22 — a NUL byte in any string argument of any MCP tool is
 * BAD_USER_INPUT naming the argument, never a 5xx or an "unavailable" answer.
 *
 * The cases are derived from the tools' own input schemas, so a parameter
 * added tomorrow is covered without editing this file. The context carries no
 * services: a request that reached any handler would crash instead of
 * answering BAD_USER_INPUT, so a pass also proves the refusal comes first.
 */
const identity: Identity = {
  userId: "user-123",
  method: "apikey",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_1",
};
const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;

type JsonNode = {
  $ref?: string;
  type?: string | string[];
  anyOf?: JsonNode[];
  oneOf?: JsonNode[];
  allOf?: JsonNode[];
  properties?: Record<string, JsonNode>;
  items?: JsonNode;
  additionalProperties?: JsonNode | boolean;
};

/** Every string-typed leaf of a JSON Schema, as `a.b[].c` (`{}` for a record's values). */
function stringLeaves(root: JsonNode): string[] {
  const found = new Set<string>();
  const resolve = (node: JsonNode): JsonNode => {
    if (!node.$ref?.startsWith("#/")) return node;
    return node.$ref
      .slice(2)
      .split("/")
      .reduce<unknown>(
        (current, key) => (current as Record<string, unknown>)?.[key],
        root,
      ) as JsonNode;
  };
  const walk = (raw: JsonNode | undefined, path: string, depth: number) => {
    if (!raw || depth > 12) return;
    const node = resolve(raw);
    for (const branch of [node.anyOf, node.oneOf, node.allOf]) {
      branch?.forEach((member) => walk(member, path, depth + 1));
    }
    const types = Array.isArray(node.type) ? node.type : [node.type];
    if (types.includes("string")) found.add(path);
    for (const [key, member] of Object.entries(node.properties ?? {})) {
      walk(member, path ? `${path}.${key}` : key, depth + 1);
    }
    if (node.items) walk(node.items, `${path}[]`, depth + 1);
    if (node.additionalProperties && node.additionalProperties !== true) {
      walk(node.additionalProperties as JsonNode, `${path}{}`, depth + 1);
    }
  };
  walk(root, "", 0);
  return [...found].filter((path) => path !== "");
}

/** The smallest argument object holding `value` at `path`. */
function argumentsAt(path: string, value: string): Record<string, unknown> {
  const segments = path.match(/[^.[\]{}]+|\[\]|\{\}/g) ?? [];
  const build = (index: number): unknown => {
    if (index === segments.length) return value;
    const segment = segments[index];
    if (segment === "[]") return [build(index + 1)];
    if (segment === "{}") return { k: build(index + 1) };
    return { [segment]: build(index + 1) };
  };
  return build(0) as Record<string, unknown>;
}

const cases = (
  MCP_TOOLS as unknown as { name: string; inputSchema: z.ZodType }[]
)
  .flatMap((tool) => {
    const schema = z.toJSONSchema(tool.inputSchema, {
      io: "input",
      unrepresentable: "any",
    }) as JsonNode;
    return stringLeaves(schema).map((path) => [tool.name, path] as const);
  })
  .filter(([, path]) => !NUL_EXEMPT_PATHS.has(path));

async function callWithNul(tool: string, path: string) {
  const ctx = { identity } as unknown as McpRequestContext;
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = assembleMcpRegistry(ctx, config);
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientTransport);
  try {
    return (await client.callTool({
      name: tool,
      arguments: argumentsAt(path, "a\u0000b"),
    })) as {
      isError?: boolean;
      structuredContent?: { error?: { code?: string; message?: string } };
    };
  } finally {
    await client.close();
    await server.close();
  }
}

describe("a NUL byte in any MCP string argument (w23/m22)", () => {
  it("derives its cases from the tool schemas", () => {
    // A floor, not a pin: the walk must see nested and array members.
    expect(cases.length).toBeGreaterThan(90);
    expect(cases.some(([, path]) => path.includes("[]."))).toBe(true);
    expect(cases.some(([, path]) => path.includes("{}"))).toBe(true);
  });

  it("exempts only the file-content arguments", () => {
    expect([...NUL_EXEMPT_PATHS].sort()).toEqual([
      "changes[].content",
      "content",
      "files[].content",
      "files[].new_string",
      "files[].old_string",
      "newContent",
      "query",
      "text",
    ]);
  });

  it.each(cases)(
    "%s: %s is BAD_USER_INPUT naming the argument",
    async (tool, path) => {
      const result = await callWithNul(tool, path);
      expect(result.isError).toBe(true);
      expect(result.structuredContent?.error?.code).toBe("BAD_USER_INPUT");
      expect(result.structuredContent?.error?.message).toContain("NUL");
    },
  );
});
