import "reflect-metadata";
import { GraphQLError } from "graphql";
import { apolloMetricsPlugin } from "../apollo-plugin";
import {
  graphqlQueryDuration,
  graphqlQueryTotal,
  graphqlQueryInProgress,
} from "../metrics-definitions";
import { NotFoundError } from "@/shared/errors";

// Mock the metrics
jest.mock("../metrics-definitions", () => ({
  graphqlQueryDuration: {
    observe: jest.fn(),
  },
  graphqlQueryTotal: {
    inc: jest.fn(),
  },
  graphqlQueryInProgress: {
    inc: jest.fn(),
    dec: jest.fn(),
  },
}));

describe("apolloMetricsPlugin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("requestDidStart", () => {
    it("should return request lifecycle handlers", async () => {
      const handlers = await apolloMetricsPlugin.requestDidStart!({} as never);

      expect(handlers).toBeDefined();
      expect(handlers?.didResolveOperation).toBeDefined();
      expect(handlers?.willSendResponse).toBeDefined();
      expect(handlers?.didEncounterErrors).toBeDefined();
    });
  });

  describe("didResolveOperation", () => {
    it("should increment in-progress queries and store metrics in context", async () => {
      const handlers = await apolloMetricsPlugin.requestDidStart!({} as never);
      const mockContext = {};
      const requestContext = {
        request: { operationName: "GetUser" },
        operation: { operation: "query" },
        contextValue: mockContext,
      };

      await handlers?.didResolveOperation!(requestContext as never);

      expect(graphqlQueryInProgress.inc).toHaveBeenCalled();
      expect(
        (mockContext as Record<string, string | number>)._metricsOperationName,
      ).toBe("GetUser");
      expect(
        (mockContext as Record<string, string | number>)._metricsOperationType,
      ).toBe("query");
      expect(
        (mockContext as Record<string, string | number>)._metricsStartTime,
      ).toBeDefined();
    });

    it("should use Anonymous for missing operation name", async () => {
      const handlers = await apolloMetricsPlugin.requestDidStart!({} as never);
      const mockContext = {};
      const requestContext = {
        request: {},
        operation: { operation: "mutation" },
        contextValue: mockContext,
      };

      await handlers?.didResolveOperation!(requestContext as never);

      expect(
        (mockContext as Record<string, string | number>)._metricsOperationName,
      ).toBe("Anonymous");
    });

    it("should use unknown for missing operation type", async () => {
      const handlers = await apolloMetricsPlugin.requestDidStart!({} as never);
      const mockContext = {};
      const requestContext = {
        request: { operationName: "CreateUser" },
        operation: undefined,
        contextValue: mockContext,
      };

      await handlers?.didResolveOperation!(requestContext as never);

      expect(
        (mockContext as Record<string, string | number>)._metricsOperationType,
      ).toBe("unknown");
    });
  });

  describe("willSendResponse", () => {
    it("should record metrics for successful request", async () => {
      const handlers = await apolloMetricsPlugin.requestDidStart!({} as never);
      const mockContext = {
        _metricsStartTime: Date.now() - 100,
        _metricsOperationName: "GetUser",
        _metricsOperationType: "query",
      };
      const requestContext = {
        contextValue: mockContext,
        response: { http: { status: 200 } },
      };

      await handlers?.willSendResponse!(requestContext as never);

      expect(graphqlQueryDuration.observe).toHaveBeenCalledWith(
        { operation_name: "GetUser" },
        expect.any(Number),
      );
      expect(graphqlQueryTotal.inc).toHaveBeenCalledWith({
        operation_name: "GetUser",
        status: "success",
      });
      expect(graphqlQueryInProgress.dec).toHaveBeenCalled();
    });

    it("should record metrics even when response has no status", async () => {
      const handlers = await apolloMetricsPlugin.requestDidStart!({} as never);
      const mockContext = {
        _metricsStartTime: Date.now() - 100,
        _metricsOperationName: "GetUser",
        _metricsOperationType: "query",
      };
      const requestContext = {
        contextValue: mockContext,
        response: {},
      };

      await handlers?.willSendResponse!(requestContext as never);

      expect(graphqlQueryTotal.inc).toHaveBeenCalledWith({
        operation_name: "GetUser",
        status: "success",
      });
    });

    it("should use Anonymous for missing operation name", async () => {
      const handlers = await apolloMetricsPlugin.requestDidStart!({} as never);
      const mockContext = {
        _metricsStartTime: Date.now() - 100,
      };
      const requestContext = {
        contextValue: mockContext,
        response: { http: { status: 200 } },
      };

      await handlers?.willSendResponse!(requestContext as never);

      expect(graphqlQueryTotal.inc).toHaveBeenCalledWith({
        operation_name: "Anonymous",
        status: "success",
      });
    });

    it("should not record duration if start time is missing", async () => {
      const handlers = await apolloMetricsPlugin.requestDidStart!({} as never);
      const mockContext = {};
      const requestContext = {
        contextValue: mockContext,
        response: { http: { status: 200 } },
      };

      await handlers?.willSendResponse!(requestContext as never);

      expect(graphqlQueryDuration.observe).not.toHaveBeenCalled();
      expect(graphqlQueryTotal.inc).not.toHaveBeenCalled();
      expect(graphqlQueryInProgress.dec).toHaveBeenCalled();
    });
  });

  describe("didEncounterErrors", () => {
    it("should not double-count errors (metrics recorded in willSendResponse)", async () => {
      const handlers = await apolloMetricsPlugin.requestDidStart!({} as never);
      const mockContext = {
        _metricsStartTime: Date.now() - 100,
        _metricsOperationName: "GetUser",
        _metricsOperationType: "query",
      };
      const error1 = new Error("Error 1");
      const error2 = new Error("Error 2");
      const requestContext = {
        contextValue: mockContext,
        errors: [error1, error2],
      };

      await handlers?.didEncounterErrors!(requestContext as never);

      // didEncounterErrors should NOT record metrics to avoid double-counting
      expect(graphqlQueryDuration.observe).not.toHaveBeenCalled();
      expect(graphqlQueryTotal.inc).not.toHaveBeenCalled();
      expect(graphqlQueryInProgress.dec).not.toHaveBeenCalled();
    });
  });

  describe("error classification in willSendResponse", () => {
    it("should return error category from a wrapped DomainError", async () => {
      const handlers = await apolloMetricsPlugin.requestDidStart!({} as never);
      const mockContext = {
        _metricsStartTime: Date.now() - 100,
        _metricsOperationName: "GetLedger",
      };
      // Apollo wraps a thrown DomainError in a GraphQLError (as originalError).
      const notFoundError = new GraphQLError("Ledger not found", {
        originalError: new NotFoundError("Ledger", "123"),
      });
      const requestContext = {
        contextValue: mockContext,
        response: {},
        errors: [notFoundError],
      };

      await handlers?.willSendResponse!(requestContext as never);

      expect(graphqlQueryTotal.inc).toHaveBeenCalledWith({
        operation_name: "GetLedger",
        status: "NOT_FOUND",
      });
    });

    it("should return BAD_USER_INPUT code directly", async () => {
      const handlers = await apolloMetricsPlugin.requestDidStart!({} as never);
      const mockContext = {
        _metricsStartTime: Date.now() - 100,
        _metricsOperationName: "CreateUser",
      };
      const validationError = new Error("Validation failed");
      (validationError as any).extensions = { code: "BAD_USER_INPUT" };
      const requestContext = {
        contextValue: mockContext,
        response: {},
        errors: [validationError],
      };

      await handlers?.willSendResponse!(requestContext as never);

      expect(graphqlQueryTotal.inc).toHaveBeenCalledWith({
        operation_name: "CreateUser",
        status: "BAD_USER_INPUT",
      });
    });

    it("should return UNAUTHENTICATED code directly", async () => {
      const handlers = await apolloMetricsPlugin.requestDidStart!({} as never);
      const mockContext = {
        _metricsStartTime: Date.now() - 100,
        _metricsOperationName: "GetSecretData",
      };
      const authError = new Error("Not authenticated");
      (authError as any).extensions = { code: "UNAUTHENTICATED" };
      const requestContext = {
        contextValue: mockContext,
        response: {},
        errors: [authError],
      };

      await handlers?.willSendResponse!(requestContext as never);

      expect(graphqlQueryTotal.inc).toHaveBeenCalledWith({
        operation_name: "GetSecretData",
        status: "UNAUTHENTICATED",
      });
    });

    it("should return FORBIDDEN code directly", async () => {
      const handlers = await apolloMetricsPlugin.requestDidStart!({} as never);
      const mockContext = {
        _metricsStartTime: Date.now() - 100,
        _metricsOperationName: "DeleteUser",
      };
      const authzError = new Error("Forbidden");
      (authzError as any).extensions = { code: "FORBIDDEN" };
      const requestContext = {
        contextValue: mockContext,
        response: {},
        errors: [authzError],
      };

      await handlers?.willSendResponse!(requestContext as never);

      expect(graphqlQueryTotal.inc).toHaveBeenCalledWith({
        operation_name: "DeleteUser",
        status: "FORBIDDEN",
      });
    });

    it("should return INTERNAL_SERVER_ERROR code directly", async () => {
      const handlers = await apolloMetricsPlugin.requestDidStart!({} as never);
      const mockContext = {
        _metricsStartTime: Date.now() - 100,
        _metricsOperationName: "GetUser",
      };
      const serverError = new Error("Internal error");
      (serverError as any).extensions = { code: "INTERNAL_SERVER_ERROR" };
      const requestContext = {
        contextValue: mockContext,
        response: {},
        errors: [serverError],
      };

      await handlers?.willSendResponse!(requestContext as never);

      expect(graphqlQueryTotal.inc).toHaveBeenCalledWith({
        operation_name: "GetUser",
        status: "INTERNAL_SERVER_ERROR",
      });
    });

    it("should return unknown_error when no error code is present", async () => {
      const handlers = await apolloMetricsPlugin.requestDidStart!({} as never);
      const mockContext = {
        _metricsStartTime: Date.now() - 100,
        _metricsOperationName: "GetUser",
      };
      const unknownError = new Error("Something went wrong");
      const requestContext = {
        contextValue: mockContext,
        response: {},
        errors: [unknownError],
      };

      await handlers?.willSendResponse!(requestContext as never);

      expect(graphqlQueryTotal.inc).toHaveBeenCalledWith({
        operation_name: "GetUser",
        status: "unknown_error",
      });
    });
  });
});
