import type { BeancountError } from "@rustledger/wasm";
import {
  isRawPluginProcessing,
  locateOptionErrors,
  reconcileOptionErrors,
  withoutPadAndBalanceChecks,
} from "../option-validation";

// w21/308: Beancount's own default `account_previous_balances` and
// `account_rounding` raised red E7002 / E7007 errors that bean-check accepts.
const error = (
  message: string,
  severity: BeancountError["severity"] = "error",
): BeancountError => ({
  message,
  code: null,
  phase: null,
  hint: null,
  file: null,
  line: null,
  column: null,
  end_line: null,
  end_column: null,
  severity,
});

describe("reconcileOptionErrors", () => {
  it("drops E7002 for a valid leaf Beancount joins under Equity", () => {
    for (const leaf of ["Opening-Balances", "Rounding", "Earnings", "401k"]) {
      expect(
        reconcileOptionErrors([
          error(`[E7002] Invalid leaf account name: '${leaf}'`),
        ]),
      ).toEqual([]);
    }
  });

  it("keeps E7002 for a leaf that is not a valid component", () => {
    for (const leaf of [
      "rounding",
      "my rounding",
      "Under_score",
      "-Lead",
      "",
    ]) {
      const bad = error(`[E7002] Invalid leaf account name: '${leaf}'`);
      expect(reconcileOptionErrors([bad])).toEqual([bad]);
    }
  });

  it("downgrades E7007 to a warning and keeps its text", () => {
    const notice = error(
      "[E7007] Option 'account_rounding' is accepted for compatibility but has no effect: no rounding residual is produced.",
    );
    expect(reconcileOptionErrors([notice])).toEqual([
      { ...notice, severity: "warning" },
    ]);
  });

  it("leaves every other error alone, in order", () => {
    const others = [
      error("[E7006] Document root 'x' does not exist"),
      error("Balance failed", "error"),
      error("note", "warning"),
    ];
    expect(reconcileOptionErrors(others)).toEqual(others);
  });
});

// w21/309: option errors came with no file, line or code, so their rows could
// not be tapped and no editor banner listed them.
describe("locateOptionErrors", () => {
  const main = [
    '; an option here must not match: option "bogus_option" "x"',
    'option "bogus_option" "x"',
    'option "operating_currency" "USD"',
    'option "render_commas" "maybe"',
    'option "title" "A"',
    'option "title" "B"',
    'option "name_assets" "assets"',
    'option "account_rounding" "Rounding"',
    'option "inferred_tolerance_multiplier" "3"',
    "",
  ].join("\n");
  const files = { "main.bean": main, "sub.bean": 'option "title" "C"\n' };
  const locate = (message: string) =>
    locateOptionErrors([error(message)], files, "main.bean")[0]!;

  it("puts an invalid option on its line and moves the tag into code", () => {
    expect(locate('[E7001] Invalid option "bogus_option"')).toMatchObject({
      code: "E7001",
      message: 'Invalid option "bogus_option"',
      file: "main.bean",
      line: 2,
    });
  });

  it("finds the option by the value a message quotes", () => {
    expect(
      locate(
        '[E7002] Invalid value "maybe" for option "render_commas": expected TRUE, FALSE, 1 or 0',
      ),
    ).toMatchObject({ code: "E7002", file: "main.bean", line: 4 });
    expect(
      locate("[E7008] Invalid account type name: 'assets' cannot begin"),
    ).toMatchObject({
      code: "E7008",
      line: 7,
    });
  });

  it("puts a repeated option on its last line", () => {
    expect(
      locate(
        '[E7003] Option "title" is set more than once; the last value wins',
      ),
    ).toMatchObject({ code: "E7003", line: 6 });
  });

  it("keeps the severity and locates a warning too", () => {
    const [located] = locateOptionErrors(
      [error("[E7007] Option 'account_rounding' has no effect", "warning")],
      files,
      "main.bean",
    );
    expect(located).toMatchObject({
      severity: "warning",
      code: "E7007",
      line: 8,
    });
  });

  // w1/209: E7004 quotes only the new name; the line declares the old one.
  it("puts a renamed option on the line that uses its old name", () => {
    expect(locate("[E7004] Renamed to 'tolerance_multiplier'.")).toMatchObject({
      code: "E7004",
      message: "Renamed to 'tolerance_multiplier'.",
      file: "main.bean",
      line: 9,
    });
  });

  it("moves the tag into code where it cannot place, and leaves the rest alone", () => {
    const unknown = error('[E7001] Invalid option "not_in_the_file"');
    const placed = { ...error("Balance failed"), file: "main.bean", line: 9 };
    const root = error("[E7006] Document root 'x' does not exist");
    expect(
      locateOptionErrors([unknown, placed, root], files, "main.bean"),
    ).toEqual([
      // Unplaced, but its code is a field, not a tag in the text (w1/209).
      {
        ...unknown,
        code: "E7001",
        message: 'Invalid option "not_in_the_file"',
      },
      placed,
      root,
    ]);
    expect(locateOptionErrors([unknown], {}, "main.bean")).toEqual([unknown]);
  });
});

// w21/656: the engine ignores `option "plugin_processing_mode" "raw"`.
describe("raw plugin processing", () => {
  const main = (text: string) => ({ "main.bean": text, "x.bean": "" });

  it("is read from the entry point's last declaration", () => {
    expect(
      isRawPluginProcessing(
        main('option "plugin_processing_mode" "raw"\n'),
        "main.bean",
      ),
    ).toBe(true);
    expect(
      isRawPluginProcessing(
        main(
          'option "plugin_processing_mode" "raw"\noption "plugin_processing_mode" "default"\n',
        ),
        "main.bean",
      ),
    ).toBe(false);
    expect(
      isRawPluginProcessing(
        main('; option "plugin_processing_mode" "raw"\n'),
        "main.bean",
      ),
    ).toBe(false);
    // Beancount reads options only from the entry point.
    expect(
      isRawPluginProcessing(
        {
          "main.bean": "",
          "x.bean": 'option "plugin_processing_mode" "raw"\n',
        },
        "main.bean",
      ),
    ).toBe(false);
  });

  it("drops only the pad and balance-check errors", () => {
    const coded = (code: string) => ({ ...error(code), code });
    expect(
      withoutPadAndBalanceChecks(
        ["E2001", "E2002", "E2003", "E2004", "E1001", "E7002"].map(coded),
      ).map((kept) => kept.code),
    ).toEqual(["E1001", "E7002"]);
  });
});
