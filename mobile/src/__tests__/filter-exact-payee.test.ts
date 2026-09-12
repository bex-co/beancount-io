import { filterExactPayee } from "../screens/merchant-detail-screen/selectors/filter-exact-payee";

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

  it("matches punctuated payees literally, without normalizing periods", () => {
    const punctuated = [
      { payee: "Ethereum 2.0", id: 1 },
      { payee: "Ethereum 2 0", id: 2 },
      { payee: "Lowe's", id: 3 },
      { payee: "Lowes", id: 4 },
      { payee: "MiniMax Group Inc.", id: 5 },
      { payee: "MiniMax Group Inc", id: 6 },
    ];
    expect(
      filterExactPayee(punctuated, "Ethereum 2.0").map((e) => e.id),
    ).toEqual([1]);
    expect(filterExactPayee(punctuated, "Lowe's").map((e) => e.id)).toEqual([
      3,
    ]);
    expect(
      filterExactPayee(punctuated, "MiniMax Group Inc.").map((e) => e.id),
    ).toEqual([5]);
  });

  it("is case-sensitive and rejects empty targets", () => {
    expect(filterExactPayee(entries, "uber").map((e) => e.id)).toEqual([3]);
    expect(filterExactPayee(entries, "   ")).toEqual([]);
    expect(filterExactPayee(entries, "")).toEqual([]);
  });
});
