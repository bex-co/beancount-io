import Router from "@koa/router";
import { NotFoundError } from "@/shared/errors";
import type { IAdminService } from "../../service/admin-service";
import {
  registerUnblockUserRoute,
  unblockUserRequestSchema,
  unblockUserResponseSchema,
} from "../unblock-user-handler";

describe("registerUnblockUserRoute", () => {
  let router: Router;
  let mockCtx: Router.RouterContext;
  let routeHandler: Router.Middleware;
  let mockAdminService: jest.Mocked<Pick<IAdminService, "unblockUser">>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdminService = { unblockUser: jest.fn() };

    router = new Router();
    router.post = jest.fn();
    registerUnblockUserRoute(
      router,
      mockAdminService as unknown as IAdminService,
    );

    const unblockUserRoute = (router.post as jest.Mock).mock.calls.find(
      (call) => call[0] === "/api/admin/unblock-user",
    );
    // chain: path, bodyParser(), apiTokenRequired, zodValidator(), handler
    routeHandler = unblockUserRoute[4];

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
      mockAdminService.unblockUser.mockRejectedValue(
        new NotFoundError("User", "notfound@example.com"),
      );

      await expect(routeHandler(mockCtx, async () => {})).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should set ctx.body when user is already unblocked", async () => {
      const email = "unblocked@example.com";
      mockCtx.request.body = { email };
      mockAdminService.unblockUser.mockResolvedValue({
        message: `User ${email} is already unblocked`,
      });

      await routeHandler(mockCtx, async () => {});

      expect(mockAdminService.unblockUser).toHaveBeenCalledWith(email);
      expect(mockCtx.body).toEqual({
        ok: true,
        message: `User ${email} is already unblocked`,
      });
    });

    it("should set ctx.body when user is successfully unblocked", async () => {
      const email = "blocked@example.com";
      mockCtx.request.body = { email };
      mockAdminService.unblockUser.mockResolvedValue({
        message: `User ${email} unblocked successfully`,
      });

      await routeHandler(mockCtx, async () => {});

      expect(mockCtx.body).toEqual({
        ok: true,
        message: `User ${email} unblocked successfully`,
      });
    });
  });
});

describe("unblockUserRequestSchema", () => {
  it("should accept valid email", () => {
    expect(
      unblockUserRequestSchema.safeParse({ email: "user@example.com" }).success,
    ).toBe(true);
  });

  it("should reject invalid email", () => {
    expect(
      unblockUserRequestSchema.safeParse({ email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("should require email", () => {
    expect(unblockUserRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("unblockUserResponseSchema", () => {
  it("should accept valid response", () => {
    expect(
      unblockUserResponseSchema.safeParse({
        ok: true,
        message: "User unblocked successfully",
      }).success,
    ).toBe(true);
  });

  it("should require ok to be true", () => {
    expect(
      unblockUserResponseSchema.safeParse({
        ok: false,
        message: "User unblocked successfully",
      }).success,
    ).toBe(false);
  });

  it("should require message", () => {
    expect(unblockUserResponseSchema.safeParse({ ok: true }).success).toBe(
      false,
    );
  });
});
