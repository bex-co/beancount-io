import { isOAuthCallbackUrl } from "../oauth-callback-url";

describe("isOAuthCallbackUrl", () => {
  it("recognizes the registered custom-scheme callbacks", () => {
    expect(
      isOAuthCallbackUrl("io.beancount.ios:/oauth/callback?code=abc&state=xyz"),
    ).toBe(true);
    expect(
      isOAuthCallbackUrl(
        "io.beancount.android:/oauth/callback?code=abc&state=xyz",
      ),
    ).toBe(true);
  });

  it("leaves ledger https URLs alone", () => {
    expect(
      isOAuthCallbackUrl(
        "https://beancount.io/ledger/open_ledger/example/balance-sheet",
      ),
    ).toBe(false);
  });
});
