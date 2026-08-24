import { describe, expect, it } from "vitest";
import { mobileOauthConsentLoader } from "../mobile-loader";

function input(userProfile?: { email: string }) {
  return {
    context: { userProfile },
  } as Parameters<typeof mobileOauthConsentLoader>[0];
}

describe("mobileOauthConsentLoader", () => {
  it("preserves a signed-out interaction at the login step", async () => {
    await expect(mobileOauthConsentLoader(input())).resolves.toEqual({
      initialStep: "login",
    });
  });

  it("shows account-wide approval for the signed-in account", async () => {
    await expect(
      mobileOauthConsentLoader(input({ email: "ada@example.test" })),
    ).resolves.toEqual({
      initialStep: "approve",
      email: "ada@example.test",
    });
  });
});
