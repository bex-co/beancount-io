import {
  atCurrentLines,
  atLinesBeforeEdits,
  diffBeanCheckErrors,
} from "@/features/ledger/utils/bean-check-errors";

const error = (message: string, source?: string) => ({
  message,
  ...(source && { source }),
});

describe("diffBeanCheckErrors", () => {
  // w23/034: a write that shifts lines moves every error below it.
  it("does not count an existing error that moved to another line", () => {
    expect(
      diffBeanCheckErrors(
        [error("Document file not found: a.pdf", "main.bean:93")],
        [error("Document file not found: a.pdf", "main.bean:97")],
      ),
    ).toEqual([]);
  });

  it("counts a second copy of a known message as new", () => {
    const known = error("Duplicate open", "main.bean:3");
    const copy = error("Duplicate open", "main.bean:40");
    expect(diffBeanCheckErrors([known], [known, copy])).toEqual([copy]);
  });

  it("counts the same message in another file as new", () => {
    const moved = error("Duplicate open", "txns/2026.bean:3");
    expect(
      diffBeanCheckErrors([error("Duplicate open", "main.bean:3")], [moved]),
    ).toEqual([moved]);
  });

  it("ignores the entry tag a re-dated or renamed entry rewrites", () => {
    expect(
      diffBeanCheckErrors(
        [error('Cannot interpolate (2026-08-30, "Groceries")', "main.bean:9")],
        [error('Cannot interpolate (2026-08-31, "Food")', "main.bean:9")],
      ),
    ).toEqual([]);
  });

  it("keeps a file name that itself contains a colon", () => {
    const other = error("Bad", "a:b.bean:2");
    expect(diffBeanCheckErrors([error("Bad", "a.bean:2")], [other])).toEqual([
      other,
    ]);
  });
});

// w31/113: an assertion that already fails quotes the figure the account
// reached, and any write above it changes that figure. The ledger service's
// `newLedgerErrors` ignores it (w21/618, w21/681); these pin the same cases.
describe("diffBeanCheckErrors with a balance assertion already failing", () => {
  const failed = (
    got: string,
    expected = "40.00 USD",
    account = "Assets:Cash",
  ) =>
    error(
      `Balance failed for ${account}: expected ${expected}, got ${got}`,
      "main.bean:89",
    );
  const exceeds = (got: string, difference: string, expected = "100 USD") =>
    error(
      `Balance exceeds explicit tolerance for Assets:Tol: expected ${expected} ~ 0.01, got ${got} USD (difference: ${difference})`,
      "main.bean:9",
    );

  it("is not new when only the reached figure changed", () => {
    expect(
      diffBeanCheckErrors(
        [failed("49.75 USD")],
        [{ ...failed("44.75 USD"), source: "main.bean:93" }],
      ),
    ).toEqual([]);
  });

  it("is not new for the explicit-tolerance wording either", () => {
    expect(
      diffBeanCheckErrors([exceeds("0", "100")], [exceeds("-5.00", "105.00")]),
    ).toEqual([]);
  });

  it("counts a second failing assertion on the same account as new", () => {
    const second = failed("44.75 USD");
    expect(
      diffBeanCheckErrors([failed("49.75 USD")], [failed("44.75 USD"), second]),
    ).toEqual([second]);
  });

  it("counts an assertion whose expected amount changed as new", () => {
    const moved = failed("44.75 USD", "41.00 USD");
    expect(diffBeanCheckErrors([failed("49.75 USD")], [moved])).toEqual([
      moved,
    ]);
    const tolerance = exceeds("0", "200", "200 USD");
    expect(diffBeanCheckErrors([exceeds("0", "100")], [tolerance])).toEqual([
      tolerance,
    ]);
  });

  it("counts a failure on another account as new", () => {
    const other = failed("44.75 USD", "40.00 USD", "Assets:Bank");
    expect(diffBeanCheckErrors([failed("49.75 USD")], [other])).toEqual([
      other,
    ]);
  });

  it("counts an assertion that was passing and now fails", () => {
    const now = failed("44.75 USD");
    expect(diffBeanCheckErrors([], [now])).toEqual([now]);
  });
});

