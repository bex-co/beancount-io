import { describe, expect, it } from "vitest";
import {
  filterCashAccountStatus,
  isClosedZeroBalance,
  isZeroBalanceRecord,
  joinCashAccountStatus,
  type CashAccountStatusRow,
} from "../cash-account-status";

function row(
  account: string,
  closedAt: string | null,
  balance: Record<string, unknown>,
): CashAccountStatusRow {
  return { account, openedAt: "2020-01-01", closedAt, balance, entryCount: 10 };
}

describe("isZeroBalanceRecord", () => {
  it("treats empty and all-zero decimal records as zero", () => {
    expect(isZeroBalanceRecord({})).toBe(true);
    expect(isZeroBalanceRecord({ USD: "0" })).toBe(true);
    expect(isZeroBalanceRecord({ USD: "0.00", EUR: "-0.0" })).toBe(true);
  });

  it("rejects nonzero or non-string amounts", () => {
    expect(isZeroBalanceRecord({ USD: "0.01" })).toBe(false);
    expect(isZeroBalanceRecord({ USD: "-250.00" })).toBe(false);
    expect(isZeroBalanceRecord({ USD: 0 })).toBe(false);
  });
});

describe("isClosedZeroBalance", () => {
  it("is true only for closed accounts with a zero balance", () => {
    expect(isClosedZeroBalance(row("Assets:Cash", "2023-05-01", {}))).toBe(
      true,
    );
    expect(
      isClosedZeroBalance(row("Assets:Cash", "2023-05-01", { USD: "0.00" })),
    ).toBe(true);
    expect(isClosedZeroBalance(row("Assets:Cash", null, { USD: "0.00" }))).toBe(
      false,
    );
    expect(
      isClosedZeroBalance(row("Assets:Cash", "2023-05-01", { USD: "5.00" })),
    ).toBe(false);
  });
});

describe("joinCashAccountStatus", () => {
  it("joins directives by account name and keeps the snapshot balance", () => {
    const rows = joinCashAccountStatus(
      [
        { account: "Assets:Bank:Checking", balance: { USD: "100.00" } },
        { account: "Assets:Cash", balance: { USD: "0.00" } },
      ],
      [
        {
          account: "Assets:Bank:Checking",
          openedAt: "2020-01-01",
          closedAt: null,
          entryCount: 42,
        },
        {
          account: "Assets:Cash",
          openedAt: "2019-03-01",
          closedAt: "2021-06-30",
          entryCount: 7,
        },
        {
          account: "Assets:Bank:OldSavings",
          openedAt: "2018-01-01",
          closedAt: "2019-01-01",
          entryCount: 3,
        },
      ],
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      account: "Assets:Bank:Checking",
      openedAt: "2020-01-01",
      closedAt: null,
      balance: { USD: "100.00" },
      entryCount: 42,
    });
    expect(rows[1]).toEqual({
      account: "Assets:Cash",
      openedAt: "2019-03-01",
      closedAt: "2021-06-30",
      balance: { USD: "0.00" },
      entryCount: 7,
    });
  });

  it("returns null status fields when no directive matches", () => {
    const rows = joinCashAccountStatus(
      [{ account: "Assets:Cash", balance: { USD: "1.00" } }],
      [],
    );
    expect(rows[0].openedAt).toBeNull();
    expect(rows[0].closedAt).toBeNull();
    expect(rows[0].entryCount).toBeNull();
  });

  it("flags cash rows whose cash-flow-role value was invalid", () => {
    const rows = joinCashAccountStatus(
      [{ account: "Assets:Bank:Checking", balance: { USD: "100.00" } }],
      [],
      [{ account: "Assets:Bank:Checking", value: "cahs" }],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].invalidRoleValue).toBe("cahs");
  });

  it("appends invalid-value accounts outside the CCE set as balance-less rows", () => {
    const rows = joinCashAccountStatus(
      [{ account: "Assets:Bank:Checking", balance: { USD: "100.00" } }],
      [
        {
          account: "Expenses:Rent",
          openedAt: "2020-01-01",
          closedAt: null,
          entryCount: 5,
        },
      ],
      [{ account: "Expenses:Rent", value: "invsting" }],
    );

    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({
      account: "Expenses:Rent",
      openedAt: "2020-01-01",
      closedAt: null,
      balance: {},
      entryCount: 5,
      invalidRoleValue: "invsting",
    });
  });
});

describe("filterCashAccountStatus", () => {
  const rows = [
    row("Assets:Bank:Checking", null, { USD: "100.00" }),
    row("Assets:Bank:OldChecking", "2022-01-01", { USD: "0.00" }),
    row("Assets:Bank:ClosedWithBalance", "2022-01-01", { USD: "50.00" }),
    row("Assets:Cash", null, {}),
  ];

  it("hides closed zero-balance accounts by default", () => {
    expect(filterCashAccountStatus(rows, false).map((r) => r.account)).toEqual([
      "Assets:Bank:Checking",
      "Assets:Bank:ClosedWithBalance",
      "Assets:Cash",
    ]);
  });

  it("keeps every account when closed accounts are shown", () => {
    expect(filterCashAccountStatus(rows, true)).toHaveLength(4);
  });
});
