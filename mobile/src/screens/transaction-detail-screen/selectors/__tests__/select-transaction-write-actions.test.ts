import { shouldShowTransactionWriteActions } from "../select-transaction-write-actions";

describe("shouldShowTransactionWriteActions", () => {
  it("hides write controls for a read-only public reader with source context", () => {
    expect(shouldShowTransactionWriteActions(false, "abc123")).toBe(false);
  });

  it("hides write controls for a writer still awaiting source context", () => {
    expect(shouldShowTransactionWriteActions(true, undefined)).toBe(false);
    expect(shouldShowTransactionWriteActions(true, null)).toBe(false);
    expect(shouldShowTransactionWriteActions(true, "")).toBe(false);
  });

  it("shows write controls for a writer with ready source context", () => {
    expect(shouldShowTransactionWriteActions(true, "abc123")).toBe(true);
  });

  it("clears write controls when permission is revoked", () => {
    expect(shouldShowTransactionWriteActions(true, "abc123")).toBe(true);
    expect(shouldShowTransactionWriteActions(false, "abc123")).toBe(false);
  });
});
