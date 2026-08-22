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
