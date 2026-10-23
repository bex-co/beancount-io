import fs from "fs";
import path from "path";
import type { DirectiveJson } from "@rustledger/wasm";
import {
  failedBalanceDiffs,
  serializeDirective,
} from "@/foundation/rustledger/journal-serialize";

/**
 * w21/087: rustledger's `DirectiveJson` has no failed-assertion diff, so every
 * Balance row went out with `diff_amount: null` and a failing assertion looked
 * exactly like a passing one. The validator's E2001 error carries both
 * amounts; this joins it back. Error shapes are the engine's own output for
 * the note's fixture (`Balance failed for …: expected …, got …`).
 */
const balance = (date: string, account: string, number: string) =>
  ({
    type: "balance",
    date,
    account,
    amount: { number, currency: "USD" },
    meta: {},
  }) as unknown as DirectiveJson;

const withTolerance = (
  date: string,
  account: string,
  number: string,
  tolerance: string,
) =>
  ({
    ...balance(date, account, number),
    tolerance,
  }) as unknown as DirectiveJson;

const failed = (
  account: string,
  expected: string,
  got: string,
  line: number,
) => ({
  message: `Balance failed for ${account}: expected ${expected} USD, got ${got} USD`,
  code: "E2001",
  file: "main.bean",
  line,
});

describe("failedBalanceDiffs", () => {
  it("gives a failing assertion actual − expected and leaves a passing one null", () => {
    const passing = balance("2026-08-29", "Assets:Cash", "49.75");
    const failing = balance("2026-10-01", "Assets:Cash", "50.00");
    const diffs = failedBalanceDiffs(
      [passing, failing],
      [failed("Assets:Cash", "50.00", "49.75", 8)],
    );
    expect(serializeDirective(failing, diffs)).toMatchObject({
      diff_amount: { number: "-0.25", currency: "USD" },
    });
    expect(serializeDirective(passing, diffs)).toMatchObject({
      diff_amount: null,
    });
  });

  it("matches an amount however it was written", () => {
    const failing = balance("2026-10-01", "Assets:Cash", "50");
    const diffs = failedBalanceDiffs(
      [failing],
      [failed("Assets:Cash", "50.00", "52.5", 3)],
    );
    expect(diffs.get(failing)).toEqual({ number: "2.50", currency: "USD" });
  });

  it("marks nothing when it cannot tell which same-amount assertion failed", () => {
    const first = balance("2026-09-01", "Assets:Cash", "50.00");
    const second = balance("2026-10-01", "Assets:Cash", "50.00");
    const diffs = failedBalanceDiffs(
      [first, second],
      [failed("Assets:Cash", "50.00", "49.75", 9)],
    );
    expect(diffs.size).toBe(0);
  });

  it("pairs several failures of one amount with their assertions in date order", () => {
    const first = balance("2026-09-01", "Assets:Cash", "50.00");
    const second = balance("2026-10-01", "Assets:Cash", "50.00");
    // The validator reports them in date order.
    const diffs = failedBalanceDiffs(
      [second, first],
      [
        failed("Assets:Cash", "50.00", "49.75", 9),
        failed("Assets:Cash", "50.00", "48.00", 12),
      ],
    );
    expect(diffs.get(first)).toEqual({ number: "-0.25", currency: "USD" });
    expect(diffs.get(second)).toEqual({ number: "-2.00", currency: "USD" });
  });

  // w21/532: a backdated assertion appended last has the highest line number
  // and the earliest date. Errors from the real engine for the note's fixture
  // (`Liabilities:QaCard` −40.00 on 01-03, `balance 0.00` on 02-01, +15.00 on
  // 01-20, then a `balance 0.00` on 01-10 at line 11): line 11 is reported
  // first, because it is checked first.
  it("pairs by date when the file is not in date order", () => {
    const february = balance("2026-02-01", "Liabilities:QaCard", "0.00");
    const backdated = balance("2026-01-10", "Liabilities:QaCard", "0.00");
    const diffs = failedBalanceDiffs(
      [february, backdated],
      [
        failed("Liabilities:QaCard", "0.00", "-40.00", 11),
        failed("Liabilities:QaCard", "0.00", "-25.00", 7),
      ],
    );
    expect(diffs.get(backdated)).toEqual({ number: "-40.00", currency: "USD" });
    expect(diffs.get(february)).toEqual({ number: "-25.00", currency: "USD" });
  });

  it("pairs by date across two included files whose names sort the other way", () => {
    const early = balance("2026-01-10", "Assets:Cash", "10.00");
    const late = balance("2026-03-10", "Assets:Cash", "10.00");
    const diffs = failedBalanceDiffs(
      [late, early],
      [
        { ...failed("Assets:Cash", "10.00", "9.00", 2), file: "z.bean" },
        { ...failed("Assets:Cash", "10.00", "8.00", 2), file: "a.bean" },
      ],
    );
    expect(diffs.get(early)).toEqual({ number: "-1.00", currency: "USD" });
    expect(diffs.get(late)).toEqual({ number: "-2.00", currency: "USD" });
  });

  it("ignores other errors", () => {
    const failing = balance("2026-10-01", "Assets:Cash", "50.00");
    const diffs = failedBalanceDiffs(
      [failing],
      [
        { message: "Transaction does not balance", code: "E3001" },
        {
          message:
            "Balance failed for Assets:Cash: expected 50.00 USD, got 49.75 USD",
          code: null,
        },
      ],
    );
    expect(diffs.size).toBe(0);
  });
});

