import { describe, expect, it } from "vitest";
import { mobileOauthConsentLoader } from "../mobile-loader";

function input(
  userProfile: { email: string } | undefined,
  screenHint: "signup" | undefined,
) {
  return {
    context: { userProfile },
    deps: { screenHint },
  } as Parameters<typeof mobileOauthConsentLoader>[0];
}

describe("mobileOauthConsentLoader", () => {
  it("opens a signed-out interaction on login, or on registration for a Sign Up tap", async () => {
    await expect(
      mobileOauthConsentLoader(input(undefined, undefined)),
    ).resolves.toEqual({ initialState: { step: "login" } });
    await expect(
      mobileOauthConsentLoader(input(undefined, "signup")),
    ).resolves.toEqual({ initialState: { step: "register" } });
  });

  it("opens a signed-in browser on the one-tap continue step", async () => {
    const ada = { email: "ada@example.test" };
    await expect(
      mobileOauthConsentLoader(input(ada, undefined)),
    ).resolves.toEqual({
      initialState: { step: "continue", email: "ada@example.test" },
    });
    await expect(
      mobileOauthConsentLoader(input(ada, "signup")),
    ).resolves.toEqual({
      initialState: { step: "continue", email: "ada@example.test" },
    });
  });
});
