const MOBILE_SCOPE_COPY: Record<string, string> = {
  openid: "Identify the account you approve",
  offline_access: "Stay signed in securely until you revoke access",
  "ledger.read": "Read your ledgers",
  "ledger.write": "Create and update ledger data",
  "ledger.admin": "Manage ledgers and collaborators",
};

export function describeMobileScopes(scope: string): string[] {
  return [...new Set(scope.split(/\s+/).filter(Boolean))].map(
    (requested) => MOBILE_SCOPE_COPY[requested] ?? requested,
  );
}
