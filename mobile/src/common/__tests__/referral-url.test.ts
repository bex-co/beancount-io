import { buildReferralUrl } from "../referral-url";

describe("buildReferralUrl", () => {
  it("builds a fully qualified canonical sign-up URL", () => {
    expect(buildReferralUrl("ios", "referrer-123")).toBe(
      "https://beancount.io/auth/sign-up?src=ios&by=referrer-123",
    );
  });

  it("encodes referral values as query parameters", () => {
    expect(buildReferralUrl("ios beta", "user/id")).toBe(
      "https://beancount.io/auth/sign-up?src=ios+beta&by=user%2Fid",
    );
  });
});
