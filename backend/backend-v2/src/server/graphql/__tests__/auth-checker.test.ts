import "reflect-metadata";
import { UnauthenticatedError } from "@/shared/errors";
import { customAuthChecker } from "../auth-checker";
import { IContext } from "../context";
import { GraphQLLoaders } from "../loaders";

// Type assertion to work around type-graphql's union type issue
const authChecker = customAuthChecker as (data: {
  context: IContext;
}) => boolean;

describe("customAuthChecker", () => {
  let mockContext: IContext;

  beforeEach(() => {
    mockContext = {
      userId: "",
      token: undefined,
      reqHeaders: {},
      platform: "web",
      config: {} as IContext["config"],
      koaCtx: {} as any,
      loaders: {} as GraphQLLoaders,
      getCurrentUserId: jest.fn(),
      getCurrentUser: jest.fn(),
      getCurrentIdentity: jest.fn(),
    };
  });

  describe("authentication", () => {
    it("should return true when userId is present", () => {
      mockContext.userId = "user-123";

      const result = authChecker({ context: mockContext });

      expect(result).toBe(true);
    });

    it("should throw AuthenticationError when userId is empty string", () => {
      mockContext.userId = "";

      expect(() => {
        authChecker({ context: mockContext });
      }).toThrow(UnauthenticatedError);
    });

    it("should throw AuthenticationError with correct message", () => {
      mockContext.userId = "";

      expect(() => {
        authChecker({ context: mockContext });
      }).toThrow("Access denied! Please login to continue!");
    });

    it("should not throw when userId is valid", () => {
      mockContext.userId = "valid-user-id";

      expect(() => {
        authChecker({ context: mockContext });
      }).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle context with all fields populated", () => {
      mockContext = {
        userId: "user-123",
        token: "jwt-token",
        reqHeaders: { authorization: "Bearer token" },
        platform: "web",
        config: {} as IContext["config"],
        koaCtx: {} as any,
        loaders: {} as GraphQLLoaders,
        getCurrentUserId: jest.fn(),
        getCurrentUser: jest.fn(),
        getCurrentIdentity: jest.fn(),
      };

      const result = authChecker({ context: mockContext });

      expect(result).toBe(true);
    });

    it("should only check userId field, ignoring other context fields", () => {
      mockContext = {
        userId: "user-123",
        token: undefined,
        reqHeaders: {},
        platform: "web",
        config: {} as IContext["config"],
        koaCtx: {} as any,
        loaders: {} as GraphQLLoaders,
        getCurrentUserId: jest.fn(),
        getCurrentUser: jest.fn(),
        getCurrentIdentity: jest.fn(),
      };

      const result = authChecker({ context: mockContext });

      expect(result).toBe(true);
    });
  });
});
