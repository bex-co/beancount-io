import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BudgetHistoryTable } from "../budget-history-table";
import type { BudgetGroup } from "../types";

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: true }),
}));

afterEach(cleanup);

function group(budgetHistory: BudgetGroup["budgetHistory"]): BudgetGroup {
  const latest = budgetHistory[budgetHistory.length - 1];
  return {
    account: "Expenses:Health:Life:GroupTermLife",
    currency: "USD",
    interval: latest.interval,
    amount: latest.amount,
    entry_hash: latest.entry_hash,
    date: latest.date,
    budgetHistory,
  } as BudgetGroup;
}

const deleteNames = () =>
  screen
    .getAllByRole("button")
    .map((button) => button.getAttribute("aria-label"));

describe("Budget history Delete buttons", () => {
  it("name the directive each one removes", async () => {
    const onDelete = vi.fn();
    render(
      <BudgetHistoryTable
        ariaLabelledBy="title"
        onDelete={onDelete}
        group={group([
          {
            date: "2026-01-01",
            interval: "monthly",
            amount: "100 USD",
            entry_hash: "a",
          },
          {
            date: "2026-08-27",
            interval: "monthly",
            amount: "122 USD",
            entry_hash: "b",
          },
        ])}
      />,
    );

    expect(deleteNames()).toEqual([
      "Delete budget: Expenses:Health:Life:GroupTermLife, 2026-08-27, 122 USD, Monthly",
      "Delete budget: Expenses:Health:Life:GroupTermLife, 2026-01-01, 100 USD, Monthly",
    ]);
    screen
      .getByRole("button", {
        name: "Delete budget: Expenses:Health:Life:GroupTermLife, 2026-01-01, 100 USD, Monthly",
      })
      .click();
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ entry_hash: "a", date: "2026-01-01" }),
      expect.any(HTMLElement),
    );
  });

  it("number rows that would otherwise read the same", () => {
    render(
      <BudgetHistoryTable
        ariaLabelledBy="title"
        onDelete={vi.fn()}
        group={group([
          {
            date: "2026-08-27",
            interval: "monthly",
            amount: "122 USD",
            entry_hash: "a",
          },
          {
            date: "2026-08-27",
            interval: "monthly",
            amount: "122 USD",
            entry_hash: "b",
          },
          {
            date: "2026-09-01",
            interval: "yearly",
            amount: "1500 USD",
            entry_hash: "c",
          },
        ])}
      />,
    );

    const names = deleteNames();
    expect(new Set(names).size).toBe(3);
    expect(names).toEqual([
      "Delete budget: Expenses:Health:Life:GroupTermLife, 2026-09-01, 1500 USD, Yearly",
      "Delete budget: Expenses:Health:Life:GroupTermLife, 2026-08-27, 122 USD, Monthly (entry 2)",
      "Delete budget: Expenses:Health:Life:GroupTermLife, 2026-08-27, 122 USD, Monthly (entry 3)",
    ]);
  });
});
