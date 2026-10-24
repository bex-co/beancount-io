import {
  amountIn,
  holdingsOf,
  isUnitsHeldAtCost,
  notInTotalOf,
  selectBalanceDisplay,
} from "../balance-display";

describe("selectBalanceDisplay", () => {
  it("reads a commodity held at cost in its units, carrying its value", () => {
    // Assets:US:Vanguard:RGAGX in the Beancount example ledger, at market.
    expect(
      selectBalanceDisplay(
        { USD: "48471.38532" },
        { RGAGX: "597.748" },
        "USD",
        () => "market",
      ),
    ).toEqual({
      kind: "units",
      units: { currency: "RGAGX", number: 597.748, scale: 3 },
      value: { amount: 48471.38532, basis: "market" },
      notInTotal: [],
    });
  });

  it("asks for the basis of the one commodity the row holds", () => {
    const asked: string[] = [];
    const display = selectBalanceDisplay(
      { USD: "1000" },
      { STARTUP: "1000" },
      "USD",
      (commodity) => {
        asked.push(commodity);
        return "cost";
      },
    );
    expect(asked).toEqual(["STARTUP"]);
    expect(display).toEqual({
      kind: "units",
      units: { currency: "STARTUP", number: 1000, scale: 0 },
      value: { amount: 1000, basis: "cost" },
      notInTotal: [],
    });
  });

  it("leaves the basis unknown while the ledger's prices are", () => {
    expect(
      selectBalanceDisplay({ USD: "48471.38532" }, { RGAGX: "597.748" }, "USD"),
    ).toEqual({
      kind: "units",
      units: { currency: "RGAGX", number: 597.748, scale: 3 },
      value: { amount: 48471.38532, basis: null },
      notInTotal: [],
    });
  });

  it("reads a commodity with no cost in its units, never as a zero", () => {
    const vacation = { VACHR: "-13" };
    const expected = {
      kind: "units",
      units: { currency: "VACHR", number: -13, scale: 0 },
      value: null,
      notInTotal: [],
    };
    expect(selectBalanceDisplay(vacation, vacation, "USD")).toEqual(expected);
    // The valued read alone is enough: the units read may not have landed.
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
  it("discloses USD under a EUR total, which no longer reads it (w21/058)", () => {
    expect(notInTotalOf({ USD: "5", GLD: "2" }, "EUR")).toEqual([
      { currency: "USD", number: 5, scale: 0 },
      { currency: "GLD", number: 2, scale: 0 },
    ]);
    expect(notInTotalOf({ EUR: "200.00", USD: "5" }, "EUR")).toEqual([
      { currency: "USD", number: 5, scale: 0 },
    ]);
  });

  it("reads a lone USD balance under EUR in its own units", () => {
    expect(selectBalanceDisplay({ USD: "50.00" }, {}, "EUR")).toEqual({
      kind: "units",
      units: { currency: "USD", number: 50, scale: 2 },
      value: null,
      notInTotal: [],
    });
  });

  it("ignores zero entries", () => {
    expect(notInTotalOf({ USD: "5", VACHR: "0" }, "USD")).toEqual([]);
  });
});

describe("holdingsOf", () => {
  it("lists non-zero entries in the order the API returned them", () => {
    expect(holdingsOf({ USD: "906.58", VACHR: "-13", GLD: "0" })).toEqual([
      { currency: "USD", number: 906.58, scale: 2 },
      { currency: "VACHR", number: -13, scale: 0 },
    ]);
    expect(holdingsOf(undefined)).toEqual([]);
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

// w21/278: a commodity held with and without a cost basis lost its value.
describe("a commodity held with and without a cost", () => {
  const rewards = { USD: "5000", ETH: "0.05" };
  const held = { ETH: "2.05" };

  it("keeps the converted value and names the cost-less remainder", () => {
    expect(selectBalanceDisplay(rewards, held, "USD", () => "market")).toEqual({
      kind: "units",
      units: { currency: "ETH", number: 2.05, scale: 2 },
      value: { amount: 5000, basis: "market" },
      notInTotal: [{ currency: "ETH", number: 0.05, scale: 2 }],
    });
  });

  it("says nothing extra when nothing was converted", () => {
    const display = selectBalanceDisplay({ ETH: "2.05" }, held, "USD");
    expect(display).toEqual({
      kind: "units",
      units: { currency: "ETH", number: 2.05, scale: 2 },
      value: null,
      notInTotal: [],
    });
  });
});

// w21/555: 0.5 BTC {30000 USD} and 0.5 BTC {28000 EUR} read "1.0 BTC" with no
// value and no note, though the Assets total includes the USD part.
describe("selectBalanceDisplay for a commodity bought in two currencies", () => {
  const display = () =>
    selectBalanceDisplay(
      { USD: "30000.00", EUR: "14000.00" },
      { BTC: "1.0" },
      "USD",
      () => "market",
    );

  it("keeps the operating-currency value of the part it converted", () => {
    const shown = display();
    expect(shown.kind).toBe("units");
    if (shown.kind !== "units") return;
    expect(shown.units).toEqual({ currency: "BTC", number: 1, scale: 1 });
    expect(shown.value).toEqual({ amount: 30000, basis: "market" });
  });

  it("names the other currency's part as not in the total", () => {
    const shown = display();
    expect(shown.kind === "units" ? shown.notInTotal : []).toEqual([
      { currency: "EUR", number: 14000, scale: 2 },
    ]);
  });

  it("stays plain units when nothing converted", () => {
    const shown = selectBalanceDisplay(
      { EUR: "14000.00" },
      { BTC: "0.5" },
      "USD",
    );
    expect(shown.kind).toBe("units");
    if (shown.kind !== "units") return;
    expect(shown.value).toBe(null);
    expect(shown.notInTotal).toEqual([]);
  });
});

// w21/958: every account shown in units got a grey chart with no percent, a
// foreign-currency card as much as a split of lots held at cost.
describe("isUnitsHeldAtCost", () => {
  it("is false for a foreign-currency balance, which has no value in the ledger's currency", () => {
    const eur = selectBalanceDisplay(
      { EUR: "-300.00" },
      { EUR: "-300.00" },
      "USD",
    );
    expect(eur.kind).toBe("units");
    expect(isUnitsHeldAtCost(eur)).toBe(false);
  });

  it("is true for units that carry a value, and false for money", () => {
    expect(
      isUnitsHeldAtCost({
        kind: "units",
        units: { currency: "QANVDA", number: 40, scale: 0 },
        value: { amount: 8000, basis: null },
        notInTotal: [],
      }),
    ).toBe(true);
    expect(
      isUnitsHeldAtCost({ kind: "money", value: 12, notInTotal: [] }),
    ).toBe(false);
  });

  it("is what the account chart's neutral reads", () => {
    const source = require("fs")
      .readFileSync(
        require("path").join(
          __dirname,
          "..",
          "..",
          "screens",
          "account-detail-screen",
          "account-detail-screen.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(source.includes("neutral={isUnitsHeldAtCost(display)}")).toBe(true);
  });
});
