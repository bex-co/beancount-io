import { Context, Next } from "koa";
import { asyncContextMiddleware } from "../async-context-middleware";
import { getRequestContext, getRequestId } from "@/shared/async-context";

describe("asyncContextMiddleware", () => {
  let ctx: Partial<Context>;
  let next: Next;

  beforeEach(() => {
    ctx = {
      headers: {},
      state: {},
      set: jest.fn(),
    } as Partial<Context>;
    next = jest.fn().mockResolvedValue(undefined);
  });

  it("should generate a requestId if none provided", async () => {
    await asyncContextMiddleware(ctx as Context, next);

    expect(ctx.state?.requestId).toBeDefined();
    expect(typeof ctx.state?.requestId).toBe("string");
    expect(ctx.set).toHaveBeenCalledWith("X-Request-Id", ctx.state?.requestId);
  });

  it("should use X-Request-Id header if provided", async () => {
    ctx.headers = { "x-request-id": "req-from-header-123" };

    await asyncContextMiddleware(ctx as Context, next);

    expect(ctx.state?.requestId).toBe("req-from-header-123");
    expect(ctx.set).toHaveBeenCalledWith("X-Request-Id", "req-from-header-123");
  });

  it("should use X-Correlation-Id header if provided", async () => {
    ctx.headers = { "x-correlation-id": "corr-from-header-456" };

    await asyncContextMiddleware(ctx as Context, next);

    expect(ctx.state?.requestId).toBe("corr-from-header-456");
    expect(ctx.set).toHaveBeenCalledWith(
      "X-Request-Id",
      "corr-from-header-456",
    );
  });

  it("should prefer X-Request-Id over X-Correlation-Id", async () => {
    ctx.headers = {
      "x-request-id": "req-id-123",
      "x-correlation-id": "corr-id-456",
    };

    await asyncContextMiddleware(ctx as Context, next);

    expect(ctx.state?.requestId).toBe("req-id-123");
    expect(ctx.set).toHaveBeenCalledWith("X-Request-Id", "req-id-123");
  });

  it("should set up async context with requestId", async () => {
    ctx.headers = { "x-request-id": "req-async-123" };

    // Capture the context during the next() call
    let capturedRequestId: string | undefined;
    next = jest.fn().mockImplementation(async () => {
      capturedRequestId = getRequestId();
    });

    await asyncContextMiddleware(ctx as Context, next);

    expect(capturedRequestId).toBe("req-async-123");
    expect(next).toHaveBeenCalled();
  });

  it("should make context available throughout async operations", async () => {
    ctx.headers = { "x-request-id": "req-nested-123" };

    // Simulate nested async operations
    const nestedOperation = async () => {
      await Promise.resolve();
      return getRequestContext();
    };

    let capturedContext;
    next = jest.fn().mockImplementation(async () => {
      capturedContext = await nestedOperation();
    });

    await asyncContextMiddleware(ctx as Context, next);

    expect(capturedContext).toEqual({ requestId: "req-nested-123" });
  });

  it("should call next middleware", async () => {
    await asyncContextMiddleware(ctx as Context, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should propagate errors from next middleware", async () => {
    const error = new Error("Test error");
    next = jest.fn().mockRejectedValue(error);

    await expect(asyncContextMiddleware(ctx as Context, next)).rejects.toThrow(
      "Test error",
    );
  });

  it("should generate unique requestIds for multiple requests", async () => {
    const ctx1 = {
      headers: {},
      state: {},
      set: jest.fn(),
    } as Partial<Context>;

    const ctx2 = {
      headers: {},
      state: {},
      set: jest.fn(),
    } as Partial<Context>;

    await asyncContextMiddleware(ctx1 as Context, next);
    await asyncContextMiddleware(ctx2 as Context, next);

    expect(ctx1.state?.requestId).toBeDefined();
    expect(ctx2.state?.requestId).toBeDefined();
    expect(ctx1.state?.requestId).not.toBe(ctx2.state?.requestId);
  });
});
