import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/config/config.server", () => ({
  serverConfig: { apiUrl: "http://backend-v2:4104/api-gateway/" },
}));

const { getBackendBase, proxyOauthInteractionLogin } =
  await import("../forward-to-backend");

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
});
