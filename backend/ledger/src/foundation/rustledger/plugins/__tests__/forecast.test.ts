import type { DirectiveJson, LedgerOptions } from "@rustledger/wasm";
import { getDirectiveSourceId, seedDirectiveSourceIds } from "../index";
import { forecast, MAX_FORECAST_OCCURRENCES } from "../forecast";

type Transaction = Extract<DirectiveJson, { type: "transaction" }>;

const OPTIONS = {} as LedgerOptions;
const CONTEXT = { today: "2024-06-15" };

function transaction(
  date: string,
  narration: string,
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    type: "transaction",
    date,
    flag: "#",
    narration,
    tags: [],
    links: [],
    postings: [
      {
        account: "Expenses:Electricity",
        units: { number: "10.00", currency: "USD" },
      },
      {
        account: "Assets:Checking",
        units: { number: "-10.00", currency: "USD" },
      },
    ],
    ...overrides,
  };
}

function run(
  directives: DirectiveJson[],
  today = CONTEXT.today,
): DirectiveJson[] {
  return forecast(directives, OPTIONS, { today }).directives;
}

function transactions(directives: DirectiveJson[]): Transaction[] {
  return directives.filter(
    (directive): directive is Transaction => directive.type === "transaction",
  );
}

function dates(directives: DirectiveJson[]): string[] {
  return transactions(directives).map((directive) => directive.date);
}

describe("fava.plugins.forecast — recurrence expansion", () => {
  it.each([
    {
      marker: "DAILY REPEAT 3 TIMES",
      expected: ["2014-03-08", "2014-03-09", "2014-03-10"],
    },
    {
      marker: "WEEKLY REPEAT 3 TIMES",
      expected: ["2014-03-08", "2014-03-15", "2014-03-22"],
    },
    {
      marker: "MONTHLY REPEAT 3 TIMES",
      expected: ["2014-03-08", "2014-04-08", "2014-05-08"],
    },
    {
      marker: "YEARLY REPEAT 3 TIMES",
      expected: ["2014-03-08", "2015-03-08", "2016-03-08"],
    },
  ])("expands $marker", ({ marker, expected }) => {
    const result = run([transaction("2014-03-08", `Bill [${marker}]`)]);
    expect(dates(result)).toEqual(expected);
    expect(transactions(result).map((item) => item.narration)).toEqual(
      expected.map(() => "Bill"),
    );
  });

  it("treats UNTIL as inclusive", () => {
    expect(
      dates(run([transaction("2014-03-08", "Bill [WEEKLY UNTIL 2014-03-22]")])),
    ).toEqual(["2014-03-08", "2014-03-15", "2014-03-22"]);
  });

  it("widens the interval for SKIP", () => {
    expect(
      dates(
        run([
          transaction("2014-03-08", "Bill [WEEKLY SKIP 1 TIME REPEAT 4 TIMES]"),
        ]),
      ),
    ).toEqual(["2014-03-08", "2014-03-22", "2014-04-05", "2014-04-19"]);
  });

  it("lets REPEAT take precedence over UNTIL", () => {
    const result = run([
      transaction(
        "2014-03-08",
        "Bill [MONTHLY REPEAT 12 TIMES UNTIL 2014-04-30]",
      ),
    ]);
    expect(dates(result)).toHaveLength(12);
    expect(dates(result).at(-1)).toBe("2015-02-08");
  });

  it("skips invalid month-end occurrences instead of clamping them", () => {
    expect(
      dates(run([transaction("2014-01-31", "Bill [MONTHLY REPEAT 3 TIMES]")])),
    ).toEqual(["2014-01-31", "2014-03-31", "2014-05-31"]);
  });

  it("skips non-leap years for a yearly February 29 recurrence", () => {
    expect(
      dates(run([transaction("2020-02-29", "Leap [YEARLY REPEAT 3 TIMES]")])),
    ).toEqual(["2020-02-29", "2024-02-29", "2028-02-29"]);
  });

  it("uses the injected current calendar year's end as the default horizon", () => {
    expect(
      dates(run([transaction("2024-01-15", "Bill [MONTHLY]")], "2024-06-15")),
    ).toEqual(
      Array.from(
        { length: 12 },
        (_, index) => `2024-${String(index + 1).padStart(2, "0")}-15`,
      ),
    );
    expect(
      transactions(
        run([transaction("2025-01-15", "Bill [MONTHLY]")], "2024-06-15"),
      ),
    ).toEqual([]);
  });

  it("keeps a realistic multi-year DAILY template within the safety bound", () => {
    const result = forecast(
      [transaction("2022-01-01", "Rent [DAILY]")],
      OPTIONS,
      { today: "2026-08-10" },
    );
    expect(result.errors).toEqual([]);
    expect(transactions(result.directives)).toHaveLength(1826);
    expect(dates(result.directives).at(-1)).toBe("2026-12-31");
  });
});

