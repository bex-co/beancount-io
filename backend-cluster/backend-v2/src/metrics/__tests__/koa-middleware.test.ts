import "reflect-metadata";
import { Context, Next } from "koa";
import { restMetricsMiddleware } from "../koa-middleware";
import {
  httpRequestDuration,
  httpRequestTotal,
  httpRequestInProgress,
} from "../metrics-definitions";

// Mock the metrics
jest.mock("../metrics-definitions", () => ({
  httpRequestDuration: {
    observe: jest.fn(),
  },
  httpRequestTotal: {
    inc: jest.fn(),
  },
  httpRequestInProgress: {
    inc: jest.fn(),
    dec: jest.fn(),
  },
}));

describe("restMetricsMiddleware", () => {
  let middleware: ReturnType<typeof restMetricsMiddleware>;
  let mockContext: Partial<Context>;
  let mockNext: jest.Mock<Promise<void>>;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = restMetricsMiddleware();
    mockNext = jest.fn().mockResolvedValue(undefined);
    mockContext = {
      method: "GET",
      path: "/api/users",
      status: 200,
      route: { path: "/api/users" },
    };
  });

  it("should record metrics for successful request", async () => {
    await middleware(mockContext as Context, mockNext as Next);

    expect(httpRequestInProgress.inc).toHaveBeenCalledWith();
    expect(httpRequestDuration.observe).toHaveBeenCalledWith(
      {
        method: "GET",
        route: "/api/users",
        status_code: "200",
      },
      expect.any(Number),
    );
    expect(httpRequestTotal.inc).toHaveBeenCalledWith({
      method: "GET",
      route: "/api/users",
      status_code: "200",
    });
    expect(httpRequestInProgress.dec).toHaveBeenCalledWith();
  });

  it("should use path when route.path is not available", async () => {
    mockContext.route = undefined;

    await middleware(mockContext as Context, mockNext as Next);

    expect(httpRequestDuration.observe).toHaveBeenCalledWith(
      expect.objectContaining({
        route: "/api/users",
      }),
      expect.any(Number),
    );
  });

  it("should record error metrics when next throws error", async () => {
    const error = new Error("Test error");
    mockNext.mockRejectedValue(error);
    mockContext.status = 500;

    await expect(
      middleware(mockContext as Context, mockNext as Next),
    ).rejects.toThrow("Test error");

    expect(httpRequestDuration.observe).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: "500",
      }),
      expect.any(Number),
    );
    expect(httpRequestTotal.inc).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: "500",
      }),
    );
    expect(httpRequestInProgress.dec).toHaveBeenCalledWith();
  });

  it("should use default status 500 when status is not set on error", async () => {
    const error = new Error("Test error");
    mockNext.mockRejectedValue(error);
    mockContext.status = undefined;

    await expect(
      middleware(mockContext as Context, mockNext as Next),
    ).rejects.toThrow("Test error");

    expect(httpRequestDuration.observe).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: "500",
      }),
      expect.any(Number),
    );
    expect(httpRequestTotal.inc).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: "500",
      }),
    );
  });

  it("should handle error without constructor name", async () => {
    const error = { message: "Test error" };
    mockNext.mockRejectedValue(error);
    mockContext.status = 500;

    await expect(
      middleware(mockContext as Context, mockNext as Next),
    ).rejects.toEqual(error);

    expect(httpRequestDuration.observe).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: "500",
      }),
      expect.any(Number),
    );
    expect(httpRequestTotal.inc).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: "500",
      }),
    );
  });

  it("should record metrics for POST request", async () => {
    mockContext.method = "POST";
    mockContext.path = "/api/users";
    mockContext.status = 201;

    await middleware(mockContext as Context, mockNext as Next);

    expect(httpRequestDuration.observe).toHaveBeenCalledWith(
      {
        method: "POST",
        route: "/api/users",
        status_code: "201",
      },
      expect.any(Number),
    );
  });

  it("should always decrement in-progress counter in finally block", async () => {
    await middleware(mockContext as Context, mockNext as Next);

    expect(httpRequestInProgress.dec).toHaveBeenCalledTimes(1);
  });

  it("should decrement in-progress counter even when error occurs", async () => {
    mockNext.mockRejectedValue(new Error("Test error"));
    mockContext.status = 500;

    await expect(
      middleware(mockContext as Context, mockNext as Next),
    ).rejects.toThrow();

    expect(httpRequestInProgress.dec).toHaveBeenCalledTimes(1);
  });

  it("should skip metrics collection for /metrics endpoints", async () => {
    mockContext.path = "/metrics";

    await middleware(mockContext as Context, mockNext as Next);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(httpRequestInProgress.inc).not.toHaveBeenCalled();
    expect(httpRequestDuration.observe).not.toHaveBeenCalled();
    expect(httpRequestTotal.inc).not.toHaveBeenCalled();
    expect(httpRequestInProgress.dec).not.toHaveBeenCalled();
  });

  it("should skip metrics collection for /api-gateway/ endpoints", async () => {
    mockContext.path = "/api-gateway/";

    await middleware(mockContext as Context, mockNext as Next);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(httpRequestInProgress.inc).not.toHaveBeenCalled();
    expect(httpRequestDuration.observe).not.toHaveBeenCalled();
    expect(httpRequestTotal.inc).not.toHaveBeenCalled();
    expect(httpRequestInProgress.dec).not.toHaveBeenCalled();
  });

  it("should record metrics for 404 not found", async () => {
    mockContext.status = 404;

    await middleware(mockContext as Context, mockNext as Next);

    expect(httpRequestTotal.inc).toHaveBeenCalledWith({
      status_code: "404",
      route: "/api/users",
      method: "GET",
    });
  });

  it("should record metrics for 401 unauthorized", async () => {
    mockContext.status = 401;

    await middleware(mockContext as Context, mockNext as Next);

    expect(httpRequestTotal.inc).toHaveBeenCalledWith({
      status_code: "401",
      route: "/api/users",
      method: "GET",
    });
  });

  it("should record metrics for 400 bad request", async () => {
    mockContext.status = 400;

    await middleware(mockContext as Context, mockNext as Next);

    expect(httpRequestTotal.inc).toHaveBeenCalledWith({
      status_code: "400",
      route: "/api/users",
      method: "GET",
    });
  });

  it("should record metrics for successful 2xx requests", async () => {
    mockContext.status = 200;

    await middleware(mockContext as Context, mockNext as Next);

    expect(httpRequestTotal.inc).toHaveBeenCalledWith({
      status_code: "200",
      route: "/api/users",
      method: "GET",
    });
  });
});
