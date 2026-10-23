import type { BeancountErrorPublic } from "@/foundation/ledger-api-types";
import { newLedgerErrors, refuseNewLedgerErrors } from "../new-ledger-errors";
import { NewLedgerErrorsError } from "@/shared/errors";

const at = (message: string, filename: string, lineno: number) => ({
  message,
  source: { filename, lineno },
});

describe("newLedgerErrors", () => {
  it("returns only the errors the projection adds", () => {
    const before = [at("Balance failed for Assets:Cash", "main.bean", 4)];
    const after = [
      at("Balance failed for Assets:Cash", "main.bean", 4),
      at("Duplicate open directive for Assets:Cash", "main.bean", 12),
    ];
    expect(newLedgerErrors(before, after)).toEqual([
      at("Duplicate open directive for Assets:Cash", "main.bean", 12),
    ]);
  });

  it("treats the same message at another position as new", () => {
    const before = [
      at("Duplicate open directive for Assets:Cash", "main.bean", 3),
    ];
    const after = [
      at("Duplicate open directive for Assets:Cash", "main.bean", 3),
      at("Duplicate open directive for Assets:Cash", "main.bean", 9),
    ];
    expect(newLedgerErrors(before, after)).toEqual([after[1]]);
  });

  // w21/367: interpolation and lot-match errors end with the entry's date and
  // narration, so editing either made the existing error read as a new one.
  describe("an error that quotes the entry's date and narration", () => {
    const interpolation = (date: string, narration: string) =>
      `interpolation failed: cannot infer currency for posting to account Expenses:QaInterp (${date}, "${narration}")`;
    const lot = (date: string, narration: string) =>
      `Ambiguous lot match for 10 AAPL {} (${date}, "${narration}")`;

    it("is not new after a narration-only edit", () => {
      const before = [
        at(interpolation("2026-08-30", "Groceries"), "main.bean", 3),
      ];
      const after = [
        at(interpolation("2026-08-30", "Groceries edited"), "main.bean", 3),
      ];
      expect(newLedgerErrors(before, after)).toEqual([]);
    });

    it("is not new after a date-only edit, nor for a lot match", () => {
      expect(
        newLedgerErrors(
          [at(interpolation("2026-08-30", "Groceries"), "main.bean", 3)],
          [at(interpolation("2026-09-02", "Groceries"), "main.bean", 3)],
        ),
      ).toEqual([]);
      expect(
        newLedgerErrors(
          [at(lot("2026-03-01", "Sell"), "main.bean", 8)],
          [at(lot("2026-03-04", 'Sell "all"'), "main.bean", 8)],
        ),
      ).toEqual([]);
    });

    it("still counts a second broken entry, a different message and another file as new", () => {
      const old = at(interpolation("2026-08-30", "Groceries"), "main.bean", 3);
      const second = at(interpolation("2026-09-01", "Rent"), "main.bean", 9);
      expect(newLedgerErrors([old], [old, second])).toEqual([second]);
      const other = at(
        'interpolation failed: cannot infer currency for posting to account Expenses:Other (2026-08-30, "Groceries")',
        "main.bean",
        3,
      );
      expect(newLedgerErrors([old], [other])).toEqual([other]);
      const elsewhere = at(old.message, "other.bean", 3);
      expect(newLedgerErrors([old], [elsewhere])).toEqual([elsewhere]);
    });
  });

  it("matches errors without a source by message", () => {
    expect(
      newLedgerErrors(
        [{ message: "Plugin failed" }],
        [{ message: "Plugin failed" }],
      ),
    ).toEqual([]);
    expect(newLedgerErrors([], [{ message: "Plugin failed" }])).toEqual([
      { message: "Plugin failed" },
    ]);
  });

  it("finds nothing new for a clean write", () => {
    expect(newLedgerErrors([], [])).toEqual([]);
  });
});

// w21/681: an assertion with a `~` tolerance that already fails changed its
// "got" figure with any add above it, so the same error read as a new one.
describe("an explicit-tolerance balance failure", () => {
  const exceeds = (got: string, difference: string): BeancountErrorPublic => ({
    message: `Balance exceeds explicit tolerance for Assets:Tol: expected 100 USD ~ 0.01, got ${got} USD (difference: ${difference})`,
    severity: "error",
    source: { filename: "main.bean", lineno: 9 },
  });

  it("is not new when only the reached figure changed", () => {
    expect(
      newLedgerErrors([exceeds("0", "100")], [exceeds("-5.00", "105.00")]),
    ).toEqual([]);
  });

  it("still counts a failure on another account or expected amount as new", () => {
    const other = {
      ...exceeds("0", "100"),
      message: exceeds("0", "100").message.replace(
        "Assets:Tol",
        "Assets:Other",
      ),
    };
    expect(newLedgerErrors([exceeds("0", "100")], [other])).toEqual([other]);
    const amount = {
      ...exceeds("0", "100"),
      message: exceeds("0", "100").message.replace(
        "expected 100",
        "expected 200",
      ),
    };
    expect(newLedgerErrors([exceeds("0", "100")], [amount])).toEqual([amount]);
  });

  it("counts an assertion that was passing and now fails", () => {
    expect(newLedgerErrors([], [exceeds("90", "10")])).toHaveLength(1);
  });
});

