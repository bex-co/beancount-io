import bodyParser from "koa-bodyparser";
import Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import { zodValidator } from "@/shared/koa-zod-validator";
import { registerRoute } from "@/server/rest/openapi-registry";
import type { IAdminService } from "../service/admin-service";
import { apiTokenRequired } from "./admin-api-middleware";
import { errorResponseSchema } from "./admin-error-schema";

export const fixUserEmailRequestSchema = z
  .object({
    email: z.string().email().openapi({
      description: "The user's current, incorrectly-stored email address",
      example: "kwoktungdev@gmail.com",
    }),
    expectedEmail: z.string().email().openapi({
      description: "The correct email address to set for the user",
      example: "kwoktung.dev@gmail.com",
    }),
  })
  .openapi("FixUserEmailRequest", {
    description: "Request body for correcting a user's stored email address",
  });

export const fixUserEmailResponseSchema = z
  .object({
    ok: z.literal(true).openapi({ description: "Indicates request succeeded" }),
    message: z.string().openapi({
      description: "Success message",
      example:
        "User email updated from kwoktungdev@gmail.com to kwoktung.dev@gmail.com",
    }),
  })
  .openapi("FixUserEmailResponse", {
    description: "Response confirming the user's email has been corrected",
  });

export function registerFixUserEmailRoute(
  router: Router,
  adminService: IAdminService,
): void {
  router.post(
    "/api/admin/fix-user-email",
    bodyParser(),
    apiTokenRequired,
    zodValidator(fixUserEmailRequestSchema),
    async (ctx) => {
      const { email, expectedEmail } = ctx.request.body as {
        email: string;
        expectedEmail: string;
      };
      const result = await adminService.fixUserEmail(email, expectedEmail);
      ctx.body = { ok: true, ...result };
    },
  );

  registerRoute({
    method: "post",
    path: "/api/admin/fix-user-email",
    summary: "Fix a user's incorrectly-stored email address",
    description: `Allows administrators to correct a user's stored email address by
providing the current (incorrectly-stored) email and the expected (correct)
email. Updates both the user's Postgres record and their Gitea-backed ledger
account so the two stores stay in sync.

This endpoint only fixes Gmail dot-stripping mismatches: \`expectedEmail\` must
be the same Gmail/Googlemail address as \`email\`, differing only by dots in
the local part (e.g. \`kwoktungdev@gmail.com\` → \`kwoktung.dev@gmail.com\`). It
is not a general-purpose email-change tool.

This endpoint will:
- Find the user by their current stored email
- Update the email in Postgres and in the Gitea-backed ledger account
- Return a success message

The endpoint will return an error if:
- \`expectedEmail\` is not a dot-variant of the same Gmail address as \`email\` (400)
- The user with the current email does not exist (404)
- The expected email is already in use by a different user (409)

If the user's email is already correct, the operation succeeds and returns a
message indicating no change was needed.`,
    tags: ["Admin API"],
    security: [{ adminToken: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: fixUserEmailRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "User email fixed successfully",
        content: {
          "application/json": {
            schema: fixUserEmailResponseSchema,
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
      409: {
        description: "Expected email is already in use by another user",
        content: {
          "application/json": {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });
}
