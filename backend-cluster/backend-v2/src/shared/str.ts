import { randomInt } from "node:crypto";
import { BadUserInputError } from "./errors";
import {
  LEDGER_OWNER_PATTERN,
  LEDGER_NAME_PATTERN,
  LEDGER_OWNER_RULE,
  LEDGER_NAME_RULE,
} from "./ledger-slug";

const RANDOM_STRING_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function getRandomString(length: number): string {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new RangeError("Random string length must be a non-negative integer");
  }

  let result = "";
  for (let i = 0; i < length; i++) {
    result += RANDOM_STRING_ALPHABET[randomInt(RANDOM_STRING_ALPHABET.length)];
  }
  return result;
}

export function getLedgerUsername(email: string): string {
  return email
    .split("@")[0]
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

export function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString("base64url");
}

export function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString();
}

export function createLedgerId(owner: string, name: string): string {
  validateLedgerSlugs(owner, name);
  return `${owner}/${name}`;
}

function validateLedgerSlugs(owner: string, name: string): void {
  if (!LEDGER_OWNER_PATTERN.test(owner)) {
    throw new BadUserInputError(LEDGER_OWNER_RULE, "owner");
  }
  if (!LEDGER_NAME_PATTERN.test(name)) {
    throw new BadUserInputError(LEDGER_NAME_RULE, "name");
  }
}

export function parseLedgerId(id: string): {
  ledgerOwner: string;
  ledgerName: string;
} {
  if (!id) {
    throw new BadUserInputError("Ledger ID cannot be empty", "ledgerId");
  }

  const slashIndex = id.indexOf("/");
  if (slashIndex === -1) {
    throw new BadUserInputError(
      "Invalid ledger ID: must contain '/' separator",
      "ledgerId",
    );
  }

  const ledgerOwner = id.substring(0, slashIndex);
  const ledgerName = id.substring(slashIndex + 1);

  if (!ledgerOwner || !ledgerName) {
    throw new BadUserInputError(
      "Invalid ledger ID: owner and name cannot be empty",
      "ledgerId",
    );
  }

  validateLedgerSlugs(ledgerOwner, ledgerName);
  return { ledgerOwner, ledgerName };
}
