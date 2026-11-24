import { parseDirectiveText } from "@/features/ledger/utils/directive-text";
import {
  checkBudgetAccountsExist,
  extractDirectiveBudgetAccounts,
  extractSingleBudgetAccount,
  withBudgetIssues,
} from "@/features/ledger/utils/budget-account-check";
import { ValidationError } from "@/shared/errors";

describe("extractDirectiveBudgetAccounts", () => {
  it("extracts custom budget accounts with their directive index and same-call opens", () => {
    const directives = parseDirectiveText(
      [
        "; heading comment",
        "2026-01-01 open Expenses:Travel USD",
        '2026-08-30 custom "fava-option" "default-file" "main.bean"',
        "; budget comment",
        '2026-08-30 custom "budget" Expenses:Food "monthly" 500.00 USD ; note',
        '2026-08-30 custom "budget" Expenses:日本 "monthly" 10000 JPY',
      ].join("\n"),
    );
    expect(extractDirectiveBudgetAccounts(directives)).toEqual({
      budgets: [
        { index: 2, account: "Expenses:Food" },
        { index: 3, account: "Expenses:日本" },
      ],
      openedInCall: ["Expenses:Travel"],
    });
  });

  it("ignores non-budget custom directives and non-account tokens", () => {
    const directives = parseDirectiveText(
      [
        '2026-08-30 custom "budget-note" Expenses:NoSuch "x"',
        '2026-08-30 custom "budget" "quoted-not-account" "monthly" 100 USD',
        '2026-08-30 custom "budget" 100.00 USD',
        '2026-08-30 custom "budget" ; comment only',
      ].join("\n"),
    );
    expect(extractDirectiveBudgetAccounts(directives)).toEqual({
      budgets: [],
      openedInCall: [],
    });
  });
});

describe("extractSingleBudgetAccount", () => {
  it("extracts a custom budget account after leading blank lines and comments", () => {
    expect(
      extractSingleBudgetAccount(
        '\n; monthly budget\r\n2026-02-10 custom "budget" Expenses:Food:Dining "monthly" 100 USD ; note\r\n',
      ),
    ).toBe("Expenses:Food:Dining");
    expect(
      extractSingleBudgetAccount(
        '2026-02-10\tcustom\t"budget"\tExpenses:日本\t"monthly"\t10000 JPY',
      ),
    ).toBe("Expenses:日本");
  });

  it("returns undefined for non-budget directives and non-account tokens", () => {
    expect(
      extractSingleBudgetAccount('2026-02-10 * "Cafe"\n  Expenses:Food 5 USD'),
    ).toBeUndefined();
    expect(
      extractSingleBudgetAccount(
        '2026-02-10 custom "fava-option" "default-file" "main.bean"',
      ),
    ).toBeUndefined();
    expect(
      extractSingleBudgetAccount(
        '2026-02-10 custom "budget" "quoted" "monthly" 100 USD',
      ),
    ).toBeUndefined();
    expect(extractSingleBudgetAccount("; comment only\n")).toBeUndefined();
  });
});

describe("checkBudgetAccountsExist", () => {
  const clientWithAccounts = (accounts: string[]) => {
    const getLedgerAccounts = jest.fn(async () => ({
      data: {
        success: true,
        data: Object.fromEntries(accounts.map((a) => [a, {}])),
      },
    }));
    return {
      getLedgerAccounts,
      favaApiClient: { reports: { getLedgerAccounts } } as never,
    };
  };

  it("skips reading accounts when there are no budgets", async () => {
    const { favaApiClient, getLedgerAccounts } = clientWithAccounts([]);
    const issues = await checkBudgetAccountsExist({
      favaApiClient,
      ledgerOwner: "alice",
      ledgerName: "main",
      budgets: [],
      openedInCall: [],
      field: "text",
      itemLabel: "directive",
    });
    expect(issues).toEqual([]);
    expect(getLedgerAccounts).not.toHaveBeenCalled();
  });

  it("reports unopened budget accounts with nearest opened siblings", async () => {
    const { favaApiClient } = clientWithAccounts([
      "Assets:Cash",
      "Expenses:Food:Coffee",
      "Expenses:Food:Groceries",
      "Expenses:Food:Dining",
      "Expenses:Food:Bakery",
    ]);
    const issues = await checkBudgetAccountsExist({
      favaApiClient,
      ledgerOwner: "alice",
      ledgerName: "main",
      budgets: [
        { index: 0, account: "Expenses:Food" },
        { index: 1, account: "Expenses:Food:Grocery" },
        { index: 2, account: "Expenses:Travel" },
      ],
      openedInCall: ["Expenses:Travel:Flights"],
      field: "text",
      itemLabel: "directive",
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toBeInstanceOf(ValidationError);
    expect(issues[0]).toMatchObject({
      category: "VALIDATION_FAILED",
      message: expect.stringContaining(
        "directive 1: budget account Expenses:Food:Grocery is not opened in this ledger, nor is any account under it; nearest: Expenses:Food:Bakery, Expenses:Food:Coffee, Expenses:Food:Dining",
      ),
      metadata: expect.objectContaining({
        directive: 1,
        account: "Expenses:Food:Grocery",
        hint: expect.stringContaining("allowInvalid: true"),
      }),
    });
  });

  it("uses single-entry open guidance for field=newContent", async () => {
    const { favaApiClient } = clientWithAccounts(["Expenses:Food:Coffee"]);
    const issues = await checkBudgetAccountsExist({
      favaApiClient,
      ledgerOwner: "alice",
      ledgerName: "main",
      budgets: [{ index: 0, account: "Expenses:DoesNotExist" }],
      openedInCall: [],
      field: "newContent",
      itemLabel: "entry",
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      category: "VALIDATION_FAILED",
      metadata: expect.objectContaining({
        field: "newContent",
        entry: 0,
        account: "Expenses:DoesNotExist",
        hint: expect.stringContaining("open the account first"),
      }),
    });
    expect(String(issues[0].metadata?.hint)).not.toContain("same call");
  });
});

describe("withBudgetIssues", () => {
  it("appends budget findings, increments errorsAfter, and sets valid to false", () => {
    const issue = new ValidationError("text", "directive 0: budget account X");
    expect(
      withBudgetIssues(
        { errorsBefore: 1, errorsAfter: 1, newErrors: [], valid: true },
        [issue],
      ),
    ).toEqual({
      errorsBefore: 1,
      errorsAfter: 2,
      newErrors: [{ message: issue.message }],
      valid: false,
    });
  });
});
