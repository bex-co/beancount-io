import { ledgerRowDescription } from "../ledger-row-description";

describe("ledgerRowDescription", () => {
  it("omits the description line for a ledger without one", () => {
    expect(ledgerRowDescription(null)).toBe(null);
    expect(ledgerRowDescription(undefined)).toBe(null);
    expect(ledgerRowDescription("")).toBe(null);
  });

  it("treats a whitespace-only description as none", () => {
    expect(ledgerRowDescription("  \n\t ")).toBe(null);
  });

  it("keeps a real description as written", () => {
    expect(ledgerRowDescription("Alphabet Inc. Financial Statements")).toBe(
      "Alphabet Inc. Financial Statements",
    );
  });
});
