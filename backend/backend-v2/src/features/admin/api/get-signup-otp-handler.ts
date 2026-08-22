import bodyParser from "koa-bodyparser";
import Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import { zodValidator } from "@/shared/koa-zod-validator";
import { registerRoute } from "@/server/rest/openapi-registry";
import type { IAdminService } from "../service/admin-service";
import { apiTokenRequired } from "./admin-api-middleware";
import { errorResponseSchema } from "./admin-error-schema";

export const getSignupOtpRequestSchema = z
  .object({
    email: z.email().openapi({
      description: "Email address of the user with a pending signup session",
      example: "user@example.com",
    }),
  })
  .openapi("GetSignupOtpRequest", {
    description: "Request body for retrieving a pending signup OTP by email",
  });

export const getSignupOtpResponseSchema = z
  .object({
    ok: z.literal(true).openapi({ description: "Indicates request succeeded" }),
    otp: z.string().openapi({
      description: "4-digit OTP validation code for the pending signup session",
      example: "4821",
    }),
    expireAt: z.string().openapi({
      description: "ISO timestamp when the signup session expires",
      example: "2026-05-03T12:30:00.000Z",
    }),
  })
  .openapi("GetSignupOtpResponse", {
    description:
      "Response containing the OTP code for the user's pending signup session",
  });

export function registerGetSignupOtpRoute(
  router: Router,
  adminService: IAdminService,
): void {
  router.post(
    "/api/admin/get-signup-otp",
    bodyParser(),
    apiTokenRequired,
    zodValidator(getSignupOtpRequestSchema),
    async (ctx) => {
      const { email } = ctx.request.body as { email: string };
      const result = await adminService.getSignupOtp(email);
      ctx.body = { ok: true, ...result };
    },
  );

  registerRoute({
    method: "post",
    path: "/api/admin/get-signup-otp",
    summary: "Get signup OTP code by email",
    description: `Retrieves the current registration validation code (OTP) for a user with a pending signup session.

Useful for support and debugging when a user reports not receiving or misplacing their OTP email.

Returns 404 if no active signup session exists for the given email (session may have expired or the user may have already completed signup).`,
    tags: ["Admin API"],
    security: [{ adminToken: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: getSignupOtpRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "OTP retrieved successfully",
        content: {
          "application/json": {
            schema: getSignupOtpResponseSchema,
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
        description: "No active signup session found for this email",
        content: {
          "application/json": {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });
}
