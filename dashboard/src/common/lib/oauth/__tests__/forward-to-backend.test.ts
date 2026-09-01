import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/config/config.server", () => ({
  serverConfig: { apiUrl: "http://backend-v2:4104/api-gateway/" },
}));

const {
  getBackendBase,
  proxyApiGatewayRequest,
  proxyOAuthProviderRequest,
  proxyOauthInteractionLogin,
} = await import("../forward-to-backend");
const { DASHBOARD_OAUTH_TRANSACTION_COOKIE } =
  await import("@/features/oauth/dashboard-oauth");

describe("OAuth backend forwarding", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dials the in-cluster SSR address, not a localhost fallback", () => {
    // The SSR server and the backend are different containers. Resolving this
    // from the isomorphic browser config instead left it at
    // http://localhost:4104, so approving consent failed with ECONNREFUSED on
    // every deployment where the two are not the same host.
    expect(getBackendBase()).toBe("http://backend-v2:4104");
  });

  it("sends the interaction login to that address", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 303 }));

    await proxyOauthInteractionLogin(
      new Request("https://books.example.test/oauth/mobile-consent?uid=abc", {
        method: "POST",
        body: "decision=approve",
      }),
      "/api-gateway/oauth/interaction/abc/login",
    );

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(
      "http://backend-v2:4104/api-gateway/oauth/interaction/abc/login",
    );
  });

  it("removes an issuer path prefix before proxying provider requests", async () => {
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 303,
        headers: {
          location:
            "https://books.example.test/beancount/oauth/dashboard-consent?uid=abc",
          "set-cookie": "_interaction=opaque; HttpOnly; Secure",
        },
      }),
    );
    const response = await proxyOAuthProviderRequest(
      new Request(
        "https://books.example.test/beancount/api-gateway/oauth/auth?client_id=dashboard",
        {
          headers: {
            cookie: `provider=session; ${DASHBOARD_OAUTH_TRANSACTION_COOKIE}=signed-verifier`,
          },
        },
      ),
    );

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://backend-v2:4104/api-gateway/oauth/auth?client_id=dashboard",
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain(
      "/beancount/oauth/dashboard-consent",
    );
    expect(response.headers.get("set-cookie")).toContain("_interaction=opaque");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get("cookie")).toBe("provider=session");
  });

  it("keeps GraphQL and streaming agent calls on the same-origin cookie path", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: partial\n\n"));
        controller.close();
      },
    });
    fetchMock.mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
    );
    const response = await proxyApiGatewayRequest(
      new Request("https://books.example.test/beancount/api-gateway/agent", {
        method: "POST",
        headers: {
          cookie: `authSess:beancount.io=oauth; ${DASHBOARD_OAUTH_TRANSACTION_COOKIE}=signed-verifier`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "hello" }),
      }),
    );

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://backend-v2:4104/api-gateway/agent",
    );
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get("cookie")).toBe(
      "authSess:beancount.io=oauth",
    );
    expect(init.body).toBeInstanceOf(ReadableStream);
    expect((init as RequestInit & { duplex?: string }).duplex).toBe("half");
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(await response.text()).toBe("data: partial\n\n");
  });
});
