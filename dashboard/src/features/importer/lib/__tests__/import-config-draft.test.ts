import { describe, expect, it } from "vitest";
import {
  buildImportConfigFormValues,
  getValidImportRows,
  toImportConfigDraft,
  type ImportConfigDraft,
} from "../import-config-draft";
import type { ParsedRow } from "../../types";

function row(overrides: Partial<ParsedRow> & Pick<ParsedRow, "id">): ParsedRow {
  return {
    date: "2026-09-10",
    payee: "QA Supplies",
    description: "Keep this expense",
    amount: -4.5,
    amountInput: "-4.5",
    ...overrides,
  };
}

describe("import-config-draft", () => {
  it("filters out invalid rows before configuration", () => {
    const rows = [
      row({ id: "ok" }),
      row({
        id: "bad-amount",
        amountInput: "not-a-number",
        amount: 0,
        errors: ["invalid amount"],
      }),
    ];
    expect(getValidImportRows(rows).map((r) => r.id)).toEqual(["ok"]);
  });

  it("restores draft mappings by ParsedRow.id and defaults new rows", () => {
    const draft: ImportConfigDraft = {
      sourceAccount: "Assets:Bank:Business",
      defaultCurrency: "EUR",
      rows: {
        keep: { targetAccount: "Expenses:Software", selected: true },
        exclude: { targetAccount: "Income:Refund", selected: false },
      },
    };

    const values = buildImportConfigFormValues(
      [
        row({ id: "keep", payee: "QA Supplies" }),
        row({
          id: "exclude",
          date: "2026-09-11",
          payee: "QA Refund",
          amount: 12.75,
          amountInput: "12.75",
        }),
        row({
          id: "new-row",
          date: "2026-09-12",
          payee: "New",
          amount: -1,
          amountInput: "-1",
        }),
      ],
      draft,
      "USD",
    );

    expect(values.sourceAccount).toBe("Assets:Bank:Business");
    expect(values.defaultCurrency).toBe("EUR");
    expect(values.transactions).toEqual([
      expect.objectContaining({
        id: "keep",
        rowIndex: 0,
        targetAccount: "Expenses:Software",
        selected: true,
      }),
      expect.objectContaining({
        id: "exclude",
        rowIndex: 1,
        targetAccount: "Income:Refund",
        selected: false,
      }),
      expect.objectContaining({
        id: "new-row",
        rowIndex: 2,
        targetAccount: "",
        selected: true,
      }),
    ]);
  });

  it("does not shift configuration when an earlier row is deleted", () => {
    const draft: ImportConfigDraft = {
      sourceAccount: "Assets:Bank",
      defaultCurrency: "USD",
      rows: {
        first: { targetAccount: "Expenses:A", selected: false },
        second: { targetAccount: "Expenses:B", selected: true },
      },
    };

    const values = buildImportConfigFormValues(
      [row({ id: "second", payee: "Second", amount: -2, amountInput: "-2" })],
      draft,
      "USD",
    );

    expect(values.transactions).toHaveLength(1);
    expect(values.transactions[0]).toMatchObject({
      id: "second",
      rowIndex: 0,
      targetAccount: "Expenses:B",
      selected: true,
    });
  });

  it("always takes financial fields from the latest parse, not the draft", () => {
    const draft: ImportConfigDraft = {
      sourceAccount: "Assets:Bank",
      defaultCurrency: "USD",
      rows: {
        keep: { targetAccount: "Expenses:Software", selected: true },
      },
    };

    const values = buildImportConfigFormValues(
      [
        row({
          id: "keep",
          date: "2026-10-01",
          payee: "Edited Payee",
          description: "Edited",
          amount: -9.99,
          amountInput: "-9.99",
        }),
      ],
      draft,
      "USD",
    );

    expect(values.transactions[0]).toMatchObject({
      date: "2026-10-01",
      payee: "Edited Payee",
      description: "Edited",
      amount: -9.99,
      amountInput: "-9.99",
      targetAccount: "Expenses:Software",
    });
  });

  it("round-trips form values into a draft keyed by id", () => {
    const values = buildImportConfigFormValues(
      [
        row({ id: "a" }),
        row({
          id: "b",
          date: "2026-09-11",
          amount: 12.75,
          amountInput: "12.75",
        }),
      ],
      {
        sourceAccount: "Assets:Bank",
        defaultCurrency: "EUR",
        rows: {
          a: { targetAccount: "Expenses:Software", selected: true },
          b: { targetAccount: "", selected: false },
        },
      },
      "USD",
    );

    expect(toImportConfigDraft(values)).toEqual({
      sourceAccount: "Assets:Bank",
      defaultCurrency: "EUR",
      rows: {
        a: { targetAccount: "Expenses:Software", selected: true },
        b: { targetAccount: "", selected: false },
      },
    });
  });
});
