import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleConsentRequesterGet,
  toConsentRequester,
} from "../consent-requester";

describe("toConsentRequester", () => {
  const base = {
    redirect_uri: "https://claude.ai/api/mcp/auth_callback",
    client_name: "Claude",
    client_id_host: null,
    loopback_only: false,
  };

  it("shows the host of a web redirect", () => {
    expect(toConsentRequester(base)).toEqual({
      redirect: "claude.ai",
      clientName: "Claude",
      vouchedBy: null,
      loopbackOnly: false,
    });
  });

  it("keeps the scheme of an app's private-use redirect, which is what identifies it", () => {
    expect(
      toConsentRequester({
        ...base,
        redirect_uri: "cursor://anysphere.cursor-mcp/oauth/callback",
      })?.redirect,
    ).toBe("cursor://anysphere.cursor-mcp");
  });

  it("keeps the port of a loopback redirect", () => {
    expect(
      toConsentRequester({
        ...base,
        redirect_uri: "http://127.0.0.1:61000/cb",
        loopback_only: true,
      }),
    ).toMatchObject({ redirect: "127.0.0.1:61000", loopbackOnly: true });
  });

  it("treats a blank name as no name and passes the vouching host through", () => {
    expect(
      toConsentRequester({
        ...base,
        client_name: "  ",
        client_id_host: "claude.ai",
      }),
    ).toMatchObject({ clientName: null, vouchedBy: "claude.ai" });
  });

  it("cannot identify a requester without a usable redirect", () => {
    expect(toConsentRequester({ ...base, redirect_uri: null })).toBeNull();
    expect(
      toConsentRequester({ ...base, redirect_uri: "not a url" }),
    ).toBeNull();
    expect(toConsentRequester(null)).toBeNull();
  });
});

describe("handleConsentRequesterGet", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const request = () =>
    new Request("https://beancount.io/oauth/consent/requester?uid=a/b", {
      headers: { cookie: "_interaction=xyz" },
    });

  it("reads the interaction with the browser's cookie and maps it", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        redirect_uri: "https://chatgpt.com/connector_platform_oauth_redirect",
        client_name: "ChatGPT",
        client_id_host: null,
        loopback_only: false,
      }),
    );
    const res = await handleConsentRequesterGet({ request: request() });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toMatchObject({
      redirect: "chatgpt.com",
      clientName: "ChatGPT",
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api-gateway\/oauth\/interaction\/a%2Fb$/);
    expect((init.headers as Record<string, string>).cookie).toBe(
      "_interaction=xyz",
    );
  });

  it("answers 404 when the backend does not know the interaction", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: "interaction_not_found" }, { status: 400 }),
    );
    const res = await handleConsentRequesterGet({ request: request() });
    expect(res.status).toBe(404);
    expect(await res.json()).toBeNull();
  });

  it("answers 404 when the backend is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await handleConsentRequesterGet({ request: request() });
    expect(res.status).toBe(404);
  });
});
