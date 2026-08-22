import Router from "@koa/router";
import { NotFoundError } from "@/shared/errors";
import type { IAdminService } from "../../service/admin-service";
import {
  registerUserLedgersRoute,
  userLedgersRequestSchema,
  userLedgersResponseSchema,
} from "../user-ledgers-handler";

describe("registerUserLedgersRoute", () => {
  let router: Router;
  let mockCtx: Router.RouterContext;
  let routeHandler: Router.Middleware;
  let mockAdminService: jest.Mocked<Pick<IAdminService, "getUserLedgers">>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdminService = { getUserLedgers: jest.fn() };

    router = new Router();
    router.post = jest.fn();
    registerUserLedgersRoute(
      router,
      mockAdminService as unknown as IAdminService,
    );

    const userLedgersRoute = (router.post as jest.Mock).mock.calls.find(
      (call) => call[0] === "/api/admin/user-ledgers",
    );
    // chain: path, bodyParser(), apiTokenRequired, zodValidator(), handler
    routeHandler = userLedgersRoute[4];

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
      mockAdminService.getUserLedgers.mockRejectedValue(
        new NotFoundError("User", "notfound@example.com"),
      );

      await expect(routeHandler(mockCtx, async () => {})).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should set ctx.body with the ledger list on success", async () => {
      const email = "alice@example.com";
      mockCtx.request.body = { email };
      const ledgers = [
        {
          id: "alice/personal",
          name: "personal",
          fullName: "alice/personal",
          private: true,
          empty: false,
          size: 2048,
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          directiveCount: 842,
        },
      ];
      mockAdminService.getUserLedgers.mockResolvedValue({ ledgers });

      await routeHandler(mockCtx, async () => {});

      expect(mockAdminService.getUserLedgers).toHaveBeenCalledWith(email);
      expect(mockCtx.body).toEqual({ ok: true, ledgers });
    });
  });
});

describe("userLedgersRequestSchema", () => {
  it("should accept a valid email", () => {
    expect(
      userLedgersRequestSchema.safeParse({ email: "user@example.com" }).success,
    ).toBe(true);
  });

  it("should reject an invalid email", () => {
    expect(
      userLedgersRequestSchema.safeParse({ email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("should require email", () => {
    expect(userLedgersRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("userLedgersResponseSchema", () => {
  const validResponse = {
    ok: true,
    ledgers: [
      {
        id: "alice/personal",
        name: "personal",
        fullName: "alice/personal",
        private: true,
        empty: false,
        size: 2048,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        directiveCount: 842,
      },
    ],
  };

  it("should accept a valid response", () => {
    expect(userLedgersResponseSchema.safeParse(validResponse).success).toBe(
      true,
    );
  });

  it("should accept a null directiveCount", () => {
    const response = {
      ...validResponse,
      ledgers: [{ ...validResponse.ledgers[0], directiveCount: null }],
    };
    expect(userLedgersResponseSchema.safeParse(response).success).toBe(true);
  });

  it("should require ok to be true", () => {
    expect(
      userLedgersResponseSchema.safeParse({ ...validResponse, ok: false })
        .success,
    ).toBe(false);
  });

  it("should require ledgers", () => {
    const { ledgers: _ledgers, ...rest } = validResponse;
    expect(userLedgersResponseSchema.safeParse(rest).success).toBe(false);
  });
});
