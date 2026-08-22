import bodyParser from "koa-bodyparser";
import Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import { zodValidator } from "@/shared/koa-zod-validator";
import { registerRoute } from "@/server/rest/openapi-registry";
import type { IAdminService } from "../service/admin-service";
import { apiTokenRequired } from "./admin-api-middleware";
import { errorResponseSchema } from "./admin-error-schema";

export const unblockUserRequestSchema = z
  .object({
    email: z.string().email().openapi({
      description: "Email of the user to unblock",
      example: "user@example.com",
    }),
  })
  .openapi("UnblockUserRequest", {
    description: "Request body for unblocking a specific user",
  });

export const unblockUserResponseSchema = z
  .object({
    ok: z.literal(true).openapi({ description: "Indicates request succeeded" }),
    message: z.string().openapi({
      description: "Success message",
      example: "User unblocked successfully",
    }),
  })
  .openapi("UnblockUserResponse", {
    description: "Response confirming the user has been unblocked",
  });

export function registerUnblockUserRoute(
  router: Router,
  adminService: IAdminService,
): void {
  router.post(
    "/api/admin/unblock-user",
    bodyParser(),
    apiTokenRequired,
    zodValidator(unblockUserRequestSchema),
    async (ctx) => {
      const { email } = ctx.request.body as { email: string };
      const result = await adminService.unblockUser(email);
      ctx.body = { ok: true, ...result };
    },
  );

  registerRoute({
    method: "post",
    path: "/api/admin/unblock-user",
    summary: "Unblock a user by email",
    description: `Allows administrators to unblock a user by providing their email address.

This endpoint will:
- Find the user by email
- Set their isBlocked status to false
- Return a success message

The endpoint will return an error if:
- The user with the provided email does not exist (404)

If the user is already unblocked, the operation succeeds and returns a message indicating the user was already unblocked.`,
    tags: ["Admin API"],
    security: [{ adminToken: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: unblockUserRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "User unblocked successfully",
        content: {
          "application/json": {
            schema: unblockUserResponseSchema,
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
