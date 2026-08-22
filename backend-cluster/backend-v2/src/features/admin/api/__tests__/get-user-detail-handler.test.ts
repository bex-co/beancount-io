import Router from "@koa/router";
import { NotFoundError } from "@/shared/errors";
import type { IAdminService } from "../../service/admin-service";
import {
  registerGetUserDetailRoute,
  getUserDetailRequestSchema,
  getUserDetailResponseSchema,
} from "../get-user-detail-handler";

describe("registerGetUserDetailRoute", () => {
  let router: Router;
  let mockCtx: Router.RouterContext;
  let routeHandler: Router.Middleware;
  let mockAdminService: jest.Mocked<Pick<IAdminService, "getUserDetail">>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdminService = { getUserDetail: jest.fn() };

    router = new Router();
    router.post = jest.fn();
    registerGetUserDetailRoute(
      router,
      mockAdminService as unknown as IAdminService,
    );

    const getUserDetailRoute = (router.post as jest.Mock).mock.calls.find(
      (call) => call[0] === "/api/admin/user-detail",
    );
    // chain: path, bodyParser(), apiTokenRequired, zodValidator(), handler
    routeHandler = getUserDetailRoute[4];

    mockCtx = {
      headers: {},
      request: { body: {} },
      response: { body: null },
      status: 200,
      body: null,
    } as unknown as Router.RouterContext;
  });

  describe("handler", () => {
    it("should propagate NotFoundError when service throws", async () => {
      mockCtx.request.body = { email: "notfound@example.com" };
      mockAdminService.getUserDetail.mockRejectedValue(
        new NotFoundError("User", "notfound@example.com"),
      );

      await expect(routeHandler(mockCtx, async () => {})).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should set ctx.body with the combined user detail on success", async () => {
      const email = "bob@example.com";
      mockCtx.request.body = { email };
      const detail = {
        user: {
          id: "u1",
          email,
          username: "bob",
          isBlocked: false,
          avatarUrl: "gravatar.com/avatar/abc",
          locale: "en",
        },
        paidCustomers: [
          {
            clientId: "beancount-web-prod",
            stripeCustomerId: "cus_abc",
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        subscriptions: [],
      };
      mockAdminService.getUserDetail.mockResolvedValue(detail as any);

      await routeHandler(mockCtx, async () => {});

      expect(mockAdminService.getUserDetail).toHaveBeenCalledWith(email);
      expect(mockCtx.body).toEqual({ ok: true, ...detail });
    });
  });
});

describe("getUserDetailRequestSchema", () => {
  it("should accept a valid email", () => {
    expect(
      getUserDetailRequestSchema.safeParse({ email: "user@example.com" })
        .success,
    ).toBe(true);
  });

  it("should reject an invalid email", () => {
    expect(
      getUserDetailRequestSchema.safeParse({ email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("should require email", () => {
    expect(getUserDetailRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("getUserDetailResponseSchema", () => {
  const validResponse = {
    ok: true,
    user: {
      id: "u1",
      email: "user@example.com",
      username: "user",
      isBlocked: false,
      avatarUrl: "gravatar.com/avatar/abc",
      locale: "en",
    },
    paidCustomers: [],
    subscriptions: [],
  };

  it("should accept a valid response", () => {
    expect(getUserDetailResponseSchema.safeParse(validResponse).success).toBe(
      true,
    );
  });

  it("should require ok to be true", () => {
    expect(
      getUserDetailResponseSchema.safeParse({
        ...validResponse,
        ok: false,
      }).success,
    ).toBe(false);
  });

  it("should require user", () => {
    const { user: _user, ...rest } = validResponse;
    expect(getUserDetailResponseSchema.safeParse(rest).success).toBe(false);
  });
});
