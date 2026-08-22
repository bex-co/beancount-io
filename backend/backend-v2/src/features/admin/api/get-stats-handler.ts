import Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import { registerRoute } from "@/server/rest/openapi-registry";
import type { IAdminService } from "../service/admin-service";
import { apiTokenRequired } from "./admin-api-middleware";
import { errorResponseSchema } from "./admin-error-schema";

const statsResponseSchema = z
  .object({
    ok: z.literal(true).openapi({ description: "Indicates request succeeded" }),
    totalUsers: z.number().int().openapi({
      description: "Total number of registered users",
      example: 1234,
    }),
    activePaidUsers: z.number().int().openapi({
      description: "Number of users with an active Stripe subscription",
      example: 56,
    }),
  })
  .openapi("AdminStatsResponse");

export function registerGetStatsRoute(
  router: Router,
  adminService: IAdminService,
): void {
  router.get("/api/admin/stats", apiTokenRequired, async (ctx) => {
    const result = await adminService.getStats();
    ctx.body = { ok: true, ...result };
  });

  registerRoute({
    method: "get",
    path: "/api/admin/stats",
    summary: "Get admin stats",
    description:
      "Returns the total number of registered users and the number of users with an active Stripe subscription.",
    tags: ["Admin API"],
    security: [{ adminToken: [] }],
    responses: {
      200: {
        description: "Admin stats",
        content: {
          "application/json": {
            schema: statsResponseSchema,
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
