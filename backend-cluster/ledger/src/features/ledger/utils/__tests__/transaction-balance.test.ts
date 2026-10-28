import BigNumber from "bignumber.js";
import {
  checkTransactionBalance,
  scanInferredToleranceDefaults,
} from "@/features/ledger/utils/transaction-balance";
import { entryInputToText } from "@/foundation/rustledger/entry-build";

const usd = (number: string) => ({ number, currency: "USD" });
const hool = (number: string) => ({ number, currency: "HOOL" });
const posting = (account: string, number?: string) => ({
  account,
  ...(number === undefined ? {} : { units: usd(number) }),
});

describe("checkTransactionBalance", () => {
  it("accepts a balanced transaction", () => {
    expect(
      checkTransactionBalance([
        posting("Expenses:Food", "10.00"),
        posting("Assets:Cash", "-10.00"),
      ]),
    ).toEqual({ ok: true, value: { residuals: [] } });
  });

  it("refuses a residual outside tolerance and names it", () => {
    const check = checkTransactionBalance([
      posting("Expenses:Food", "10"),
      posting("Assets:Cash", "-5"),
    ]);
    expect(check.ok).toBe(false);
    if (!check.ok && check.value.kind === "unbalanced") {
      expect(check.value.message).toBe(
        "Transaction does not balance: residual 5 USD",
      );
      expect(check.value.residuals).toEqual(["5 USD"]);
    } else {
      throw new Error("expected an unbalanced failure");
    }
  });

  it("keeps the residual precision of the postings", () => {
    const check = checkTransactionBalance([
      posting("Expenses:Food", "10.00"),
      posting("Assets:Cash", "-5.00"),
    ]);
    if (!check.ok && check.value.kind === "unbalanced") {
      expect(check.value.residuals).toEqual(["5.00 USD"]);
    } else {
      throw new Error("expected an unbalanced failure");
    }
  });

  it("tolerates dust within the inferred half-unit", () => {
    // 100.00 implies 0.005; a 0.004 residual passes.
    expect(
      checkTransactionBalance([
        posting("Expenses:Food", "100.00"),
        posting("Assets:Cash", "-99.996"),
      ]).ok,
    ).toBe(true);
  });

  // w21/648: Beancount has no 0.005 floor: high-precision numbers imply a
  // tiny tolerance, and both engines refuse a 0.004 residual on them.
  it("has no tolerance floor without a declared default", () => {
    expect(
      checkTransactionBalance([
        posting("Expenses:Food", "100.0000"),
        posting("Assets:Cash", "-99.9960"),
      ]).ok,
    ).toBe(false);
  });

  // w21/648: a whole number implied a 0.5 tolerance; Beancount gives none.
  it("infers no tolerance from a whole number", () => {
    expect(
      checkTransactionBalance([
        posting("Expenses:Food", "10"),
        posting("Assets:Cash", "-9.6"),
      ]).ok,
    ).toBe(false);
  });

  it("raises a currency's tolerance to its declared default", () => {
    const split = [
      posting("Assets:Cash", "-10.00"),
      posting("Expenses:A", "3.33"),
      posting("Expenses:B", "3.33"),
      posting("Expenses:C", "3.33"),
    ];
    const usd = new Map([["USD", new BigNumber("0.01")]]);
    expect(checkTransactionBalance(split).ok).toBe(false);
    expect(checkTransactionBalance(split, usd).ok).toBe(true);
    // A `*` default covers only a currency that implies no tolerance of its
    // own, as in Beancount: the split's 0.005 stands.
    const star = new Map([["*", new BigNumber("0.01")]]);
    expect(checkTransactionBalance(split, star).ok).toBe(false);
    const whole = [
      posting("Expenses:Food", "10"),
      posting("Assets:Cash", "-9"),
    ];
    expect(
      checkTransactionBalance(whole, new Map([["*", new BigNumber("1")]])).ok,
    ).toBe(true);
    expect(
      checkTransactionBalance(whole, new Map([["EUR", new BigNumber("1")]])).ok,
    ).toBe(false);
  });

  // w21/647: a priced posting was summed in its own currency, so a balanced
  // exchange read as "residual 110.00 USD, 100.00 EUR".
  it("weighs a priced posting as units × price, in the price's currency", () => {
    const exchange = (price: string) => [
      posting("Assets:Cash", "-110.00"),
      {
        account: "Assets:Bank",
        units: { number: "100.00", currency: "EUR" },
        price: usd(price),
      },
    ];
    expect(checkTransactionBalance(exchange("1.10")).ok).toBe(true);
    const check = checkTransactionBalance(exchange("1.11"));
    expect(check).toMatchObject({
      ok: false,
      value: {
        kind: "unbalanced",
        message: "Transaction does not balance: residual 1.0000 USD",
      },
    });
    // The weight interpolates an elided posting like any other amount.
    expect(
      checkTransactionBalance([exchange("1.10")[1]!, posting("Assets:Cash")])
        .ok,
    ).toBe(true);
  });

  // w23/163: a cost posting weighs units × cost in the cost's currency, as
  // stock's get_weight balances it — the pre-check used to sum raw units.
  it("weighs a cost posting as units × cost, in the cost's currency", () => {
    const costed = (cost: string) => [
      posting("Assets:Cash", "-20"),
      {
        account: "Expenses:Food",
        units: usd("10"),
        cost: usd(cost),
      },
    ];
    expect(checkTransactionBalance(costed("2")).ok).toBe(true);
    const check = checkTransactionBalance(costed("2.5"));
    expect(check).toMatchObject({
      ok: false,
      value: {
        kind: "unbalanced",
        message: "Transaction does not balance: residual 5.0 USD",
      },
    });
    expect(
      checkTransactionBalance([costed("2")[1]!, posting("Assets:Cash")]).ok,
    ).toBe(true);
  });

  // w23/163: a total-price posting weighs its face value — no multiplication,
  // the total already is units × per-unit.
  it("weighs a total-price posting at face value, in its currency", () => {
    const totaled = (total: string) => [
      posting("Assets:Cash", "-20"),
      {
        account: "Expenses:Food",
        units: usd("10"),
        totalPrice: usd(total),
      },
    ];
    expect(checkTransactionBalance(totaled("20")).ok).toBe(true);
    expect(checkTransactionBalance(totaled("20.5"))).toMatchObject({
      ok: false,
      value: {
        kind: "unbalanced",
        message: "Transaction does not balance: residual 0.5 USD",
      },
    });
  });

  // w23/163: cost wins over a co-present price, as stock's get_weight does —
  // `{100 USD} @ 999 USD` against -1000 USD balances in stock.
  it("weighs cost over price when a posting carries both", () => {
    expect(
      checkTransactionBalance([
        posting("Assets:Cash", "-1000"),
        {
          account: "Assets:Stock",
          units: hool("10"),
          cost: usd("100"),
          price: usd("999"),
        },
      ]).ok,
    ).toBe(true);
  });

  // w23/163: tolerance stays units-keyed — stock's infer_tolerance_from_cost
  // defaults to False, so a cost leg's decimals never widen the residual's
  // tolerance. 10 HOOL {100.00 USD} against -999.999 USD refuses in stock.
  it("infers tolerance from units, not cost, for a cost posting", () => {
    expect(
      checkTransactionBalance([
        posting("Assets:Cash", "-999.999"),
        {
          account: "Assets:Stock",
          units: hool("10"),
          cost: usd("100.00"),
        },
      ]),
    ).toMatchObject({
      ok: false,
      value: {
        kind: "unbalanced",
        message: "Transaction does not balance: residual 0.001 USD",
      },
    });
  });

  it("names a residual with its sign, as the engines do", () => {
    const check = checkTransactionBalance([
      posting("Expenses:Food", "5.00"),
      posting("Assets:Cash", "-10.00"),
    ]);
    expect(check).toMatchObject({
      ok: false,
      value: { residuals: ["-5.00 USD"] },
    });
  });

  it("rejects two or more elided postings", () => {
    const check = checkTransactionBalance([
      posting("Expenses:Food"),
      posting("Assets:Cash"),
    ]);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.value.kind).toBe("elided-count");
  });

  it("interpolates one elided posting for the check", () => {
    expect(
      checkTransactionBalance([
        posting("Expenses:Food", "10.00"),
        posting("Assets:Cash"),
      ]),
    ).toEqual({ ok: true, value: { residuals: [] } });
  });

  it("refuses an elided posting across multiple currencies", () => {
    const check = checkTransactionBalance([
      posting("Expenses:Food", "10.00"),
      { account: "Assets:Cash", units: { number: "-5.00", currency: "EUR" } },
      posting("Equity:Open"),
    ]);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.value.kind).toBe("uninterpolatable");
  });

  it("computes multi-currency residuals exactly", () => {
    const check = checkTransactionBalance([
      posting("Expenses:Food", "0.1"),
      posting("Expenses:Food", "0.2"),
      posting("Assets:Cash", "-0.3"),
    ]);
    // 0.1 + 0.2 - 0.3 is exactly zero in decimal math — no float dust.
    expect(check).toEqual({ ok: true, value: { residuals: [] } });
  });
});

