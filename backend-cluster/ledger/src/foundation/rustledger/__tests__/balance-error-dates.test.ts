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
});
