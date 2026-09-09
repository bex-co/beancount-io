import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  transactionsResponseSchema,
  receiptTransactionsResponseSchema,
} from "../call-llm";
import { categorizationsResponseSchema } from "../categorize-transactions";
import { accountMappingResponseSchema } from "../suggest-account-mapping";
import { accountRecommendationSchema } from "../recommend-accounts";

/**
 * OpenAI's strict `response_format` requires every property to appear in
 * `required` (absence must be expressed as nullable, not optional). The
 * Anthropic primary tolerates optional fields, so a violation only surfaces
 * when the fallback leg runs — which is how an optional `date` silently broke
 * failover in production (w2/m30/t002, ADR 0011). This gate walks every
 * structured-output schema and rejects the dialect violation statically.
 */

const REGISTERED_SCHEMAS: Record<string, z.ZodType> = {
  "call-llm/transactions": transactionsResponseSchema,
  "call-llm/receiptTransactions": receiptTransactionsResponseSchema,
  "categorize-transactions": categorizationsResponseSchema,
  "suggest-account-mapping": accountMappingResponseSchema,
  "recommend-accounts": accountRecommendationSchema,
};

/** Walk a JSON schema; collect object nodes whose required ≠ all properties. */
function strictModeViolations(node: unknown, at = "$"): string[] {
  if (typeof node !== "object" || node === null) return [];
  const violations: string[] = [];
  const record = node as Record<string, unknown>;

  const properties = record.properties as Record<string, unknown> | undefined;
  if (properties && typeof properties === "object") {
    const keys = Object.keys(properties).sort();
    const required = Array.isArray(record.required)
      ? ([...record.required] as string[]).sort()
      : [];
    if (JSON.stringify(keys) !== JSON.stringify(required)) {
      violations.push(
        `${at}: properties [${keys.join(", ")}] but required [${required.join(", ")}]`,
      );
    }
    for (const [key, child] of Object.entries(properties)) {
      violations.push(...strictModeViolations(child, `${at}.${key}`));
    }
  }
  for (const branch of ["items", "anyOf", "allOf", "oneOf", "$defs"]) {
    const child = record[branch];
    if (Array.isArray(child)) {
      child.forEach((c, i) =>
        violations.push(...strictModeViolations(c, `${at}.${branch}[${i}]`)),
      );
    } else if (child) {
      violations.push(...strictModeViolations(child, `${at}.${branch}`));
    }
  }
  return violations;
}

describe("structured-output schemas are OpenAI strict-mode compatible", () => {
  it.each(Object.entries(REGISTERED_SCHEMAS))(
    "%s has every property required",
    (_name, schema) => {
      const json = z.toJSONSchema(schema);
      expect(strictModeViolations(json)).toEqual([]);
    },
  );

  it("the walker itself flags an optional field (positive control)", () => {
    const bad = z.object({
      keep: z.string(),
      dropped: z.string().optional(),
    });
    expect(strictModeViolations(z.toJSONSchema(bad))).not.toEqual([]);
  });

  it("every Output.object call site in the llm feature is registered here", () => {
    const root = path.join(__dirname, "..");
    const callSites: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "__tests__") walk(full);
        } else if (
          entry.name.endsWith(".ts") &&
          fs.readFileSync(full, "utf8").includes("Output.object(")
        ) {
          callSites.push(path.relative(root, full));
        }
      }
    };
    walk(root);
    expect(callSites.sort()).toEqual([
      "call-llm.ts",
      "categorize-transactions/index.ts",
      "recommend-accounts/index.ts",
      "suggest-account-mapping/index.ts",
    ]);
  });
});
