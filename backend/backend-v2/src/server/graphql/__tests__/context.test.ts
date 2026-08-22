import "reflect-metadata";
import { IContext, createContext } from "../context";
import { FavaApiContext } from "@/foundation/types";
import type { DatabaseLayer } from "@/foundation/composition";
import { AppConfig } from "@/config/config";
import { UnauthenticatedError } from "@/shared/errors";
import { GraphQLLoaders } from "../loaders";

// Mock auth utils
jest.mock("@/features/auth/utils/auth", () => ({
  getTokenFromCtx: jest.fn(),
}));

// Mock fava client creation
jest.mock("@/foundation/fava", () => ({
  createFavaApi: jest.fn(),
}));

describe("Context Types", () => {
  describe("IContext", () => {
    it("should accept valid context with all required fields", () => {
      const context: IContext = {
        userId: "user-123",
        token: "jwt-token",
        reqHeaders: { authorization: "Bearer token" },
        platform: "web",
        config: {} as AppConfig,
        koaCtx: {} as any,
        loaders: {} as GraphQLLoaders,
        getCurrentUserId: jest.fn(),
        getCurrentUser: jest.fn(),
        getCurrentIdentity: jest.fn(),
      };

      expect(context.userId).toBe("user-123");
      expect(context.token).toBe("jwt-token");
      expect(context.reqHeaders).toEqual({ authorization: "Bearer token" });
      expect(context.config).toBeDefined();
    });

    it("should accept context without optional token field", () => {
      const context: IContext = {
        userId: "user-123",
        reqHeaders: {},
        platform: "web",
        config: {} as AppConfig,
        koaCtx: {} as any,
        loaders: {} as GraphQLLoaders,
        getCurrentUserId: jest.fn(),
        getCurrentUser: jest.fn(),
        getCurrentIdentity: jest.fn(),
      };

      expect(context.token).toBeUndefined();
      expect(context.userId).toBe("user-123");
    });

    it("should accept empty userId", () => {
      const context: IContext = {
        userId: "",
        reqHeaders: {},
        platform: "web",
        config: {} as AppConfig,
        koaCtx: {} as any,
        loaders: {} as GraphQLLoaders,
        getCurrentUserId: jest.fn(),
        getCurrentUser: jest.fn(),
        getCurrentIdentity: jest.fn(),
      };

      expect(context.userId).toBe("");
    });

    it("should accept empty reqHeaders", () => {
      const context: IContext = {
        userId: "user-123",
        reqHeaders: {},
        platform: "web",
        config: {} as AppConfig,
        koaCtx: {} as any,
        loaders: {} as GraphQLLoaders,
        getCurrentUserId: jest.fn(),
        getCurrentUser: jest.fn(),
        getCurrentIdentity: jest.fn(),
      };

      expect(context.reqHeaders).toEqual({});
    });

    it("should accept reqHeaders with multiple entries", () => {
      const headers = {
        authorization: "Bearer token",
        "content-type": "application/json",
        "x-custom-header": "value",
      };

      const context: IContext = {
        userId: "user-123",
        reqHeaders: headers,
        platform: "web",
        config: {} as AppConfig,
        koaCtx: {} as any,
        loaders: {} as GraphQLLoaders,
        getCurrentUserId: jest.fn(),
        getCurrentUser: jest.fn(),
        getCurrentIdentity: jest.fn(),
      };

      expect(context.reqHeaders).toEqual(headers);
    });
  });

  describe("FavaApiContext", () => {
    it("should accept valid FavaApiContext", () => {
      const favaContext: FavaApiContext = {
        favaApiClient: {} as FavaApiContext["favaApiClient"],
        favaUser: {
          username: "testuser",
          password: "testpass",
        },
      };

      expect(favaContext.favaApiClient).toBeDefined();
      expect(favaContext.favaUser.username).toBe("testuser");
      expect(favaContext.favaUser.password).toBe("testpass");
    });

    it("should have correct favaUser structure", () => {
      const favaContext: FavaApiContext = {
        favaApiClient: {} as FavaApiContext["favaApiClient"],
        favaUser: {
          username: "user@example.com",
          password: "securepass",
        },
      };

      expect(typeof favaContext.favaUser.username).toBe("string");
      expect(typeof favaContext.favaUser.password).toBe("string");
    });
  });

  describe("Context integration", () => {
    it("should support full context structure", () => {
      const context: IContext = {
        userId: "user-123",
        token: "jwt-token",
        reqHeaders: {
          authorization: "Bearer jwt-token",
        },
        platform: "web",
        config: {
          favaApi: {
            baseUrl: "http://localhost:5000",
          },
        } as unknown as AppConfig,
        koaCtx: {} as any,
        loaders: {} as GraphQLLoaders,
        getCurrentUserId: jest.fn(),
        getCurrentUser: jest.fn(),
        getCurrentIdentity: jest.fn(),
      };

      // Verify context structure
      expect(context.userId).toBeTruthy();
      expect(context.token).toBeTruthy();
      expect(context.config.favaApi.baseUrl).toBe("http://localhost:5000");
    });
  });

  describe("createContext", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getTokenFromCtx } = require("@/features/auth/utils/auth");

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should create context with authenticated user", async () => {
      const mockToken = "valid-jwt-token";
      const mockUserId = "user-123";

      getTokenFromCtx.mockReturnValue(mockToken);

      const mockService = {
        db: {} as any,
        models: {
          jwt: {
            verify: jest.fn().mockResolvedValue(mockUserId),
          },
          user: {
            getById: jest.fn(),
            updateLastSeenAt: jest.fn().mockResolvedValue(undefined),
          },
        },
      } as unknown as DatabaseLayer;

      const mockConfig = {
        favaApi: {
          baseUrl: "http://localhost:5000",
        },
      } as unknown as AppConfig;

      const mockCtx = {
        headers: {
          authorization: `Bearer ${mockToken}`,
          "content-type": "application/json",
        },
      };

      const context = await createContext(mockCtx, mockService, mockConfig);

      expect(context.userId).toBe(mockUserId);
      expect(context.token).toBe(mockToken);
      expect(context.config).toBe(mockConfig);
      expect(context.reqHeaders).toEqual({
        authorization: `Bearer ${mockToken}`,
        "content-type": "application/json",
      });
    });

    it("should create context with empty userId when no token", async () => {
      getTokenFromCtx.mockReturnValue(undefined);

      const mockService = {
        db: {} as any,
        models: {
          jwt: {
            verify: jest.fn(),
          },
          user: {
            getById: jest.fn(),
          },
        },
      } as unknown as DatabaseLayer;

      const mockConfig = {} as AppConfig;

      const mockCtx = {
        headers: {},
      };

      const context = await createContext(mockCtx, mockService, mockConfig);

      expect(context.userId).toBeUndefined();
      expect(context.token).toBeUndefined();
      expect(mockService.models.jwt.verify).not.toHaveBeenCalled();
    });

    it("should handle array headers by taking first value", async () => {
      getTokenFromCtx.mockReturnValue(undefined);

      const mockService = {
        db: {} as any,
        models: {
          jwt: {
            verify: jest.fn(),
          },
        },
      } as unknown as DatabaseLayer;

      const mockConfig = {} as AppConfig;

      const mockCtx = {
        headers: {
          "x-custom-header": ["value1", "value2"],
          "x-single-header": "single-value",
        },
      };

      const context = await createContext(mockCtx, mockService, mockConfig);

      expect(context.reqHeaders).toEqual({
        "x-custom-header": "value1",
        "x-single-header": "single-value",
      });
    });

    it("should exclude undefined header values", async () => {
      getTokenFromCtx.mockReturnValue(undefined);

      const mockService = {
        db: {} as any,
        models: {
          jwt: {
            verify: jest.fn(),
          },
        },
      } as unknown as DatabaseLayer;

      const mockConfig = {} as AppConfig;

      const mockCtx = {
        headers: {
          "defined-header": "value",
          "undefined-header": undefined,
        },
      };

      const context = await createContext(mockCtx, mockService, mockConfig);

      expect(context.reqHeaders).toEqual({
        "defined-header": "value",
      });
      expect(context.reqHeaders).not.toHaveProperty("undefined-header");
    });

    describe("platform", () => {
      it("defaults to web when x-app-id is absent", async () => {
        getTokenFromCtx.mockReturnValue(undefined);

        const mockService = {
          db: {} as any,
          models: { jwt: { verify: jest.fn() } },
        } as unknown as DatabaseLayer;

        const mockCtx = { headers: {} };

        const context = await createContext(
          mockCtx,
          mockService,
          {} as AppConfig,
        );

        expect(context.platform).toBe("web");
      });

      it("defaults to web for an unrecognized x-app-id value", async () => {
        getTokenFromCtx.mockReturnValue(undefined);

        const mockService = {
          db: {} as any,
          models: { jwt: { verify: jest.fn() } },
        } as unknown as DatabaseLayer;

        const mockCtx = { headers: { "x-app-id": "some-other-app" } };

        const context = await createContext(
          mockCtx,
          mockService,
          {} as AppConfig,
        );

        expect(context.platform).toBe("web");
      });

      it("is mobile when x-app-id is mobile-beancount", async () => {
        getTokenFromCtx.mockReturnValue(undefined);

        const mockService = {
          db: {} as any,
          models: { jwt: { verify: jest.fn() } },
        } as unknown as DatabaseLayer;

        const mockCtx = { headers: { "x-app-id": "mobile-beancount" } };

        const context = await createContext(
          mockCtx,
          mockService,
          {} as AppConfig,
        );

        expect(context.platform).toBe("mobile");
      });

      it("is mobile when x-app-id is beancount-mobile", async () => {
        getTokenFromCtx.mockReturnValue(undefined);

        const mockService = {
          db: {} as any,
          models: { jwt: { verify: jest.fn() } },
        } as unknown as DatabaseLayer;

        const mockCtx = { headers: { "x-app-id": "beancount-mobile" } };

        const context = await createContext(
          mockCtx,
          mockService,
          {} as AppConfig,
        );

        expect(context.platform).toBe("mobile");
      });
    });

    describe("getCurrentUserId", () => {
      it("should return userId when user is authenticated", async () => {
        const mockToken = "valid-jwt-token";
        const mockUserId = "user-123";

        getTokenFromCtx.mockReturnValue(mockToken);

        const mockService = {
          db: {} as any,
          models: {
            jwt: {
              verify: jest.fn().mockResolvedValue(mockUserId),
            },
          },
        } as unknown as DatabaseLayer;

        const mockConfig = {} as AppConfig;
        const mockCtx = { headers: {} };

        const context = await createContext(mockCtx, mockService, mockConfig);
        const result = context.getCurrentUserId();

        expect(result).toBe(mockUserId);
      });

      it("should throw AuthenticationError when user is not authenticated", async () => {
        getTokenFromCtx.mockReturnValue(undefined);

        const mockService = {
          db: {} as any,
          models: {
            jwt: {
              verify: jest.fn(),
            },
          },
        } as unknown as DatabaseLayer;

        const mockConfig = {} as AppConfig;
        const mockCtx = { headers: {} };

        const context = await createContext(mockCtx, mockService, mockConfig);

        expect(() => context.getCurrentUserId()).toThrow(UnauthenticatedError);
        expect(() => context.getCurrentUserId()).toThrow(
          "Authentication required",
        );
      });
    });
  });
});
