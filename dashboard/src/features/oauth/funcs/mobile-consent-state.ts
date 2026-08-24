export type MobileOAuthConsentState =
  | { step: "login" | "register" }
  | { step: "otp"; sessionId: string; email: string }
  | { step: "approve"; email?: string };

export type MobileOAuthConsentAction =
  | { type: "show_login" }
  | { type: "show_register" }
  | { type: "registration_submitted"; sessionId: string; email: string }
  | { type: "authenticated"; email?: string };

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
