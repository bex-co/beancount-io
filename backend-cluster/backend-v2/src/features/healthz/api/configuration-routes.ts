import { tierQuotaRoute } from "@/features/stripe/api/tier-quota-route";
import type Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import {
  anonymousV1Route,
  registerV1Routes,
  type V1Deps,
} from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { readHealth, readFeatureFlags } from "../utils/public-configuration";

export const featureFlagsQuery = z.object({ userId: z.string().optional() });

export const CONFIGURATION_V1_ROUTES = [
  tierQuotaRoute,
  anonymousV1Route({
    method: "get",
    path: "/api-gateway/v1/health",
    summary: "Read application health",
    description:
      "The public GraphQL health probe; this is not a dependency readiness check.",
    responses: { 200: json("Application health", z.string()) },
    handler: async (_deps, { ctx }) => {
      ctx.type = "application/json";
      return JSON.stringify(await readHealth());
    },
  }),
  anonymousV1Route({
    method: "get",
    path: "/api-gateway/v1/feature-flags",
    summary: "Read public feature flags",
    description:
      "Public feature flags. The legacy userId argument is accepted but does not affect this static configuration.",
    query: featureFlagsQuery,
    responses: {
      200: json(
        "Feature flags",
        z.object({ spendingReportSubscription: z.boolean() }),
      ),
    },
    handler: readFeatureFlags,
  }),
] as const;

export function setConfigurationRoutes(router: Router, deps: V1Deps): void {
  registerV1Routes(router, deps, CONFIGURATION_V1_ROUTES);
}
