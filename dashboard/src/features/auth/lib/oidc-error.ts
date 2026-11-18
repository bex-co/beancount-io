import { searchEnum } from "@/common/lib/search-params/tolerant";

const OIDC_ERROR_KEYS = {
  email_in_use: "auth.oidcErrorEmailInUse",
  email_unverified: "auth.oidcErrorEmailUnverified",
  blocked: "auth.oidcErrorBlocked",
  already_linked: "auth.oidcErrorAlreadyLinked",
  account_linked: "auth.oidcErrorAccountLinked",
  not_allowed: "auth.oidcErrorNotAllowed",
  failed: "auth.oidcErrorFailed",
} as const;

type OidcError = keyof typeof OIDC_ERROR_KEYS;

const OIDC_ERRORS = Object.keys(OIDC_ERROR_KEYS) as [OidcError, ...OidcError[]];

/** The `oidcError` search param the backend adds after a failed sign-in or link. */
export const oidcErrorSearch = () => searchEnum(OIDC_ERRORS);

export const oidcErrorKey = (code: OidcError) => OIDC_ERROR_KEYS[code];
