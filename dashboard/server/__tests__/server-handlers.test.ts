import { afterEach, describe, expect, it, vi } from "vitest";
import publicUrl from "../public-url";
import apiGatewayProxy, { isProxiedPath } from "../api-gateway-proxy";

const proxyRequest = vi.hoisted(() => vi.fn());
vi.mock("nitro/h3", () => ({
  defineHandler: (handler: unknown) => handler,
  proxyRequest,
}));

// Both handlers are global middleware, so they see every request the dashboard
// serves. What matters: they do their job for their own paths when the
// deployment opted in, and are invisible everywhere else.

function event(pathname: string) {
  return {
    url: new URL(`https://dashboard.example.com${pathname}`),
    req: { headers: new Headers() },
    res: { headers: new Headers() },
  } as never;
}

afterEach(() => vi.unstubAllEnvs());

describe("isProxiedPath", () => {
  it.each([
    "/api-gateway/",
    "/api-gateway/oauth/token",
    "/.well-known/oauth-protected-resource",
  ])("forwards %s", (path) => expect(isProxiedPath(path)).toBe(true));

  it.each([
    "/",
    "/auth/login",
    "/api-gatewayX",
    "/ledger/a/b",
    "/.well-knownish",
  ])("leaves %s to the app", (path) => expect(isProxiedPath(path)).toBe(false));
});

describe("api gateway proxy", () => {
  it("does nothing, even for its own paths, when API_PROXY_URL is unset", () => {
    vi.stubEnv("API_PROXY_URL", "");
    expect(apiGatewayProxy(event("/api-gateway/"))).toBeUndefined();
    expect(apiGatewayProxy(event("/.well-known/security.txt"))).toBeUndefined();
  });

  it("forwards to the backend and leaves a redirect for the browser to follow", () => {
    vi.stubEnv("API_PROXY_URL", "http://api.internal:4104");
    apiGatewayProxy(event("/api-gateway/oauth/auth?client_id=app"));
    const [, target, options] = proxyRequest.mock.calls.at(-1) ?? [];
    expect(target).toBe(
      "http://api.internal:4104/api-gateway/oauth/auth?client_id=app",
    );
    // Followed here, the authorization endpoint's 303 would never reach the
    // browser: it would stay on this URL with the sign-in page's HTML.
    expect(options.fetchOptions).toEqual({ redirect: "manual" });
    expect(options.headers["x-forwarded-host"]).toBe("dashboard.example.com");
  });

  it("does nothing for other paths when it is on", () => {
    vi.stubEnv("API_PROXY_URL", "http://api.internal:4104");
    expect(apiGatewayProxy(event("/auth/login"))).toBeUndefined();
  });

  it("passes the client's Accept on, which the MCP endpoint requires", async () => {
    vi.stubEnv("API_PROXY_URL", "http://api.internal:4104");
    const mcpRequest = event("/api-gateway/mcp");
    const accept = "application/json, text/event-stream";
    (mcpRequest as { req: { headers: Headers } }).req.headers.set(
      "accept",
      accept,
    );
    apiGatewayProxy(mcpRequest);
    const [proxied, , options] = proxyRequest.mock.calls.at(-1) ?? [];
    // h3's own header filter, given the proxy's options: by default it drops
    // Accept, and the MCP endpoint then answers 406.
    const { getProxyRequestHeaders } =
      await vi.importActual<typeof import("nitro/h3")>("nitro/h3");
    expect(
      getProxyRequestHeaders(proxied, {
        forwardHeaders: options.forwardHeaders,
        filterHeaders: options.filterHeaders,
      }).accept,
    ).toBe(accept);
    expect(getProxyRequestHeaders(proxied).accept).toBeUndefined();
  });
});

describe("public url endpoint", () => {
  it("answers with the address the platform gave this service", () => {
    vi.stubEnv("RENDER_EXTERNAL_URL", " https://dashboard-x9.example.com ");
    const e = event("/_internal/public-url");
    expect(publicUrl(e)).toBe("https://dashboard-x9.example.com");
    expect(
      (e as { res: { headers: Headers } }).res.headers.get("cache-control"),
    ).toBe("no-store");
  });

  it("is invisible where the platform gave no address", () => {
    vi.stubEnv("RENDER_EXTERNAL_URL", "");
    expect(publicUrl(event("/_internal/public-url"))).toBeUndefined();
  });

  it("answers only at its own path", () => {
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://dashboard-x9.example.com");
    expect(publicUrl(event("/"))).toBeUndefined();
    expect(publicUrl(event("/_internal/other"))).toBeUndefined();
  });
});
