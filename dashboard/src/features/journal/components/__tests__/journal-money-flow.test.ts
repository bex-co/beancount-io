import { describe, expect, it } from "vitest";
import { shortAccountNames, shortAccountPair } from "../journal-money-flow";

describe("compact account pairs", () => {
  it("qualifies a shared tail with more than four segments", () => {
    const from = "Equity:CapTable:Unvested:Grant:Series:Award2026:Carol";
    const to = "Equity:CapTable:Vested:Grant:Series:Award2026:Carol";
    expect(shortAccountPair(from, to)).toEqual({
      from: "Unvested:Grant:Series:Award2026:Carol",
      to: "Vested:Grant:Series:Award2026:Carol",
    });
  });
});

describe("shortAccountNames", () => {
  it.each([
    {
      accounts: ["Assets:Bank1:Checking", "Assets:Bank2:Checking"],
      labels: ["Bank1:Checking", "Bank2:Checking"],
    },
    {
      accounts: ["Bank:Checking", "Assets:Country:Bank:Checking"],
      labels: ["Bank:Checking", "Country:Bank:Checking"],
    },
    {
      accounts: [
        "Assets:US:Bank:Cash",
        "Assets:EU:Bank:Cash",
        "Assets:Broker:Cash",
      ],
      labels: ["US:Bank:Cash", "EU:Bank:Cash", "Broker:Cash"],
    },
    {
      accounts: ["Liabilities:Bank:Slate", "Expenses:Food:Restaurant"],
      labels: ["Slate", "Restaurant"],
    },
  ])("names $accounts as $labels", ({ accounts, labels }) => {
    expect(shortAccountNames(accounts)).toEqual(labels);
  });
});
