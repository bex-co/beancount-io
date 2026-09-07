import { aiCfoUsageRoute } from "@/features/feature-usage/api/ai-cfo-usage-route";
import type Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import {
  anonymousV1Route,
  v1Route,
  registerV1Routes,
  type V1Deps,
} from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";

export const userProfileQuery = z.object({
  userId: z.string().nullable().optional(),
});
const profileSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    locale: z.string(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    emailReportStatus: z
      .enum(["OFF", "WEEKLY", "MONTHLY"])
      .nullable()
      .optional(),
    username: z.string().nullable().optional(),
    tier: z.string(),
    limits: z.object({
      ledgersUsed: z.number(),
      ledgersMax: z.number(),
      collaboratorsPerLedgerMax: z.number(),
      maxDirectives: z.number(),
    }),
    hasEverSubscribed: z.boolean(),
  })
  .nullable();

export const ACCOUNT_V1_ROUTES = [
  aiCfoUsageRoute,
  v1Route({
    method: "delete",
    path: "/api-gateway/v1/account",
    summary: "Delete the authenticated account",
    query: z.object({}).strict(),
    description:
      "Permanently deletes the caller's account using the existing subscription, bank, credential, and ledger-user cleanup. Session or OAuth identity is required; API keys cannot delete an account. No user or ledger selector and no preview.",
    responses: { 200: json("Account deleted", z.boolean()) },
    handler: async ({ layers }, { identity }) =>
      layers.services.account.deleteAccount(identity),
  }),
  anonymousV1Route({
    method: "get",
    path: "/api-gateway/v1/user-profile",
    summary: "Read the current user's profile",
    description:
      "Returns null without an authenticated identity or when the user no longer exists. A supplied userId must identify the caller; the shared account service enforces scope and exact-self authority.",
    query: userProfileQuery,
    responses: { 200: json("User profile or null", profileSchema) },
    handler: async ({ layers }, { identity, query, ctx }) => {
      const profile = identity
        ? await layers.services.account.getUserProfile(
            identity,
            query.userId ?? identity.userId,
          )
        : null;
      ctx.type = "application/json";
      // Koa otherwise turns a null body into 204 rather than the GraphQL probe's null.
      return JSON.stringify(profile);
    },
  }),
] as const;

export function setAccountRoutes(router: Router, deps: V1Deps): void {
  registerV1Routes(router, deps, ACCOUNT_V1_ROUTES);
}