// w31/115: a lot-booking error quotes the lots the account holds, and a buy
// dated before the reduction changes that figure. The engine's own wording
// (`@rustledger/wasm` 0.24.0), entry tag included.
describe("diffBeanCheckErrors with a lot error already in the ledger", () => {
  const short = (
    available: string,
    requested = "10",
    account = "Assets:Broker",
    tag = '(2026-03-01, "Sell")',
  ) =>
    error(
      `Not enough units in ${account}: requested ${requested}, available ${available}; not enough to reduce ${tag}`,
      "main.bean:20",
    );
  const ambiguous = (lots: number, account = "Assets:Strict") =>
    error(
      `Ambiguous lot match for HOOL: ${lots} lots match in ${account} (2026-03-01, "Sell")`,
      "main.bean:24",
    );
  const insufficient = (available: string, requested = "10") =>
    error(
      `Insufficient units of HOOL: requested ${requested}, available ${available}`,
      "main.bean:20",
    );
  const inventory = (lots: number) =>
    error(`Ambiguous match: ${lots} lots match for HOOL`, "main.bean:24");

  it("is not new when only the available figure changed", () => {
    expect(
      diffBeanCheckErrors(
        [short("5")],
        [{ ...short("7"), source: "main.bean:24" }],
      ),
    ).toEqual([]);
    expect(
      diffBeanCheckErrors([insufficient("5")], [insufficient("7")]),
    ).toEqual([]);
  });

  it("is not new when only the number of matching lots changed", () => {
    expect(diffBeanCheckErrors([ambiguous(2)], [ambiguous(3)])).toEqual([]);
    expect(diffBeanCheckErrors([inventory(2)], [inventory(3)])).toEqual([]);
  });

  it("counts a changed requested amount as new", () => {
    const more = short("7", "12");
    expect(diffBeanCheckErrors([short("5")], [more])).toEqual([more]);
    const larger = insufficient("7", "12");
    expect(diffBeanCheckErrors([insufficient("5")], [larger])).toEqual([
      larger,
    ]);
  });

  it("counts a second failing reduction as new", () => {
    const second = short("7", "10", "Assets:Broker", '(2026-03-02, "Sell 2")');
    expect(diffBeanCheckErrors([short("5")], [short("7"), second])).toEqual([
      second,
    ]);
    const copy = ambiguous(3);
    expect(diffBeanCheckErrors([ambiguous(2)], [ambiguous(3), copy])).toEqual([
      copy,
    ]);
  });

  it("counts a reduction on another account, or one that newly fails, as new", () => {
    const other = short("5", "10", "Assets:Other");
    expect(diffBeanCheckErrors([short("5")], [other])).toEqual([other]);
    const elsewhere = ambiguous(2, "Assets:Other");
    expect(diffBeanCheckErrors([ambiguous(2)], [elsewhere])).toEqual([
      elsewhere,
    ]);
    const now = short("7");
    expect(diffBeanCheckErrors([], [now])).toEqual([now]);
  });
});

