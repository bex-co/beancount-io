import Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import { registerRoute } from "@/server/rest/openapi-registry";
import type { IAdminService } from "../service/admin-service";
import { BadUserInputError } from "@/shared/errors";
import { apiTokenRequired } from "./admin-api-middleware";
import { errorResponseSchema } from "./admin-error-schema";

const listRecentUsersQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50).openapi({
      description: "Maximum number of users to return",
      example: 50,
    }),
    offset: z.coerce.number().int().min(0).default(0).openapi({
      description: "Number of users to skip for pagination",
      example: 0,
    }),
    sinceHours: z.coerce.number().int().min(1).max(8760).default(24).openapi({
      description: "Return users seen within the last N hours",
      example: 24,
    }),
  })
  .openapi("ListRecentUsersQuery");

const recentUserSchema = z
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
  })
  .openapi("RecentUser");

const listRecentUsersResponseSchema = z
  .object({
    ok: z.literal(true).openapi({ description: "Indicates request succeeded" }),
    users: z.array(recentUserSchema),
    pagination: z.object({
      limit: z.number().int(),
      offset: z.number().int(),
      count: z.number().int().openapi({
        description:
          "Total number of users matching the filter, regardless of pagination",
      }),
    }),
  })
  .openapi("ListRecentUsersResponse");

export function registerListRecentUsersRoute(
  router: Router,
  adminService: IAdminService,
): void {
  router.get("/api/admin/recent-users", apiTokenRequired, async (ctx) => {
    const parsed = listRecentUsersQuerySchema.safeParse(ctx.query);
    if (!parsed.success) {
      throw new BadUserInputError(
        `Invalid query params: ${parsed.error.issues[0]?.message}`,
      );
    }

    const { limit, offset, sinceHours } = parsed.data;
    const result = await adminService.listRecentUsers({
      limit,
      offset,
      sinceHours,
    });
    ctx.body = { ok: true, ...result };
  });

  registerRoute({
    method: "get",
    path: "/api/admin/recent-users",
    summary: "List recently active users",
    description:
      "Returns users who have made at least one authenticated request within the specified time window, ordered by most-recently-seen first.",
    tags: ["Admin API"],
    security: [{ adminToken: [] }],
    request: {
      query: listRecentUsersQuerySchema,
    },
    responses: {
      200: {
        description: "List of recently seen users",
        content: {
          "application/json": {
            schema: listRecentUsersResponseSchema,
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
