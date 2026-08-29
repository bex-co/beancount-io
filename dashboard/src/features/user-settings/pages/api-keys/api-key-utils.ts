import type { ApiKeysQuery } from "@/graphql/definitions";

export const API_KEY_SCOPES = [
  "ledger.read",
  "ledger.write",
  "ledger.admin",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];
export type ApiKeyListItem = ApiKeysQuery["apiKeys"][number];
export type ApiKeyStatus = "active" | "expired" | "revoked";

export function getApiKeyStatus(
  key: Pick<ApiKeyListItem, "expiresAt" | "revokedAt">,
  now = new Date(),
): ApiKeyStatus {
  if (key.revokedAt) {
    return "revoked";
  }

  if (key.expiresAt && new Date(key.expiresAt).getTime() <= now.getTime()) {
    return "expired";
  }

  return "active";
}

export function isValidLedgerScope(value: string): boolean {
  return /^[^/\s]+\/[^/\s]+$/.test(value);
}

export function expirationDateToIso(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T23:59:59.999Z`).toISOString();
}
