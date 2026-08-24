import { oauthRedirectUriForPlatform } from "../native-redirect-value";

describe("native OAuth redirects", () => {
  it("uses the exact registered reverse-domain callback for each platform", () => {
    expect(oauthRedirectUriForPlatform("ios")).toBe(
      "io.beancount.ios:/oauth/callback",
    );
    expect(oauthRedirectUriForPlatform("android")).toBe(
      "io.beancount.android:/oauth/callback",
    );
  });
});
