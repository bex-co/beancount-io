import { valueCurrencyTargets, valueTargetError } from "../value-target-guard";

describe("valueCurrencyTargets (w23/184)", () => {
  it.each([
    ["SELECT value(position, 'EUR')", ["EUR"]],
    ['select VALUE ( position , "usd" ) from postings', ["usd"]],
    [
      "SELECT value(sum(position), 'GBP'), value(position, 'JPY')",
      ["GBP", "JPY"],
    ],
    ["SELECT value(convert(position, 'USD'), 'EUR')", ["EUR"]],
  ])("extracts the literal targets of %p", (query, expected) => {
    expect(valueCurrencyTargets(query)).toEqual(expected);
  });

  it.each([
    "SELECT value(position)",
    "SELECT value(position, date('2025-01-01'))",
    "SELECT value(position, currency)",
    "SELECT value(position, 'USD', 'x')",
    "SELECT narration WHERE narration ~ \"value(position, 'ZZZ')\"",
    "SELECT my.value(position, 'ZZZ')",
    "SELECT revalue(position, 'ZZZ')",
  ])("abstains on %p", (query) => {
    expect(valueCurrencyTargets(query)).toEqual([]);
  });
});

describe("valueTargetError (w23/184)", () => {
  const known = () => new Set(["USD", "EUR"]);

  it("refuses an unknown or miscased target, listing what the ledger names", () => {
    for (const target of ["BOGUS", "usd", "GBP"]) {
      const refused = valueTargetError(
        `SELECT value(position, '${target}')`,
        known,
      );
      expect(refused?.rows).toEqual([]);
      expect(refused?.errors[0]).toMatchObject({
        severity: "error",
        message: expect.stringContaining(
          `"${target}" is not a currency in this ledger (EUR, USD)`,
        ),
      });
    }
  });

  it("lets a known target and non-literal forms through without scanning the ledger", () => {
    expect(
      valueTargetError("SELECT value(position, 'EUR')", known),
    ).toBeUndefined();
    const scan = jest.fn(() => new Set<string>());
    expect(valueTargetError("SELECT value(position)", scan)).toBeUndefined();
    expect(
      valueTargetError("SELECT value(position, currency)", scan),
    ).toBeUndefined();
    expect(scan).not.toHaveBeenCalled();
  });
});
