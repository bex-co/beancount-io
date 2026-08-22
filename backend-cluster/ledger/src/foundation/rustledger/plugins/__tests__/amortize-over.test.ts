import BigNumber from "bignumber.js";
import type { DirectiveJson, LedgerOptions } from "@rustledger/wasm";
import { amortizeOver, MAX_AMORTIZE_MONTHS } from "../amortize-over";

const OPTS = {} as LedgerOptions;
const FAR_FUTURE = "2099-01-01";

/** Build a 2-posting amortized transaction (second posting elided by default). */
function amortizeTxn(over: {
  date?: string;
  narration?: string;
  months?: string;
  first?: { account: string; number: string; currency?: string };
  second?: { account: string; number?: string; currency?: string };
}): DirectiveJson {
  const first = over.first ?? {
    account: "Assets:Prepaid-Expenses",
    number: "-600.00",
    currency: "USD",
  };
  const second = over.second ?? { account: "Expenses:Insurance:Auto" };
  return {
    type: "transaction",
    date: over.date ?? "2017-06-01",
    flag: "*",
    narration: over.narration ?? "Amortize car insurance",
    tags: [],
    links: [],
    meta:
      over.months === undefined ? undefined : { amortize_months: over.months },
    postings: [
      {
        account: first.account,
        units: { number: first.number, currency: first.currency ?? "USD" },
      },
      second.number === undefined
        ? { account: second.account }
        : {
            account: second.account,
            units: {
              number: second.number,
              currency: second.currency ?? "USD",
            },
          },
    ],
  } as DirectiveJson;
}