describe("fava.plugins.forecast — marker and field semantics", () => {
  it("uses the final marker and discards trailing narration text", () => {
    const [result] = transactions(
      run([
        transaction(
          "2014-03-08",
          "Rent [important] pay [MONTHLY REPEAT 1 TIME] trailing note",
        ),
      ]),
    );
    expect(result.narration).toBe("Rent [important] pay");
  });

  it.each([
    "Bill",
    "Bill [monthly]",
    "Bill [QUARTERLY]",
    "Bill [MONTHLY REPEAT TIMES]",
    "Bill [MONTHLY SKIP 0 TIMES]",
    "Bill [MONTHLY REPEAT 0 TIMES]",
  ])("passes an unparseable marker through unchanged: %s", (narration) => {
    const template = transaction("2014-03-08", narration);
    expect(run([template])).toEqual([template]);
  });

  it("rejects an invalid UNTIL date", () => {
    const template = transaction(
      "2014-03-08",
      "Bill [MONTHLY UNTIL 2014-99-99]",
    );
    const result = forecast([template], OPTIONS, { today: "2014-12-01" });
    expect(result.directives).toEqual([template]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "TS_FORECAST_TEMPLATE_FAILED",
        message: expect.stringContaining(
          "Invalid forecast UNTIL date: 2014-99-99",
        ),
      }),
    ]);
  });

  it("does not parse an invalid UNTIL when REPEAT takes precedence", () => {
    expect(
      dates(
        run([
          transaction(
            "2014-03-08",
            "Bill [MONTHLY REPEAT 2 TIMES UNTIL 2014-99-99]",
          ),
        ]),
      ),
    ).toEqual(["2014-03-08", "2014-04-08"]);
  });

  it("preserves flag, payee, postings, tags, links, metadata, and provenance", () => {
    const template = transaction(
      "2014-03-08",
      "Bill [MONTHLY REPEAT 2 TIMES]",
      {
        payee: "Acme Power",
        tags: ["utilities"],
        links: ["rent-2014"],
        meta: { category: "utilities" },
      },
    );
    seedDirectiveSourceIds([template]);
    const sourceId = getDirectiveSourceId(template);
    const result = transactions(run([template]));

    expect(result).toHaveLength(2);
    result.forEach((item) => {
      expect(item).toMatchObject({
        flag: "#",
        payee: "Acme Power",
        narration: "Bill",
        tags: ["utilities"],
        links: ["rent-2014"],
        meta: { category: "utilities" },
        postings: template.postings,
      });
      expect(getDirectiveSourceId(item)).toBe(sourceId);
    });
  });

  it("leaves regular transactions with marker text untouched", () => {
    const regular = transaction("2014-03-08", "Bill [MONTHLY REPEAT 3 TIMES]", {
      flag: "*",
    });
    expect(run([regular])).toEqual([regular]);
  });
});

describe("fava.plugins.forecast — ordering and resource bounds", () => {
  it("places regular directives first and sorts generated transactions together", () => {
    const regular = transaction("2014-06-01", "June groceries", {
      flag: "*",
    });
    const result = transactions(
      run([
        regular,
        transaction("2014-03-20", "B [MONTHLY REPEAT 2 TIMES]"),
        transaction("2014-03-08", "A [MONTHLY REPEAT 2 TIMES]"),
      ]),
    );
    expect(result.map((item) => [item.date, item.narration])).toEqual([
      ["2014-06-01", "June groceries"],
      ["2014-03-08", "A"],
      ["2014-03-20", "B"],
      ["2014-04-08", "A"],
      ["2014-04-20", "B"],
    ]);
  });

  it("sorts markerless forecast transactions in the generated section", () => {
    const regular = transaction("2014-06-01", "June groceries", {
      flag: "*",
    });
    const markerless = transaction("2014-01-02", "No marker here");
    expect(run([regular, markerless])).toEqual([regular, markerless]);
  });

  it("isolates an explicit repeat that exceeds the expansion cap", () => {
    const failed = transaction(
      "2014-03-08",
      `Bill [DAILY REPEAT ${MAX_FORECAST_OCCURRENCES + 1} TIMES]`,
    );
    const valid = transaction("2014-03-08", "Rent [MONTHLY REPEAT 2 TIMES]");
    const result = forecast([failed, valid], OPTIONS, { today: "2014-12-01" });
    expect(result.directives).toEqual([
      failed,
      expect.objectContaining({ narration: "Rent", date: "2014-03-08" }),
      expect.objectContaining({ narration: "Rent", date: "2014-04-08" }),
    ]);
    expect(result.errors[0]).toEqual(
      expect.objectContaining({
        code: "TS_FORECAST_TEMPLATE_FAILED",
        message: expect.stringContaining(
          `exceeding the DAILY maximum of ${MAX_FORECAST_OCCURRENCES}`,
        ),
      }),
    );
  });

  it("keeps an UNTIL template when its recurrence exceeds the cap", () => {
    const template = transaction("2014-03-08", "Bill [DAILY UNTIL 2200-12-31]");
    const result = forecast([template], OPTIONS, { today: "2014-12-01" });
    expect(result.directives).toEqual([template]);
    expect(result.errors[0]?.message).toContain(
      `exceeds the DAILY maximum of ${MAX_FORECAST_OCCURRENCES}`,
    );
  });

  it("rejects Date overflow instead of emitting a NaN-dated directive", () => {
    const template = transaction(
      "2014-03-08",
      "Bill [DAILY SKIP 100000000000000 TIMES REPEAT 2 TIMES]",
    );
    const result = forecast([template], OPTIONS, { today: "2014-12-01" });
    expect(result.directives).toEqual([template]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "TS_FORECAST_TEMPLATE_FAILED",
        message: expect.stringContaining("supported date range"),
      }),
    ]);
    expect(
      result.directives.some((directive) => directive.date.includes("NaN")),
    ).toBe(false);
  });
});
