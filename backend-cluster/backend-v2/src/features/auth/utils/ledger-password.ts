import { getRandomString } from "@/shared/str";

const LEDGER_PASSWORD_PREFIX = "v2_";
const LEDGER_PASSWORD_RANDOM_LENGTH = 32;

export function generateLedgerPassword(): string {
  return `${LEDGER_PASSWORD_PREFIX}${getRandomString(
    LEDGER_PASSWORD_RANDOM_LENGTH,
  )}`;
}