// w21/533: an assertion with its own `~ tolerance` fails with E2002, which the
// join ignored, so it looked like a passing one. The message is the engine's
// own for the note's fixture.
// w21/677: three "0.00" assertions on a card, one failing; w21/675: the same
// amount asserted before and after a spend; w21/676: 98.00 against 100.00.
describe("failedBalanceDiffs names the assertion by the date on its line", () => {
  it("gives only the failing one of three same-amount assertions its difference", () => {
    const feb = balance("2026-02-01", "Liabilities:Card", "0.00");
    const mar = balance("2026-03-01", "Liabilities:Card", "0.00");
    const apr = balance("2026-04-01", "Liabilities:Card", "0.00");
    const diffs = failedBalanceDiffs(
      [feb, mar, apr],
      [
        {
          ...failed("Liabilities:Card", "0.00", "-5.00", 9),
          date: "2026-03-01",
        },
      ],
    );
    expect(diffs.get(mar)).toEqual({ number: "-5.00", currency: "USD" });
    expect(diffs.has(feb)).toBe(false);
    expect(diffs.has(apr)).toBe(false);
  });

  it("reads a later failure of an amount an earlier assertion already passed", () => {
    const early = balance("2026-02-02", "Assets:Cash", "100.00");
    const late = balance("2026-02-04", "Assets:Cash", "100.00");
    const diffs = failedBalanceDiffs(
      [early, late],
      [{ ...failed("Assets:Cash", "100.00", "90.00", 12), date: "2026-02-04" }],
    );
    expect(diffs.get(late)).toEqual({ number: "-10.00", currency: "USD" });
    expect(diffs.has(early)).toBe(false);
  });

  it("falls back to the old pairing for an error without a date", () => {
    const first = balance("2026-09-01", "Assets:Cash", "50.00");
    const second = balance("2026-10-01", "Assets:Cash", "50.00");
    expect(
      failedBalanceDiffs(
        [first, second],
        [failed("Assets:Cash", "50.00", "40", 8)],
      ).size,
    ).toBe(0);
  });
});

describe("failedBalanceDiffs for an explicit tolerance", () => {
  const exceeded = (line: number) => ({
    message:
      "Balance exceeds explicit tolerance for Assets:QaTol: expected 99.995 USD ~ 0.001, got 100.00 USD (difference: 0.005)",
    code: "E2002",
    file: "main.bean",
    line,
  });

  it("gives the failing assertion got − expected", () => {
    const assertion = withTolerance(
      "2026-01-07",
      "Assets:QaTol",
      "99.995",
      "0.001",
    );
    const diffs = failedBalanceDiffs([assertion], [exceeded(7)]);
    expect(serializeDirective(assertion, diffs)).toMatchObject({
      diff_amount: { number: "0.005", currency: "USD" },
    });
  });

  it("does not pair it with a plain assertion of the same amount", () => {
    const plain = balance("2026-01-08", "Assets:QaTol", "99.995");
    const assertion = withTolerance(
      "2026-01-07",
      "Assets:QaTol",
      "99.995",
      "0.001",
    );
    const diffs = failedBalanceDiffs([plain, assertion], [exceeded(7)]);
    expect(diffs.has(plain)).toBe(false);
    expect(diffs.get(assertion)).toEqual({ number: "0.005", currency: "USD" });
  });
});

describe("journal reads", () => {
  // REST, GraphQL and MCP all read the journal through these: the service's
  // journal, account journal and entry context, and the V1 legacy route.
  const read = (file: string) =>
    fs.readFileSync(path.join(__dirname, "..", "..", "..", file), "utf8");

  it("pass the validator's diffs to the serializer", () => {
    const service = read("features/ledger/service/ledger-journal-service.ts");
    expect(
      service.match(/failedBalanceDiffs\(/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(3);
    expect(service).toContain("serializeDirective(directive, balanceDiffs)");
    expect(read("api/legacy.ts")).toContain(
      "failedBalanceDiffs(snapshot.directives, snapshot.errors)",
    );
  });
});
