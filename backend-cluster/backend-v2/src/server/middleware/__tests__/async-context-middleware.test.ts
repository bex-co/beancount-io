import { Context, Next } from "koa";
import { asyncContextMiddleware } from "../async-context-middleware";
import { getRequestContext, getRequestId } from "@/shared/async-context";
import { ApiClient } from "@/foundation/fava/api-client";
import { COOKIE_NAME } from "@/shared/cookie-utils";

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

  describe("session token", () => {
    // The middleware stores the caller's live credential so the ledger service
    // can present it to beancount.io's login-gated routes (ADR 016 section 7).
    // It must come from whichever inlet this request actually used, and it must
    // not survive into the next request.
    const tokenSeenBy = async (
      request: Partial<Context>,
    ): Promise<string | undefined> => {
      let seen: string | undefined;
      await asyncContextMiddleware(request as Context, async () => {
        seen = getRequestContext()?.sessionToken;
      });
      return seen;
    };

    const requestWith = (overrides: Partial<Context>): Partial<Context> => ({
      headers: {},
      state: {},
      set: jest.fn(),
      ...overrides,
    });

    it("takes the credential from an Authorization bearer header", async () => {
      await expect(
        tokenSeenBy(
          requestWith({ headers: { authorization: "Bearer session-jwt" } }),
        ),
      ).resolves.toBe("session-jwt");
    });

    it("takes the credential from the x-api-key header", async () => {
      await expect(
        tokenSeenBy(requestWith({ headers: { "x-api-key": "bcio_ABCDEF" } })),
      ).resolves.toBe("bcio_ABCDEF");
    });

    it("takes the credential from the browser session cookie", async () => {
      const get = jest.fn().mockReturnValue("cookie-session-jwt");

      await expect(
        tokenSeenBy(requestWith({ cookies: { get } as never })),
      ).resolves.toBe("cookie-session-jwt");
      expect(get).toHaveBeenCalledWith(COOKIE_NAME);
    });

    it("stores no credential for an anonymous request", async () => {
      await expect(tokenSeenBy(requestWith({}))).resolves.toBeUndefined();
    });

    it("stores no credential when a header carries an empty value", async () => {
      // `Bearer ` with nothing after it yields "", which must normalize to
      // undefined so the envelope omits the field rather than sending `=`.
      await expect(
        tokenSeenBy(requestWith({ headers: { authorization: "Bearer " } })),
      ).resolves.toBeUndefined();
    });

    it("does not throw for a context that has no cookie jar", async () => {
      // Not every context reaching this middleware carries a Koa cookie jar.
      const request = requestWith({});
      await expect(
        asyncContextMiddleware(request as Context, next),
      ).resolves.toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it("does not leak one request's credential into the next", async () => {
      await expect(
        tokenSeenBy(
          requestWith({ headers: { authorization: "Bearer first-caller" } }),
        ),
      ).resolves.toBe("first-caller");
      await expect(tokenSeenBy(requestWith({}))).resolves.toBeUndefined();
    });
  });

  describe("forwarding to the ledger service", () => {
    // End to end through the real seam: middleware -> async context ->
    // forwarded-context serializer -> ApiClient outbound headers. Only the
    // network call itself is stubbed.
    const clientWithStub = (): { client: ApiClient; spy: jest.Mock } => {
      const client = new ApiClient({ baseUrl: "http://ledger.test" });
      const spy = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200, data: {} });
      Object.defineProperty(client, "originalRequest", {
        value: spy,
        writable: true,
        configurable: true,
      });
      return { client, spy };
    };

    it("sends the envelope built from this request's own credential", async () => {
      const { client, spy } = clientWithStub();
      ctx.headers = {
        "x-request-id": "req-e2e-1",
        authorization: "Bearer live-session-jwt",
      };

      await asyncContextMiddleware(ctx as Context, async () => {
        await client.request({ path: "/ledger", method: "GET" });
      });

      expect(spy.mock.calls[0][0].headers).toEqual({
        "x-bcio-context": "request-id=req-e2e-1,session-token=live-session-jwt",
      });
    });

    it("sends only the request id when the caller was anonymous", async () => {
      const { client, spy } = clientWithStub();
      ctx.headers = { "x-request-id": "req-e2e-2" };

      await asyncContextMiddleware(ctx as Context, async () => {
        await client.request({ path: "/ledger", method: "GET" });
      });

      expect(spy.mock.calls[0][0].headers).toEqual({
        "x-bcio-context": "request-id=req-e2e-2",
      });
    });

    it("gives each request its own envelope when one client serves both", async () => {
      const { client, spy } = clientWithStub();
      const run = async (requestId: string, token: string) => {
        const request = {
          headers: { "x-request-id": requestId, "x-api-key": token },
          state: {},
          set: jest.fn(),
        } as Partial<Context>;
        await asyncContextMiddleware(request as Context, async () => {
          await client.request({ path: "/ledger", method: "GET" });
        });
      };

      await run("req-a", "bcio_AAAA");
      await run("req-b", "bcio_BBBB");

      expect(spy.mock.calls.map((call) => call[0].headers)).toEqual([
        { "x-bcio-context": "request-id=req-a,session-token=bcio_AAAA" },
        { "x-bcio-context": "request-id=req-b,session-token=bcio_BBBB" },
      ]);
    });
  });
});
