import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import type { IAiCfoUsageService } from "../service/ai-cfo-usage-service";
import type { Identity } from "@/server/api/identity";

export async function readAiCfoUsage(
  service: Pick<IAiCfoUsageService, "getUsage">,
  identity: Identity,
) {
  const usage = await service.getUsage(identity);
  return {
    aiCfoTokensUsed: usage.currentCount,
    aiCfoTokensMax: usage.maxAllowed,
  };
}

export const aiCfoUsageRoute = v1Route({
  method: "get",
  path: "/api-gateway/v1/account/ai-cfo-usage",
  summary: "Read the current account's AI CFO usage",
  description:
    "Current billing-month token usage and plan limit. The authenticated identity selects the account; no user or ledger selector is accepted.",
  query: z.object({}).strict(),
  responses: {
    200: json(
      "AI CFO token usage",
      z.object({ aiCfoTokensUsed: z.number(), aiCfoTokensMax: z.number() }),
    ),
  },
  handler: ({ layers }, { identity }) =>
    readAiCfoUsage(layers.services.aiCfoUsage, identity),
});
