import fs from "fs";
import path from "path";
import { buildBudgetEntry } from "../../budget-screen/build-budget-entry";

// w21/303: an update from a card took its currency from the route, so Done did
// not wait for the ledger's options, and an income target saved before they
// landed went out positive (a spending cap). The screen uses hooks this runner
// cannot execute, so the wiring is checked on its source.
describe("Add Budget waits for the ledger's options before saving", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "add-budget-screen.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("reads the metadata error and requires it to be settled", () => {
    expect(source.includes("error:metaError,}=useLedgerMeta(")).toBe(true);
    expect(
      source.includes(
        "constmetaSettled=ledgerMeta!==undefined||Boolean(metaError);",
      ),
    ).toBe(true);
    const submit = source.slice(source.indexOf("constcanSubmit="));
    expect(
      submit.slice(0, submit.indexOf(";")).includes("&&metaSettled&&"),
    ).toBe(true);
  });

  it("saves the income sign once the root is known, and as typed when it is not", () => {
    const income = {
      account: "Income:Salary",
      interval: "MONTHLY",
      currency: "USD",
      date: new Date(2026, 9, 21),
      number: "5000",
    };
    expect(
      buildBudgetEntry({ ...income, incomeRoot: "Income" }).budget?.amount
        .number,
    ).toBe("-5000");
    expect(buildBudgetEntry(income).budget?.amount.number).toBe("5000");
  });
});

// w21/878: settings that failed to load left no income root, and an Update of an
// income target was written positive.
describe("a budget saved after the settings read failed", () => {
  const fs = require("fs");
  const path = require("path");
  const {
    buildBudgetEntry,
  } = require("../../budget-screen/build-budget-entry");

  it("falls back to the default income root", () => {
    const form = fs
      .readFileSync(path.join(__dirname, "..", "add-budget-screen.tsx"), "utf8")
      .replace(/\s+/g, "");
    expect(
      form.includes(
        "incomeRoot:ledgerMeta?.options.name_income??DEFAULT_INCOME_ROOT,",
      ),
    ).toBe(true);
    expect(form.includes('constDEFAULT_INCOME_ROOT="Income";')).toBe(true);
  });

  it("writes an income target negative under that root", () => {
    const entry = buildBudgetEntry({
      account: "Income:Salary",
      interval: "monthly",
      number: "5000",
      currency: "USD",
      date: new Date(2026, 9, 23),
      incomeRoot: "Income",
    });
    expect(entry.budget.amount.number).toBe("-5000");
  });
});
