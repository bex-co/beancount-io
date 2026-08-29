/** The static public OAuth client shipped by the first-party native app. */
export const MOBILE_CLIENT_ID = "beancount-mobile";

export const MOBILE_REDIRECT_URIS = [
  "io.beancount.ios:/oauth/callback",
  "io.beancount.android:/oauth/callback",
] as const;
