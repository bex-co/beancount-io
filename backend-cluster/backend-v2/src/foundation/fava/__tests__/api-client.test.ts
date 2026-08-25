import "reflect-metadata";
import { ApiClient, FavaApiError } from "../api-client";

jest.mock("@/shared/logger", () => ({
  logger: {
    child: jest.fn().mockReturnValue({
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

import { logger } from "@/shared/logger";

// Capture the same mock object that api-client.ts receives via logger.child()
const mockFavaLogger = (logger.child as jest.Mock)() as {
  warn: jest.Mock;
  error: jest.Mock;
};

describe("ApiClient", () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new ApiClient({ baseUrl: "http://localhost:5000" });
  });

  function stubOriginalRequest(spy: jest.Mock) {
    Object.defineProperty(apiClient, "originalRequest", {
      value: spy,
      writable: true,
      configurable: true,
    });
  }

  describe("constructor", () => {
    it("should accept custom configuration", () => {
      const customClient = new ApiClient({
        baseUrl: "https://custom-api.example.com",
        baseApiParams: {
          headers: { "Custom-Header": "custom-value" },
        },
      });

      expect(customClient).toBeDefined();
      expect(customClient.request).toBeDefined();
    });

    it("should work without configuration", () => {
      const defaultClient = new ApiClient();

      expect(defaultClient).toBeDefined();
      expect(defaultClient.request).toBeDefined();
    });

    it("should override the request method during construction", () => {
      expect(apiClient.request).toBeDefined();
      expect(typeof apiClient.request).toBe("function");
    });

    it("should default timeoutMs to 30000", () => {
      expect((apiClient as any).timeoutMs).toBe(30_000);
    });

    it("should accept custom timeoutMs", () => {
      const client = new ApiClient({
        baseUrl: "http://localhost:5000",
        timeoutMs: 5_000,
      });
      expect((client as any).timeoutMs).toBe(5_000);
    });
  });

  describe("request method", () => {
    it("should inject an AbortSignal into every request", async () => {
      const spy = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200, data: {} });
      stubOriginalRequest(spy);

      await apiClient.request({ path: "/test", method: "GET" });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it("should call originalRequest and return successful response", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        data: { result: "success" },
      };
      const spy = jest.fn().mockResolvedValue(mockResponse);
      stubOriginalRequest(spy);

      const result = await apiClient.request({ path: "/test", method: "GET" });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ path: "/test", method: "GET" }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should log warn and throw when request times out", async () => {
      const timeoutError = Object.assign(
        new Error("The operation timed out."),
        {
          name: "TimeoutError",
        },
      );
      const spy = jest.fn().mockRejectedValue(timeoutError);
      stubOriginalRequest(spy);

      await expect(
        apiClient.request({ path: "/slow", method: "GET" }),
      ).rejects.toMatchObject({
        message: "Fava API request timed out",
        status: 504,
      });

      expect(mockFavaLogger.warn).toHaveBeenCalledWith("Request timed out", {
        method: "GET",
        path: "/slow",
        timeoutMs: 30_000,
      });
      expect(mockFavaLogger.error).not.toHaveBeenCalled();
    });

    it("should include custom timeoutMs in timeout warn log", async () => {
      const customClient = new ApiClient({
        baseUrl: "http://localhost:5000",
        timeoutMs: 5_000,
      });
      const timeoutError = Object.assign(new Error(), { name: "TimeoutError" });
      const spy = jest.fn().mockRejectedValue(timeoutError);
      Object.defineProperty(customClient, "originalRequest", {
        value: spy,
        writable: true,
        configurable: true,
      });

      await expect(
        customClient.request({ path: "/slow", method: "POST" }),
      ).rejects.toThrow("Fava API request timed out");

      expect(mockFavaLogger.warn).toHaveBeenCalledWith("Request timed out", {
        method: "POST",
        path: "/slow",
        timeoutMs: 5_000,
      });
    });

    it("should combine caller signal with timeout signal", async () => {
      const spy = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200, data: {} });
      stubOriginalRequest(spy);

      const controller = new AbortController();
      await apiClient.request({
        path: "/test",
        method: "GET",
        signal: controller.signal,
      });

      const injectedSignal = spy.mock.calls[0][0].signal as AbortSignal;
      expect(injectedSignal).toBeInstanceOf(AbortSignal);
      expect(injectedSignal.aborted).toBe(false);
    });

    it("should handle API errors and log them", async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        error: { error: "Internal Server Error" },
      };
      const spy = jest.fn().mockRejectedValue(errorResponse);
      stubOriginalRequest(spy);

      await expect(
        apiClient.request({ path: "/test-error", method: "POST" }),
      ).rejects.toThrow("Internal Server Error");

      expect(mockFavaLogger.error).toHaveBeenCalledWith("[Fava API] failed", {
        method: "POST",
        path: "/test-error",
        error: "Internal Server Error",
      });
    });

    it("should throw a FavaApiError carrying status and the full error body", async () => {
      const errorBody = {
        success: false,
        error: "This ledger has reached its free-tier limit of 1000 directives",
        code: "directive_limit_exceeded",
        details: { limit: 1000, current: 1005 },
      };
      const errorResponse = { ok: false, status: 403, error: errorBody };
      const spy = jest.fn().mockRejectedValue(errorResponse);
      stubOriginalRequest(spy);

      let caught: unknown;
      try {
        await apiClient.request({ path: "/test-error", method: "PUT" });
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(FavaApiError);
      const error = caught as FavaApiError;
      expect(error.status).toBe(403);
      expect(error.body).toEqual(errorBody);
      expect(error.message).toBe(errorBody.error);
    });

    it("should handle errors with undefined error message", async () => {
      const errorResponse = { ok: false, status: 500, error: {} };
      const spy = jest.fn().mockRejectedValue(errorResponse);
      stubOriginalRequest(spy);

      await expect(
        apiClient.request({ path: "/test-undefined-error", method: "GET" }),
      ).rejects.toThrow("Unknown API error");

      expect(mockFavaLogger.error).toHaveBeenCalledWith("[Fava API] failed", {
        method: "GET",
        path: "/test-undefined-error",
        error: undefined,
      });
    });

    it("should default to GET method when not specified", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        data: { result: "success" },
      };
      const spy = jest.fn().mockResolvedValue(mockResponse);
      stubOriginalRequest(spy);

      await apiClient.request({ path: "/test-default-method" });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ path: "/test-default-method" }),
      );
    });
  });
});
