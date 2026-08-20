import {
  filterExactPayee,
  journalSearchFilter,
} from "../screens/merchant-detail-screen/selectors/filter-exact-payee";

describe("journalSearchFilter", () => {
  it("strips periods that 500 the journal free-text filter", () => {
    expect(journalSearchFilter("MiniMax Group Inc.")).toBe("MiniMax Group Inc");
    expect(journalSearchFilter("A.B.C.")).toBe("A B C");
    expect(journalSearchFilter("  Uber  ")).toBe("Uber");
  });
});

describe("filterExactPayee", () => {
  const entries = [
    { payee: "Uber", id: 1 },
    { payee: "Uber Eats", id: 2 },
    { payee: "uber", id: 3 },
    { payee: " Uber ", id: 4 },
    { payee: null, id: 5 },
    { payee: "", id: 6 },
  ];

  it("keeps only exact payee matches after trim", () => {
    expect(filterExactPayee(entries, "Uber").map((e) => e.id)).toEqual([1, 4]);
  });

  it("does not match a substring payee like Uber Eats", () => {
    expect(filterExactPayee(entries, "Uber").map((e) => e.payee)).toEqual([
      "Uber",
      " Uber ",
    ]);
  });

  it("is case-sensitive and rejects empty targets", () => {
    expect(filterExactPayee(entries, "uber").map((e) => e.id)).toEqual([3]);
    expect(filterExactPayee(entries, "   ")).toEqual([]);
    expect(filterExactPayee(entries, "")).toEqual([]);
  });
});
