import { describe, expect, it } from "vitest";
import { withLedgerFileTitlePrefix } from "../ledger-file-title";

describe("withLedgerFileTitlePrefix", () => {
  it("prefixes the localized Files title with the blob path", () => {
    expect(
      withLedgerFileTitlePrefix("accounts.bean", "Files - budgeting-envelopes"),
    ).toBe("accounts.bean · Files - budgeting-envelopes");
  });

  it("keeps the generic Files title when no path is present", () => {
    expect(withLedgerFileTitlePrefix("", "Files - budgeting-envelopes")).toBe(
      "Files - budgeting-envelopes",
    );
  });
});
