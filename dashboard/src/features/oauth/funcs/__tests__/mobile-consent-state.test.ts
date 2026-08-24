import { describe, expect, it } from "vitest";
import {
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
});
