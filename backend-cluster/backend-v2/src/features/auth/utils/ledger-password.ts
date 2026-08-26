import { getRandomString } from "@/shared/str";

// The legacy generator could never produce an underscore, so this prefix is a
// durable version marker in the existing column without a schema migration.
export const LEDGER_PASSWORD_VERSION_PREFIX = "v2_";
const LEDGER_PASSWORD_RANDOM_LENGTH = 32;

export function generateLedgerPassword(): string {
  return `${LEDGER_PASSWORD_VERSION_PREFIX}${getRandomString(
    LEDGER_PASSWORD_RANDOM_LENGTH,
  )}`;
}

export function isCurrentLedgerPassword(password: string): boolean {
  return password.startsWith(LEDGER_PASSWORD_VERSION_PREFIX);
}
