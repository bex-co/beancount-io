/**
 * Codegen script: generate agent-tool-types.ts from Zod schemas.
 *
 * Run: yarn generate-agent-tool-types
 *
 * Reads the inputSchema and outputSchema of each agent tool, converts them to
 * TypeScript type strings via z.toJsonSchema(), and writes a zero-dependency
 * output file that can be copied to any consumer (e.g. beancount-dashboard)
 * without adding server-side imports.
 */

import { writeFileSync } from "fs";
import { resolve } from "path";
import { z } from "zod";
import { createAgentTools } from "@/features/ai-agent/tools";
import type { ToolContext } from "@/features/ai-agent/tools/types";

// ---------------------------------------------------------------------------
// JSON Schema → TypeScript type string
// ---------------------------------------------------------------------------

type JsonSchema = Record<string, unknown>;

function resolveRef(ref: string, defs: Record<string, JsonSchema>): JsonSchema {
  const key = ref.replace(/^#\/\$defs\//, "");
  return defs[key] ?? {};
}

function jsonSchemaToTs(
  schema: JsonSchema,
  defs: Record<string, JsonSchema>,
  depth: number,
): string {
  const INDENT = "  ";
  const tab = INDENT.repeat(depth);
  const inner = INDENT.repeat(depth + 1);

  if (schema.$ref) {
    return jsonSchemaToTs(
      resolveRef(schema.$ref as string, defs),
      defs,
      depth,
    );
  }

  // Literal constant — check before type so { type:"string", const:"create" } → "create"
  if ("const" in schema) return JSON.stringify(schema.const);

  // String enum — check before plain string so z.enum(["file","dir"]) → "file" | "dir"
  if (schema.type === "string" && Array.isArray(schema.enum)) {
    return (schema.enum as unknown[]).map((v) => JSON.stringify(v)).join(" | ");
  }

  // Scalar types
  if (schema.type === "string") return "string";
  if (schema.type === "number" || schema.type === "integer") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "null") return "null";

  // Object
  if (schema.type === "object") {
    const properties =
      (schema.properties as Record<string, JsonSchema> | undefined) ?? {};
    const required = (schema.required as string[] | undefined) ?? [];
    const entries = Object.entries(properties);
    if (entries.length === 0) return "Record<string, never>";
    const fields = entries.map(([key, val]) => {
      const optional = !required.includes(key);
      return `${inner}${key}${optional ? "?" : ""}: ${jsonSchemaToTs(val, defs, depth + 1)};`;
    });
    return `{\n${fields.join("\n")}\n${tab}}`;
  }

  // Array
  if (schema.type === "array") {
    const items = (schema.items as JsonSchema | undefined) ?? {};
    const elemType = jsonSchemaToTs(items, defs, depth + 1);
    if (elemType.includes("\n")) {
      // Multi-line element — use Array<> to avoid the trailing-[] ambiguity
      return `Array<\n${inner}${elemType}\n${tab}>`;
    }
    return `${elemType}[]`;
  }

  // Union
  const unionMembers =
    (schema.anyOf as JsonSchema[] | undefined) ??
    (schema.oneOf as JsonSchema[] | undefined);
  if (unionMembers) {
    const members = unionMembers.map(
      (opt) => `| ${jsonSchemaToTs(opt, defs, depth)}`,
    );
    return members.join(`\n${tab}`);
  }

  // Intersection — take the first concrete schema (handles allOf wrappers)
  if (schema.allOf) {
    const allOf = schema.allOf as JsonSchema[];
    const concrete = allOf.find((s) => s.type ?? s.$ref ?? s.anyOf ?? s.oneOf);
    return concrete ? jsonSchemaToTs(concrete, defs, depth) : "unknown";
  }

  return "unknown";
}

function schemaToTs(schema: z.ZodTypeAny, depth: number): string {
  const root = z.toJSONSchema(schema) as JsonSchema;
  const defs =
    (root.$defs as Record<string, JsonSchema> | undefined) ?? {};
  return jsonSchemaToTs(root, defs, depth);
}

// ---------------------------------------------------------------------------
// Tool registry — derived from createAgentTools with a mock context.
// Only inputSchema and outputSchema are read; execute closures are never called.
// ---------------------------------------------------------------------------

const tools = createAgentTools({} as ToolContext);
const inputSchemas: Record<string, z.ZodTypeAny> = Object.fromEntries(
  Object.entries(tools).map(([name, t]) => [name, t.inputSchema as z.ZodTypeAny]),
);
const outputSchemas: Record<string, z.ZodTypeAny> = Object.fromEntries(
  Object.entries(tools).map(([name, t]) => [name, t.outputSchema as z.ZodTypeAny]),
);

// ---------------------------------------------------------------------------
// Generate output
// ---------------------------------------------------------------------------

function generate(): string {
  const inputEntries = Object.entries(inputSchemas)
    .map(([name, schema]) => `  ${name}: ${schemaToTs(schema, 1)};`)
    .join("\n");

  const outputEntries = Object.entries(outputSchemas)
    .map(([name, schema]) => `  ${name}: ${schemaToTs(schema, 1)};`)
    .join("\n");

  return [
    "// GENERATED FILE — do not edit manually.",
    "// Run: yarn generate-agent-tool-types (from backend-cluster/backend-v2)",
    "// Source: src/features/ai-agent/tools/*-tool.ts",
    "//",
    "// Zero runtime dependencies — safe to copy to any consumer (e.g. beancount-dashboard).",
    "",
    "/** Maps tool name → its input argument type (what the AI model sends). */",
    "export type AgentToolInputs = {",
    inputEntries,
    "};",
    "",
    "export type AgentToolName = keyof AgentToolInputs;",
    "",
    "/** Maps tool name → its structured output type. */",
    "export type AgentToolOutputs = {",
    outputEntries,
    "};",
    "",
    "/** UITools-compatible type for use with useChat<UIMessage<unknown, never, AgentUITools>>. */",
    "export type AgentUITools = {",
    "  [K in AgentToolName]: { input: AgentToolInputs[K]; output: AgentToolOutputs[K] };",
    "};",
    "",
  ].join("\n");
}

const output = generate();

const dashboardPath = resolve(
  __dirname,
  "../../../beancount-dashboard/src/features/ai-agent/types/agent-tool-types.ts",
);

writeFileSync(dashboardPath, output, "utf-8");
console.log(`Generated: ${dashboardPath}`);
