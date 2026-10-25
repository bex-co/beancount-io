import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SupportedLanguage } from "@/i18n/config";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { DeleteBudgetDialog } from "../delete-budget-dialog";
import type { BudgetGroup } from "../types";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ query: vi.fn() }),
  useMutation: () => [vi.fn()],
}));
vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useApolloCacheClear: () => vi.fn(),
}));
vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => (err: Error) => err.message,
}));

async function renderDialog(language: SupportedLanguage, interval: string) {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const target = {
    account: "Expenses:Food:Groceries",
    interval,
    currency: "USD",
    amount: "100.00 USD",
    entry_hash: `h-${interval}`,
    date: "2026-01-01",
    budgetHistory: [],
  } as unknown as BudgetGroup;
  render(
    <LocalizationProvider localization={localization}>
      <DeleteBudgetDialog
        target={target}
        ledgerId="qa/books"
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    </LocalizationProvider>,
  );
  return screen.getByText(/100\.00 USD/);
}

describe("DeleteBudgetDialog cadence language (w4/1081)", () => {
  it.each([
    ["Daily", "tägliche"],
    ["Weekly", "wöchentliche"],
    ["Monthly", "monatliche"],
    ["Quarterly", "vierteljährliche"],
    ["Yearly", "jährliche"],
  ])("names the %s cadence in German", async (interval, phrase) => {
    const description = await renderDialog("de", interval);
    expect(description.textContent).toContain(phrase);
    expect(description.textContent).not.toContain(interval.toLowerCase());
  });

  it.each([
    ["Daily", "روزانه"],
    ["Weekly", "هفتگی"],
    ["Monthly", "ماهانه"],
    ["Quarterly", "فصلی"],
    ["Yearly", "سالانه"],
  ])("names the %s cadence in Persian", async (interval, phrase) => {
    const description = await renderDialog("fa", interval);
    expect(description.textContent).toContain(phrase);
    expect(description.textContent).not.toContain(interval.toLowerCase());
  });

  it("keeps the English control wording", async () => {
    const description = await renderDialog("en", "Monthly");
    expect(description.textContent).toContain("monthly");
  });
});
