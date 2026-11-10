import BigNumber from "bignumber.js";
import type { DirectiveJson } from "@rustledger/wasm";
import { buildPriceMap, convertInventory } from "../price-map";

const prices: DirectiveJson[] = [
  {
    type: "price",
    date: "2024-01-10",
    currency: "EUR",
    amount: { number: "1.10", currency: "USD" },
  },
  {
    type: "price",
    date: "2024-02-10",
    currency: "EUR",
    amount: { number: "1.20", currency: "USD" },
  },
];

describe("buildPriceMap", () => {
  const map = buildPriceMap(prices);

  it("returns 1 for identical currencies", () => {
    expect(map.getRate("USD", "USD")?.toString()).toBe("1");
  });

  it("returns the latest rate by default", () => {
    expect(map.getRate("EUR", "USD")?.toString()).toBe("1.2");
  });

  it("returns the as-of-date rate", () => {
    expect(map.getRate("EUR", "USD", "2024-01-15")?.toString()).toBe("1.1");
    expect(map.getRate("EUR", "USD", "2024-01-05")).toBeNull(); // before first price
  });

  it("resolves inverse rates", () => {
    const inv = map.getRate("USD", "EUR");
    // 1 / 1.20 ≈ 0.8333...
    expect(inv?.toString().startsWith("0.8333333")).toBe(true);
  });

  it("rounds inverse rates to Python Decimal's 28 significant digits", () => {
    const mapWithRepeatingInverse = buildPriceMap([
      {
        type: "price",
        date: "2024-01-01",
        currency: "EUR",
        amount: { number: "30", currency: "USD" },
      },
    ]);
    expect(mapWithRepeatingInverse.getRate("USD", "EUR")?.toString()).toBe(
      "0.03333333333333333333333333333",
    );
  });

  it("returns null for an unknown pair", () => {
    expect(map.getRate("JPY", "USD")).toBeNull();
  });
});

describe("convertInventory", () => {
  const map = buildPriceMap(prices);

  it("passes through amounts already in the target", () => {
    const bal = new Map([["USD", new BigNumber("100")]]);
    const out = convertInventory(bal, "USD", map);
    expect(out.get("USD")?.toString()).toBe("100");
  });

  it("values a foreign currency at the latest rate", () => {
    const bal = new Map([["EUR", new BigNumber("100")]]);
    const out = convertInventory(bal, "USD", map);
    expect(out.get("USD")?.toString()).toBe("120"); // 100 * 1.20
  });

  it("sums mixed currencies into the target", () => {
    const bal = new Map([
      ["USD", new BigNumber("50")],
      ["EUR", new BigNumber("100")],
    ]);
    const out = convertInventory(bal, "USD", map);
    expect(out.get("USD")?.toString()).toBe("170"); // 50 + 120
  });

  it("leaves unconvertible currencies in place", () => {
    const bal = new Map([["JPY", new BigNumber("1000")]]);
    const out = convertInventory(bal, "USD", map);
    expect(out.get("JPY")?.toString()).toBe("1000");
    expect(out.has("USD")).toBe(false);
  });
});

// w22/016: a rate's written places travel with it, because Decimal multiplication
// sums them and a BigNumber has already dropped its trailing zeros.
describe("getScaledRate", () => {
  const map = buildPriceMap([
    ...prices,
    {
      type: "price",
      date: "2024-03-01",
      currency: "VTI",
      amount: { number: "200.00", currency: "EUR" },
    } as DirectiveJson,
  ]);

  it("returns the price as written, with its places", () => {
    expect(map.getScaledRate("VTI", "EUR")?.scale).toBe(2);
    expect(map.getScaledRate("VTI", "EUR")?.value.toString()).toBe("200");
    expect(map.getScaledRate("EUR", "USD", "2024-01-15")?.scale).toBe(2);
  });

  it("gives an inverse the places of its own quotient", () => {
    const inverse = map.getScaledRate("EUR", "VTI");
    expect(inverse?.scale).toBe(inverse?.value.decimalPlaces() ?? 0);
    expect(inverse?.value.toString()).toBe("0.005");
  });

  it("gives the identity rate no places, and no path no rate", () => {
    expect(map.getScaledRate("EUR", "EUR")?.scale).toBe(0);
    expect(map.getScaledRate("JPY", "USD")).toBeNull();
    expect(map.getScaledRate("EUR", "USD", "2024-01-05")).toBeNull();
  });

  it("agrees with getRate on the value", () => {
    for (const [base, quote, date] of [
      ["EUR", "USD", "2024-02-15"],
      ["VTI", "EUR", undefined],
      ["USD", "EUR", "2024-02-15"],
    ] as const) {
      expect(map.getScaledRate(base, quote, date)?.value.toString()).toBe(
        map.getRate(base, quote, date)?.toString(),
      );
    }
  });
});