describe("scanInferredToleranceDefaults", () => {
  // w21/648: only a bare number was read; Beancount's "USD:0.01" was not.
  it("reads each currency and the * default, the later one winning", () => {
    const defaults = scanInferredToleranceDefaults([
      'option "inferred_tolerance_default" "USD:0.02"\n2020-01-01 open Assets:Cash USD\n',
      'option "inferred_tolerance_default" "*:0.005" ; all\noption "inferred_tolerance_default" "USD:0.01"\n',
    ]);
    expect(
      Object.fromEntries(
        [...defaults].map(([currency, value]) => [currency, value.toString()]),
      ),
    ).toEqual({ USD: "0.01", "*": "0.005" });
  });

  it("declares nothing for a bare number, which is not Beancount syntax", () => {
    expect(
      scanInferredToleranceDefaults([
        'option "inferred_tolerance_default" "0.02"\n',
      ]).size,
    ).toBe(0);
    expect(scanInferredToleranceDefaults([]).size).toBe(0);
  });
});

describe("entryInputToText with an elided posting", () => {
  it("renders the posting without an amount", () => {
    const text = entryInputToText({
      type: "transaction",
      entry: {
        date: "2026-09-01",
        flag: "*",
        narration: "Food",
        postings: [
          {
            account: "Expenses:Food",
            units: { number: "10.00", currency: "USD" },
          },
          { account: "Assets:Cash" },
        ],
      },
    });
    expect(text).toContain("Expenses:Food");
    expect(text).toContain("Assets:Cash");
    expect(text).not.toMatch(/Assets:Cash\s+\S/);
  });
});

describe("malformed posting amounts (w3/641)", () => {
  it.each(["(12.50)", "-1,234.56", "abc"])(
    "reports %s as not a number instead of throwing",
    (number) => {
      // bignumber.js 11 throws on these where earlier versions returned NaN.
      expect(() => new BigNumber(number)).toThrow();
      const result = checkTransactionBalance([
        { units: { number, currency: "USD" } },
        { units: { number: "12.50", currency: "USD" } },
      ] as never);

      expect(result.ok).toBe(false);
      expect(result).toMatchObject({
        value: {
          kind: "unbalanced",
          message: `posting amount "${number} USD" is not a number`,
        },
      });
    },
  );
});
