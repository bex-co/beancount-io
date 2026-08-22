import type { DirectiveJson } from "@rustledger/wasm";
import {
  filterDirectives,
  parseDateRange,
  TimeFilterParseError,
  AdvancedFilterParseError,
} from "../directive-filter";
import directivesFixture from "./directive-filter.directives.json";
import golden from "./directive-filter.golden.json";

/**
 * Golden-parity tests for {@link filterDirectives} — a port of Fava's
 * `FavaLedger.get_filtered(account, filter, time)` (`fava/core/filters.py` +
 * `fava/util/date.py`).
 *
 * Both sides consume the SAME source ledger:
 *   - `directive-filter.directives.json` is the exact `DirectiveJson[]` emitted
 *     by the real `@rustledger/wasm` engine
 *     (`withLedger({ "main.bean": SRC }, "main.bean", l => l.getDirectives())`)
 *     for the fixture ledger.
 *   - `directive-filter.golden.json` is the golden result of running the REAL
 *     Python `AccountFilter` / `AdvancedFilter` / `parse_date` (from the in-repo
 *     `beancount-ledger/.venv`) over the SAME source, captured as a stable
 *     correlation key per surviving entry.
 *
 * Because beancount's internal `hash_entry` is not reproducible from a
 * `DirectiveJson`, we correlate the two sides on a `type|date|…` key computed
 * identically here and in the golden generator.
 */

const DIRECTIVES = directivesFixture as unknown as DirectiveJson[];

interface AccountGolden {
  [value: string]: string[];
}
interface FilterGolden {
  [value: string]: string[] | { error: string };
}
interface TimeGolden {
  [value: string]: { range: [string | null, string | null]; keys: string[] };
}
interface Golden {
  all: string[];
  account: AccountGolden;
  filter: FilterGolden;
  time: TimeGolden;
  parse_date: Record<string, [string | null, string | null]>;
}

const GOLDEN = golden as unknown as Golden;

/** Stable cross-engine correlation key — must match the Python generator. */
function directiveKey(directive: DirectiveJson): string {
  const date = directive.date;
  switch (directive.type) {
    case "transaction": {
      const account = directive.postings[0]?.account ?? "";
      return `transaction|${date}|${directive.narration ?? ""}|${account}`;
    }
    case "open":
      return `open|${date}|${directive.account}`;
    case "close":
      return `close|${date}|${directive.account}`;
    case "balance":
      return `balance|${date}|${directive.account}`;
    case "note":
      return `note|${date}|${directive.account}`;
    case "event":
      return `event|${date}|${directive.event_type}`;
    case "price":
      return `price|${date}|${directive.currency}`;
    case "pad":
      return `pad|${date}|${directive.account}`;
    default:
      return `${directive.type}|${date}`;
  }
}

const keysOf = (directives: DirectiveJson[]): string[] =>
  directives.map(directiveKey);

