import { describe, expect, it } from "vitest";
import {
  expirationDateToIso,
  getApiKeyStatus,
  isValidLedgerScope,
} from "../api-key-utils";

describe("personal access token utilities", () => {
  const now = new Date("2026-08-29T12:00:00.000Z");

  it("distinguishes active, expired, and revoked tokens", () => {
    expect(getApiKeyStatus({ expiresAt: null, revokedAt: null }, now)).toBe(
      "active",
    );
    expect(
      getApiKeyStatus(
        { expiresAt: "2026-08-28T23:59:59.999Z", revokedAt: null },
        now,
      ),
    ).toBe("expired");
    expect(
      getApiKeyStatus(
        {
          expiresAt: "2026-09-30T23:59:59.999Z",
          revokedAt: "2026-08-20T10:00:00.000Z",
        },
        now,
      ),
    ).toBe("revoked");
  });

  it("accepts exactly one owner/name ledger restriction", () => {
    expect(isValidLedgerScope("alice/books")).toBe(true);
    expect(isValidLedgerScope("alice")).toBe(false);
    expect(isValidLedgerScope("alice/books/extra")).toBe(false);
    expect(isValidLedgerScope("alice/my books")).toBe(false);
  });

  it("converts an expiration date to the end of its UTC day", () => {
    expect(expirationDateToIso("2026-09-30")).toBe("2026-09-30T23:59:59.999Z");
    expect(expirationDateToIso("")).toBeUndefined();
  });
});
