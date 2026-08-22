import { normalizeForParity } from "../normalize";

describe("normalizeForParity", () => {
  it("trims trailing decimal zeros (Python '2950.00' vs BigNumber '2950')", () => {
    expect(normalizeForParity("getLedgerErrors", "2950.00")).toBe("2950");
    expect(normalizeForParity("getLedgerErrors", "-10.500")).toBe("-10.5");
    // integers and non-numeric strings untouched
    expect(normalizeForParity("getLedgerErrors", "2950")).toBe("2950");
    expect(normalizeForParity("getLedgerErrors", "v2.00-tag")).toBe(
      "v2.00-tag",
    );
  });

  it("drops null cost/cost_children and null/empty meta (omitted-null parity)", () => {
    expect(
      normalizeForParity("getLedgerHierarchy", {
        account: "Assets",
        cost: null,
        cost_children: null,
        meta: {},
      }),
    ).toEqual({ account: "Assets" });
  });

  it("strips journal meta source coordinates but keeps user metadata", () => {
    const out = normalizeForParity("getJournal", {
      meta: { filename: "/tmp/x/main.bean", lineno: 12, note: "keep" },
    });
    expect(out).toEqual({ meta: { note: "keep" } });
  });

  it("masks entry_hash for journal operations only", () => {
    expect(normalizeForParity("getJournal", { entry_hash: "abc" })).toEqual({
      entry_hash: "<engine-entry-id>",
    });
    expect(
      normalizeForParity("getLedgerErrors", { entry_hash: "abc" }),
    ).toEqual({ entry_hash: "abc" });
  });

  it("masks volatile fields per operation (healthCheck timestamp)", () => {
    expect(
      normalizeForParity("healthCheck", {
        status: "healthy",
        timestamp: "2026-08-14T01:02:03Z",
      }),
    ).toEqual({ status: "healthy", timestamp: "<volatile>" });
    // timestamp is NOT volatile for other operations
    expect(normalizeForParity("getLedgerErrors", { timestamp: "x" })).toEqual({
      timestamp: "x",
    });
  });

  it("cannot silently normalize away a real structural difference", () => {
    const python = normalizeForParity("getLedgerBalanceSheet", {
      balance: { USD: "100.00" },
      account: "Assets:Checking",
    });
    const v2 = normalizeForParity("getLedgerBalanceSheet", {
      balance: { USD: "101" },
      account: "Assets:Checking",
    });
    expect(python).not.toEqual(v2); // a 100 vs 101 difference must survive
  });
});
