import bodyParser from "koa-bodyparser";
import Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import { zodValidator } from "@/shared/koa-zod-validator";
import { registerRoute } from "@/server/rest/openapi-registry";
import type { IAdminService } from "../service/admin-service";
import { apiTokenRequired } from "./admin-api-middleware";
import { errorResponseSchema } from "./admin-error-schema";

export const userLedgersRequestSchema = z
  .object({
    email: z.string().email().openapi({
      description: "Email address of the user whose ledgers to list",
      example: "user@example.com",
    }),
  })
  .openapi("UserLedgersRequest");

const userLedgerSchema = z
  .object({
    id: z.string().openapi({ example: "jdoe/personal-finances" }),
    name: z.string().openapi({ example: "personal-finances" }),
    fullName: z.string().openapi({ example: "jdoe/personal-finances" }),
    private: z.boolean().openapi({ example: true }),
    empty: z.boolean().openapi({ example: false }),
    size: z.number().int().openapi({ example: 2048 }),
    createdAt: z.string().datetime().openapi({
      example: "2025-01-01T00:00:00.000Z",
    }),
    updatedAt: z.string().datetime().openapi({
      example: "2026-05-15T10:00:00.000Z",
    }),
    directiveCount: z.number().int().nullable().openapi({
      description:
        "Total beancount directive count for this ledger, or null if it could not be computed",
      example: 842,
    }),
  })
  .openapi("AdminUserLedger");

export const userLedgersResponseSchema = z
  .object({
    ok: z.literal(true).openapi({ description: "Indicates request succeeded" }),
    ledgers: z.array(userLedgerSchema),
  })
  .openapi("UserLedgersResponse");

export function registerUserLedgersRoute(
  router: Router,
  adminService: IAdminService,
): void {
  router.post(
    "/api/admin/user-ledgers",
    bodyParser(),
    apiTokenRequired,
    zodValidator(userLedgersRequestSchema),
    async (ctx) => {
      const { email } = ctx.request.body as { email: string };
      const result = await adminService.getUserLedgers(email);
      ctx.body = { ok: true, ...result };
    },
  );

  registerRoute({
    method: "post",
    path: "/api/admin/user-ledgers",
    summary: "Get a user's ledger list with per-ledger directive counts",
    description: `Returns every ledger a user owns, each with its total beancount
directive count (summed across all directive types) — the same figure the
dashboard's directive-usage indicator shows and that the free-tier directive
cap is measured against. Intended for support/debugging.

The endpoint will return an error if:
- The user with the provided email does not exist (404)

A ledger's \`directiveCount\` is \`null\` if it could not be computed (e.g. a
transient ledger-service error) rather than failing the whole request.`,
    tags: ["Admin API"],
    security: [{ adminToken: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: userLedgersRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "User's ledgers retrieved successfully",
        content: {
          "application/json": {
            schema: userLedgersResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid input",
        content: {
          "application/json": {
            schema: errorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing admin token",
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
