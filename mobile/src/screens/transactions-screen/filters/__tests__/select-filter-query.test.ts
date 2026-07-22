import {
  countActiveFilters,
  formatTimeFilter,
  resolveDateRange,
  toFilterQuery,
} from "../select-filter-query";
import { NO_FILTERS, type TransactionFilters } from "../types";

// Local noon keeps the date the same no matter the runner's timezone.
const TODAY = new Date(2026, 6, 22, 12);

const filters = (
  overrides: Partial<TransactionFilters>,
): TransactionFilters => ({
  ...NO_FILTERS,
  ...overrides,
});

describe("resolveDateRange", () => {
  it("returns null for the unbounded range", () => {
    expect(resolveDateRange(NO_FILTERS, TODAY)).toBe(null);
  });

  it("walks back one month for 1M", () => {
    expect(resolveDateRange(filters({ range: "1M" }), TODAY)).toEqual({
      start: "2026-06-22",
      end: "2026-07-22",
    });
  });

  it("walks back three months for 3M", () => {
    expect(resolveDateRange(filters({ range: "3M" }), TODAY)).toEqual({
      start: "2026-04-22",
      end: "2026-07-22",
    });
  });

  it("clamps to the last day when the earlier month is shorter", () => {
    const march31 = new Date(2026, 2, 31, 12);
    expect(resolveDateRange(filters({ range: "1M" }), march31)).toEqual({
      start: "2026-02-28",
      end: "2026-03-31",
    });
  });

  it("starts YTD on January 1st", () => {
    expect(resolveDateRange(filters({ range: "YTD" }), TODAY)).toEqual({
      start: "2026-01-01",
      end: "2026-07-22",
    });
  });

  it("returns the stored pair for a custom range", () => {
    const custom = filters({
      range: "custom",
      startDate: "2025-01-01",
      endDate: "2025-03-31",
    });
    expect(resolveDateRange(custom, TODAY)).toEqual({
      start: "2025-01-01",
      end: "2025-03-31",
    });
  });

  it("returns null when a custom range is missing an end", () => {
    const halfFilled = filters({ range: "custom", startDate: "2025-01-01" });
    expect(resolveDateRange(halfFilled, TODAY)).toBe(null);
  });
});

describe("formatTimeFilter", () => {
  it("writes the Fava range expression", () => {
    expect(formatTimeFilter({ start: "2026-01-01", end: "2026-07-22" })).toBe(
      "2026-01-01 - 2026-07-22",
    );
  });
});

describe("toFilterQuery", () => {
  it("omits every field when nothing is filtered", () => {
    expect(toFilterQuery(NO_FILTERS, TODAY)).toEqual({});
  });

  it("passes selected statuses as transaction subtypes", () => {
    const query = toFilterQuery(
      filters({ statuses: ["pending", "other"] }),
      TODAY,
    );
    expect(query.transactionSubtypes).toEqual(["pending", "other"]);
    expect(query.time).toBe(undefined);
  });

  it("passes a resolved range as the time expression", () => {
    expect(toFilterQuery(filters({ range: "YTD" }), TODAY).time).toBe(
      "2026-01-01 - 2026-07-22",
    );
  });

  it("passes the picked account through", () => {
    const query = toFilterQuery(
      filters({ account: "Assets:Bank:Checking" }),
      TODAY,
    );
    expect(query.account).toBe("Assets:Bank:Checking");
  });

  it("combines every filter group", () => {
    const query = toFilterQuery(
      filters({
        statuses: ["cleared"],
        range: "custom",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        account: "Expenses:Food",
      }),
      TODAY,
    );
    expect(query).toEqual({
      transactionSubtypes: ["cleared"],
      time: "2026-01-01 - 2026-01-31",
      account: "Expenses:Food",
    });
  });
});

describe("countActiveFilters", () => {
  it("counts nothing for the empty state", () => {
    expect(countActiveFilters(NO_FILTERS, TODAY)).toBe(0);
  });

  it("counts one per active group", () => {
    const all = filters({
      statuses: ["cleared"],
      range: "1M",
      account: "Assets:Cash",
    });
    expect(countActiveFilters(all, TODAY)).toBe(3);
  });

  it("ignores a custom range that cannot be resolved", () => {
    const halfFilled = filters({ range: "custom", endDate: "2026-01-31" });
    expect(countActiveFilters(halfFilled, TODAY)).toBe(0);
  });
});
