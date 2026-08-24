import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleConsentPost } from "../handle-consent-post";
import { handleMobileConsentPost } from "../handle-mobile-consent-post";
import { backendBaseFromApiUrl } from "@/common/lib/oauth/forward-to-backend";

const CONSENT_URL = "https://beancount.io/oauth/consent?uid=abc";

describe("handleConsentPost", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards a small form body upstream and maps the redirect", async () => {
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 303,
        headers: { location: "https://beancount.io/done" },
      }),
    );

    const response = await handleConsentPost({
      request: new Request(CONSENT_URL, {
        method: "POST",
        body: "consent=accept",
      }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe("consent=accept");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://beancount.io/done");
  });

  it("preserves a reverse-proxy prefix while removing the API gateway suffix", () => {
    expect(
      backendBaseFromApiUrl(
        "https://books.example.test/beancount/api-gateway/",
      ),
    ).toBe("https://books.example.test/beancount");
  });

  it("forwards a mobile cancellation as the standard interaction decision", async () => {
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 303,
        headers: {
          location: "io.beancount.ios:/oauth/callback?error=access_denied",
        },
      }),
    );

    const response = await handleMobileConsentPost({
      request: new Request(
        "https://beancount.io/oauth/mobile-consent?uid=mobile-1",
        { method: "POST", body: "decision=cancel" },
      ),
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api-gateway/oauth/interaction/mobile-1/login");
    expect(init.body).toBe("decision=cancel");
    expect(response.headers.get("location")).toContain("access_denied");
  });

  it("rejects an oversized declared Content-Length before reading the body", async () => {
    // The Request constructor strips forbidden headers like Content-Length,
    // so fake the minimal request surface the handler touches.
    const request = {
      url: CONSENT_URL,
      headers: new Headers({ "content-length": String(10 * 1024 * 1024) }),
      body: null,
    } as unknown as Request;

    const response = await handleConsentPost({ request });

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid Content-Length", async () => {
    const request = {
      url: CONSENT_URL,
      headers: new Headers({ "content-length": "not-a-number" }),
      body: null,
    } as unknown as Request;

    const response = await handleConsentPost({ request });

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a streamed body that exceeds the cap without buffering it", async () => {
    const oversizedChunk = new Uint8Array(64 * 1024 + 1);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(oversizedChunk);
        controller.close();
      },
    });
    const request = new Request(CONSENT_URL, {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);

    const response = await handleConsentPost({ request });

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
