import type { Context, Next } from "koa";
import { getRequestContext, getSessionToken } from "@/shared/async-context";
import { requestContextMiddleware } from "../request-context-middleware";

function contextWith(headers: Record<string, string>) {
  const set = jest.fn();
  const ctx = {
    get: (field: string) => headers[field.toLowerCase()] ?? "",
    set,
  } as unknown as Context;
  return { ctx, set };
}

/** Capture what the downstream middleware sees inside the async context. */
function capturingNext() {
  const seen: Array<ReturnType<typeof getRequestContext>> = [];
  const next = (async () => {
    seen.push(getRequestContext());
  }) as Next;
  return { next, seen };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

describe("requestContextMiddleware", () => {
  it("adopts the forwarded request id and exposes it to the async context", async () => {
    const { ctx, set } = contextWith({ "x-bcio-context": "request-id=abc-123" });
    const { next, seen } = capturingNext();

    await requestContextMiddleware()(ctx, next);

    expect(seen[0]).toMatchObject({ requestId: "abc-123" });
    expect(set).toHaveBeenCalledWith("X-Request-Id", "abc-123");
  });

  it("mints an id when no envelope arrives, so every request is correlated", async () => {
    const { ctx, set } = contextWith({});
    const { next, seen } = capturingNext();

    await requestContextMiddleware()(ctx, next);

    const requestId = seen[0]?.requestId as string;
    expect(requestId).toMatch(UUID_RE);
    expect(set).toHaveBeenCalledWith("X-Request-Id", requestId);
  });

  it.each([
    ["a newline", "request-id=a\nb"],
    ["a space", "request-id=a b"],
    ["an over-long value", `request-id=${"a".repeat(129)}`],
    ["a malformed envelope", "not-an-envelope"],
  ])("mints a fresh id rather than adopting %s", async (_label, envelope) => {
    const { ctx } = contextWith({ "x-bcio-context": envelope });
    const { next, seen } = capturingNext();

    await requestContextMiddleware()(ctx, next);

    expect(seen[0]?.requestId).toMatch(UUID_RE);
  });

  it("gives concurrent requests separate stores", async () => {
    const run = async (id: string) => {
      const { ctx } = contextWith({ "x-bcio-context": `request-id=${id}` });
      const { next, seen } = capturingNext();
      await requestContextMiddleware()(ctx, next);
      return seen[0]?.requestId;
    };

    await expect(Promise.all([run("one"), run("two")])).resolves.toEqual([
      "one",
      "two",
    ]);
  });

  it("exposes the relayed credential to the outbound price fetch", async () => {
    const { ctx } = contextWith({
      "x-bcio-context": "request-id=a,session-token=tok-abc",
    });
    const { next, seen } = capturingNext();

    await requestContextMiddleware()(ctx, next);

    expect(seen[0]).toMatchObject({ requestId: "a", sessionToken: "tok-abc" });
  });

  it("stores only the fields it consumes, not the whole envelope", async () => {
    const { ctx } = contextWith({
      "x-bcio-context": "request-id=a,platform=mobile,unknown=x",
    });
    const { next, seen } = capturingNext();

    await requestContextMiddleware()(ctx, next);

    // The parser tolerates unknown keys so a new field can ship without a
    // lockstep deploy, but unread caller-controlled data stays out of reach.
    expect(Object.keys(seen[0] ?? {}).sort()).toEqual([
      "requestId",
      "sessionToken",
    ]);
    expect(seen[0]?.sessionToken).toBeUndefined();
  });

  it("leaves the store empty once the request is over", async () => {
    const { ctx } = contextWith({});
    const { next } = capturingNext();

    await requestContextMiddleware()(ctx, next);

    expect(getRequestContext()).toBeUndefined();
  });

  it("adopts a request id of exactly the maximum length", async () => {
    const candidate = "a".repeat(128);
    const { ctx, set } = contextWith({
      "x-bcio-context": `request-id=${candidate}`,
    });
    const { next, seen } = capturingNext();

    await requestContextMiddleware()(ctx, next);

    expect(seen[0]?.requestId).toBe(candidate);
    expect(set).toHaveBeenCalledWith("X-Request-Id", candidate);
  });

  it.each([
    ["adopted", "request-id=abc-123"],
    ["minted because none arrived", ""],
    ["minted because the forwarded one was unprintable", "request-id=a\nb"],
  ])("echoes the same id it stored when the id is %s", async (_label, envelope) => {
    const { ctx, set } = contextWith(
      envelope ? { "x-bcio-context": envelope } : {},
    );
    const { next, seen } = capturingNext();

    await requestContextMiddleware()(ctx, next);

    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith("X-Request-Id", seen[0]?.requestId);
  });

  it("hands the relayed credential to getSessionToken inside the request", async () => {
    const { ctx } = contextWith({
      "x-bcio-context": "request-id=a,session-token=tok-abc",
    });
    const tokens: Array<string | undefined> = [];
    const next = (async () => {
      tokens.push(getSessionToken());
      await Promise.resolve();
      // Still readable after an await: the store follows the async chain.
      tokens.push(getSessionToken());
    }) as Next;

    expect(getSessionToken()).toBeUndefined();
    await requestContextMiddleware()(ctx, next);

    expect(tokens).toEqual(["tok-abc", "tok-abc"]);
    expect(getSessionToken()).toBeUndefined();
  });

  it.each([
    ["no session-token entry", "request-id=a"],
    ["an empty session-token", "request-id=a,session-token="],
    ["a session-token the parser rejected", `request-id=a,session-token=${"t".repeat(2049)}`],
  ])("leaves the credential undefined for %s", async (_label, envelope) => {
    const { ctx } = contextWith({ "x-bcio-context": envelope });
    const seen: Array<string | undefined> = [];
    const next = (async () => {
      seen.push(getSessionToken());
    }) as Next;

    await requestContextMiddleware()(ctx, next);

    expect(seen[0]).toBeUndefined();
  });

  it("gives sequential requests separate stores, leaking nothing forward", async () => {
    const middleware = requestContextMiddleware();

    const first = contextWith({
      "x-bcio-context": "request-id=one,session-token=tok-one",
    });
    const firstRun = capturingNext();
    await middleware(first.ctx, firstRun.next);

    const second = contextWith({});
    const secondRun = capturingNext();
    await middleware(second.ctx, secondRun.next);

    expect(firstRun.seen[0]).toMatchObject({
      requestId: "one",
      sessionToken: "tok-one",
    });
    expect(secondRun.seen[0]?.requestId).toMatch(UUID_RE);
    expect(secondRun.seen[0]?.sessionToken).toBeUndefined();
  });

  it("lets a downstream failure through and still clears the store", async () => {
    const { ctx, set } = contextWith({ "x-bcio-context": "request-id=abc-123" });
    const boom = new Error("downstream exploded");
    const next = (async () => {
      throw boom;
    }) as Next;

    await expect(requestContextMiddleware()(ctx, next)).rejects.toBe(boom);

    // The ID is set before `next` runs, so a failed request is still nameable.
    expect(set).toHaveBeenCalledWith("X-Request-Id", "abc-123");
    expect(getRequestContext()).toBeUndefined();
  });
});
