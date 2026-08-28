import { describe, expect, it } from "vitest";
import {
  initialMobileOAuthConsentState,
  mobileOAuthConsentReducer,
  type MobileOAuthConsentState,
} from "../mobile-consent-state";

function transition(
  state: MobileOAuthConsentState,
  action: Parameters<typeof mobileOAuthConsentReducer>[1],
) {
  return mobileOAuthConsentReducer(state, action);
}

describe("mobile OAuth consent state", () => {
  it("preserves registration identity through OTP into approval", () => {
    let state: MobileOAuthConsentState = { step: "login" };
    state = transition(state, { type: "show_register" });
    state = transition(state, {
      type: "registration_submitted",
      sessionId: "otp-session",
      email: "ada@example.test",
    });
    expect(state).toEqual({
      step: "otp",
      sessionId: "otp-session",
      email: "ada@example.test",
    });
    state = transition(state, {
      type: "authenticated",
      email: state.step === "otp" ? state.email : undefined,
    });
    expect(state).toEqual({
      step: "approve",
      email: "ada@example.test",
    });
  });

  it("returns an account switch to login without stale account copy", () => {
    expect(
      transition(
        { step: "approve", email: "old@example.test" },
        { type: "show_login" },
      ),
    ).toEqual({ step: "login" });
  });

  it("moves a password login directly to account-wide approval", () => {
    expect(
      transition(
        { step: "login" },
        { type: "authenticated", email: "ada@example.test" },
      ),
    ).toEqual({ step: "approve", email: "ada@example.test" });
  });

  it("lets a signed-in browser keep its account or start a fresh registration", () => {
    const chooser: MobileOAuthConsentState = {
      step: "choose_account",
      email: "old@example.test",
    };
    expect(
      transition(chooser, { type: "authenticated", email: "old@example.test" }),
    ).toEqual({ step: "approve", email: "old@example.test" });
    expect(transition(chooser, { type: "show_register" })).toEqual({
      step: "register",
    });
  });
});

describe("initialMobileOAuthConsentState", () => {
  it("opens a signed-out browser on login unless the app said Sign Up", () => {
    expect(
      initialMobileOAuthConsentState({
        userProfile: null,
        screenHint: undefined,
      }),
    ).toEqual({ step: "login" });
    expect(
      initialMobileOAuthConsentState({
        userProfile: null,
        screenHint: "signup",
      }),
    ).toEqual({ step: "register" });
  });

  it("never approves a signed-in browser silently when the app said Sign Up", () => {
    const userProfile = { email: "ada@example.test" };
    expect(
      initialMobileOAuthConsentState({ userProfile, screenHint: undefined }),
    ).toEqual({ step: "approve", email: "ada@example.test" });
    expect(
      initialMobileOAuthConsentState({ userProfile, screenHint: "signup" }),
    ).toEqual({ step: "choose_account", email: "ada@example.test" });
  });
});