// w31/127: `check_commodity` names the first account that uses a currency,
// and `onecommodity` lists an account's currencies in the order first used,
// on its last entry. A write that changes either relabels the error the
// ledger already had (the ledger service's wording, as stock Beancount's).
describe("diffBeanCheckErrors with a commodity-plugin error already in the ledger", () => {
  const missing = (currency: string, context: string) =>
    error(`Missing Commodity directive for '${currency}' in '${context}'`);
  const mixed = (
    currencies: string,
    source = "main.bean:17",
    account = "Expenses:Travel",
    label = "currency",
  ) =>
    error(
      `More than one ${label} in account '${account}': ${currencies}`,
      source,
    );

  it("is not new when another account is the first to use the currency", () => {
    expect(
      diffBeanCheckErrors(
        [missing("USD", "Assets:US:BofA:Checking")],
        [missing("USD", "Assets:US:Ally:Savings")],
      ),
    ).toEqual([]);
    expect(
      diffBeanCheckErrors(
        [missing("BND", "Price Directive Context")],
        [missing("BND", "Assets:Broker")],
      ),
    ).toEqual([]);
  });

  it("is not new when a rename makes another account the first", () => {
    expect(
      diffBeanCheckErrors(
        [missing("USD", "Assets:US:BofA:Checking")],
        [missing("USD", "Assets:US:ETrade:Cash")],
        undefined,
        { from: "Assets:US:BofA:Checking", to: "Assets:US:Wells:Checking" },
      ),
    ).toEqual([]);
  });

  it("counts a second undeclared currency, or a second copy, as new", () => {
    const gbp = missing("GBP", "Assets:UK:Cash");
    expect(
      diffBeanCheckErrors(
        [missing("USD", "Assets:Bank")],
        [missing("USD", "Assets:Bank"), gbp],
      ),
    ).toEqual([gbp]);
    const copy = missing("USD", "Assets:Ally");
    expect(
      diffBeanCheckErrors(
        [missing("USD", "Assets:Bank")],
        [missing("USD", "Assets:Bank"), copy],
      ),
    ).toEqual([copy]);
  });

  it("is not new when its currencies reorder or it moves to another file", () => {
    expect(diffBeanCheckErrors([mixed("USD,EUR")], [mixed("EUR,USD")])).toEqual(
      [],
    );
    expect(
      diffBeanCheckErrors(
        [mixed("USD,EUR")],
        [mixed("USD,EUR", "2027.bean:1")],
      ),
    ).toEqual([]);
    expect(
      diffBeanCheckErrors(
        [mixed("USD,EUR", "main.bean:17", "Assets:Broker", "cost currency")],
        [mixed("EUR,USD", "2027.bean:4", "Assets:Broker", "cost currency")],
      ),
    ).toEqual([]);
  });

  it("counts a third currency, another account or the cost wording as new", () => {
    const third = mixed("USD,EUR,GBP");
    expect(diffBeanCheckErrors([mixed("USD,EUR")], [third])).toEqual([third]);
    const other = mixed("USD,EUR", "main.bean:17", "Expenses:Food");
    expect(diffBeanCheckErrors([mixed("USD,EUR")], [other])).toEqual([other]);
    const cost = mixed(
      "USD,EUR",
      "main.bean:17",
      "Expenses:Travel",
      "cost currency",
    );
    expect(diffBeanCheckErrors([mixed("USD,EUR")], [cost])).toEqual([cost]);
  });
});

// w31/128: `coherent_cost` places its error on the first transaction by date
// that holds the currency without a cost, `unique_prices` on the day's first
// price by line whatever its file, and `noduplicates` on the later copy by
// date and line. A write in one file moves each into another without adding
// one (the ledger service's wording, as stock Beancount's).
describe("diffBeanCheckErrors with a plugin error a write moves to another file", () => {
  const mixedCost = (currency: string, source: string) =>
    error(`Currency '${currency}' is used both with and without cost`, source);
  const disagreeing = (source: string) =>
    error("Disagreeing price entries", source);
  const duplicate = (source: string) =>
    error(
      "Duplicate entry: Balance: 2026-02-01 balance Assets:Cash 10 USD",
      source,
    );

  it("is not new when an earlier or remaining uncosted holding sits in another file", () => {
    expect(
      diffBeanCheckErrors(
        [mixedCost("VTI", "main.bean:98")],
        [mixedCost("VTI", "qa-other.bean:3")],
      ),
    ).toEqual([]);
  });

  it("is not new when the day's prices reorder across files", () => {
    expect(
      diffBeanCheckErrors(
        [disagreeing("qa-other.bean:7")],
        [disagreeing("main.bean:10")],
      ),
    ).toEqual([]);
  });

  it("is not new when the later duplicate is the copy in another file", () => {
    expect(
      diffBeanCheckErrors(
        [duplicate("main.bean:10")],
        [duplicate("other.bean:11")],
      ),
    ).toEqual([]);
  });

  it("counts a second currency held both ways as new", () => {
    const bnd = mixedCost("BND", "main.bean:120");
    expect(
      diffBeanCheckErrors(
        [mixedCost("VTI", "main.bean:98")],
        [mixedCost("VTI", "qa-other.bean:3"), bnd],
      ),
    ).toEqual([bnd]);
  });

  it("counts a second disagreeing day, or a third duplicate, as new", () => {
    const second = disagreeing("qa-other.bean:9");
    expect(
      diffBeanCheckErrors(
        [disagreeing("qa-other.bean:7")],
        [disagreeing("main.bean:10"), second],
      ),
    ).toEqual([second]);
    const third = duplicate("main.bean:12");
    expect(
      diffBeanCheckErrors(
        [duplicate("main.bean:10")],
        [duplicate("other.bean:11"), third],
      ),
    ).toEqual([third]);
  });
});

