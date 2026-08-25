import { randomInt } from "node:crypto";

const RANDOM_STRING_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function getRandomString(length: number): string {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new RangeError("Random string length must be a non-negative integer");
  }

  let result = "";
  for (let i = 0; i < length; i++) {
    // randomInt uses rejection sampling internally, avoiding both predictable
    // Math.random() output and modulo bias.
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
  return `${owner}/${name}`;
}

// Any mix of URL-safe repo-name characters, rejecting only the traversal
// segments "." / "..". Must accept every name the creation pipeline allows
// (slugifyLedgerName + validateLedgerName: `^[a-z0-9_-]+$`, so a leading
// underscore is legal) and every legacy name the identical pre-port Python
// slugify produced — a stricter charset here would permanently lock such
// repos out of every parseLedgerId call site.
const GITEA_PATH_SEGMENT_RE = /^(?!\.\.?$)[A-Za-z0-9_.-]{1,100}$/u;

export function parseLedgerId(id: string): {
  ledgerOwner: string;
  ledgerName: string;
} {
  if (!id) {
    throw new Error("Ledger ID cannot be empty");
  }

  const slashIndex = id.indexOf("/");
  if (slashIndex === -1) {
    throw new Error("Invalid ledger ID: must contain '/' separator");
  }
  if (slashIndex !== id.lastIndexOf("/")) {
    throw new Error("Invalid ledger ID: must contain exactly one separator");
  }

  const ledgerOwner = id.substring(0, slashIndex);
  const ledgerName = id.substring(slashIndex + 1);

  if (!ledgerOwner || !ledgerName) {
    throw new Error("Invalid ledger ID: owner and name cannot be empty");
  }
  if (
    !GITEA_PATH_SEGMENT_RE.test(ledgerOwner) ||
    !GITEA_PATH_SEGMENT_RE.test(ledgerName)
  ) {
    throw new Error(
      "Invalid ledger ID: owner or name contains unsafe characters",
    );
  }

  return { ledgerOwner, ledgerName };
}
