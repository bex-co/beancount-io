import { describe, expect, it } from "vitest";
import { resolveCashFlowRole, CASH_FLOW_ROLE_META_KEY } from "../role-resolver";

function meta(value: unknown): Record<string, unknown> {
  return { [CASH_FLOW_ROLE_META_KEY]: value };
}

describe("resolveCashFlowRole — declared values", () => {
  it('resolves "cash" as a declared CCE member', () => {
    expect(
      resolveCashFlowRole("Assets:US:Marcus:Savings", meta("cash")),
    ).toEqual({ role: "cash", source: "declared" });
  });

  it('resolves "operating" as a declared activity', () => {
    expect(resolveCashFlowRole("Income:Salary", meta("operating"))).toEqual({
      role: "operating",
      source: "declared",
    });
  });

  it('resolves "investing" as a declared activity', () => {
    expect(
      resolveCashFlowRole("Assets:US:Brokerage", meta("investing")),
    ).toEqual({ role: "investing", source: "declared" });
  });

  it('resolves "financing" as a declared activity', () => {
    expect(
      resolveCashFlowRole("Liabilities:Mortgage", meta("financing")),
    ).toEqual({ role: "financing", source: "declared" });
  });
});

describe("resolveCashFlowRole — declared beats heuristic", () => {
  it('excludes a Bank-named asset from cash when declared "investing"', () => {
    // The heuristic would capture Assets:US:Bank:CD as cash; the declared
    // role both excludes it from CCE and files it under investing.
    expect(resolveCashFlowRole("Assets:US:Bank:CD", meta("investing"))).toEqual(
      { role: "investing", source: "declared" },
    );
  });

  it('admits a non-pattern account into cash when declared "cash"', () => {
    // The heuristic would file a brokerage under investing; "cash" makes it
    // a CCE member instead.
    expect(
      resolveCashFlowRole("Assets:US:Brokerage:MoneyMarket", meta("cash")),
    ).toEqual({ role: "cash", source: "declared" });
  });

  it("honors an unconventional declaration verbatim", () => {
    expect(
      resolveCashFlowRole("Equity:OpeningBalances", meta("operating")),
    ).toEqual({ role: "operating", source: "declared" });
  });
});

describe("resolveCashFlowRole — invalid declared values fall through", () => {
  it("treats a typo as absent and reports it", () => {
    expect(
      resolveCashFlowRole("Assets:US:Bank:Checking", meta("invsting")),
    ).toEqual({ role: "cash", source: "heuristic", invalidValue: "invsting" });
  });

  it("matching is case-sensitive", () => {
    expect(resolveCashFlowRole("Income:Salary", meta("Investing"))).toEqual({
      role: "operating",
      source: "heuristic",
      invalidValue: "Investing",
    });
  });

  it("treats a non-string boolean as absent and reports it", () => {
    expect(resolveCashFlowRole("Assets:US:Brokerage", meta(true))).toEqual({
      role: "investing",
      source: "heuristic",
      invalidValue: true,
    });
  });

  it("treats a non-string number as absent and reports it", () => {
    expect(resolveCashFlowRole("Liabilities:CreditCard", meta(1))).toEqual({
      role: "financing",
      source: "heuristic",
      invalidValue: 1,
    });
  });
});

describe("resolveCashFlowRole — absent metadata", () => {
  it("resolves via heuristic when meta is undefined", () => {
    expect(resolveCashFlowRole("Assets:Cash")).toEqual({
      role: "cash",
      source: "heuristic",
    });
  });

  it("resolves via heuristic when meta is null", () => {
    expect(resolveCashFlowRole("Assets:Cash", null)).toEqual({
      role: "cash",
      source: "heuristic",
    });
  });

  it("resolves via heuristic when the key is missing", () => {
    expect(
      resolveCashFlowRole("Expenses:Food", { "other-key": "investing" }),
    ).toEqual({ role: "operating", source: "heuristic" });
  });

  it("does not set invalidValue when nothing was declared", () => {
    const resolution = resolveCashFlowRole("Expenses:Food", {});
    expect("invalidValue" in resolution).toBe(false);
  });
});

describe("resolveCashFlowRole — heuristic mapping", () => {
  it("matches every cash-equivalent pattern", () => {
    for (const account of [
      "Assets:PettyCash",
      "Assets:US:Chase:Checking",
      "Assets:US:Marcus:Savings",
      "Assets:US:Bank:CD",
    ]) {
      expect(resolveCashFlowRole(account).role).toBe("cash");
    }
  });

  it("maps Income to operating", () => {
    expect(resolveCashFlowRole("Income:Salary").role).toBe("operating");
  });

  it("maps Expenses to operating", () => {
    expect(resolveCashFlowRole("Expenses:Food:Groceries").role).toBe(
      "operating",
    );
  });

  it("maps non-cash Assets to investing", () => {
    expect(resolveCashFlowRole("Assets:US:Brokerage").role).toBe("investing");
  });

  it("maps Liabilities to financing", () => {
    expect(resolveCashFlowRole("Liabilities:CreditCard").role).toBe(
      "financing",
    );
  });

  it("maps Equity to financing", () => {
    expect(resolveCashFlowRole("Equity:OpeningBalances").role).toBe(
      "financing",
    );
  });
});
