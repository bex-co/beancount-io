import fs from "fs";
import path from "path";
import {
  countActiveFilters,
  formatTimeFilter,
  isDateRangeValid,
  resolveDateRange,
  selectFiltersForLedger,
  toFilterQuery,
} from "../select-filter-query";
import {
  NO_FILTERS,
  type ScopedTransactionFilters,
  type TransactionFilters,
} from "../types";

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

  it("returns null when a custom range is missing a start", () => {
    const halfFilled = filters({ range: "custom", endDate: "2025-03-31" });
    expect(resolveDateRange(halfFilled, TODAY)).toBe(null);
  });

  it("accepts a single-day custom range", () => {
    const sameDay = filters({
      range: "custom",
      startDate: "2026-09-10",
      endDate: "2026-09-10",
    });
    expect(resolveDateRange(sameDay, TODAY)).toEqual({
      start: "2026-09-10",
      end: "2026-09-10",
    });
  });

  it("never serializes a reversed custom range", () => {
    // The backend answers `Failed to parse date: 2026-10-10 - 2026-09-10` and
    // replaces the journal with an error, so nothing may reach it.
    const reversed = filters({
      range: "custom",
      startDate: "2026-10-10",
      endDate: "2026-09-10",
    });
    expect(resolveDateRange(reversed, TODAY)).toBe(null);
  });

  it("does not swap the ends of a reversed range", () => {
    const reversed = filters({
      range: "custom",
      startDate: "2026-10-10",
      endDate: "2026-09-10",
    });
    expect(toFilterQuery(reversed, TODAY).time).toBe(undefined);
  });
});

describe("isDateRangeValid", () => {
  it("accepts an increasing custom range", () => {
    expect(
      isDateRangeValid(
        filters({
          range: "custom",
          startDate: "2026-09-10",
          endDate: "2026-10-10",
        }),
      ),
    ).toBe(true);
  });

  it("accepts a same-day custom range", () => {
    expect(
      isDateRangeValid(
        filters({
          range: "custom",
          startDate: "2026-09-10",
          endDate: "2026-09-10",
        }),
      ),
    ).toBe(true);
  });

  it("rejects a reversed custom range", () => {
    expect(
      isDateRangeValid(
        filters({
          range: "custom",
          startDate: "2026-10-10",
          endDate: "2026-09-10",
        }),
      ),
    ).toBe(false);
  });

  it("rejects a reversal of one day, and of one year", () => {
    expect(
      isDateRangeValid(
        filters({
          range: "custom",
          startDate: "2026-09-11",
          endDate: "2026-09-10",
        }),
      ),
    ).toBe(false);
    expect(
      isDateRangeValid(
        filters({
          range: "custom",
          startDate: "2027-01-01",
          endDate: "2026-12-31",
        }),
      ),
    ).toBe(false);
  });

  it("treats a half-filled custom range as valid — it just filters nothing", () => {
    expect(
      isDateRangeValid(filters({ range: "custom", startDate: "2026-09-10" })),
    ).toBe(true);
    expect(
      isDateRangeValid(filters({ range: "custom", endDate: "2026-09-10" })),
    ).toBe(true);
  });

  it("accepts every computed range, whatever stale custom dates remain", () => {
    for (const range of ["all", "1M", "3M", "YTD"] as const) {
      expect(
        isDateRangeValid(
          filters({ range, startDate: "2026-10-10", endDate: "2026-09-10" }),
        ),
      ).toBe(true);
    }
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

describe("selectFiltersForLedger (w?/note-115 cross-ledger filter leak)", () => {
  // The bug: one module-level filter var with no ledger identity. Picking an
  // account filter in ledger A and then switching to ledger B kept querying B's
  // journal with A's account, which matches nothing — the journal read as empty.
  const applied = (ledgerId: string | null): ScopedTransactionFilters => ({
    ledgerId,
    filters: filters({ account: "Assets:A:Cash", statuses: ["cleared"] }),
  });

  it("keeps the filters while the owning ledger stays selected", () => {
    expect(selectFiltersForLedger(applied("alice/a"), "alice/a")).toEqual(
      filters({ account: "Assets:A:Cash", statuses: ["cleared"] }),
    );
  });

  it("drops another ledger's filters after a switch with the tab mounted", () => {
    // The tab re-reads the var on every render, so the switch is visible at once.
    expect(selectFiltersForLedger(applied("alice/a"), "alice/b")).toBe(
      NO_FILTERS,
    );
  });

  it("drops them when the switch happened while the tab was unmounted", () => {
    // Nothing cleared the var — the next mount resolves it against the new
    // ledger, which is why the check lives at read time and not at write time.
    const stored = applied("alice/a");
    expect(selectFiltersForLedger(stored, "alice/b")).toBe(NO_FILTERS);
    // And back again: the stored owner is untouched, so returning restores it.
    expect(selectFiltersForLedger(stored, "alice/a")).toBe(stored.filters);
  });

  it("treats same-ledger navigation as no change", () => {
    const stored = applied("alice/a");
    // Repeated reads (push to a detail screen and back) keep the same object.
    expect(selectFiltersForLedger(stored, "alice/a")).toBe(stored.filters);
    expect(selectFiltersForLedger(stored, "alice/a")).toBe(stored.filters);
  });

  it("drops unowned filters and handles a missing selection", () => {
    expect(selectFiltersForLedger(applied(null), "alice/a")).toBe(NO_FILTERS);
    expect(selectFiltersForLedger(applied("alice/a"), null)).toBe(NO_FILTERS);
    expect(selectFiltersForLedger(applied("alice/a"), undefined)).toBe(
      NO_FILTERS,
    );
  });

  it("never yields an account for a mismatched ledger's query", () => {
    const resolved = selectFiltersForLedger(applied("alice/a"), "alice/b");
    expect(toFilterQuery(resolved, TODAY)).toEqual({});
  });
});

describe("transactionFiltersVar readers", () => {
  // Guardrail: the ledger check is only worth anything if every reader goes
  // through it. A new screen folding the raw var into a query would reintroduce
  // note 115, so the read sites are checked at the source level.
  const srcDir = path.join(__dirname, "..", "..", "..", "..");

  const collect = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...collect(full));
      else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name))
        out.push(full);
    }
    return out;
  };

  it("every reader resolves the var against the selected ledger", () => {
    const offenders = collect(srcDir)
      .filter((file) => {
        const source = fs.readFileSync(file, "utf8");
        // The var's own module declares it; everyone else must scope it.
        if (!/transactionFiltersVar/.test(source)) return false;
        if (file.endsWith(path.join("filters", "var.ts"))) return false;
        return !/selectFiltersForLedger/.test(source);
      })
      .map((file) => path.relative(srcDir, file));

    expect(offenders.join(", ")).toBe("");
  });
});
