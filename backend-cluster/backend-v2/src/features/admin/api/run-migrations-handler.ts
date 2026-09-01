import Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import { registerRoute } from "@/server/rest/openapi-registry";
import type { IAdminService } from "../service/admin-service";
import { apiTokenRequired } from "./admin-api-middleware";
import { errorResponseSchema } from "./admin-error-schema";

const runMigrationsResponseSchema = z
  .object({
    ok: z.literal(true).openapi({ description: "Indicates request succeeded" }),
    message: z.string().openapi({
      description: "Result message",
      example: "Migrations applied successfully",
    }),
  })
  .openapi("RunMigrationsResponse", {
    description: "Response confirming migrations were applied",
  });

export function registerRunMigrationsRoute(
  router: Router,
  adminService: IAdminService,
): void {
  router.post("/api/admin/run-migrations", apiTokenRequired, async (ctx) => {
    await adminService.runMigrations();
    ctx.body = { ok: true, message: "Migrations applied successfully" };
  });

  registerRoute({
    method: "post",
    path: "/api/admin/run-migrations",
    summary: "Apply pending database migrations",
    description:
      "Runs all pending Drizzle migrations against the PostgreSQL database.",
    tags: ["Admin API"],
    security: [{ adminToken: [] }],
    responses: {
      200: {
        description: "Migrations applied successfully",
        content: {
          "application/json": {
            schema: runMigrationsResponseSchema,
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
    },
  });
}
