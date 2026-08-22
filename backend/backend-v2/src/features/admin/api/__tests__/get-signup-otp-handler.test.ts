import Router from "@koa/router";
import { NotFoundError } from "@/shared/errors";
import type { IAdminService } from "../../service/admin-service";
import {
  registerGetSignupOtpRoute,
  getSignupOtpRequestSchema,
  getSignupOtpResponseSchema,
} from "../get-signup-otp-handler";

describe("registerGetSignupOtpRoute", () => {
  let router: Router;
  let mockCtx: Router.RouterContext;
  let routeHandler: Router.Middleware;
  let mockAdminService: jest.Mocked<Pick<IAdminService, "getSignupOtp">>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdminService = { getSignupOtp: jest.fn() };

    router = new Router();
    router.post = jest.fn();
    registerGetSignupOtpRoute(
      router,
      mockAdminService as unknown as IAdminService,
    );

    const route = (router.post as jest.Mock).mock.calls.find(
      (call) => call[0] === "/api/admin/get-signup-otp",
    );
    // chain: path, bodyParser(), apiTokenRequired, zodValidator(), handler
    routeHandler = route[4];

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
      mockAdminService.getSignupOtp.mockRejectedValue(
        new NotFoundError("Signup session", "notfound@example.com"),
      );

      await expect(routeHandler(mockCtx, async () => {})).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should set ctx.body with ok:true and service result", async () => {
      const email = "pending@example.com";
      const expireAt = new Date(Date.now() + 60000).toISOString();
      mockCtx.request.body = { email };
      mockAdminService.getSignupOtp.mockResolvedValue({
        otp: "4821",
        expireAt,
      });

      await routeHandler(mockCtx, async () => {});

      expect(mockAdminService.getSignupOtp).toHaveBeenCalledWith(email);
      expect(mockCtx.body).toEqual({ ok: true, otp: "4821", expireAt });
    });
  });
});

describe("getSignupOtpRequestSchema", () => {
  it("should accept valid email", () => {
    expect(
      getSignupOtpRequestSchema.safeParse({ email: "user@example.com" })
        .success,
    ).toBe(true);
  });

  it("should reject invalid email", () => {
    expect(
      getSignupOtpRequestSchema.safeParse({ email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("should require email", () => {
    expect(getSignupOtpRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("getSignupOtpResponseSchema", () => {
  it("should accept valid response", () => {
    expect(
      getSignupOtpResponseSchema.safeParse({
        ok: true,
        otp: "4821",
        expireAt: "2026-05-03T12:30:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("should require ok to be true", () => {
    expect(
      getSignupOtpResponseSchema.safeParse({
        ok: false,
        otp: "4821",
        expireAt: "2026-05-03T12:30:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("should require otp", () => {
    expect(
      getSignupOtpResponseSchema.safeParse({
        ok: true,
        expireAt: "2026-05-03T12:30:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("should require expireAt", () => {
    expect(
      getSignupOtpResponseSchema.safeParse({ ok: true, otp: "4821" }).success,
    ).toBe(false);
  });
});
