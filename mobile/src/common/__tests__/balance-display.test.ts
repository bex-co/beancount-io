import {
  amountIn,
  balanceNotes,
  notInTotalOf,
  selectBalanceDisplay,
} from "../balance-display";

/** Echoes the key and its params, so a note's wording and inputs are both visible. */
const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}(${JSON.stringify(params)})` : key;

describe("selectBalanceDisplay", () => {
  it("reads a commodity held at cost in its units, carrying the cost", () => {
    // Assets:US:Vanguard:RGAGX in the Beancount example ledger.
    expect(
      selectBalanceDisplay({ USD: "49049.66613" }, { RGAGX: "597.748" }, "USD"),
    ).toEqual({
      kind: "units",
      units: { currency: "RGAGX", number: 597.748, scale: 3 },
      cost: 49049.66613,
    });
  });

  it("reads a commodity with no cost in its units, never as a zero", () => {
    const vacation = { VACHR: "-13" };
    const expected = {
      kind: "units",
      units: { currency: "VACHR", number: -13, scale: 0 },
      cost: null,
    };
    expect(selectBalanceDisplay(vacation, vacation, "USD")).toEqual(expected);
    // The at-cost read alone is enough: the units read may not have landed.
    expect(selectBalanceDisplay(vacation, undefined, "USD")).toEqual(expected);
  });

  it("keeps a commodity held at cost a money figure until the units read lands", () => {
    expect(
      selectBalanceDisplay({ USD: "49049.66613" }, undefined, "USD"),
    ).toEqual({ kind: "money", value: 49049.66613, notInTotal: [] });
  });

  it("leaves a genuinely empty account an empty money figure", () => {
    expect(selectBalanceDisplay({}, {}, "USD")).toEqual({
      kind: "money",
      value: 0,
      notInTotal: [],
    });
  });

  it("leaves a plain cash account exactly as it was", () => {
    expect(
      selectBalanceDisplay({ USD: "1234.5" }, { USD: "1234.5" }, "USD"),
    ).toEqual({ kind: "money", value: 1234.5, notInTotal: [] });
  });

  it("keeps a parent holding several commodities and cash a money total", () => {
    // Assets:US:Vanguard: two funds at cost plus a cent of cash.
    expect(
      selectBalanceDisplay(
        { USD: "81749.99944" },
        { USD: "-0.02", VBMPX: "193.442", RGAGX: "597.748" },
        "USD",
      ),
    ).toEqual({ kind: "money", value: 81749.99944, notInTotal: [] });
  });

  it("names the holdings a total cannot express, instead of dropping them", () => {
    // The Assets root: every fund converts, the vacation hours cannot.
    expect(
      selectBalanceDisplay(
        { USD: "109529.33944", VACHR: "-13" },
        { USD: "3609.87", RGAGX: "597.748", VACHR: "-13" },
        "USD",
      ),
    ).toEqual({
      kind: "money",
      value: 109529.33944,
      notInTotal: [{ currency: "VACHR", number: -13, scale: 0 }],
    });
  });

  it("keeps a total of several unconverted commodities a disclosed money figure", () => {
    expect(
      selectBalanceDisplay({ IRAUSD: "18000", VACHR: "5" }, undefined, "USD"),
    ).toEqual({
      kind: "money",
      value: 0,
      notInTotal: [
        { currency: "IRAUSD", number: 18000, scale: 0 },
        { currency: "VACHR", number: 5, scale: 0 },
      ],
    });
  });

  it("treats a cash account in a non-USD operating currency as money", () => {
    expect(
      selectBalanceDisplay({ MUSD: "357.997" }, { MUSD: "357.997" }, "MUSD"),
    ).toEqual({ kind: "money", value: 357.997, notInTotal: [] });
  });
});

describe("notInTotalOf", () => {
  it("excludes the key the total is read from, including the USD fallback", () => {
    // resolveCurrencyBalance falls back to USD when the currency is absent, so
    // USD is part of that total and must not also be reported as left out.
    expect(notInTotalOf({ USD: "5", GLD: "2" }, "EUR")).toEqual([
      { currency: "GLD", number: 2, scale: 0 },
    ]);
  });

  it("ignores zero entries", () => {
    expect(notInTotalOf({ USD: "5", VACHR: "0" }, "USD")).toEqual([]);
  });
});

describe("amountIn", () => {
  it("reads one currency strictly, with its recorded scale", () => {
    expect(amountIn({ RGAGX: "597.748", USD: "5" }, "RGAGX")).toEqual({
      number: 597.748,
      scale: 3,
    });
  });

  it("reads a missing currency as zero, without the USD fallback", () => {
    expect(amountIn({ USD: "5" }, "RGAGX")).toEqual({ number: 0, scale: 0 });
    expect(amountIn(undefined, "USD")).toEqual({ number: 0, scale: 0 });
  });
});

describe("balanceNotes", () => {
  it("states the cost behind a units figure", () => {
    expect(
      balanceNotes(
        {
          kind: "units",
          units: { currency: "RGAGX", number: 597.748, scale: 3 },
          cost: 49049.66613,
        },
        "USD",
        t,
      ),
    ).toEqual(['atCost({"amount":"$49,049.67"})']);
  });

  it("says nothing more about a units figure with no cost", () => {
    expect(
      balanceNotes(
        {
          kind: "units",
          units: { currency: "VACHR", number: -13, scale: 0 },
          cost: null,
        },
        "USD",
        t,
      ),
    ).toEqual([]);
  });

  it("names what a money total leaves out, and nothing when it leaves out nothing", () => {
    expect(
      balanceNotes(
        {
          kind: "money",
          value: 1,
          notInTotal: [
            { currency: "VACHR", number: -13, scale: 0 },
            { currency: "IRAUSD", number: 18000, scale: 0 },
          ],
        },
        "USD",
        t,
      ),
    ).toEqual(['notInTotal({"amounts":"-13 VACHR, 18,000 IRAUSD"})']);
    expect(
      balanceNotes({ kind: "money", value: 1, notInTotal: [] }, "USD", t),
    ).toEqual([]);
  });
});