describe("directive-filter fixture integrity", () => {
  it("rustledger directives correlate 1:1 with the Python 'all' set", () => {
    expect(keysOf(DIRECTIVES)).toEqual(GOLDEN.all);
  });

  it("all correlation keys are unique in the fixture", () => {
    const keys = keysOf(DIRECTIVES);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("filterDirectives — AccountFilter parity", () => {
  for (const value of Object.keys(GOLDEN.account)) {
    it(`account="${value}" matches Python AccountFilter`, () => {
      const result = filterDirectives(DIRECTIVES, { account: value });
      expect(keysOf(result)).toEqual(GOLDEN.account[value]);
    });
  }

  it("empty account string is a no-op (keeps all)", () => {
    const result = filterDirectives(DIRECTIVES, { account: "" });
    expect(keysOf(result)).toEqual(GOLDEN.all);
  });

  it("rejects oversized user regex programs before matching ledger text", () => {
    expect(() =>
      filterDirectives(DIRECTIVES, { account: "a".repeat(257) }),
    ).toThrow(AdvancedFilterParseError);
  });

  it("translates common Python-only named-group regex syntax", () => {
    const result = filterDirectives(DIRECTIVES, {
      account: "(?P<account>Checking)",
    });
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every((directive) =>
        directive.type === "transaction"
          ? directive.postings.some((posting) =>
              posting.account.includes("Checking"),
            )
          : "account" in directive &&
            typeof directive.account === "string" &&
            directive.account.includes("Checking"),
      ),
    ).toBe(true);
  });

  it("translates Python global inline regex flags", () => {
    const result = filterDirectives(DIRECTIVES, {
      account: "(?i)assets:checking",
    });
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("filterDirectives — AdvancedFilter parity", () => {
  for (const value of Object.keys(GOLDEN.filter)) {
    const expected = GOLDEN.filter[value];
    if (Array.isArray(expected)) {
      it(`filter="${value}" matches Python AdvancedFilter`, () => {
        const result = filterDirectives(DIRECTIVES, { filter: value });
        expect(keysOf(result)).toEqual(expected);
      });
    }
  }

  it("blank filter is a no-op (keeps all)", () => {
    const result = filterDirectives(DIRECTIVES, { filter: "   " });
    expect(keysOf(result)).toEqual(GOLDEN.all);
  });

  // #6: an unparseable advanced filter must raise (mirrors Fava's
  // FilterParseError), NOT silently keep every entry — which would masquerade as
  // a filter that matched everything.
  for (const bad of ["(", "account:", "any(", "#a )"]) {
    it(`throws AdvancedFilterParseError on the illegal filter ${JSON.stringify(bad)}`, () => {
      expect(() => filterDirectives(DIRECTIVES, { filter: bad })).toThrow(
        AdvancedFilterParseError,
      );
    });
  }

  it("matches tags and links carried by document directives", () => {
    const document: DirectiveJson = {
      type: "document",
      date: "2024-04-01",
      account: "Expenses:Food",
      path: "receipts/r1.pdf",
      tags: ["receipt"],
      links: ["invoice-1"],
    };

    expect(filterDirectives([document], { filter: "#receipt" })).toEqual([
      document,
    ]);
    expect(filterDirectives([document], { filter: "^invoice-1" })).toEqual([
      document,
    ]);
  });

  it("does not expose Object prototype members as directive attributes", () => {
    expect(
      filterDirectives(DIRECTIVES, { filter: "constructor:native" }),
    ).toEqual([]);
  });

  it("accepts Unicode unquoted filter words", () => {
    const unicode: DirectiveJson[] = [
      {
        type: "transaction",
        date: "2024-04-01",
        flag: "*",
        payee: "Bäckerei",
        narration: "咖啡",
        tags: [],
        links: [],
        postings: [],
      },
    ];
    expect(filterDirectives(unicode, { filter: "Bäckerei" })).toEqual(unicode);
    expect(filterDirectives(unicode, { filter: "咖啡" })).toEqual(unicode);
  });

  it("compares only Amount-shaped metadata values", () => {
    const primitiveMeta = {
      type: "note",
      date: "2024-04-01",
      account: "Assets:Cash",
      comment: "primitive",
      meta: { shares: "100" },
    } as DirectiveJson;
    const amountMeta = {
      ...primitiveMeta,
      comment: "amount",
      meta: { shares: { number: "100", currency: "HOOL" } },
    } as DirectiveJson;
    expect(
      filterDirectives([primitiveMeta, amountMeta], { filter: "shares>50" }),
    ).toEqual([amountMeta]);
  });

  it("matches the full duck-typed directive attributes used by Fava", () => {
    const pending: DirectiveJson = {
      type: "transaction",
      date: "2024-04-02",
      flag: "P",
      payee: "Cafe",
      narration: "Pending lunch",
      tags: [],
      links: [],
      // An actual tuple attribute takes precedence over same-named metadata.
      meta: { flag: "metadata-value" },
      postings: [
        {
          account: "Expenses:Food",
          units: { number: "12.50", currency: "USD" },
          flag: "P",
        },
      ],
    };
    const balance: DirectiveJson = {
      type: "balance",
      date: "2024-04-03",
      account: "Assets:Cash",
      amount: { number: "20", currency: "USD" },
    };
    const event: DirectiveJson = {
      type: "event",
      date: "2024-04-04",
      event_type: "location",
      value: "Paris",
    };

    expect(
      filterDirectives([pending, balance, event], { filter: "flag:P" }),
    ).toEqual([pending]);
    expect(
      filterDirectives([pending, balance, event], {
        filter: "flag:metadata-value",
      }),
    ).toEqual([]);
    expect(
      filterDirectives([pending, balance, event], { filter: "amount>10" }),
    ).toEqual([balance]);
    expect(
      filterDirectives([pending, balance, event], { filter: "type:location" }),
    ).toEqual([event]);
    expect(
      filterDirectives([pending, balance, event], { filter: "any(flag:P)" }),
    ).toEqual([pending]);
  });
});

describe("filterDirectives — TimeFilter (date-range) parity", () => {
  for (const value of Object.keys(GOLDEN.time)) {
    it(`time="${value}" keeps entries in the Python-parsed range`, () => {
      const result = filterDirectives(DIRECTIVES, { time: value });
      expect(keysOf(result)).toEqual(GOLDEN.time[value].keys);
    });
  }

  it("throws TimeFilterParseError on an unparseable time string", () => {
    expect(() => filterDirectives(DIRECTIVES, { time: "garbage" })).toThrow(
      TimeFilterParseError,
    );
  });
});

describe("parseDateRange — util/date.parse_date parity", () => {
  for (const value of Object.keys(GOLDEN.parse_date)) {
    const [begin, end] = GOLDEN.parse_date[value];
    it(`parse_date(${JSON.stringify(value)})`, () => {
      const range = parseDateRange(value);
      if (begin === null || end === null) {
        expect(range).toBeUndefined();
      } else {
        expect(range).toEqual({ begin, end });
      }
    });
  }

  it.each([
    "0000",
    "2024-00",
    "2024-13",
    "2024-99",
    "2023-02-29",
    "2024-02-30",
    "2024-02-31",
    "2024-W00",
    "2021-W53",
    "2024-W99",
    "2024 to 2023",
  ])("rejects impossible or reversed date range %s", (value) => {
    expect(parseDateRange(value)).toBeUndefined();
    expect(() => filterDirectives(DIRECTIVES, { time: value })).toThrow(
      TimeFilterParseError,
    );
  });

  it("accepts leap days and the 53rd ISO week only when they exist", () => {
    expect(parseDateRange("2024-02-29")).toEqual({
      begin: "2024-02-29",
      end: "2024-03-01",
    });
    expect(parseDateRange("2020-W53")).toEqual({
      begin: "2020-12-28",
      end: "2021-01-04",
    });
  });
});

describe("filterDirectives — composition (account + filter + time)", () => {
  it("applies account, then filter, then time in order", () => {
    // #income transactions in 2024 touching Assets → only the Jan 2024 salary
    // and the March 2024 bonus are #income; time=2024 keeps both.
    const result = filterDirectives(DIRECTIVES, {
      account: "Assets",
      filter: "#income",
      time: "2024",
    });
    const keys = keysOf(result);
    expect(keys).toContain(
      "transaction|2024-01-10|Salary January|Assets:Checking",
    );
    expect(keys).toContain("transaction|2024-03-01|Q1 bonus|Assets:Savings");
    // 2023 #income salary is excluded by time=2024.
    expect(keys).not.toContain(
      "transaction|2023-06-15|Salary June|Assets:Checking",
    );
  });

  it("empty opts returns the input unchanged", () => {
    expect(filterDirectives(DIRECTIVES, {})).toBe(DIRECTIVES);
  });
});

describe("parseDateRange — relative variables + fiscal year end", () => {
  it("substitutes 'year' against the provided today", () => {
    expect(parseDateRange("year", undefined, "2024-06-15")).toEqual({
      begin: "2024-01-01",
      end: "2025-01-01",
    });
  });

  it("substitutes 'year-1' (previous year)", () => {
    expect(parseDateRange("year-1", undefined, "2024-06-15")).toEqual({
      begin: "2023-01-01",
      end: "2024-01-01",
    });
  });

  it("substitutes 'month' against the provided today", () => {
    expect(parseDateRange("month", undefined, "2024-06-15")).toEqual({
      begin: "2024-06-01",
      end: "2024-07-01",
    });
  });

  it("honors a non-default fiscal_year_end for FY ranges", () => {
    // FYE 06-30: FY2024 runs 2023-07-01 .. 2024-07-01.
    expect(parseDateRange("FY2024", "06-30")).toEqual({
      begin: "2023-07-01",
      end: "2024-07-01",
    });
  });

  it("preserves Fava's cross-year fiscal month offset", () => {
    // Fava accepts month 15 as March in the following year.
    expect(parseDateRange("FY2024", "15-31")).toEqual({
      begin: "2024-04-01",
      end: "2025-04-01",
    });
  });
});

describe("parseDateRange — fiscal_quarter substitution (util/date parity)", () => {
  // Fava: quarter = (target.month - fye.month_of_year - 1) // 3 % 4 + 1.
  // With the default FYE 12-31 fiscal quarters ARE calendar quarters, so every
  // month of 2024 must resolve to its calendar quarter's [begin, end) range.
  const CALENDAR_QUARTER_RANGES: Record<
    number,
    { begin: string; end: string }
  > = {
    1: { begin: "2024-01-01", end: "2024-04-01" },
    2: { begin: "2024-04-01", end: "2024-07-01" },
    3: { begin: "2024-07-01", end: "2024-10-01" },
    4: { begin: "2024-10-01", end: "2025-01-01" },
  };

  for (let month = 1; month <= 12; month += 1) {
    const quarter = Math.floor((month - 1) / 3) + 1;
    const today = `2024-${String(month).padStart(2, "0")}-15`;
    it(`default FYE 12-31: today=${today} resolves to calendar Q${quarter}`, () => {
      expect(parseDateRange("fiscal_quarter", undefined, today)).toEqual(
        CALENDAR_QUARTER_RANGES[quarter],
      );
    });
  }

  // FYE 06-30: the fiscal year starts in July, so FY2025-Q1 = Jul–Sep 2024,
  // Q2 = Oct–Dec 2024, Q3 = Jan–Mar 2025 (i.e. FY2024-Q3 for early 2024), and
  // Q4 = Apr–Jun. Spot-check one month from each fiscal quarter plus both
  // boundary months (July = first month of the FY, June = last).
  const FYE_JUN30_CASES: Array<{
    today: string;
    label: string;
    begin: string;
    end: string;
  }> = [
    // FY2025-Q1 (Jul–Sep 2024)
    {
      today: "2024-07-15",
      label: "FY2025-Q1",
      begin: "2024-07-01",
      end: "2024-10-01",
    },
    {
      today: "2024-08-15",
      label: "FY2025-Q1",
      begin: "2024-07-01",
      end: "2024-10-01",
    },
    {
      today: "2024-09-15",
      label: "FY2025-Q1",
      begin: "2024-07-01",
      end: "2024-10-01",
    },
    // FY2025-Q2 (Oct–Dec 2024)
    {
      today: "2024-11-15",
      label: "FY2025-Q2",
      begin: "2024-10-01",
      end: "2025-01-01",
    },
    // FY2024-Q3 (Jan–Mar 2024)
    {
      today: "2024-01-15",
      label: "FY2024-Q3",
      begin: "2024-01-01",
      end: "2024-04-01",
    },
    // FY2024-Q4 (Apr–Jun 2024), including the FY's final month.
    {
      today: "2024-04-15",
      label: "FY2024-Q4",
      begin: "2024-04-01",
      end: "2024-07-01",
    },
    {
      today: "2024-06-15",
      label: "FY2024-Q4",
      begin: "2024-04-01",
      end: "2024-07-01",
    },
  ];

  for (const { today, label, begin, end } of FYE_JUN30_CASES) {
    it(`FYE 06-30: today=${today} resolves to ${label}`, () => {
      expect(parseDateRange("fiscal_quarter", "06-30", today)).toEqual({
        begin,
        end,
      });
    });
  }

  it("applies a -1 offset across the fiscal-year boundary (default FYE)", () => {
    // Jan 2024 minus one quarter → Oct 2023 → FY2023-Q4.
    expect(parseDateRange("fiscal_quarter-1", undefined, "2024-01-15")).toEqual(
      { begin: "2023-10-01", end: "2024-01-01" },
    );
  });

  it("applies a +1 offset across the fiscal-year boundary (default FYE)", () => {
    // Dec 2024 plus one quarter → Mar 2025 → FY2025-Q1.
    expect(parseDateRange("fiscal_quarter+1", undefined, "2024-12-15")).toEqual(
      { begin: "2025-01-01", end: "2025-04-01" },
    );
  });

  it("throws when the fiscal year end does not fall on a month boundary", () => {
    // Fava raises FyeHasNoQuartersError for e.g. FYE 02-15; we surface it as a
    // TimeFilterParseError.
    expect(() =>
      parseDateRange("fiscal_quarter", "02-15", "2024-06-15"),
    ).toThrow(TimeFilterParseError);
  });
});
