import type { Context } from "koa";
import { authMiddleware, parseAuthorizationHeader } from "@/server/auth";

jest.mock("@/config", () => ({
  config: {
    env: "test",
    port: 8000,
    gitea: { hostName: "gitea", httpPort: 3000 },
    webhookToken: "secret-token",
    backendV2: { hostName: "backend-v2", httpPort: 4104, adminToken: "" },
  },
}));

function fakeCtx(headers: Record<string, string> = {}): Context {
  const set = jest.fn();
  return {
    get: (name: string) => headers[name] ?? "",
    set,
    state: {},
    status: 0,
    body: undefined,
  } as unknown as Context;
}

describe("parseAuthorizationHeader", () => {
  it("classifies Basic auth and recovers username/password", () => {
    const encoded = Buffer.from("alice:pw:with:colons").toString("base64");
    const auth = parseAuthorizationHeader(`Basic ${encoded}`);
    expect(auth).toEqual({
      authType: "basic",
      header: `Basic ${encoded}`,
      username: "alice",
      password: "pw:with:colons",
    });
  });

  it("classifies Gitea token auth and forwards the token form", () => {
    const auth = parseAuthorizationHeader("token abc123");
    expect(auth).toEqual({ authType: "api_key", header: "token abc123" });
  });

  it("classifies the private anonymous-read protocol", () => {
    expect(parseAuthorizationHeader("Anonymous")).toEqual({
      authType: "anonymous",
      header: "Anonymous",
    });
  });

  it("rejects missing, empty, and unknown schemes", () => {
    expect(parseAuthorizationHeader(undefined)).toBeNull();
    expect(parseAuthorizationHeader("")).toBeNull();
    expect(parseAuthorizationHeader("Bearer xyz")).toBeNull();
    expect(parseAuthorizationHeader("token ")).toBeNull();
    expect(parseAuthorizationHeader("Basic ")).toBeNull();
  });
});

describe("authMiddleware", () => {
  it("401s with the Python-exact message and WWW-Authenticate on missing auth", async () => {
    const ctx = fakeCtx();
    const next = jest.fn();
    await authMiddleware(ctx, next);
    expect(next).not.toHaveBeenCalled();
    expect(ctx.status).toBe(401);
    expect(ctx.set).toHaveBeenCalledWith("WWW-Authenticate", "Basic");
    expect(ctx.body).toEqual({
      success: false,
      error:
        "No authorization header provided. Use 'Basic <credentials>' or 'token <token>'",
      code: null,
      details: null,
    });
  });

  it("attaches auth state and continues for valid credentials", async () => {
    const encoded = Buffer.from("bob:pw").toString("base64");
    const ctx = fakeCtx({ Authorization: `Basic ${encoded}` });
    const next = jest.fn();
    await authMiddleware(ctx, next);
    expect(next).toHaveBeenCalled();
    expect((ctx.state.auth as { username: string }).username).toBe("bob");
  });
});
