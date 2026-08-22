import bodyParser from "koa-bodyparser";
import Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import { zodValidator } from "@/shared/koa-zod-validator";
import { registerRoute } from "@/server/rest/openapi-registry";
import type { IAdminService } from "../service/admin-service";
import { apiTokenRequired } from "./admin-api-middleware";
import { errorResponseSchema } from "./admin-error-schema";

export const getUserDetailRequestSchema = z
  .object({
    email: z.string().email().openapi({
      description: "Email address of the user to look up",
      example: "user@example.com",
    }),
  })
  .openapi("GetUserDetailRequest", {
    description: "Request body for fetching a user's full detail by email",
  });

const userDetailUserSchema = z
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
    avatarUrl: z.string().openapi({
      example: "gravatar.com/avatar/abc123",
    }),
    locale: z.string().openapi({ example: "en" }),
  })
  .openapi("UserDetailUser");

const userDetailPaidCustomerSchema = z
  .object({
    clientId: z.string().openapi({ example: "beancount-web-prod" }),
    stripeCustomerId: z.string().openapi({ example: "cus_abc123" }),
    email: z.string().optional().openapi({ example: "user@example.com" }),
    name: z.string().optional().openapi({ example: "Jane Doe" }),
    phone: z.string().optional(),
    currentPeriodEnd: z.string().datetime().optional().openapi({
      example: "2026-12-31T00:00:00.000Z",
    }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("UserDetailPaidCustomer");

const userDetailSubscriptionItemSchema = z
  .object({
    id: z.string().openapi({ example: "si_abc123" }),
    priceId: z.string().openapi({ example: "price_abc123" }),
    productId: z.string().optional().openapi({ example: "prod_abc123" }),
    quantity: z.number().int(),
    unitAmount: z.number().optional().openapi({ example: 1999 }),
    currency: z.string().openapi({ example: "usd" }),
    interval: z.string().openapi({ example: "month" }),
  })
  .openapi("UserDetailSubscriptionItem");

const userDetailSubscriptionSchema = z
  .object({
    id: z.string().openapi({ example: "sub_abc123" }),
    clientId: z.string().openapi({ example: "beancount-web-prod" }),
    status: z.string().openapi({ example: "active" }),
    currentPeriodStart: z.string().datetime(),
    currentPeriodEnd: z.string().datetime(),
    cancelAtPeriodEnd: z.boolean(),
    cancelAt: z.string().datetime().optional(),
    canceledAt: z.string().datetime().optional(),
    items: z.array(userDetailSubscriptionItemSchema),
  })
  .openapi("UserDetailSubscription");

export const getUserDetailResponseSchema = z
  .object({
    ok: z.literal(true).openapi({ description: "Indicates request succeeded" }),
    user: userDetailUserSchema,
    paidCustomers: z.array(userDetailPaidCustomerSchema),
    subscriptions: z.array(userDetailSubscriptionSchema),
  })
  .openapi("GetUserDetailResponse");

export function registerGetUserDetailRoute(
  router: Router,
  adminService: IAdminService,
): void {
  router.post(
    "/api/admin/user-detail",
    bodyParser(),
    apiTokenRequired,
    zodValidator(getUserDetailRequestSchema),
    async (ctx) => {
      const { email } = ctx.request.body as { email: string };
      const result = await adminService.getUserDetail(email);
      ctx.body = { ok: true, ...result };
    },
  );

  registerRoute({
    method: "post",
    path: "/api/admin/user-detail",
    summary: "Get a user's full detail by email",
    description: `Returns a complete picture of a user for support/debugging: basic
account info, all of their \`paidCustomer\` records (one per Stripe \`clientId\`,
covering prod and dev environments), and their live Stripe subscriptions.

The endpoint will return an error if:
- The user with the provided email does not exist (404)`,
    tags: ["Admin API"],
    security: [{ adminToken: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: getUserDetailRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "User detail retrieved successfully",
        content: {
          "application/json": {
            schema: getUserDetailResponseSchema,
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
