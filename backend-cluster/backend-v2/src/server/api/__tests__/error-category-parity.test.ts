import "reflect-metadata";
import { readFileSync } from "node:fs";
import path from "node:path";
import { GraphQLError } from "graphql";
import type { RouterContext } from "@koa/router";

jest.mock("@/config/config", () => ({
  config: { env: "development" },
}));

import { DomainError, ErrorCategory } from "@/shared/errors";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import { formatError } from "@/server/graphql/format-error";
import {
  envelopeFromThrown,
  jsonRpcCodeFor,
} from "@/features/ai-agent/api/mcp-errors";

/**
 * w23/226 — every `ErrorCategory` reaches REST, GraphQL and MCP under one
 * machine code, with the status REST renders and the JSON-RPC number MCP
 * travels under written down in one table. The table is independent of the
 * code that maps (it is the contract, not a copy of the implementation), so a
 * new category cannot drift on one surface: it fails here until the table, the
 * three adapters and `docs/mcp.md` agree.
 */
const EXPECTED: Record<
  ErrorCategory,
  { http: number; jsonRpc: number; onMcp: boolean }
> = {
  UNAUTHENTICATED: { http: 401, jsonRpc: -32003, onMcp: true },
  FORBIDDEN: { http: 403, jsonRpc: -32003, onMcp: true },
  NOT_FOUND: { http: 404, jsonRpc: -32002, onMcp: true },
  BAD_USER_INPUT: { http: 400, jsonRpc: -32602, onMcp: true },
  VALIDATION_FAILED: { http: 400, jsonRpc: -32602, onMcp: true },
  CONFLICT: { http: 409, jsonRpc: -32000, onMcp: true },
  RATE_LIMITED: { http: 429, jsonRpc: -32000, onMcp: true },
  INTERNAL_SERVER_ERROR: { http: 500, jsonRpc: -32000, onMcp: true },
  SERVICE_UNAVAILABLE: { http: 503, jsonRpc: -32000, onMcp: true },
  RESOURCE_LIMIT_REACHED: { http: 403, jsonRpc: -32003, onMcp: true },
  OPERATION_NOT_ALLOWED: { http: 403, jsonRpc: -32003, onMcp: true },
  UNBALANCED: { http: 400, jsonRpc: -32602, onMcp: true },
  CONFIGURATION_ERROR: { http: 500, jsonRpc: -32000, onMcp: true },
  PREMIUM_REQUIRED: { http: 402, jsonRpc: -32003, onMcp: true },
  // Raised only by the store-billed plan change, which is session-only and has
  // no MCP tool (billing is outside the agent surface), so the MCP guide's
  // failure table does not list it.
  BILLED_BY_STORE: { http: 409, jsonRpc: -32000, onMcp: false },
};

const CATEGORIES = Object.values(ErrorCategory);

/** `DomainError` is abstract: a probe subclass lets a test pick the category. */
class ProbeError extends DomainError {}
const DOC = readFileSync(
  path.resolve(__dirname, "../../../../docs/mcp.md"),
  "utf8",
);

describe.each(CATEGORIES)("%s", (category) => {
  const error = new ProbeError(category, "probe message");

  it("renders on REST with its code and status", async () => {
    const ctx = {
      method: "GET",
      path: "/x",
      get: () => "",
      set: () => undefined,
    } as unknown as RouterContext;
    await restErrorMiddleware()(ctx, async () => {
      throw error;
    });
    expect(ctx.status).toBe(EXPECTED[category].http);
    expect(ctx.body).toMatchObject({ ok: false, error: { code: category } });
  });

  it("renders on GraphQL as extensions.code", () => {
    const wrapped = new GraphQLError("probe message", {
      originalError: error,
      path: ["someField"],
    });
    const formatted = formatError(
      { message: wrapped.message, extensions: {} },
      wrapped,
    );
    expect(formatted.extensions?.code).toBe(category);
  });

  it("renders on MCP with its code, a hint and its JSON-RPC number", () => {
    const envelope = envelopeFromThrown(error);
    expect(envelope.code).toBe(category);
    expect(envelope.hint.length).toBeGreaterThan(0);
    expect(jsonRpcCodeFor(category)).toBe(EXPECTED[category].jsonRpc);
  });

  it("is listed in the MCP guide's failure table exactly when it can reach MCP", () => {
    const row = DOC.match(
      new RegExp(`^\\| \`${category}\`\\s*\\| \`(-?\\d+)\``, "m"),
    );
    if (EXPECTED[category].onMcp) {
      expect(row?.[1]).toBe(String(EXPECTED[category].jsonRpc));
    } else {
      expect(row).toBeNull();
    }
  });
});

it("covers every category the code defines", () => {
  expect(Object.keys(EXPECTED).sort()).toEqual([...CATEGORIES].sort());
});
