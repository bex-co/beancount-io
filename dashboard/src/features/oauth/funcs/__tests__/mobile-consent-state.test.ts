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
  it("preserves registration identity through OTP into auto-return", () => {
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
      step: "returning",
      email: "ada@example.test",
    });
  });

  it("returns an account switch to login without stale account copy", () => {
    expect(
      transition(
        { step: "continue", email: "old@example.test" },
        { type: "show_login" },
      ),
    ).toEqual({ step: "login" });
  });

  it("moves between login and password recovery without losing the consent flow", () => {
    const recovery = transition(
      { step: "login" },
      { type: "show_forgot_password" },
    );
    expect(recovery).toEqual({ step: "forgot_password" });
    expect(transition(recovery, { type: "show_login" })).toEqual({
      step: "login",
    });
  });

  it("moves a password login directly to returning without an approve step", () => {
    expect(
      transition(
        { step: "login" },
        { type: "authenticated", email: "ada@example.test" },
      ),
    ).toEqual({ step: "returning", email: "ada@example.test" });
  });

  it("lets a signed-in browser continue or start a fresh registration", () => {
    const chooser: MobileOAuthConsentState = {
      step: "continue",
      email: "old@example.test",
    };
    expect(
      transition(chooser, {
        type: "authenticated",
        email: "old@example.test",
      }),
    ).toEqual({ step: "returning", email: "old@example.test" });
    expect(transition(chooser, { type: "show_register" })).toEqual({
      step: "register",
    });
  });

  it("keeps uid/scope-facing retry by clearing only the return error", () => {
    const failed = transition(
      { step: "returning", email: "ada@example.test" },
      {
        type: "return_failed",
        email: "ada@example.test",
        error: "network down",
      },
    );
    expect(failed).toEqual({
      step: "returning",
      email: "ada@example.test",
      error: "network down",
    });
    expect(transition(failed, { type: "retry_return" })).toEqual({
      step: "returning",
      email: "ada@example.test",
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

  it("asks a signed-in browser to continue rather than auto-returning", () => {
    const userProfile = { email: "ada@example.test" };
    expect(
      initialMobileOAuthConsentState({ userProfile, screenHint: undefined }),
    ).toEqual({ step: "continue", email: "ada@example.test" });
    expect(
      initialMobileOAuthConsentState({ userProfile, screenHint: "signup" }),
    ).toEqual({ step: "continue", email: "ada@example.test" });
  });
});
