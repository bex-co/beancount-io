/**
 * The unit model the overview charts share.
 *
 * These are the rules that decide which number a reader sees, so they are
 * asserted directly rather than only through the charts that consume them.
 */
import { describe, expect, it } from "vitest";
import {
  balanceToAmounts,
  chooseDisplayUnit,
  collectUnits,
  mergeAmounts,
  omittedUnits,
  toFiniteAmount,
} from "../unit-amounts";

describe("balanceToAmounts", () => {
  it("keeps every unit rather than the first or USD", () => {
    const amounts = balanceToAmounts({ USD: 386.22, VACHR: 25 });
    expect(amounts.get("USD")).toBe("386.22");
    expect(amounts.get("VACHR")).toBe("25");
  });

  it("keeps the API's decimal strings as the ledger wrote them", () => {
    expect(balanceToAmounts({ USD: "-129974.58" }).get("USD")).toBe(
      "-129974.58",
    );
    // A double would read …993 as …992 and drop 4.00995's last digits in
    // text (w4/m53).
    const amounts = balanceToAmounts({
      BTC: "9007199254740993",
      ETH: "4.00995",
    });
    expect(amounts.get("BTC")).toBe("9007199254740993");
    expect(amounts.get("ETH")).toBe("4.00995");
  });

  it("negates every unit when inverted, not just one", () => {
    const amounts = balanceToAmounts({ USD: -100, MUSD: -7 }, true);
    expect(amounts.get("USD")).toBe("100");
    expect(amounts.get("MUSD")).toBe("7");
    expect(
      balanceToAmounts({ BTC: "-9007199254740993" }, true).get("BTC"),
    ).toBe("9007199254740993");
  });

  it("skips a malformed amount instead of truncating it", () => {
    // `parseFloat("12abc")` would silently yield 12; `Number` yields NaN.
    const amounts = balanceToAmounts({
      USD: "12abc",
      EUR: "5",
      JPY: "Infinity",
    });
    expect(amounts.has("USD")).toBe(false);
    expect(amounts.has("JPY")).toBe(false);
    expect(amounts.get("EUR")).toBe("5");
  });

  it("treats a missing or empty balance as no amounts", () => {
    expect(balanceToAmounts(null).size).toBe(0);
    expect(balanceToAmounts({}).size).toBe(0);
    // Neither a zero nor a missing amount gives a chart anything to draw.
    expect(balanceToAmounts({ USD: 0 }).size).toBe(0);
    expect(balanceToAmounts({ USD: "0.00" }).size).toBe(0);
    expect(balanceToAmounts({ USD: null }).size).toBe(0);
  });
});

describe("toFiniteAmount", () => {
  it("accepts numbers and numeric strings, rejects the rest", () => {
    expect(toFiniteAmount("1.5")).toBe(1.5);
    expect(toFiniteAmount(-2)).toBe(-2);
    expect(toFiniteAmount("12abc")).toBeNull();
    expect(toFiniteAmount(Infinity)).toBeNull();
  });
});

describe("mergeAmounts", () => {
  it("adds unit by unit and never across units", () => {
    const into = balanceToAmounts({ USD: 10, VACHR: 2 });
    mergeAmounts(into, balanceToAmounts({ USD: 5, EUR: 3 }));
    expect(into.get("USD")).toBe("15");
    expect(into.get("VACHR")).toBe("2");
    expect(into.get("EUR")).toBe("3");
  });

  it("sums exactly where doubles would not", () => {
    const into = balanceToAmounts({ BTC: "9007199254740993", ETH: "0.1" });
    mergeAmounts(into, balanceToAmounts({ BTC: "1", ETH: "0.2" }));
    // As doubles: 9007199254740992 and 0.30000000000000004.
    expect(into.get("BTC")).toBe("9007199254740994");
    expect(into.get("ETH")).toBe("0.3");
  });

  it("leaves an exact zero when amounts cancel", () => {
    const into = balanceToAmounts({ BTC: "4.00995" });
    mergeAmounts(into, balanceToAmounts({ BTC: "-4.00995" }));
    expect(into.get("BTC")).toBe("0.00000");
  });
});

