import Router from "@koa/router";
import { NotFoundError, ConflictError } from "@/shared/errors";
import type { IAdminService } from "../../service/admin-service";
import {
  registerFixUserEmailRoute,
  fixUserEmailRequestSchema,
  fixUserEmailResponseSchema,
} from "../fix-user-email-handler";

describe("registerFixUserEmailRoute", () => {
  let router: Router;
  let mockCtx: Router.RouterContext;
  let routeHandler: Router.Middleware;
  let mockAdminService: jest.Mocked<Pick<IAdminService, "fixUserEmail">>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdminService = { fixUserEmail: jest.fn() };

    router = new Router();
    router.post = jest.fn();
    registerFixUserEmailRoute(
      router,
      mockAdminService as unknown as IAdminService,
    );

    const fixUserEmailRoute = (router.post as jest.Mock).mock.calls.find(
      (call) => call[0] === "/api/admin/fix-user-email",
    );
    // chain: path, bodyParser(), apiTokenRequired, zodValidator(), handler
    routeHandler = fixUserEmailRoute[4];

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
      mockCtx.request.body = {
        email: "notfound@example.com",
        expectedEmail: "correct@example.com",
      };
      mockAdminService.fixUserEmail.mockRejectedValue(
        new NotFoundError("User", "notfound@example.com"),
      );

      await expect(routeHandler(mockCtx, async () => {})).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should propagate ConflictError when expected email is already taken", async () => {
      mockCtx.request.body = {
        email: "kwoktungdev@gmail.com",
        expectedEmail: "taken@example.com",
      };
      mockAdminService.fixUserEmail.mockRejectedValue(
        new ConflictError("Email", "taken@example.com"),
      );

      await expect(routeHandler(mockCtx, async () => {})).rejects.toThrow(
        ConflictError,
      );
    });

    it("should set ctx.body when email is fixed successfully", async () => {
      const email = "kwoktungdev@gmail.com";
      const expectedEmail = "kwoktung.dev@gmail.com";
      mockCtx.request.body = { email, expectedEmail };
      mockAdminService.fixUserEmail.mockResolvedValue({
        message: `User email updated from ${email} to ${expectedEmail}`,
      });

      await routeHandler(mockCtx, async () => {});

      expect(mockAdminService.fixUserEmail).toHaveBeenCalledWith(
        email,
        expectedEmail,
      );
      expect(mockCtx.body).toEqual({
        ok: true,
        message: `User email updated from ${email} to ${expectedEmail}`,
      });
    });
  });
});

describe("fixUserEmailRequestSchema", () => {
  it("should accept valid emails", () => {
    expect(
      fixUserEmailRequestSchema.safeParse({
        email: "user@example.com",
        expectedEmail: "user.other@example.com",
      }).success,
    ).toBe(true);
  });

  it("should reject invalid email", () => {
    expect(
      fixUserEmailRequestSchema.safeParse({
        email: "not-an-email",
        expectedEmail: "user@example.com",
      }).success,
    ).toBe(false);
  });

  it("should require both email and expectedEmail", () => {
    expect(
      fixUserEmailRequestSchema.safeParse({ email: "user@example.com" })
        .success,
    ).toBe(false);
  });
});

describe("fixUserEmailResponseSchema", () => {
  it("should accept valid response", () => {
    expect(
      fixUserEmailResponseSchema.safeParse({
        ok: true,
        message: "User email updated",
      }).success,
    ).toBe(true);
  });

  it("should require ok to be true", () => {
    expect(
      fixUserEmailResponseSchema.safeParse({
        ok: false,
        message: "User email updated",
      }).success,
    ).toBe(false);
  });

  it("should require message", () => {
    expect(fixUserEmailResponseSchema.safeParse({ ok: true }).success).toBe(
      false,
    );
  });
});
