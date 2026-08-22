import Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import { registerRoute } from "@/server/rest/openapi-registry";
import type { IAdminService } from "../service/admin-service";
import { BadUserInputError } from "@/shared/errors";
import { apiTokenRequired } from "./admin-api-middleware";
import { errorResponseSchema } from "./admin-error-schema";

const ENV_TO_CLIENT_ID = {
  prod: "beancount-web-prod",
  dev: "beancount-web-dev",
} as const;

const listActivePaidUsersQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50).openapi({
      description: "Maximum number of users to return",
      example: 50,
    }),
    offset: z.coerce.number().int().min(0).default(0).openapi({
      description: "Number of users to skip for pagination",
      example: 0,
    }),
    env: z.enum(["prod", "dev"]).default("prod").openapi({
      description: "Environment to filter paid users by",
      example: "prod",
    }),
  })
  .openapi("ListActivePaidUsersQuery");

const activePaidUserSchema = z
  .object({
    id: z.string().openapi({ example: "abc123" }),
    email: z.string().openapi({ example: "user@example.com" }),
    firstName: z.string().optional().openapi({ example: "Jane" }),
    lastName: z.string().optional().openapi({ example: "Doe" }),
    username: z.string().openapi({ example: "jane_doe" }),
    isBlocked: z.boolean().openapi({ example: false }),
    lastSeenAt: z.string().datetime().optional().openapi({
      example: "2026-05-15T10:00:00.000Z",
    }),
    createAt: z.string().datetime().optional().openapi({
      example: "2025-01-01T00:00:00.000Z",
    }),
    stripeCustomerId: z.string().openapi({ example: "cus_abc123" }),
    currentPeriodEnd: z.string().datetime().openapi({
      example: "2026-12-31T00:00:00.000Z",
    }),
  })
  .openapi("ActivePaidUser");

const listActivePaidUsersResponseSchema = z
  .object({
    ok: z.literal(true).openapi({ description: "Indicates request succeeded" }),
    users: z.array(activePaidUserSchema),
    pagination: z.object({
      limit: z.number().int(),
      offset: z.number().int(),
      total: z.number().int().openapi({
        description: "Total number of active paid users",
      }),
    }),
  })
  .openapi("ListActivePaidUsersResponse");

export function registerListActivePaidUsersRoute(
  router: Router,
  adminService: IAdminService,
): void {
  router.get("/api/admin/active-paid-users", apiTokenRequired, async (ctx) => {
    const parsed = listActivePaidUsersQuerySchema.safeParse(ctx.query);
    if (!parsed.success) {
      throw new BadUserInputError(
        `Invalid query params: ${parsed.error.issues[0]?.message}`,
      );
    }

    const { limit, offset, env } = parsed.data;
    const result = await adminService.listActivePaidUsers({
      limit,
      offset,
      clientId: ENV_TO_CLIENT_ID[env],
    });
    ctx.body = { ok: true, ...result };
  });

  registerRoute({
    method: "get",
    path: "/api/admin/active-paid-users",
    summary: "List active paid users",
    description:
      "Returns users with an active Stripe subscription (currentPeriodEnd in the future), ordered by subscription end date descending.",
    tags: ["Admin API"],
    security: [{ adminToken: [] }],
    request: {
      query: listActivePaidUsersQuerySchema,
    },
    responses: {
      200: {
        description: "List of active paid users",
        content: {
          "application/json": {
            schema: listActivePaidUsersResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request — invalid query params",
        content: {
          "application/json": {
            schema: errorResponseSchema,
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
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });
}