describe("newLedgerErrors after an edit or delete", () => {
  it("does not count an existing error the write moved to another line", () => {
    // Deleting a block above it shifts the duplicate open up (w21/m1).
    const before = [
      at("Duplicate open directive for Assets:Cash", "main.bean", 90),
    ];
    const after = [
      at("Duplicate open directive for Assets:Cash", "main.bean", 87),
    ];
    expect(newLedgerErrors(before, after)).toEqual([]);
  });

  it("keeps the same message in another file apart", () => {
    const before = [
      at("Duplicate open directive for Assets:Cash", "a.bean", 3),
    ];
    const after = [at("Duplicate open directive for Assets:Cash", "b.bean", 3)];
    expect(newLedgerErrors(before, after)).toEqual(after);
  });
});

describe("refuseNewLedgerErrors", () => {
  const balance = at(
    "Balance failed for Assets:Cash: expected 49.75 USD, got 73.25 USD",
    "main.bean",
    84,
  );

  it("never reads today's errors for a clean projection", async () => {
    const before = jest.fn(async () => []);
    await refuseNewLedgerErrors([], before, "delete");
    expect(before).not.toHaveBeenCalled();
  });

  it("refuses an introduced error, naming the write", async () => {
    await expect(
      refuseNewLedgerErrors([balance], async () => [], "delete"),
    ).rejects.toMatchObject({
      constructor: NewLedgerErrorsError,
      message:
        "this deletion would introduce 1 new bean-check error: Balance failed for Assets:Cash: expected 49.75 USD, got 73.25 USD (main.bean:84)",
      metadata: {
        code: "NEW_LEDGER_ERRORS",
        details: { count: 1, action: "delete" },
      },
    });
  });

  // w21/369: a parse error repeats; naming it once says the same thing.
  it("names an error that repeats at one place once", async () => {
    const parse = (lineno: number) =>
      at("parse error: unexpected input", "2024.bean", lineno);
    await expect(
      refuseNewLedgerErrors(
        [parse(7), parse(7), parse(7), parse(9)],
        async () => [],
        "update",
      ),
    ).rejects.toMatchObject({
      message:
        "this edit would introduce 2 new bean-check errors: parse error: unexpected input (2024.bean:7); parse error: unexpected input (2024.bean:9)",
      metadata: { details: { count: 2 } },
    });
  });

  it("lets a write through that leaves only errors the ledger had", async () => {
    await expect(
      refuseNewLedgerErrors([balance], async () => [balance], "update"),
    ).resolves.toBeUndefined();
  });

  it("words a structured add as before", async () => {
    await expect(
      refuseNewLedgerErrors([balance], async () => [], "add"),
    ).rejects.toThrow(/^adding these entries would introduce 1 new/);
  });
});

// w21/188: the engine's warnings are not what bean-check refuses a write for.
describe("warnings and the write gate", () => {
  const warning = {
    message: "Transaction has only one posting",
    source: { filename: "main.bean", lineno: 90 },
    severity: "warning" as const,
  };

  it("does not count a new warning as a new error", () => {
    expect(newLedgerErrors([], [warning])).toEqual([]);
  });

  it("does not refuse a write that only adds a warning", async () => {
    const before = jest.fn(async () => []);
    await expect(
      refuseNewLedgerErrors([warning], before, "add" as never),
    ).resolves.toBeUndefined();
    expect(before).not.toHaveBeenCalled();
  });

  it("still refuses a real new error beside a warning", async () => {
    await expect(
      refuseNewLedgerErrors(
        [warning, { message: "does not balance", severity: "error" as const }],
        async () => [],
        "add" as never,
      ),
    ).rejects.toThrow();
  });
});

// w21/618: a balance assertion that already fails quotes the figure it reached;
// editing an amount above it changed that figure and read as a new error.
describe("a balance assertion that was already failing", () => {
  const failed = (
    got: string,
    expected = "40.00 USD",
    account = "Assets:Cash",
  ) =>
    at(
      `Balance failed for ${account}: expected ${expected}, got ${got}`,
      "main.bean",
      87,
    );

  it("is not new when only the reached figure changed", () => {
    expect(
      newLedgerErrors([failed("49.75 USD")], [failed("46.25 USD")]),
    ).toEqual([]);
  });

  it("is new when it asserts another account or amount", () => {
    expect(
      newLedgerErrors(
        [failed("49.75 USD")],
        [failed("46.25 USD", "40.00 USD", "Assets:Bank")],
      ),
    ).toHaveLength(1);
    expect(
      newLedgerErrors(
        [failed("49.75 USD")],
        [failed("46.25 USD", "41.00 USD")],
      ),
    ).toHaveLength(1);
  });

  it("still counts a second failing copy as introduced", () => {
    expect(
      newLedgerErrors(
        [failed("49.75 USD")],
        [failed("46.25 USD"), failed("46.25 USD")],
      ),
    ).toHaveLength(1);
  });
});
