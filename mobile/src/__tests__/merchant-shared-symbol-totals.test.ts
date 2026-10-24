import { formatMerchantTotals } from "../screens/merchant-detail-screen/selectors/format-merchant-total";

// w21/535: "QA Maple" paid 42.50 USD and 42.50 CAD showed two identical
// "$42.50" total lines.
const total = (currency: string, amount: number) => ({
  currency,
  total: amount,
});

describe("formatMerchantTotals", () => {
  it("tells a USD and a CAD total apart, the ledger's own keeping its symbol", () => {
    const lines = formatMerchantTotals(
      [total("USD", -42.5), total("CAD", -42.5)],
      "USD",
    );
    expect(lines).toEqual(["-$42.50", "-42.50 CAD"]);
    expect(new Set(lines).size).toBe(2);
  });

  it("uses codes for every one when none is the ledger's own", () => {
    expect(
      formatMerchantTotals([total("CAD", -10), total("AUD", -20)], "EUR"),
    ).toEqual(["-10.00 CAD", "-20.00 AUD"]);
  });

  it("tells CNY and JPY apart, and the krone currencies", () => {
    expect(
      formatMerchantTotals([total("CNY", -100), total("JPY", -1500)], "USD"),
    ).toEqual(["-100.00 CNY", "-1,500 JPY"]);
    expect(
      formatMerchantTotals([total("SEK", -1), total("NOK", -2)], "SEK"),
    ).toEqual(["-kr1.00", "-2.00 NOK"]);
  });

  it("leaves a lone total, and totals with distinct symbols, as they were", () => {
    expect(formatMerchantTotals([total("CAD", -42.5)])).toEqual(["-$42.50"]);
    expect(formatMerchantTotals([total("EUR", -42.5)], "USD")).toEqual([
      "-€42.50",
    ]);
    expect(
      formatMerchantTotals([total("USD", -42.5), total("EUR", -10)], "USD"),
    ).toEqual(["-$42.50", "-€10.00"]);
  });

  it("shows a total that rounds to zero unsigned", () => {
    expect(
      formatMerchantTotals([total("USD", 0), total("CAD", -0.001)], "USD"),
    ).toEqual(["$0.00", "0.00 CAD"]);
  });

  // w21/719: in a CAD ledger a USD merchant's header read "$120.00" over its
  // own rows' "−60.00 USD", while Home's "$" is CAD.
  it("reads a lone total by code when the ledger's own currency has its symbol", () => {
    expect(formatMerchantTotals([total("USD", -120)], "CAD")).toEqual([
      "-120.00 USD",
    ]);
    expect(formatMerchantTotals([total("CAD", -42.5)], "USD")).toEqual([
      "-42.50 CAD",
    ]);
    // The ledger's own keeps its symbol, a USD ledger's USD included.
    expect(formatMerchantTotals([total("USD", -120)], "USD")).toEqual([
      "-$120.00",
    ]);
    expect(formatMerchantTotals([total("CAD", -1)], "CAD")).toEqual(["-$1.00"]);
  });
});

// w21/897: the scheduled and priced lines were checked apart from the totals.
describe("formatMerchantTotals across the header's lines", () => {
  it("reads both currencies by code when one line's symbol is another line's", () => {
    const shown = ["USD", "CAD"];
    expect(formatMerchantTotals([total("USD", 100)], "EUR", shown)).toEqual([
      "100.00 USD",
    ]);
    expect(formatMerchantTotals([total("CAD", 50)], "EUR", shown)).toEqual([
      "50.00 CAD",
    ]);
    expect(
      formatMerchantTotals([total("JPY", 1500)], "EUR", ["JPY", "CNY"]),
    ).toEqual(["1,500 JPY"]);
  });
});
