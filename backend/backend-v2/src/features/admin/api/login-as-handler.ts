import bodyParser from "koa-bodyparser";
import Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import { zodValidator } from "@/shared/koa-zod-validator";
import { registerRoute } from "@/server/rest/openapi-registry";
import type { IAdminService } from "../service/admin-service";
import { apiTokenRequired } from "./admin-api-middleware";
import { errorResponseSchema } from "./admin-error-schema";

export const loginAsRequestSchema = z
  .object({
    email: z.email().openapi({
      description: "Email of the user to login as",
      example: "user@example.com",
    }),
  })
  .openapi("LoginAsRequest", {
    description: "Request body for logging in as a specific user",
  });

export const loginAsResponseSchema = z
  .object({
    ok: z.literal(true).openapi({ description: "Indicates request succeeded" }),
    redirectUrl: z.url().openapi({
      description:
        "Dashboard URL with one-time token for auto login via /auth/callback",
      example: "https://beancount.io/auth/callback?oneTimeToken=abc123",
    }),
  })
  .openapi("LoginAsResponse", {
    description:
      "Response containing a one-time redirect URL to auto-login to the dashboard",
  });

export function registerLoginAsRoute(
  router: Router,
  adminService: IAdminService,
): void {
  router.post(
    "/api/admin/login-as",
    bodyParser(),
    apiTokenRequired,
    zodValidator(loginAsRequestSchema),
    async (ctx) => {
      const { email } = ctx.request.body as { email: string };
      const result = await adminService.loginAs(email);
      ctx.body = { ok: true, ...result };
    },
  );

  registerRoute({
    method: "post",
    path: "/api/admin/login-as",
    summary: "Generate a one-time login URL for a user by email",
    description: `Allows administrators to generate a one-time redirect URL that auto-logs into the dashboard as the specified user.

The returned URL points to /auth/callback?oneTimeToken=... and expires in 5 minutes.

The endpoint will return an error if:
- The user with the provided email does not exist (404)
- The user is blocked (400)`,
    tags: ["Admin API"],
    security: [{ adminToken: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: loginAsRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "One-time login URL generated successfully",
        content: {
          "application/json": {
            schema: loginAsResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - user is blocked or invalid input",
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
