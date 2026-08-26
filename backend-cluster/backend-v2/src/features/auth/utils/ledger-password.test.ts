import {
  generateLedgerPassword,
  isCurrentLedgerPassword,
} from "./ledger-password";

describe("ledger password utilities", () => {
  it("generates a recognizable CSPRNG-backed password", () => {
    const mathRandom = jest
      .spyOn(Math, "random")
      .mockImplementation(() => {
        throw new Error("insecure PRNG called");
      });

    const password = generateLedgerPassword();

    expect(password).toMatch(/^v2_[A-Za-z0-9]{32}$/);
    expect(mathRandom).not.toHaveBeenCalled();
    mathRandom.mockRestore();
  });

  it("distinguishes current passwords from legacy alphanumeric values", () => {
    expect(isCurrentLedgerPassword("v2_secure-value")).toBe(true);
    expect(isCurrentLedgerPassword("LegacyAlphanumeric123")).toBe(false);
  });
});
