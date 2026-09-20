import { describe, expect, it } from "vitest";
import { createViewSearchSchema, isOneOfViews } from "../view-search";
import { cashFlowViewFixtures } from "./view-search-fixtures";

/**
 * A page must never fail to render over a search param, so anything that is
 * not a known view becomes the default — a typo, an array, an injected value.
 * The default itself stays absent from the URL, so a shared link carries a
 * view only when the reader actually chose one.
 */

const VIEWS = ["netCashFlow", "byActivity"] as const;
const schema = createViewSearchSchema(VIEWS, "netCashFlow");

describe("recognising a view", () => {
  it("accepts the ones the page offers", () => {
    expect(isOneOfViews(VIEWS, "byActivity")).toBe(true);
    expect(isOneOfViews(VIEWS, "netCashFlow")).toBe(true);
  });

  it("rejects anything else", () => {
    for (const value of cashFlowViewFixtures) {
      expect(isOneOfViews(VIEWS, value)).toBe(false);
    }
  });
});

describe("parsing the search param", () => {
  it("keeps a view the reader chose", () => {
    expect(schema.parse({ view: "byActivity" })).toEqual({
      view: "byActivity",
    });
  });

  it("leaves the default out of the URL entirely", () => {
    expect(schema.parse({})).toEqual({ view: undefined });
    expect(schema.parse({ view: "netCashFlow" })).toEqual({
      view: "netCashFlow",
    });
  });

  it("drops a value it does not recognise rather than failing", () => {
    for (const value of cashFlowViewFixtures) {
      expect(schema.parse({ view: value })).toEqual({ view: undefined });
    }
  });

  it("ignores unrelated params so the ledger filters survive", () => {
    // The filters are validated by the parent route; this schema must not
    // claim them.
    expect(() =>
      schema.parse({ time: "2016", account: "Assets" }),
    ).not.toThrow();
  });
});
