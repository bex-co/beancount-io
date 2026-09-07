import { z } from "@/shared/zod-openapi-setup";
import { anonymousV1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";

const tierQuota = z.object({
  tier: z.string(),
  aiCfoTokensMax: z.number(),
  maxLedgers: z.number(),
  maxCollaboratorsPerLedger: z.number(),
  maxDirectives: z.number(),
});

export const tierQuotaRoute = anonymousV1Route({
  method: "get",
  path: "/api-gateway/v1/tier-quotas",
  summary: "Read public subscription tier quotas",
  description:
    "Static product limits for every tier. A limit of -1 means unlimited. No user billing information or Stripe request is involved.",
  responses: { 200: json("Tier quotas", z.array(tierQuota)) },
  handler: async ({ layers }) => layers.services.subscriptions.allTierQuotas(),
});
