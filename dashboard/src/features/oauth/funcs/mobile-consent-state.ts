import type { MobileConsentSearch } from "./mobile-consent-search";

export type MobileOAuthConsentState =
  | { step: "login" | "forgot_password" | "register" }
  | { step: "otp"; sessionId: string; email: string }
  | { step: "continue"; email: string }
  | { step: "returning"; email?: string; error?: string };

export type MobileOAuthConsentAction =
  | { type: "show_login" }
  | { type: "show_forgot_password" }
  | { type: "show_register" }
  | { type: "registration_submitted"; sessionId: string; email: string }
  | { type: "authenticated"; email?: string }
  | { type: "return_failed"; email?: string; error: string }
  | { type: "retry_return" };

export type MobileOAuthScreenHint = MobileConsentSearch["screen_hint"];

/**
 * A signed-in browser always needs one tap before the custom-scheme redirect
 * (RFC 8252 §8.6). The sign-up hint only changes copy/actions on that step —
 * never auto-approves into the existing account.
 */
export function initialMobileOAuthConsentState({
  userProfile,
  screenHint,
}: {
  userProfile?: { email: string } | null;
  screenHint: MobileOAuthScreenHint;
}): MobileOAuthConsentState {
  if (userProfile) {
    return { step: "continue", email: userProfile.email };
  }
  return { step: screenHint === "signup" ? "register" : "login" };
}

export function mobileOAuthConsentReducer(
  state: MobileOAuthConsentState,
  action: MobileOAuthConsentAction,
): MobileOAuthConsentState {
  switch (action.type) {
    case "show_login":
      return { step: "login" };
    case "show_forgot_password":
      return { step: "forgot_password" };
    case "show_register":
      return { step: "register" };
    case "registration_submitted":
      return {
        step: "otp",
        sessionId: action.sessionId,
        email: action.email,
      };
    case "authenticated":
      return { step: "returning", email: action.email };
    case "return_failed":
      return {
        step: "returning",
        email: action.email,
        error: action.error,
      };
    case "retry_return":
      if (state.step !== "returning") {
        return state;
      }
      return { step: "returning", email: state.email };
  }
}
