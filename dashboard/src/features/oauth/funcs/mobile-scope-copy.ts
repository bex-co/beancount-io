const MOBILE_SCOPE_COPY = {
  openid: "auth.oauthMobileScopeIdentity",
  offline_access: "auth.oauthMobileScopeOfflineAccess",
  "ledger.read": "auth.oauthMobileScopeRead",
  "ledger.write": "auth.oauthMobileScopeWrite",
  "ledger.admin": "auth.oauthMobileScopeAdmin",
} as const;

type MobileScopeTranslationKey =
  (typeof MOBILE_SCOPE_COPY)[keyof typeof MOBILE_SCOPE_COPY];

type TranslateMobileScope = (key: MobileScopeTranslationKey) => string;

export function describeMobileScopes(
  scope: string,
  translate: TranslateMobileScope,
): string[] {
  return [...new Set(scope.split(/\s+/).filter(Boolean))].map((requested) => {
    const key = MOBILE_SCOPE_COPY[requested as keyof typeof MOBILE_SCOPE_COPY];
    return key ? translate(key) : requested;
  });
}
