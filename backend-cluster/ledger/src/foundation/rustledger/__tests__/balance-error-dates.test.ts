import { withBalanceErrorDates } from "../balance-error-dates";

// w21/677: the validator's balance failure has a file and line but no date.
const FILES = {
  "main.bean": [
    "2026-01-01 open Liabilities:Card",
    "2026-02-01 balance Liabilities:Card  0.00 USD",
    "2026-03-01 balance Liabilities:Card  0.00 USD",
    "",
  ].join("\n"),
};
const error = (line: number | null, code = "E2001") => ({
  message: "Balance failed",
  code,
  phase: "validate",
  hint: null,
  file: "main.bean",
  line,
  column: 1,
  end_line: null,
  end_column: null,
  severity: "error" as const,
});

describe("withBalanceErrorDates", () => {
  it("adds the date written on the failing line", () => {
    expect(withBalanceErrorDates([error(3)], FILES)[0]).toMatchObject({
      date: "2026-03-01",
    });
    expect(withBalanceErrorDates([error(2, "E2002")], FILES)[0]).toMatchObject({
      date: "2026-02-01",
    });
  });

  it("leaves other errors, and lines that are not a balance, as they were", () => {
    const other = error(3, "E1001");
    expect(withBalanceErrorDates([other], FILES)[0]).toBe(other);
    const open = error(1);
    expect(withBalanceErrorDates([open], FILES)[0]).toBe(open);
    const unlocated = error(null);
    expect(withBalanceErrorDates([unlocated], FILES)[0]).toBe(unlocated);
  });

  // w21/706: the source was split again for every failing balance, so 4000 of
  // them took seconds.
  it("dates 4000 failing balances in one pass over the file", () => {
    const day = (n: number) =>
      new Date(Date.UTC(2000, 0, 1) + n * 86_400_000)
        .toISOString()
        .slice(0, 10);
    const lines = ["2000-01-01 open Assets:Cash"];
    for (let i = 1; i <= 4000; i += 1) {
      lines.push(`${day(i)} balance Assets:Cash  ${i}.00 USD`);
    }
    const files = { "main.bean": lines.join("\n") };
    const errors = lines.slice(1).map((_, i) => error(i + 2));
    const started = Date.now();
    const dated = withBalanceErrorDates(errors, files);
    expect(Date.now() - started < 1000).toBe(true);
    expect(dated[3999]).toMatchObject({ date: day(4000) });
  });
});
