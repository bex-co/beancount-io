import { describe, expect, it } from "vitest";
import { collectHierarchyRecords, collectUnits } from "../units";

describe("collectUnits", () => {
  it("returns units other than the presentation currency that carry a nonzero amount", () => {
    const records = [{ USD: "1200.00", TRX: "19.953" }, { USD: "800.00" }];

    expect(collectUnits(records, "USD")).toEqual(["TRX"]);
  });

  it("ignores zero, empty, and missing amounts", () => {
    const records = [
      { USD: "1000", BTC: "0", EUR: "0.00", GBP: "", JPY: undefined },
    ];

    expect(collectUnits(records, "USD")).toEqual([]);
  });

  it("sorts and dedupes units across multiple records", () => {
    const records = [{ TRX: "5" }, { BTC: "1" }, { TRX: "10" }];

    expect(collectUnits(records, "USD")).toEqual(["BTC", "TRX"]);
  });

  it("skips null and undefined records", () => {
    expect(collectUnits([null, undefined, { TRX: "5" }], "USD")).toEqual([
      "TRX",
    ]);
  });
});

describe("collectHierarchyRecords", () => {
  it("collects the rolled-up balance from every node in the tree", () => {
    const root = {
      account: "Assets",
      balance: { USD: "0" },
      balanceChildren: { USD: "1200" },
      children: [
        {
          account: "Assets:Bank",
          balance: { USD: "1000" },
          children: [],
        },
        {
          account: "Assets:Crypto",
          balance: { TRX: "19.953" },
          children: [],
        },
      ],
    };

    expect(collectUnits(collectHierarchyRecords(root), "USD")).toEqual(["TRX"]);
  });

  it("returns an empty list for a missing root", () => {
    expect(collectHierarchyRecords(undefined)).toEqual([]);
    expect(collectHierarchyRecords(null)).toEqual([]);
  });
});
