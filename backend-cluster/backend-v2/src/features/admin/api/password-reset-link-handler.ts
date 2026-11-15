import bodyParser from "koa-bodyparser";
import Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import { zodValidator } from "@/shared/koa-zod-validator";
import { registerRoute } from "@/server/rest/openapi-registry";
import type { IAdminService } from "../service/admin-service";
import { apiTokenRequired } from "./admin-api-middleware";
import { errorResponseSchema } from "./admin-error-schema";

const PATH = "/api/admin/password-reset-link";

const passwordResetLinkRequestSchema = z
  .object({
    email: z.email().openapi({
      description: "Email of the user whose password is to be reset",
      example: "user@example.com",
    }),
  })
  .openapi("PasswordResetLinkRequest", {
    description: "Request body for issuing a one-time password-reset link",
  });

const passwordResetLinkResponseSchema = z
  .object({
    ok: z.literal(true).openapi({ description: "Indicates request succeeded" }),
    resetUrl: z.url().openapi({
      description:
        "Dashboard reset-password URL carrying a one-time token. Give it to the user; it sets a new password once.",
      example:
        "https://beancount.example.com/auth/reset-password/?token=abc123",
    }),
    expireAt: z.string().openapi({
      description: "When the link stops working (ISO 8601)",
      example: "2026-11-14T12:00:00.000Z",
    }),
  })
  .openapi("PasswordResetLinkResponse", {
    description: "A one-time password-reset link for the user",
  });

/**
 * Operator recovery for a deployment that cannot send email (ADR029
 * Decision 4). Operator tooling behind `ADMIN_TOKEN`, not a customer
 * capability, so it has no GraphQL or MCP counterpart.
 */
export function registerPasswordResetLinkRoute(
  router: Router,
  adminService: IAdminService,
): void {
  router.post(
    PATH,
    bodyParser(),
    apiTokenRequired,
    zodValidator(passwordResetLinkRequestSchema),
    async (ctx) => {
      const { email } = ctx.request.body as { email: string };
      const result = await adminService.issuePasswordResetLink(email);
      // A live credential: keep it out of every cache between here and the operator.
      ctx.set("Cache-Control", "no-store");
      ctx.body = { ok: true, ...result };
    },
  );

  registerRoute({
    method: "post",
    path: PATH,
    summary: "Issue a one-time password-reset link for a user by email",
    description: `Lets the operator of a deployment without a mail provider restore a user's access. The returned URL opens the dashboard's reset-password page; the user sets a new password there, which signs out every existing session. The link works once and expires after one hour.

The endpoint will return an error if:
- The user with the provided email does not exist (404)
- The request body is invalid (400)
- The user is blocked (403)`,
    tags: ["Admin API"],
    security: [{ adminToken: [] }],
    request: {
      body: {
        content: {
          "application/json": { schema: passwordResetLinkRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: "One-time reset link issued",
        content: {
          "application/json": { schema: passwordResetLinkResponseSchema },
        },
      },
      400: {
        description: "Bad request - invalid input",
        content: { "application/json": { schema: errorResponseSchema } },
      },
      401: {
        description: "Unauthorized - invalid or missing admin token",
        content: { "application/json": { schema: errorResponseSchema } },
      },
      403: {
        description: "The user is blocked",
        content: { "application/json": { schema: errorResponseSchema } },
      },
      404: {
        description: "User not found",
        content: { "application/json": { schema: errorResponseSchema } },
      },
    },
  });
}
