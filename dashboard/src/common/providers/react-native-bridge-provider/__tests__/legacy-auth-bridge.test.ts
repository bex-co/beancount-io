import { afterEach, describe, expect, it, vi } from "vitest";
import { postLegacyMobileAuthToken } from "../legacy-auth-bridge";

vi.mock("@/common/analytics", () => ({ track: vi.fn() }));

describe("postLegacyMobileAuthToken", () => {
  afterEach(() => {
    delete window.ReactNativeWebView;
  });

  it("does not broadcast a bearer token in an ordinary browser", () => {
    const broadcast = vi.spyOn(window, "postMessage");
    postLegacyMobileAuthToken("secret-token", "password");
    expect(broadcast).not.toHaveBeenCalled();
    broadcast.mockRestore();
  });

  it("preserves the old WebView payload only when the bridge is present", () => {
    const postMessage = vi.fn();
    window.ReactNativeWebView = { postMessage };
    postLegacyMobileAuthToken("legacy-token", "otp");
    expect(postMessage).toHaveBeenCalledWith(
      JSON.stringify({ authToken: "legacy-token" }),
    );
  });
});
