import { GraphQLError } from "graphql";
import type { RouterContext } from "@koa/router";
import {
  envelopeFromThrown,
  splitToolFailure,
} from "@/features/ai-agent/api/mcp-errors";
import { runToolSafely } from "@/features/ai-agent/utils/run-tool";
import { formatError } from "@/server/graphql/format-error";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import {
  type LimitOwner,
  RateLimitedError,
  ResourceLimitReachedError,
} from "@/shared/errors";
import { logger } from "@/shared/logger";

/** The same refusal, read the way each surface's client reads it. */
async function overRest(error: Error) {
  const ctx = { method: "POST", path: "/v1" } as unknown as RouterContext & {
    body: { error: { metadata?: Record<string, unknown> } };
  };
  await restErrorMiddleware()(ctx, async () => {
    throw error;
  });
  return ctx.body.error.metadata;
}

function overGraphql(error: Error) {
  const wrapped = new GraphQLError(error.message, {
    originalError: error,
    path: ["createLedger"],
  });
  return formatError(wrapped.toJSON(), wrapped).extensions;
}

async function overMcpTool(error: Error) {
  const failure = await runToolSafely({
    message: "tool failed",
    logger,
    execute: async () => {
      throw error;
    },
  });
  return splitToolFailure(failure as Record<string, unknown>).envelope;
}

const planLimit = (limitOwner: LimitOwner) =>
  new ResourceLimitReachedError("Directive", 1000, 1001, undefined, {
    limitOwner,
    tier: "FREE",
  });

describe("whose plan set a limit, on each surface (ADR 001 D13)", () => {
  describe.each<LimitOwner>(["LEDGER_OWNER", "REQUESTER"])(
    "%s",
    (limitOwner) => {
      it("reaches REST clients", async () => {
        expect(await overRest(planLimit(limitOwner))).toMatchObject({
          limitOwner,
          tier: "FREE",
        });
      });

      it("reaches GraphQL clients", () => {
        expect(overGraphql(planLimit(limitOwner))).toMatchObject({
          code: "RESOURCE_LIMIT_REACHED",
          limitOwner,
          tier: "FREE",
        });
      });

      it("reaches MCP clients through a resource failure", () => {
        expect(envelopeFromThrown(planLimit(limitOwner)).limitOwner).toBe(
          limitOwner,
        );
      });

      it("reaches MCP clients through a tool failure", async () => {
        expect((await overMcpTool(planLimit(limitOwner))).limitOwner).toBe(
          limitOwner,
        );
      });
    },
  );

  it("keeps the tier off MCP, which carries no plan wording (ADR 019)", async () => {
    expect(envelopeFromThrown(planLimit("REQUESTER"))).not.toHaveProperty(
      "tier",
    );
    expect(await overMcpTool(planLimit("REQUESTER"))).not.toHaveProperty(
      "tier",
    );
  });

  it("carries the AI allowance's owner on its rate-limit refusal", () => {
    const refusal = new RateLimitedError(undefined, "Monthly quota reached", {
      limitOwner: "REQUESTER",
    });

    expect(envelopeFromThrown(refusal).limitOwner).toBe("REQUESTER");
  });

  it("names no owner for a limit no plan sets", async () => {
    const refusal = new ResourceLimitReachedError("Repository size", 10, 11);

    expect(await overRest(refusal)).not.toHaveProperty("limitOwner");
    expect(envelopeFromThrown(refusal)).not.toHaveProperty("limitOwner");
    expect(await overMcpTool(refusal)).not.toHaveProperty("limitOwner");
  });

  it("stops telling a client to upgrade by default", () => {
    expect(new ResourceLimitReachedError("Ledger", 1, 1).message).toBe(
      "Ledger limit reached. Maximum: 1, Current: 1.",
    );
  });
});
