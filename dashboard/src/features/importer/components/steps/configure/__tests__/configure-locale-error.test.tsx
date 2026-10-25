import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SupportedLanguage } from "@/i18n/config";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import type { ParsedRow } from "../../../../types";
import { TransactionConfigForm } from "../transaction-config-form";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ primaryCurrency: "USD" }),
}));

vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: ({
    value,
    onValueChange,
    placeholder,
    id,
    "aria-describedby": describedBy,
    "aria-invalid": invalid,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => (
    <input
      id={id}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      aria-label={placeholder ?? "account"}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
  CurrencyCombobox: ({
    value,
    onValueChange,
  }: {
    value: string;
    onValueChange: (value: string) => void;
  }) => (
    <input
      aria-label="currency"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
}));

vi.mock("../../../../hooks/use-ai-categorization", () => ({
  useAICategorization: () => ({
    categorizeTransactions: vi.fn(),
    loading: false,
  }),
}));

const rows: ParsedRow[] = [
  {
    id: "row-1",
    date: "2026-09-10",
    payee: "QA Supplies",
    description: "Keep this expense",
    amount: -4.5,
    amountInput: "-4.50",
  },
] as ParsedRow[];

describe("Configure errors follow the current language (w4/1086)", () => {
  it("translates an existing required-source error without resubmitting", async () => {
    const localization = createLocalization();
    await localization.changeLanguage("en" as SupportedLanguage);
    const onSubmit = vi.fn();
    render(
      <LocalizationProvider localization={localization}>
        <TransactionConfigForm
          rows={rows}
          ledgerId="owner/books"
          configDraft={null}
          onConfigDraftChange={vi.fn()}
          onSubmit={onSubmit}
          onBack={vi.fn()}
        />
      </LocalizationProvider>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Import/ }));
    expect(await screen.findByText("Source account is required")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => {
      await localization.changeLanguage("de" as SupportedLanguage);
    });
    expect(
      await screen.findByText("Quellkonto ist erforderlich"),
    ).toBeVisible();
    expect(screen.queryByText("Source account is required")).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByLabelText(/Quellkonto/)).toHaveValue(""),
    );
  });
});
