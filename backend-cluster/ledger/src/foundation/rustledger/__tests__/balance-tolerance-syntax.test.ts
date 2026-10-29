import { midCurrencyToleranceErrors } from "../balance-tolerance-syntax";

const run = (main: string, extra: Record<string, string> = {}) =>
  midCurrencyToleranceErrors(
    { "main.beancount": main, ...extra },
    "main.beancount",
  );

describe("midCurrencyToleranceErrors (w23/197)", () => {
  it("flags the stock-invalid `USD ~` spelling at its line, once per line", () => {
    const errors = run(
      [
        "2026-01-01 open Assets:Cash",
        "2026-08-30 balance Assets:Cash 49.75 USD ~ 0.05 USD",
        "2026-08-31\tbalance  Assets:Cash  1,000.50 EUR~0.01 EUR",
        "",
      ].join("\n"),
    );
    expect(errors.map((e) => [e.line, e.severity, e.file])).toEqual([
      [2, "error", "main.beancount"],
      [3, "error", "main.beancount"],
    ]);
    expect(errors[0]?.message).toContain('"USD ~"');
  });

  it("reads included files too", () => {
    const errors = midCurrencyToleranceErrors(
      {
        "main.beancount": 'include "sub.beancount"\n',
        "sub.beancount": "2026-08-30 balance Assets:Cash 5 USD ~ 1 USD\n",
      },
      "main.beancount",
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]?.file).toBe("sub.beancount");
  });

  it.each([
    // The valid spelling: `~` straight after the number.
    "2026-08-30 balance Assets:Cash 49.75 ~ 0.05 USD",
    "2026-08-30 balance Assets:Cash 49.75 USD",
    "2026-08-30 balance Assets:Cash 49.75 + 1 USD",
    // Not a balance directive, or not at column 0 / not a date.
    '2026-08-30 * "balance Assets:Cash 49.75 USD ~ 0.05 USD"',
    "  ; 2026-08-30 balance Assets:Cash 49.75 USD ~ 0.05 USD",
    "  2026-08-30 balance Assets:Cash 49.75 USD ~ 0.05 USD",
    'option "title" "balance A 1 USD ~ 1 USD"',
    "2026-08-30 price USD 1.0 EUR ~ 2 EUR",
  ])("leaves %p alone", (line) => {
    expect(run(`${line}\n`)).toEqual([]);
  });
});
