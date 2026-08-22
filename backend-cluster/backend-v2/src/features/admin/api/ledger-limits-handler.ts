import Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import { registerRoute } from "@/server/rest/openapi-registry";
import type { IAdminService } from "../service/admin-service";
import { apiTokenRequired } from "./admin-api-middleware";
import { errorResponseSchema } from "./admin-error-schema";

const ledgerLimitsParamsSchema = z
  .object({
    ledgerUsername: z.string().openapi({
      description: "The user's ledger (Gitea) username",
      example: "jdoe",
    }),
  })
  .openapi("AdminLedgerLimitsParams");

const ledgerLimitsResponseSchema = z
  .object({
    ok: z.literal(true).openapi({ description: "Indicates request succeeded" }),
    maxDirectives: z.number().int().openapi({
      description:
        "Maximum beancount directives allowed for this user's subscription tier, or -1 if unlimited",
      example: 1000,
    }),
  })
  .openapi("AdminLedgerLimitsResponse");

export function registerLedgerLimitsRoute(
  router: Router,
  adminService: IAdminService,
): void {
  router.get(
    "/api/admin/ledger-limits/:ledgerUsername",
    apiTokenRequired,
    async (ctx) => {
      const { ledgerUsername } = ctx.params;
      const result = await adminService.getLedgerDirectiveLimit(ledgerUsername);
      ctx.body = { ok: true, ...result };
    },
  );

  registerRoute({
    method: "get",
    path: "/api/admin/ledger-limits/{ledgerUsername}",
    summary: "Get a user's directive limit by ledger username",
    description: `Called by beancount-ledger's pre-receive hook check to enforce the free-tier directive cap.

Looks up the user by their Gitea/ledger username and returns their subscription tier's maxDirectives limit (-1 = unlimited).`,
    tags: ["Admin API"],
    security: [{ adminToken: [] }],
    request: {
      params: ledgerLimitsParamsSchema,
    },
    responses: {
      200: {
        description: "Directive limit for the user's current tier",
        content: {
          "application/json": {
            schema: ledgerLimitsResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized — invalid or missing admin token",
        content: {
          "application/json": {
            schema: errorResponseSchema,
          },
        },
      },
      404: {
        description: "User not found",
        content: {
          "application/json": {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });
}