// w1/236: a renamed file's errors went with it; keyed on the old path every
// one of them read as new.
describe("diffBeanCheckErrors with renamed files", () => {
  const renames = new Map([["broken.bean", "broken2.bean"]]);

  it("does not count the errors of a file that only moved", () => {
    expect(
      diffBeanCheckErrors(
        [
          error("Account was never opened", "broken.bean:1"),
          error("Account was never opened", "broken.bean:2"),
        ],
        [
          error("Account was never opened", "broken2.bean:1"),
          error("Account was never opened", "broken2.bean:2"),
        ],
        renames,
      ),
    ).toEqual([]);
  });

  it("still counts an error the moved file gained", () => {
    const gained = error("Unbalanced", "broken2.bean:9");
    expect(
      diffBeanCheckErrors(
        [error("Account was never opened", "broken.bean:1")],
        [error("Account was never opened", "broken2.bean:1"), gained],
        renames,
      ),
    ).toEqual([gained]);
  });

  it("does not excuse the same message in an unrelated file", () => {
    const elsewhere = error("Account was never opened", "other.bean:1");
    expect(
      diffBeanCheckErrors(
        [error("Account was never opened", "broken.bean:1")],
        [error("Account was never opened", "broken2.bean:1"), elsewhere],
        renames,
      ),
    ).toEqual([elsewhere]);
  });

  it("leaves errors with no file alone", () => {
    expect(
      diffBeanCheckErrors(
        [error("Load failed")],
        [error("Load failed")],
        renames,
      ),
    ).toEqual([]);
  });
});

// w31/114: a renamed account's errors name the new account; keyed on the old
// name every one of them read as new.
describe("diffBeanCheckErrors with a renamed account", () => {
  const account = { from: "Assets:Cash", to: "Assets:Wallet" };
  const failing =
    "Balance failed for Assets:Cash: expected 40.00 USD, got 49.75 USD";

  it("does not count an error that names the account, or one under it", () => {
    expect(
      diffBeanCheckErrors(
        [
          error(failing, "main.bean:89"),
          error("Account Assets:Cash:Petty was never opened", "main.bean:90"),
        ],
        [
          error(
            "Balance failed for Assets:Wallet: expected 40.00 USD, got 49.75 USD",
            "main.bean:89",
          ),
          error("Account Assets:Wallet:Petty was never opened", "main.bean:90"),
        ],
        undefined,
        account,
      ),
    ).toEqual([]);
  });

  it("still counts an error the rename adds", () => {
    const added = error(
      "Duplicate open directive for Assets:Wallet",
      "a.bean:3",
    );
    expect(
      diffBeanCheckErrors(
        [error(failing, "main.bean:89")],
        [
          error(
            "Balance failed for Assets:Wallet: expected 40.00 USD, got 49.75 USD",
            "main.bean:89",
          ),
          added,
        ],
        undefined,
        account,
      ),
    ).toEqual([added]);
  });

  it("still counts a second copy of a known error under the new name", () => {
    const renamed = error(
      "Balance failed for Assets:Wallet: expected 40.00 USD, got 49.75 USD",
      "main.bean:89",
    );
    expect(
      diffBeanCheckErrors(
        [error(failing, "main.bean:89")],
        [renamed, renamed],
        undefined,
        account,
      ),
    ).toEqual([renamed]);
  });

  it("matches an error whose quoted narration keeps the old name", () => {
    // The rename leaves strings alone, so the engine still quotes it.
    const quoted = error(
      'Transaction "Paid from Assets:Cash" posts to Assets:Cash without a price',
      "main.bean:12",
    );
    expect(
      diffBeanCheckErrors(
        [quoted],
        [
          error(
            'Transaction "Paid from Assets:Cash" posts to Assets:Wallet without a price',
            "main.bean:12",
          ),
        ],
        undefined,
        account,
      ),
    ).toEqual([]);
  });

  it("leaves an account the name is only a prefix of alone", () => {
    const longer = error(
      "Account Assets:CashBox was never opened",
      "main.bean:4",
    );
    expect(
      diffBeanCheckErrors(
        [longer],
        [error("Account Assets:WalletBox was never opened", "main.bean:4")],
        undefined,
        account,
      ),
    ).toHaveLength(1);
    expect(diffBeanCheckErrors([longer], [longer], undefined, account)).toEqual(
      [],
    );
  });
});

