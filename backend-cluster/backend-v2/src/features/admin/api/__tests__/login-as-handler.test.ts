import Router from "@koa/router";
import { NotFoundError, OperationNotAllowedError } from "@/shared/errors";
import type { IAdminService } from "../../service/admin-service";
import {
  registerLoginAsRoute,
  loginAsRequestSchema,
  loginAsResponseSchema,
} from "../login-as-handler";

describe("registerLoginAsRoute", () => {
  let router: Router;
  let mockCtx: Router.RouterContext;
  let routeHandler: Router.Middleware;
  let mockAdminService: jest.Mocked<Pick<IAdminService, "loginAs">>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdminService = { loginAs: jest.fn() };

    router = new Router();
    router.post = jest.fn();
    registerLoginAsRoute(router, mockAdminService as unknown as IAdminService);

    const loginAsRoute = (router.post as jest.Mock).mock.calls.find(
      (call) => call[0] === "/api/admin/login-as",
    );
    // chain: path, bodyParser(), apiTokenRequired, zodValidator(), handler
    routeHandler = loginAsRoute[4];

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
      mockAdminService.loginAs.mockRejectedValue(
        new NotFoundError("User", "notfound@example.com"),
      );

      await expect(routeHandler(mockCtx, async () => {})).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should propagate OperationNotAllowedError when user is blocked", async () => {
      mockCtx.request.body = { email: "blocked@example.com" };
      mockAdminService.loginAs.mockRejectedValue(
        new OperationNotAllowedError(
          "login-as",
          "User blocked@example.com is blocked",
        ),
      );

      await expect(routeHandler(mockCtx, async () => {})).rejects.toThrow(
        OperationNotAllowedError,
      );
    });

    it("should set ctx.body with ok:true and redirectUrl from service", async () => {
      const email = "valid@example.com";
      const redirectUrl =
        "https://dashboard.example.com/auth/callback?oneTimeToken=mock-token";
      mockCtx.request.body = { email };
      mockAdminService.loginAs.mockResolvedValue({ redirectUrl });

      await routeHandler(mockCtx, async () => {});

      expect(mockAdminService.loginAs).toHaveBeenCalledWith(email);
      expect(mockCtx.body).toEqual({ ok: true, redirectUrl });
    });
  });
});

describe("loginAsRequestSchema", () => {
  it("should accept valid email", () => {
    expect(
      loginAsRequestSchema.safeParse({ email: "user@example.com" }).success,
    ).toBe(true);
  });

  it("should reject invalid email", () => {
    expect(
      loginAsRequestSchema.safeParse({ email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("should require email", () => {
    expect(loginAsRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("loginAsResponseSchema", () => {
  it("should accept valid response", () => {
    expect(
      loginAsResponseSchema.safeParse({
        ok: true,
        redirectUrl:
          "https://dashboard.v3.beancount.io/auth/callback?oneTimeToken=abc123",
      }).success,
    ).toBe(true);
  });

  it("should require ok to be true", () => {
    expect(
      loginAsResponseSchema.safeParse({
        ok: false,
        redirectUrl:
          "https://dashboard.v3.beancount.io/auth/callback?oneTimeToken=abc123",
      }).success,
    ).toBe(false);
  });

  it("should require redirectUrl", () => {
    expect(loginAsResponseSchema.safeParse({ ok: true }).success).toBe(false);
  });

  it("should require redirectUrl to be a valid URL", () => {
    expect(
      loginAsResponseSchema.safeParse({ ok: true, redirectUrl: "not-a-url" })
        .success,
    ).toBe(false);
  });
});