describe("amortizeOver", () => {
  it("splits a 600.00/3-month transaction into three signed monthly copies (docstring example)", () => {
    const { directives, errors } = amortizeOver(
      [amortizeTxn({ months: "3" })],
      OPTS,
      {
        today: FAR_FUTURE,
      },
    );
    expect(errors).toEqual([]);
    expect(
      directives.map((d) =>
        d.type === "transaction" ? [d.date, d.narration] : null,
      ),
    ).toEqual([
      ["2017-06-01", "Amortize car insurance (1/3)"],
      ["2017-07-01", "Amortize car insurance (2/3)"],
      ["2017-08-01", "Amortize car insurance (3/3)"],
    ]);
    directives.forEach((d) => {
      if (d.type !== "transaction") throw new Error("expected transaction");
      expect(d.postings[0].units).toEqual({
        number: "-200.00",
        currency: "USD",
      });
      expect(d.postings[1].units).toEqual({
        number: "200.00",
        currency: "USD",
      });
      expect(d.postings[1].account).toBe("Expenses:Insurance:Auto");
    });
  });

  it("distributes the rounding residue (100.00/3 -> 33.33/33.34/33.33, banker's rounding)", () => {
    const txn = amortizeTxn({
      months: "3",
      first: { account: "Assets:Prepaid", number: "-100.00" },
    });
    const { directives } = amortizeOver([txn], OPTS, { today: FAR_FUTURE });
    expect(
      directives.map((d) =>
        d.type === "transaction" ? d.postings[0].units?.number : null,
      ),
    ).toEqual(["-33.33", "-33.34", "-33.33"]);
  });

  it("clamps to the last day of each month (2020-01-31 + n months)", () => {
    const txn = amortizeTxn({ date: "2020-01-31", months: "3" });
    const { directives } = amortizeOver([txn], OPTS, { today: FAR_FUTURE });
    expect(directives.map((d) => d.date)).toEqual([
      "2020-01-31",
      "2020-02-29", // leap year
      "2020-03-31",
    ]);
  });

  it("preserves years below 100 while adding calendar months", () => {
    const txn = amortizeTxn({ date: "0050-01-31", months: "2" });
    const { directives } = amortizeOver([txn], OPTS, { today: FAR_FUTURE });
    expect(directives.map((directive) => directive.date)).toEqual([
      "0050-01-31",
      "0050-02-28",
    ]);
  });

  it("drops copies dated after `today`", () => {
    const txn = amortizeTxn({ date: "2017-06-01", months: "3" });
    const { directives } = amortizeOver([txn], OPTS, { today: "2017-07-25" });
    expect(directives.map((d) => d.date)).toEqual(["2017-06-01", "2017-07-01"]);
  });

  it("follows each posting's sign (positive first posting -> negated second)", () => {
    const txn = amortizeTxn({
      months: "2",
      first: { account: "Assets:Prepaid", number: "600.00" },
    });
    const { directives } = amortizeOver([txn], OPTS, { today: FAR_FUTURE });
    directives.forEach((d) => {
      if (d.type !== "transaction") throw new Error("expected transaction");
      expect(d.postings[0].units?.number).toBe("300.00");
      expect(d.postings[1].units?.number).toBe("-300.00");
    });
  });

  it("honours an explicit second posting's own sign", () => {
    const txn = amortizeTxn({
      months: "2",
      first: { account: "A", number: "-600.00" },
      second: { account: "B", number: "600.00" },
    });
    const { directives } = amortizeOver([txn], OPTS, { today: FAR_FUTURE });
    if (directives[0].type !== "transaction")
      throw new Error("expected transaction");
    expect(directives[0].postings[0].units?.number).toBe("-300.00");
    expect(directives[0].postings[1].units?.number).toBe("300.00");
  });

  it("preserves a transaction that does not have exactly two postings, with an error", () => {
    const bad = {
      ...amortizeTxn({ months: "3" }),
    } as Extract<DirectiveJson, { type: "transaction" }>;
    bad.postings = [
      { account: "A", units: { number: "-600.00", currency: "USD" } },
      { account: "B", units: { number: "300.00", currency: "USD" } },
      { account: "C", units: { number: "300.00", currency: "USD" } },
    ];
    const { directives, errors } = amortizeOver([bad], OPTS, {
      today: FAR_FUTURE,
    });
    expect(directives).toEqual([bad]);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/exactly two postings/);
    expect(errors[0].phase).toBe("plugin");
  });

  it("errors without dropping the transaction when neither posting has units", () => {
    const bad = amortizeTxn({ months: "3" }) as Extract<
      DirectiveJson,
      { type: "transaction" }
    >;
    bad.postings = [{ account: "A" }, { account: "B" }];
    const { directives, errors } = amortizeOver([bad], OPTS, {
      today: FAR_FUTURE,
    });
    expect(directives).toEqual([bad]);
    expect(errors[0].message).toMatch(/must have units specified/);
  });

  it("derives an elided first posting from the explicit second posting", () => {
    const txn = amortizeTxn({ months: "3" }) as Extract<
      DirectiveJson,
      { type: "transaction" }
    >;
    txn.postings = [
      { account: "Assets:Prepaid-Expenses" },
      {
        account: "Expenses:Insurance:Auto",
        units: { number: "600.00", currency: "USD" },
      },
    ];

    const { directives, errors } = amortizeOver([txn], OPTS, {
      today: FAR_FUTURE,
    });

    expect(errors).toEqual([]);
    expect(directives).toHaveLength(3);
    directives.forEach((directive) => {
      if (directive.type !== "transaction") {
        throw new Error("expected transaction");
      }
      expect(directive.postings[0].units).toEqual({
        number: "-200.00",
        currency: "USD",
      });
      expect(directive.postings[1].units).toEqual({
        number: "200.00",
        currency: "USD",
      });
    });
  });

  it("passes through transactions without the amortize_months metadata unchanged", () => {
    const plain = amortizeTxn({}); // no months
    const { directives, errors } = amortizeOver([plain], OPTS, {
      today: FAR_FUTURE,
    });
    expect(directives).toEqual([plain]);
    expect(errors).toEqual([]);
  });

  it.each(["0", "-2", "3.5", "not-a-number"])(
    "reports invalid amortize_months=%s without dropping the transaction",
    (months) => {
      const txn = amortizeTxn({ months });
      const { directives, errors } = amortizeOver([txn], OPTS, {
        today: FAR_FUTURE,
      });
      expect(directives).toEqual([txn]);
      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe("error");
      expect(errors[0].message).toMatch(/positive integer/);
    },
  );

  it("accepts an integral decimal amortize_months value like Python", () => {
    const txn = amortizeTxn({ months: "3.00" });
    const { directives, errors } = amortizeOver([txn], OPTS, {
      today: FAR_FUTURE,
    });
    expect(errors).toEqual([]);
    expect(directives).toHaveLength(3);
  });

  describe("split exactness (banker's rounding parts sum EXACTLY to the original)", () => {
    /** First-leg amounts of every emitted copy. */
    const firstLegs = (directives: DirectiveJson[]): string[] =>
      directives.map((d) => {
        if (d.type !== "transaction" || d.postings[0].units === undefined) {
          throw new Error("expected transaction with units");
        }
        return d.postings[0].units.number;
      });

    it.each([
      ["-600.00", 7],
      ["100.01", 3],
      ["-0.05", 4],
    ])("parts of %s over %i periods sum back exactly", (amount, months) => {
      const txn = amortizeTxn({
        months: String(months),
        first: { account: "Assets:Prepaid", number: amount },
      });
      const { directives, errors } = amortizeOver([txn], OPTS, {
        today: FAR_FUTURE,
      });
      expect(errors).toEqual([]);
      const parts = firstLegs(directives);
      expect(parts).toHaveLength(months);
      // Every part keeps the ORIGINAL amount's decimal places...
      parts.forEach((part) => expect(part).toMatch(/^-?\d+\.\d{2}$/));
      // ...and the parts sum EXACTLY to the original amount (no lost cents).
      const sum = parts.reduce((acc, part) => acc.plus(part), new BigNumber(0));
      expect(sum.toFixed(2)).toBe(amount);
      // Each copy stays internally balanced (second leg mirrors the first).
      directives.forEach((d) => {
        if (d.type !== "transaction") throw new Error("expected transaction");
        const [a, b] = d.postings;
        if (a.units === undefined || b.units === undefined)
          throw new Error("expected units");
        expect(
          new BigNumber(b.units.number).plus(a.units.number).isZero(),
        ).toBe(true);
      });
    });

    it("splits 100.01/3 as 33.34/33.34/33.33 (banker's rounding on the 33.335 tie)", () => {
      const txn = amortizeTxn({
        months: "3",
        first: { account: "Assets:Prepaid", number: "100.01" },
      });
      const { directives } = amortizeOver([txn], OPTS, { today: FAR_FUTURE });
      expect(firstLegs(directives)).toEqual(["33.34", "33.34", "33.33"]);
    });
  });

  describe("amortize_months cap (unbounded split must not crash the ledger)", () => {
    it("emits a plugin error and passes the transaction through UNTRANSFORMED when over the cap", () => {
      const txn = amortizeTxn({ months: "100000" });
      const { directives, errors } = amortizeOver([txn], OPTS, {
        today: FAR_FUTURE,
      });
      expect(directives).toEqual([txn]); // untransformed, not dropped
      expect(errors).toHaveLength(1);
      expect(errors[0].phase).toBe("plugin");
      expect(errors[0].severity).toBe("error");
      expect(errors[0].message).toContain(String(MAX_AMORTIZE_MONTHS));
    });

    it("handles the cap boundary itself (1200 periods, iterative — no stack overflow)", () => {
      const txn = amortizeTxn({ months: String(MAX_AMORTIZE_MONTHS) });
      const { directives, errors } = amortizeOver([txn], OPTS, {
        today: "2999-01-01",
      });
      expect(errors).toEqual([]);
      expect(directives).toHaveLength(MAX_AMORTIZE_MONTHS);
      const sum = directives.reduce((acc, d) => {
        if (d.type !== "transaction" || d.postings[0].units === undefined) {
          throw new Error("expected transaction with units");
        }
        return acc.plus(d.postings[0].units.number);
      }, new BigNumber(0));
      expect(sum.toFixed(2)).toBe("-600.00"); // still sums exactly
    });
  });

  it("passes through non-transaction directives unchanged", () => {
    const open: DirectiveJson = {
      type: "open",
      date: "2017-01-01",
      account: "Assets:Prepaid-Expenses",
      currencies: [],
    } as DirectiveJson;
    const { directives } = amortizeOver([open], OPTS, { today: FAR_FUTURE });
    expect(directives).toEqual([open]);
  });
});
