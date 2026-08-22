import Router from "@koa/router";
import { AppConfig } from "@/config/config";
import { setV1CompatRedirectRoutes } from "../redirect-handler";
import type { AppLayers } from "@/foundation/composition";

// Mock auth utils
jest.mock("@/features/auth/utils/auth", () => ({
  getTokenFromCtx: jest.fn(),
}));

// Mock shared utils
jest.mock("@/shared/str", () => ({
  parseLedgerId: jest.fn(),
  base64UrlDecode: jest.fn((s: string) => s),
}));

describe("setLedgerEditorHandler", () => {
  let router: Router;
  let mockServices: {
    database: {
      db: any;
      models: {
        jwt: { verify: jest.Mock };
        magicLinkToken: { regenerateToken: jest.Mock };
        user: { getById: jest.Mock };
      };
    };
  };
  let mockConfig: AppConfig;
  let mockCtx: Router.RouterContext;
  let getTokenFromCtx: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock router
    router = new Router();
    router.get = jest.fn();

    // Mock services
    mockServices = {
      database: {
        db: {} as any,
        models: {
          jwt: { verify: jest.fn() },
          magicLinkToken: { regenerateToken: jest.fn() },
          user: { getById: jest.fn() },
        },
      },
    };

    // Mock config
    mockConfig = {
      dashboard: {
        url: "https://dashboard.example.com",
      },
    } as unknown as AppConfig;

    // Mock context
    mockCtx = {
      query: {},
      request: {
        href: "https://example.com/ledger/editor/",
      },
      redirect: jest.fn(),
      throw: jest.fn().mockImplementation((status: number, message: string) => {
        const error: Error & { status?: number } = new Error(message);
        error.status = status;
        throw error;
      }),
    } as unknown as Router.RouterContext;

    // Get the mocked function
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    getTokenFromCtx = require("@/features/auth/utils/auth").getTokenFromCtx;
  });

  it("should register GET /ledger/editor/ route", () => {
    setV1CompatRedirectRoutes(
      router,
      mockServices as unknown as AppLayers,
      mockConfig,
    );

    expect(router.get).toHaveBeenCalledWith(
      "/ledger/editor/",
      expect.any(Function),
    );
  });

  describe("GET /ledger/editor/ handler", () => {
    let routeHandler: Router.Middleware;

    beforeEach(() => {
      setV1CompatRedirectRoutes(
        router,
        mockServices as unknown as AppLayers,
        mockConfig,
      );
      // Get the handler function from the router.get mock call
      const getCalls = (router.get as jest.Mock).mock.calls;
      const editorRoute = getCalls.find(
        (call) => call[0] === "/ledger/editor/",
      );
      routeHandler = editorRoute[1];
    });

    it("should redirect to dashboard with one-time token when token is valid", async () => {
      const token = "valid-jwt-token";
      const userId = "user123";
      const oneTimeToken = { id: "onetime123" };

      getTokenFromCtx.mockReturnValue(token);
      mockServices.database.models.jwt.verify.mockResolvedValue(userId);
      mockServices.database.models.magicLinkToken.regenerateToken.mockResolvedValue(
        oneTimeToken,
      );

      await routeHandler(mockCtx, async () => {});

      expect(getTokenFromCtx).toHaveBeenCalledWith(mockCtx);
      expect(mockServices.database.models.jwt.verify).toHaveBeenCalledWith(
        expect.any(Object),
        token,
      );
      expect(
        mockServices.database.models.magicLinkToken.regenerateToken,
      ).toHaveBeenCalledWith(userId);
      expect(mockCtx.redirect).toHaveBeenCalledWith(
        "https://dashboard.example.com/auth/callback?oneTimeToken=onetime123",
      );
    });

    it("should throw 400 error when token not found", async () => {
      getTokenFromCtx.mockReturnValue(null);

      await expect(routeHandler(mockCtx, async () => {})).rejects.toThrow(
        "token not found",
      );

      expect(mockServices.database.models.jwt.verify).not.toHaveBeenCalled();
      expect(
        mockServices.database.models.magicLinkToken.regenerateToken,
      ).not.toHaveBeenCalled();
      expect(mockCtx.redirect).not.toHaveBeenCalled();
    });

    it("should throw 400 error when token is undefined", async () => {
      getTokenFromCtx.mockReturnValue(undefined);

      await expect(routeHandler(mockCtx, async () => {})).rejects.toThrow(
        "token not found",
      );

      expect(mockServices.database.models.jwt.verify).not.toHaveBeenCalled();
      expect(
        mockServices.database.models.magicLinkToken.regenerateToken,
      ).not.toHaveBeenCalled();
      expect(mockCtx.redirect).not.toHaveBeenCalled();
    });

    it("should throw 400 error when token is empty string", async () => {
      getTokenFromCtx.mockReturnValue("");

      await expect(routeHandler(mockCtx, async () => {})).rejects.toThrow(
        "token not found",
      );

      expect(mockServices.database.models.jwt.verify).not.toHaveBeenCalled();
      expect(
        mockServices.database.models.magicLinkToken.regenerateToken,
      ).not.toHaveBeenCalled();
      expect(mockCtx.redirect).not.toHaveBeenCalled();
    });

    it("should preserve lang and theme query parameters in redirect URL", async () => {
      const token = "valid-jwt-token";
      const userId = "user123";
      const oneTimeToken = { id: "onetime123" };

      mockCtx.request.href =
        "https://example.com/ledger/editor/?lang=zh&theme=dark";

      getTokenFromCtx.mockReturnValue(token);
      mockServices.database.models.jwt.verify.mockResolvedValue(userId);
      mockServices.database.models.magicLinkToken.regenerateToken.mockResolvedValue(
        oneTimeToken,
      );

      await routeHandler(mockCtx, async () => {});

      expect(mockCtx.redirect).toHaveBeenCalledWith(
        "https://dashboard.example.com/auth/callback?oneTimeToken=onetime123&lang=zh&theme=dark",
      );
    });

    it("should preserve only lang when theme is not present", async () => {
      const token = "valid-jwt-token";
      const userId = "user123";
      const oneTimeToken = { id: "onetime123" };

      mockCtx.request.href = "https://example.com/ledger/editor/?lang=en";

      getTokenFromCtx.mockReturnValue(token);
      mockServices.database.models.jwt.verify.mockResolvedValue(userId);
      mockServices.database.models.magicLinkToken.regenerateToken.mockResolvedValue(
        oneTimeToken,
      );

      await routeHandler(mockCtx, async () => {});

      expect(mockCtx.redirect).toHaveBeenCalledWith(
        "https://dashboard.example.com/auth/callback?oneTimeToken=onetime123&lang=en",
      );
    });

    describe("with ledgerId parameter", () => {
      const parseLedgerId = jest.requireMock("@/shared/str").parseLedgerId;

      it("should redirect to specific ledger editor when valid ledgerId is provided", async () => {
        const token = "valid-jwt-token";
        const userId = "user123";
        const ledgerId = "base64encodedid";
        const oneTimeToken = { id: "onetime123" };
        const user = { _id: userId, username: "testuser" };

        mockCtx.query = { ledgerId };
        getTokenFromCtx.mockReturnValue(token);
        mockServices.database.models.jwt.verify.mockResolvedValue(userId);
        mockServices.database.models.user.getById.mockResolvedValue(user);
        parseLedgerId.mockReturnValue({
          ledgerOwner: "testuser",
          ledgerName: "my-ledger",
        });
        mockServices.database.models.magicLinkToken.regenerateToken.mockResolvedValue(
          oneTimeToken,
        );

        await routeHandler(mockCtx, async () => {});

        expect(parseLedgerId).toHaveBeenCalledWith(ledgerId);
        expect(mockServices.database.models.user.getById).toHaveBeenCalledWith(
          expect.any(Object),
          userId,
        );
        expect(mockCtx.redirect).toHaveBeenCalledWith(
          "https://dashboard.example.com/auth/callback?oneTimeToken=onetime123&next=%2Fledger%2Ftestuser%2Fmy-ledger%2Ffiles%2Fcontent",
        );
      });

      it("should preserve query params when redirecting with ledgerId", async () => {
        const token = "valid-jwt-token";
        const userId = "user123";
        const ledgerId = "base64encodedid";
        const oneTimeToken = { id: "onetime123" };
        const user = { _id: userId, username: "testuser" };

        mockCtx.query = { ledgerId };
        mockCtx.request.href =
          "https://example.com/ledger/editor/?ledgerId=abc&lang=en&theme=light";

        getTokenFromCtx.mockReturnValue(token);
        mockServices.database.models.jwt.verify.mockResolvedValue(userId);
        mockServices.database.models.user.getById.mockResolvedValue(user);
        parseLedgerId.mockReturnValue({
          ledgerOwner: "testuser",
          ledgerName: "my-ledger",
        });
        mockServices.database.models.magicLinkToken.regenerateToken.mockResolvedValue(
          oneTimeToken,
        );

        await routeHandler(mockCtx, async () => {});

        expect(mockCtx.redirect).toHaveBeenCalledWith(
          "https://dashboard.example.com/auth/callback?oneTimeToken=onetime123&next=%2Fledger%2Ftestuser%2Fmy-ledger%2Ffiles%2Fcontent&lang=en&theme=light",
        );
      });

      it("should throw 401 error when user not found", async () => {
        const token = "valid-jwt-token";
        const userId = "user123";
        const ledgerId = "base64encodedid";

        mockCtx.query = { ledgerId };
        getTokenFromCtx.mockReturnValue(token);
        mockServices.database.models.jwt.verify.mockResolvedValue(userId);
        mockServices.database.models.user.getById.mockResolvedValue(null);

        await expect(routeHandler(mockCtx, async () => {})).rejects.toThrow(
          "User not found",
        );

        expect(mockServices.database.models.user.getById).toHaveBeenCalledWith(
          expect.any(Object),
          userId,
        );
        expect(mockCtx.redirect).not.toHaveBeenCalled();
      });

      it("should throw 400 error when ledgerId format is invalid", async () => {
        const token = "valid-jwt-token";
        const userId = "user123";
        const ledgerId = "invalid";
        const user = { _id: userId, username: "testuser" };

        mockCtx.query = { ledgerId };
        getTokenFromCtx.mockReturnValue(token);
        mockServices.database.models.jwt.verify.mockResolvedValue(userId);
        mockServices.database.models.user.getById.mockResolvedValue(user);
        parseLedgerId.mockImplementation(() => {
          throw new Error("Invalid ledgerId");
        });

        await expect(routeHandler(mockCtx, async () => {})).rejects.toThrow(
          "Invalid ledgerId format",
        );

        expect(mockCtx.redirect).not.toHaveBeenCalled();
      });

      it("should throw 400 error when ledgerId cannot be decoded", async () => {
        const token = "valid-jwt-token";
        const userId = "user123";
        const ledgerId = "cantdecode";
        const user = { _id: userId, username: "testuser" };

        mockCtx.query = { ledgerId };
        getTokenFromCtx.mockReturnValue(token);
        mockServices.database.models.jwt.verify.mockResolvedValue(userId);
        mockServices.database.models.user.getById.mockResolvedValue(user);
        parseLedgerId.mockImplementation(() => {
          throw new Error("Failed to decode base64");
        });

        await expect(routeHandler(mockCtx, async () => {})).rejects.toThrow(
          "Invalid ledgerId format",
        );

        expect(mockCtx.redirect).not.toHaveBeenCalled();
      });

      it("should throw 500 error for unexpected errors during ledgerId processing", async () => {
        const token = "valid-jwt-token";
        const userId = "user123";
        const ledgerId = "base64encodedid";
        const user = { _id: userId, username: "testuser" };

        mockCtx.query = { ledgerId };
        getTokenFromCtx.mockReturnValue(token);
        mockServices.database.models.jwt.verify.mockResolvedValue(userId);
        mockServices.database.models.user.getById.mockResolvedValue(user);
        parseLedgerId.mockImplementation(() => {
          throw new Error("Unexpected database error");
        });

        await expect(routeHandler(mockCtx, async () => {})).rejects.toThrow(
          "Failed to process request: Unexpected database error",
        );

        expect(mockCtx.redirect).not.toHaveBeenCalled();
      });
    });
  });
});