// w31/102: a delete's removeIncludes drops include lines, and bean-check
// reports the rewritten file, one line higher below each dropped line.
describe("atCurrentLines", () => {
  const never = "Account Assets:Gone was never opened";

  it("moves an error below a dropped line down to where it stands now", () => {
    expect(
      atCurrentLines(
        [error(never, "main.bean:89")],
        new Map([["main.bean", [7]]]),
      ),
    ).toEqual([error(never, "main.bean:90")]);
  });

  it("keeps an error above the dropped line where it is", () => {
    expect(
      atCurrentLines(
        [error(never, "main.bean:5")],
        new Map([["main.bean", [7]]]),
      ),
    ).toEqual([error(never, "main.bean:5")]);
  });

  it("moves an error past every dropped line at or above it", () => {
    // Current file: 1 include, 2 entry, 3 include, 4 entry, 5 entry.
    // Rewritten: 1 entry (was 2), 2 entry (was 4), 3 entry (was 5).
    const dropped = new Map([["main.bean", [1, 3]]]);
    expect(
      atCurrentLines(
        [
          error(never, "main.bean:1"),
          error(never, "main.bean:2"),
          error(never, "main.bean:3"),
        ],
        dropped,
      ),
    ).toEqual([
      error(never, "main.bean:2"),
      error(never, "main.bean:4"),
      error(never, "main.bean:5"),
    ]);
  });

  it("moves an error that took a dropped line's place past it", () => {
    // Dropping lines 3 and 4 leaves line 5 at 3.
    expect(
      atCurrentLines(
        [error(never, "main.bean:3")],
        new Map([["main.bean", [3, 4]]]),
      ),
    ).toEqual([error(never, "main.bean:5")]);
  });

  it("leaves errors in other files, and errors with no file, alone", () => {
    const errors = [
      error(never, "books/2026.bean:89"),
      error(never, "other-main.bean:89"),
      error("Load failed"),
    ];
    expect(atCurrentLines(errors, new Map([["main.bean", [7]]]))).toEqual(
      errors,
    );
  });

  it("keeps the message and code it does not move", () => {
    expect(
      atCurrentLines(
        [{ message: never, source: "a:b.bean:9", code: "E1001" }],
        new Map([["a:b.bean", [2]]]),
      ),
    ).toEqual([{ message: never, source: "a:b.bean:10", code: "E1001" }]);
  });
});

