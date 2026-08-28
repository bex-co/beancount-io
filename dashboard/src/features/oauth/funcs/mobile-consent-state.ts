import type { MobileConsentSearch } from "./mobile-consent-search";

export type MobileOAuthConsentState =
  | { step: "login" | "register" }
  | { step: "otp"; sessionId: string; email: string }
  | { step: "choose_account"; email: string }
  | { step: "approve"; email?: string };

export type MobileOAuthConsentAction =
  | { type: "show_login" }
  | { type: "show_register" }
  | { type: "registration_submitted"; sessionId: string; email: string }
  | { type: "authenticated"; email?: string };

export type MobileOAuthScreenHint = MobileConsentSearch["screen_hint"];

/**
 * The sign-up hint only ever adds a step in the user's favour: a signed-out
 * browser opens on registration instead of login, and a signed-in one is asked
 * which account to use instead of being approved straight into the existing
 * one — the silent path that made a "Sign Up" tap look like a broken sign-up.
 */
export function initialMobileOAuthConsentState({
  userProfile,
  screenHint,
}: {
  userProfile?: { email: string } | null;
  screenHint: MobileOAuthScreenHint;
}): MobileOAuthConsentState {
  if (userProfile) {
    return screenHint === "signup"
      ? { step: "choose_account", email: userProfile.email }
      : { step: "approve", email: userProfile.email };
  }
  return { step: screenHint === "signup" ? "register" : "login" };
}

export function mobileOAuthConsentReducer(
  _state: MobileOAuthConsentState,
  action: MobileOAuthConsentAction,
): MobileOAuthConsentState {
  switch (action.type) {
    case "show_login":
      return { step: "login" };
    case "show_register":
      return { step: "register" };
    case "registration_submitted":
      return {
        step: "otp",
        sessionId: action.sessionId,
        email: action.email,
      };
    case "authenticated":
      return { step: "approve", email: action.email };
  }
}
