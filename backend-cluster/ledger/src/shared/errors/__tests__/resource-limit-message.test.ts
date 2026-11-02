import { ResourceLimitReachedError } from "../domain-errors";

describe("ResourceLimitReachedError", () => {
  it("states the limit and leaves what to do to the client", () => {
    // Every limit this service raises is one no plan lifts, so a sentence
    // telling people to upgrade is wrong on all of them (ADR 001 D13).
    expect(new ResourceLimitReachedError("Ledger file", 5, 6).message).toBe(
      "Ledger file limit reached. Maximum: 5, Current: 6.",
    );
  });
});
