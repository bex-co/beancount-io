import "reflect-metadata";
import { GraphQLError } from "graphql";
import {
  UnauthenticatedError,
  ForbiddenError,
  BadUserInputError,
  NotFoundError,
  InternalServerError,
} from "@/shared/errors";

// Create mock logger that will be returned by child()
const mockDebug = jest.fn();
const mockInfo = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();

const mockChildLogger = {
  debug: mockDebug,
  info: mockInfo,
  warn: mockWarn,
  error: mockError,
};

// Mock the logger module - child() must return a valid logger immediately
jest.mock("@/shared/logger", () => ({
  logger: {
    child: jest.fn(() => mockChildLogger),
  },
}));

// Import after mocking to ensure the mock is used
import { errorLoggingPlugin } from "../plugins/error-logging";

interface RequestContextType {
  errors?: readonly GraphQLError[];
  contextValue: Record<string, unknown>;
  operation?: {
    operation: string;
  };
  request: {
    operationName?: string;
  };
}

type DidEncounterErrorsHandler = (
  requestContext: RequestContextType,
) => Promise<void>;

describe("errorLoggingPlugin", () => {
  let didEncounterErrors: DidEncounterErrorsHandler;
  let mockLogger: typeof mockChildLogger;

  beforeEach(async () => {
    // Clear all mocks before each test
    mockDebug.mockClear();
    mockInfo.mockClear();
    mockWarn.mockClear();
    mockError.mockClear();

    // Reference the shared mock logger
    mockLogger = mockChildLogger;

    const requestDidStartResult = await errorLoggingPlugin.requestDidStart?.(
      {} as Parameters<
        NonNullable<typeof errorLoggingPlugin.requestDidStart>
      >[0],
    );
    didEncounterErrors =
      requestDidStartResult?.didEncounterErrors as DidEncounterErrorsHandler;
  });

  describe("requestDidStart", () => {
    it("should return an object with didEncounterErrors handler", async () => {
      expect(didEncounterErrors).toBeDefined();
      expect(typeof didEncounterErrors).toBe("function");
    });
  });

  describe("didEncounterErrors", () => {
    // Domain errors reach the plugin wrapped in a GraphQLError (as originalError),
    // exactly as Apollo wraps a non-GraphQLError thrown from a resolver. Auto-wrap
    // any plain Error so tests can pass DomainErrors directly.
    const createRequestContext = (
      errors?: readonly (GraphQLError | Error)[],
    ): RequestContextType => ({
      errors: errors?.map((e) =>
        e instanceof GraphQLError
          ? e
          : new GraphQLError(e.message, { originalError: e }),
      ),
      contextValue: {},
      operation: {
        operation: "query",
      },
      request: {
        operationName: "testOperation",
      },
    });

    describe("when there are no errors", () => {
      it("should not log anything when errors array is empty", async () => {
        const requestContext = createRequestContext([]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.debug).not.toHaveBeenCalled();
        expect(mockLogger.info).not.toHaveBeenCalled();
        expect(mockLogger.error).not.toHaveBeenCalled();
      });

      it("should not log anything when errors is undefined", async () => {
        const requestContext = createRequestContext(undefined);

        await didEncounterErrors(requestContext);

        expect(mockLogger.debug).not.toHaveBeenCalled();
        expect(mockLogger.info).not.toHaveBeenCalled();
        expect(mockLogger.error).not.toHaveBeenCalled();
      });
    });

    describe("authentication and authorization errors", () => {
      it("should log UNAUTHENTICATED errors at debug level", async () => {
        const error = new UnauthenticatedError();
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          "GraphQL auth error",
          expect.objectContaining({
            message: error.message,
            code: "UNAUTHENTICATED",
          }),
        );
        expect(mockLogger.error).not.toHaveBeenCalled();
      });

      it("should log FORBIDDEN errors at debug level", async () => {
        const error = new ForbiddenError();
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          "GraphQL auth error",
          expect.objectContaining({
            message: error.message,
            code: "FORBIDDEN",
          }),
        );
        expect(mockLogger.error).not.toHaveBeenCalled();
      });
    });

    describe("client errors", () => {
      it("should log BAD_USER_INPUT errors at info level", async () => {
        const error = new BadUserInputError("Invalid input");
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.info).toHaveBeenCalledWith(
          "GraphQL client error",
          expect.objectContaining({
            message: "Invalid input",
            code: "BAD_USER_INPUT",
          }),
        );
        expect(mockLogger.error).not.toHaveBeenCalled();
      });

      it("should log NOT_FOUND errors at info level", async () => {
        const error = new NotFoundError("User", "123");
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.info).toHaveBeenCalledWith(
          "GraphQL client error",
          expect.objectContaining({
            code: "NOT_FOUND",
          }),
        );
        expect(mockLogger.error).not.toHaveBeenCalled();
      });

      it("should log VALIDATION_FAILED errors at info level", async () => {
        const error = new GraphQLError("Validation failed", {
          extensions: { code: "VALIDATION_FAILED" },
        });
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.info).toHaveBeenCalledWith(
          "GraphQL client error",
          expect.objectContaining({
            message: "Validation failed",
            code: "VALIDATION_FAILED",
          }),
        );
        expect(mockLogger.error).not.toHaveBeenCalled();
      });

      it("should log CONFLICT errors at info level", async () => {
        const error = new GraphQLError("Resource conflict", {
          extensions: { code: "CONFLICT" },
        });
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.info).toHaveBeenCalledWith(
          "GraphQL client error",
          expect.objectContaining({
            message: "Resource conflict",
            code: "CONFLICT",
          }),
        );
        expect(mockLogger.error).not.toHaveBeenCalled();
      });

      it("should log RATE_LIMITED errors at info level", async () => {
        const error = new GraphQLError("Rate limit exceeded", {
          extensions: { code: "RATE_LIMITED" },
        });
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.info).toHaveBeenCalledWith(
          "GraphQL client error",
          expect.objectContaining({
            message: "Rate limit exceeded",
            code: "RATE_LIMITED",
          }),
        );
        expect(mockLogger.error).not.toHaveBeenCalled();
      });
    });

    describe("server errors", () => {
      it("should log INTERNAL_SERVER_ERROR at error level", async () => {
        const error = new InternalServerError("Database connection failed");
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.error).toHaveBeenCalledWith(
          "GraphQL server error",
          expect.objectContaining({
            message: "Database connection failed",
            code: "INTERNAL_SERVER_ERROR",
          }),
        );
      });

      it("should log unknown errors at error level", async () => {
        const error = new GraphQLError("Unknown error", {
          extensions: { code: "UNKNOWN_ERROR" },
        });
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.error).toHaveBeenCalledWith(
          "GraphQL server error",
          expect.objectContaining({
            message: "Unknown error",
            code: "UNKNOWN_ERROR",
          }),
        );
      });

      it("should log SERVICE_UNAVAILABLE at error level", async () => {
        const error = new GraphQLError("External service unavailable", {
          extensions: { code: "SERVICE_UNAVAILABLE" },
        });
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.error).toHaveBeenCalledWith(
          "GraphQL server error",
          expect.objectContaining({
            message: "External service unavailable",
            code: "SERVICE_UNAVAILABLE",
          }),
        );
      });

      it("should log RESOURCE_LIMIT_REACHED at error level", async () => {
        const error = new GraphQLError("Subscription limit reached", {
          extensions: { code: "RESOURCE_LIMIT_REACHED" },
        });
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.error).toHaveBeenCalledWith(
          "GraphQL server error",
          expect.objectContaining({
            message: "Subscription limit reached",
            code: "RESOURCE_LIMIT_REACHED",
          }),
        );
      });

      it("should log PREMIUM_REQUIRED at error level", async () => {
        const error = new GraphQLError("Premium subscription required", {
          extensions: { code: "PREMIUM_REQUIRED" },
        });
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.error).toHaveBeenCalledWith(
          "GraphQL server error",
          expect.objectContaining({
            message: "Premium subscription required",
            code: "PREMIUM_REQUIRED",
          }),
        );
      });

      it("should log OPERATION_NOT_ALLOWED at error level", async () => {
        const error = new GraphQLError("Operation not allowed", {
          extensions: { code: "OPERATION_NOT_ALLOWED" },
        });
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.error).toHaveBeenCalledWith(
          "GraphQL server error",
          expect.objectContaining({
            message: "Operation not allowed",
            code: "OPERATION_NOT_ALLOWED",
          }),
        );
      });
    });

    describe("error metadata", () => {
      it("should include operation details in log metadata", async () => {
        const error = new BadUserInputError("Invalid input");
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.info).toHaveBeenCalledWith(
          "GraphQL client error",
          expect.objectContaining({
            operation: "query",
            operationName: "testOperation",
          }),
        );
      });

      it("should include error path if available", async () => {
        const error = new GraphQLError("Field error", {
          path: ["user", "email"],
          extensions: { code: "BAD_USER_INPUT" },
        });
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.info).toHaveBeenCalledWith(
          "GraphQL client error",
          expect.objectContaining({
            path: ["user", "email"],
          }),
        );
      });

      it("should include stacktrace if available in extensions", async () => {
        const error = new GraphQLError("Server error", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
            stacktrace: ["at someFunction", "at anotherFunction"],
          },
        });
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.error).toHaveBeenCalledWith(
          "GraphQL server error",
          expect.objectContaining({
            stacktrace: ["at someFunction", "at anotherFunction"],
          }),
        );
      });

      it("should include originalError message if available", async () => {
        const originalError = new Error("Original error message");
        const error = new GraphQLError("Wrapped error", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
          originalError,
        });
        const requestContext = createRequestContext([error]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.error).toHaveBeenCalledWith(
          "GraphQL server error",
          expect.objectContaining({
            originalError: "Original error message",
          }),
        );
      });
    });

    describe("multiple errors", () => {
      it("should log each error separately", async () => {
        const error1 = new BadUserInputError("Invalid input 1");
        const error2 = new BadUserInputError("Invalid input 2");
        const requestContext = createRequestContext([error1, error2]);

        await didEncounterErrors(requestContext);

        expect(mockLogger.info).toHaveBeenCalledTimes(2);
        expect(mockLogger.info).toHaveBeenNthCalledWith(
          1,
          "GraphQL client error",
          expect.objectContaining({
            message: "Invalid input 1",
          }),
        );
        expect(mockLogger.info).toHaveBeenNthCalledWith(
          2,
          "GraphQL client error",
          expect.objectContaining({
            message: "Invalid input 2",
          }),
        );
      });
    });
  });
});