describe("chooseDisplayUnit", () => {
  it("returns null when there is nothing to show", () => {
    expect(chooseDisplayUnit([])).toBeNull();
    expect(chooseDisplayUnit([new Map()])).toBeNull();
  });

  it("picks the unit the most accounts are kept in", () => {
    const unit = chooseDisplayUnit([
      balanceToAmounts({ USD: 1 }),
      balanceToAmounts({ USD: 2 }),
      balanceToAmounts({ VACHR: 999 }),
    ]);
    expect(unit).toBe("USD");
  });

  it("breaks a tie on account count by magnitude", () => {
    // The real case: one USD account against one IRAUSD account. Without this
    // tier the chart would be drawn in the smaller, incidental unit.
    const unit = chooseDisplayUnit([
      balanceToAmounts({ USD: 27635.92 }),
      balanceToAmounts({ IRAUSD: 18000 }),
    ]);
    expect(unit).toBe("USD");
  });

  it("is independent of key order when count and magnitude tie", () => {
    const forward = chooseDisplayUnit([balanceToAmounts({ AAA: 5, BBB: 5 })]);
    const reverse = chooseDisplayUnit([balanceToAmounts({ BBB: 5, AAA: 5 })]);
    expect(forward).toBe("AAA");
    expect(reverse).toBe("AAA");
  });

  it("chooses a non-USD unit when that is what the ledger uses", () => {
    expect(
      chooseDisplayUnit([
        balanceToAmounts({ MUSD: 7054 }),
        balanceToAmounts({ MUSD: 281 }),
      ]),
    ).toBe("MUSD");
  });
});

describe("collectUnits and omittedUnits", () => {
  it("reports every unit present, sorted", () => {
    expect(
      collectUnits([
        balanceToAmounts({ VACHR: 25 }),
        balanceToAmounts({ USD: 1, IRAUSD: 2 }),
      ]),
    ).toEqual(["IRAUSD", "USD", "VACHR"]);
  });

  it("names what a chart in one unit leaves out", () => {
    expect(omittedUnits(["IRAUSD", "USD", "VACHR"], "USD")).toEqual([
      "IRAUSD",
      "VACHR",
    ]);
    expect(omittedUnits(["USD"], "USD")).toEqual([]);
  });
});

describe("chooseDisplayUnit with a declared operating currency", () => {
  /** One account on each side — the thin ledger where the count tier ties. */
  const thinLedger = () => [
    new Map([["IRAUSD", "13200"]]),
    new Map([["USD", "6903.12"]]),
  ];

  it("drops the odd unit a thin ledger used to pick on magnitude alone", () => {
    // Without a declared currency, magnitude decides and the whole diagram is
    // drawn in a single large retirement account's unit.
    expect(chooseDisplayUnit(thinLedger())).toBe("IRAUSD");
    expect(chooseDisplayUnit(thinLedger(), "USD")).toBe("USD");
  });

  it("uses the declared currency even when another unit has more accounts", () => {
    const entries = [
      new Map([["VACHR", "1"]]),
      new Map([["VACHR", "2"]]),
      new Map([["VACHR", "3"]]),
      new Map([["EUR", "10"]]),
    ];

    expect(chooseDisplayUnit(entries)).toBe("VACHR");
    expect(chooseDisplayUnit(entries, "EUR")).toBe("EUR");
  });

  it("ignores a declared currency the accounts do not hold", () => {
    // Preferring a unit nobody holds would draw an empty chart; the heuristic
    // still has to answer.
    const entries = [new Map([["USD", "100"]]), new Map([["USD", "50"]])];

    expect(chooseDisplayUnit(entries, "JPY")).toBe("USD");
  });

  it("leaves the existing tie-breaks alone when nothing is declared", () => {
    const entries = [new Map([["USD", "1"]]), new Map([["EUR", "1"]])];

    // Equal counts, equal magnitude — alphabetical, as before.
    expect(chooseDisplayUnit(entries)).toBe("EUR");
    expect(chooseDisplayUnit(entries, null)).toBe("EUR");
    expect(chooseDisplayUnit(entries, undefined)).toBe("EUR");
    expect(chooseDisplayUnit(entries, "")).toBe("EUR");
  });

  it("still answers nothing for an empty ledger", () => {
    expect(chooseDisplayUnit([], "USD")).toBeNull();
    expect(chooseDisplayUnit([new Map()], "USD")).toBeNull();
  });
});