// w31/116: an append inserts lines, and bean-check reports the written file,
// that many lines lower below each insertion.
describe("atLinesBeforeEdits", () => {
  const failed = "Balance failed for Assets:Cash: expected 49.75 USD";
  const inserts = (...steps: [number, number][]) =>
    new Map([["main.bean", steps.map(([at, lines]) => ({ at, lines }))]]);

  it("moves an error below an insertion up to where it stands now", () => {
    // Four lines inserted at index 40 (lines 41-44): the assertion at 87 is at 91.
    expect(
      atLinesBeforeEdits([error(failed, "main.bean:91")], inserts([40, 4])),
    ).toEqual([error(failed, "main.bean:87")]);
  });

  it("keeps an error above the insertion where it is", () => {
    expect(
      atLinesBeforeEdits([error(failed, "main.bean:40")], inserts([40, 4])),
    ).toEqual([error(failed, "main.bean:40")]);
  });

  it("keeps the written line of an error inside the inserted text", () => {
    const errors = [
      error(failed, "main.bean:41"),
      error(failed, "main.bean:44"),
    ];
    expect(atLinesBeforeEdits(errors, inserts([40, 4]))).toEqual(errors);
  });

  it("undoes each step in the text it produced, last first", () => {
    // An include at index 2 (line 3), then a 3-line block at index 6 of that
    // text (lines 7-9). Written line 12 was line 9 after the include, and 8
    // before it.
    const steps = inserts([2, 1], [6, 3]);
    expect(
      atLinesBeforeEdits(
        [
          error(failed, "main.bean:2"),
          error(failed, "main.bean:5"),
          error(failed, "main.bean:12"),
          error(failed, "main.bean:3"),
          error(failed, "main.bean:8"),
        ],
        steps,
      ),
    ).toEqual([
      error(failed, "main.bean:2"),
      error(failed, "main.bean:4"),
      error(failed, "main.bean:8"),
      error(failed, "main.bean:3"),
      error(failed, "main.bean:8"),
    ]);
  });

  it("leaves errors in other files, and errors with no file, alone", () => {
    const errors = [
      error(failed, "books/2026.bean:91"),
      error(failed, "other-main.bean:91"),
      error("Load failed"),
    ];
    expect(atLinesBeforeEdits(errors, inserts([40, 4]))).toEqual(errors);
  });

  it("keeps the message and code it does not move", () => {
    expect(
      atLinesBeforeEdits(
        [{ message: failed, source: "a:b.bean:9", code: "E2001" }],
        new Map([["a:b.bean", [{ at: 1, lines: 2 }]]]),
      ),
    ).toEqual([{ message: failed, source: "a:b.bean:7", code: "E2001" }]);
  });

  // w31/118: a file edit replaces lines, so the ones below move by the
  // difference, up or down.
  const replaces = (...steps: [number, number, number][]) =>
    new Map([
      [
        "main.bean",
        steps.map(([at, replaced, lines]) => ({ at, replaced, lines })),
      ],
    ]);

  it("moves an error below a replacement that grows by the lines it added", () => {
    // Line 2 (index 1) became three lines: the assertion at 6 is at 8.
    expect(
      atLinesBeforeEdits([error(failed, "main.bean:8")], replaces([1, 1, 3])),
    ).toEqual([error(failed, "main.bean:6")]);
  });

  it("moves an error below a replacement that shrinks down by the lines it removed", () => {
    // Lines 2-4 became one line: the assertion at 6 is at 4.
    expect(
      atLinesBeforeEdits([error(failed, "main.bean:4")], replaces([1, 3, 1])),
    ).toEqual([error(failed, "main.bean:6")]);
  });

  it("maps past a cut that wrote no lines", () => {
    expect(
      atLinesBeforeEdits(
        [error(failed, "main.bean:1"), error(failed, "main.bean:2")],
        replaces([1, 2, 0]),
      ),
    ).toEqual([error(failed, "main.bean:1"), error(failed, "main.bean:4")]);
  });

  it("keeps the written line of an error inside the replacement, and above it", () => {
    const errors = [
      error(failed, "main.bean:1"),
      error(failed, "main.bean:2"),
      error(failed, "main.bean:4"),
    ];
    expect(atLinesBeforeEdits(errors, replaces([1, 1, 3]))).toEqual(errors);
  });

  it("undoes chained replacements in the text each produced", () => {
    // Line 1 became three (lines 1-3), then line 4 of that text was cut.
    // Written line 7 was line 8 after the first edit, and 6 before it.
    expect(
      atLinesBeforeEdits(
        [error(failed, "main.bean:7")],
        replaces([0, 1, 3], [3, 1, 0]),
      ),
    ).toEqual([error(failed, "main.bean:6")]);
  });
});
