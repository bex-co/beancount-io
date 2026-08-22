import type { RouterContext } from "@koa/router";
import {
  NotFoundError,
  UnauthenticatedError,
  InternalServerError,
} from "@/shared/errors";
import { restErrorMiddleware } from "../error-middleware";

function makeCtx(): RouterContext {
  return {
    method: "GET",
    path: "/api/test",
    status: 200,
    body: undefined,
  } as unknown as RouterContext;
}

describe("restErrorMiddleware (REST transport adapter)", () => {
  const run = async (throwFn: () => never | Promise<never>) => {
    const ctx = makeCtx();
    await restErrorMiddleware()(ctx, async () => {
      await throwFn();
    });
    return ctx;
  };

  it("maps a DomainError to its HTTP status and canonical code", async () => {
    const ctx = await run(() => {
      throw new NotFoundError("User", "abc");
    });

    expect(ctx.status).toBe(404);
    expect(ctx.body).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "User with ID 'abc' not found",
        metadata: { resource: "User", id: "abc" },
      },
    });
  });

  it("derives 401 from the UNAUTHENTICATED category", async () => {
    const ctx = await run(() => {
      throw new UnauthenticatedError("invalid api token");
    });

    expect(ctx.status).toBe(401);
    expect(ctx.body).toMatchObject({
      ok: false,
      error: { code: "UNAUTHENTICATED", message: "invalid api token" },
    });
  });

  it("honours httpStatusHint for passthrough errors", async () => {
    const ctx = await run(() => {
      throw new InternalServerError("upstream 502", undefined, 502);
    });

    expect(ctx.status).toBe(502);
    expect(ctx.body).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
  });

  it("wraps unexpected errors as 500 INTERNAL_SERVER_ERROR", async () => {
    const ctx = await run(() => {
      throw new Error("boom");
    });

    expect(ctx.status).toBe(500);
    expect(ctx.body).toEqual({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR", message: "boom" },
    });
  });

  it("does nothing when the handler succeeds", async () => {
    const ctx = makeCtx();
    await restErrorMiddleware()(ctx, async () => {
      ctx.body = { ok: true };
    });

    expect(ctx.status).toBe(200);
    expect(ctx.body).toEqual({ ok: true });
  });
});
