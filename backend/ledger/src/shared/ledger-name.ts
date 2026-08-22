import { BadUserInputError } from "@/shared/errors";

/**
 * Ledger-name slugify + validation, ported line-for-line from the Python
 * service (`app/api/ledger.py::slugify` + `app/utils/security.py`). Error
 * messages are byte-matched — the parity suites compare them.
 */

const RESERVED_NAMES = new Set([".git"]);
const DANGEROUS_PATTERNS = ["..", "~", "\\"];

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function securityError(name: string): string | null {
  if (RESERVED_NAMES.has(name.toLowerCase())) {
    return `Name '${name}' is reserved and cannot be used`;
  }
  for (const pattern of DANGEROUS_PATTERNS) {
    if (name.includes(pattern)) {
      return `Name contains dangerous pattern: ${pattern}`;
    }
  }
  for (const char of name) {
    const code = char.charCodeAt(0);
    if (code < 32 || code === 127) {
      return "Name contains control characters or null bytes";
    }
  }
  if (name.startsWith(".") || name.endsWith(".")) {
    return "Name cannot start or end with dots";
  }
  if (!name || name.trim() === "") {
    return "Name cannot be empty";
  }
  if (!/[a-z0-9]/.test(name.toLowerCase())) {
    return "Name must contain at least one letter or number";
  }
  return null;
}

/** Python `validate_ledger_name` — throws 400 with the exact Python detail. */
export function validateLedgerName(slugifiedName: string): void {
  const fail = (detail: string): never => {
    throw new BadUserInputError(detail);
  };
  if (!slugifiedName) {
    fail("Ledger name must contain at least one alphanumeric character");
  }
  if (slugifiedName.length > 100) {
    fail(
      `Ledger name is too long (${slugifiedName.length} characters). Maximum is 100 characters after transformation`,
    );
  }
  if (!/^[a-z0-9_-]+$/.test(slugifiedName)) {
    fail(
      "Ledger name can only contain lowercase letters, numbers, underscores, and hyphens",
    );
  }
  if (slugifiedName.startsWith("-") || slugifiedName.endsWith("-")) {
    fail("Ledger name cannot start or end with a hyphen");
  }
  if (!/[a-z0-9]/.test(slugifiedName)) {
    fail("Ledger name must contain at least one letter or number");
  }
  const securityMessage = securityError(slugifiedName);
  if (securityMessage) {
    fail(`Invalid ledger name: ${securityMessage}`);
  }
}
