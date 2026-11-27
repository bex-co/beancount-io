import type { BeancountErrorPublic } from "@/foundation/ledger-api-types";
import {
  atLinesBeforeEdits,
  newLedgerErrors,
  projectNewLedgerErrors,
  refuseNewLedgerErrors,
} from "../new-ledger-errors";
import {
  NewLedgerErrorsError,
  UnbalancedTransactionError,
} from "@/shared/errors";

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

// w31/115: a lot-booking error quotes the lots the account holds, so a buy
// dated before the reduction changed it and the error the ledger already had
// read as a new one. The engine's own wording, entry tag included.
describe("a lot-booking error already in the ledger", () => {
  const short = (
    available: string,
    requested = "10",
    account = "Assets:Broker",
    tag = '(2026-03-01, "Sell")',
  ): BeancountErrorPublic =>
    at(
      `Not enough units in ${account}: requested ${requested}, available ${available}; not enough to reduce ${tag}`,
      "main.bean",
      20,
    );
  const ambiguous = (
    lots: number,
    account = "Assets:Strict",
  ): BeancountErrorPublic =>
    at(
      `Ambiguous lot match for HOOL: ${lots} lots match in ${account} (2026-03-01, "Sell")`,
      "main.bean",
      24,
    );
  const insufficient = (available: string, requested = "10") =>
    at(
      `Insufficient units of HOOL: requested ${requested}, available ${available}`,
      "main.bean",
      20,
    );
  const inventory = (lots: number) =>
    at(`Ambiguous match: ${lots} lots match for HOOL`, "main.bean", 24);

  it("is not new when only the available figure changed", () => {
    expect(
      newLedgerErrors(
        [short("5")],
        [{ ...short("7"), source: { filename: "main.bean", lineno: 24 } }],
      ),
    ).toEqual([]);
    expect(newLedgerErrors([insufficient("5")], [insufficient("7")])).toEqual(
      [],
    );
  });

  it("is not new when only the number of matching lots changed", () => {
    expect(newLedgerErrors([ambiguous(2)], [ambiguous(3)])).toEqual([]);
    expect(newLedgerErrors([inventory(2)], [inventory(3)])).toEqual([]);
  });

  it("counts a changed requested amount as new", () => {
    const more = short("7", "12");
    expect(newLedgerErrors([short("5")], [more])).toEqual([more]);
    const larger = insufficient("7", "12");
    expect(newLedgerErrors([insufficient("5")], [larger])).toEqual([larger]);
  });

  it("counts a second failing reduction as new", () => {
    const second = short("7", "10", "Assets:Broker", '(2026-03-02, "Sell 2")');
    expect(newLedgerErrors([short("5")], [short("7"), second])).toEqual([
      second,
    ]);
    const copy = ambiguous(3);
    expect(newLedgerErrors([ambiguous(2)], [ambiguous(3), copy])).toEqual([
      copy,
    ]);
  });

  it("counts a reduction on another account, or one that newly fails, as new", () => {
    const other = short("5", "10", "Assets:Other");
    expect(newLedgerErrors([short("5")], [other])).toEqual([other]);
    const elsewhere = ambiguous(2, "Assets:Other");
    expect(newLedgerErrors([ambiguous(2)], [elsewhere])).toEqual([elsewhere]);
    expect(newLedgerErrors([], [short("7")])).toHaveLength(1);
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

describe("newLedgerErrors after a move (w31/126)", () => {
  const UNOPENED = "Account Expenses:Qa:Unopened was never opened";
  // main.bean lines 90-92 (0-based [89, 92)) move to qa-move.bean.
  const moved = [{ file: "main.bean", start: 89, end: 92, to: "qa-move.bean" }];

  it("matches an error inside the moved lines in the file they move to", () => {
    const before = [at(UNOPENED, "main.bean", 90)];
    const after = [at(UNOPENED, "qa-move.bean", 1)];
    expect(newLedgerErrors(before, after)).toEqual(after);
    expect(newLedgerErrors(before, after, moved)).toEqual([]);
    // The last moved line moves too; the one below it stays.
    expect(
      newLedgerErrors([at(UNOPENED, "main.bean", 92)], after, moved),
    ).toEqual([]);
    expect(
      newLedgerErrors([at(UNOPENED, "main.bean", 93)], after, moved),
    ).toEqual(after);
  });

  it("keeps an error outside the moved lines in its own file", () => {
    const stays = at(UNOPENED, "main.bean", 40);
    expect(newLedgerErrors([stays], [stays], moved)).toEqual([]);
    const elsewhere = at(UNOPENED, "other.bean", 90);
    expect(
      newLedgerErrors([elsewhere], [at(UNOPENED, "qa-move.bean", 1)], moved),
    ).toHaveLength(1);
  });

  it("still counts a second copy of the moved error as new", () => {
    const second = at(UNOPENED, "qa-move.bean", 5);
    expect(
      newLedgerErrors(
        [at(UNOPENED, "main.bean", 90)],
        [at(UNOPENED, "qa-move.bean", 1), second],
        moved,
      ),
    ).toEqual([second]);
  });
});

describe("projectNewLedgerErrors", () => {
  it("reports counts and the diff without refusing", async () => {
    const known = at("Balance failed for Assets:Cash", "main.bean", 4);
    const added = at(
      "Duplicate open directive for Assets:Cash",
      "main.bean",
      12,
    );
    await expect(
      projectNewLedgerErrors([known, added], async () => [known]),
    ).resolves.toEqual({ errorsBefore: 1, errorsAfter: 2, newErrors: [added] });
  });

  it("excludes warnings from the counts as from the diff", async () => {
    const warning = {
      message: "Transaction has only one posting",
      source: { filename: "main.bean", lineno: 90 },
      severity: "warning" as const,
    };
    await expect(
      projectNewLedgerErrors([warning], async () => [warning]),
    ).resolves.toEqual({ errorsBefore: 0, errorsAfter: 0, newErrors: [] });
  });
});

describe("refuseNewLedgerErrors", () => {
  const balance = at(
    "Balance failed for Assets:Cash: expected 49.75 USD, got 73.25 USD",
    "main.bean",
    84,
  );

  it("reads today's errors even for a clean projection", async () => {
    // The counts are reported on the response whether the write is refused,
    // committed, or previewed, so the laziness had to go (w23/161).
    const before = jest.fn(async () => []);
    await refuseNewLedgerErrors([], before, "delete");
    expect(before).toHaveBeenCalled();
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

  // w23/087: the add path refuses imbalance as UNBALANCED; an edit whose
  // only new error is imbalance must read the same, not VALIDATION_FAILED.
  it("refuses a lone introduced imbalance as UNBALANCED with the residual", async () => {
    await expect(
      refuseNewLedgerErrors(
        [
          at(
            "Transaction does not balance: residual -0.50 USD",
            "main.bean",
            89,
          ),
        ],
        async () => [],
        "update",
      ),
    ).rejects.toMatchObject({
      constructor: UnbalancedTransactionError,
      message:
        "Transaction does not balance: residual -0.50 USD (main.bean:89)",
      metadata: { code: "UNBALANCED", details: { residual: "-0.50 USD" } },
    });
  });

  it("keeps VALIDATION_FAILED when imbalance arrives with another error", async () => {
    await expect(
      refuseNewLedgerErrors(
        [
          at(
            "Transaction does not balance: residual -0.50 USD",
            "main.bean",
            89,
          ),
          at("Balance failed for Assets:Cash", "main.bean", 90),
        ],
        async () => [],
        "update",
      ),
    ).rejects.toBeInstanceOf(NewLedgerErrorsError);
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
    // Read for the reported counts, not for a refusal (w23/161).
    expect(before).toHaveBeenCalled();
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

// w31/116: a refusal and a preview name each new error at its line in the
// file as it stands, undoing the write's cuts, replacements and inserts.
describe("atLinesBeforeEdits", () => {
  const FAILED = "Balance failed for Assets:Cash";
  const lines = (projection: { newErrors: BeancountErrorPublic[] }) =>
    projection.newErrors.map(({ source }) => source?.lineno);
  const project = (
    newErrors: BeancountErrorPublic[],
    edits: [string, { start: number; end: number; lines: number }[]][],
  ) =>
    atLinesBeforeEdits(
      { errorsBefore: 0, errorsAfter: newErrors.length, newErrors },
      new Map(edits),
    );

  it("moves an error below a longer or shorter replacement back by the difference", () => {
    // Lines 83-86 (0-based [82, 86)) replaced by five lines, then by three.
    const errors = [at(FAILED, "main.bean", 88), at(FAILED, "main.bean", 80)];
    expect(
      lines(
        project(errors, [["main.bean", [{ start: 82, end: 86, lines: 5 }]]]),
      ),
    ).toEqual([87, 80]);
    expect(
      lines(
        project(
          [at(FAILED, "main.bean", 86)],
          [["main.bean", [{ start: 82, end: 86, lines: 3 }]]],
        ),
      ),
    ).toEqual([87]);
  });

  it("keeps the written line of an error inside a replacement or an insert", () => {
    const errors = [at(FAILED, "main.bean", 83), at(FAILED, "main.bean", 87)];
    expect(
      lines(
        project(errors, [["main.bean", [{ start: 82, end: 86, lines: 5 }]]]),
      ),
    ).toEqual([83, 87]);
    expect(
      lines(
        project(
          [at(FAILED, "main.bean", 4)],
          [["main.bean", [{ start: 3, end: 3, lines: 1 }]]],
        ),
      ),
    ).toEqual([4]);
  });

  it("undoes the edits last to first, as a delete's cuts and a move's include run", () => {
    // Cut bottom-first: lines 9-12, then 3-6; then an include at index 1 of
    // what was left. Line 9 after the write was 8 before the include, the
    // line that was 16 before the cuts.
    const edits: [string, { start: number; end: number; lines: number }[]][] = [
      [
        "main.bean",
        [
          { start: 8, end: 12, lines: 0 },
          { start: 2, end: 6, lines: 0 },
          { start: 1, end: 1, lines: 1 },
        ],
      ],
    ];
    expect(
      lines(
        project(
          [
            at(FAILED, "main.bean", 1),
            at(FAILED, "main.bean", 2),
            at(FAILED, "main.bean", 3),
            at(FAILED, "main.bean", 5),
            at(FAILED, "main.bean", 9),
          ],
          edits,
        ),
      ),
    ).toEqual([1, 2, 2, 8, 16]);
  });

  it("leaves errors in other files, errors with no source, and the counts alone", () => {
    const errors = [
      at(FAILED, "books/2026.bean", 88),
      { message: "Load failed", source: null },
    ];
    expect(
      project(errors, [["main.bean", [{ start: 0, end: 0, lines: 3 }]]]),
    ).toEqual({ errorsBefore: 0, errorsAfter: 2, newErrors: errors });
  });
});
