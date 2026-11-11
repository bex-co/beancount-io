import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { TransactionConfigForm } from "../transaction-config-form";
import type { ImportTransaction, ParsedRow } from "../../../../types";

// The duplicate check reads the ledger; these rows are new (w2/122).
vi.mock("../../../../hooks/use-import-duplicates", () => ({
  useImportDuplicates: () => new Set<string>(),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params?.count !== undefined ? `${key}:${params.count}` : key,
    i18n: { language: "en" },
  }),
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ primaryCurrency: "USD" }),
}));
// Like the real Combobox, `disabled` reaches the input (and hides Clear).
vi.mock("@/common/components/ledger-comboboxes", () => {
  const Field = ({
    label,
    value,
    onValueChange,
    disabled,
  }: {
    label: string;
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <input
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    />
  );
  return {
    AccountCombobox: (props: {
      placeholder?: string;
      value: string;
      onValueChange: (value: string) => void;
      disabled?: boolean;
    }) => <Field label={props.placeholder ?? "account"} {...props} />,
    CurrencyCombobox: (props: {
      value: string;
      onValueChange: (value: string) => void;
      disabled?: boolean;
    }) => <Field label="currency" {...props} />,
  };
});
const categorizeTransactions = vi.fn();
vi.mock("../../../../hooks/use-ai-categorization", () => ({
  useAICategorization: () => ({ categorizeTransactions, loading: false }),
}));

const rows: ParsedRow[] = [
  {
    id: "row-1",
    date: "2026-10-20",
    payee: "qa-20261020 pending import",
    description: "qa-20261020 pending mapping A",
    amount: -1.25,
    amountInput: "-1.25",
  },
];

/** Submits once and stays pending until `settle` is clicked. */
function PendingHarness({
  onSubmit,
}: {
  onSubmit: (t: ImportTransaction[]) => void;
}) {
  const [pending, setPending] = useState(false);
  return (
    <>
      <TransactionConfigForm
        rows={rows}
        ledgerId="o/l"
        configDraft={null}
        onConfigDraftChange={() => {}}
        onSubmit={(transactions) => {
          onSubmit(transactions);
          setPending(true);
        }}
        onBack={() => {}}
        isSubmitting={pending}
      />
      <button type="button" onClick={() => setPending(false)}>
        settle
      </button>
    </>
  );
}

const source = () =>
  screen.getByLabelText("importer.configure.sourceAccountPlaceholder");
const target = () =>
  screen.getByLabelText("importer.accountMapping.selectAccountPlaceholder");
const payloadControls = () => [
  source(),
  screen.getByLabelText("currency"),
  target(),
  screen.getByRole("checkbox", { name: "importer.accountMapping.selectAll" }),
  screen.getByRole("checkbox", {
    name: "importer.accountMapping.selectTransaction 1",
  }),
  screen.getByRole("button", { name: /importer.accountMapping.aiFill/ }),
];

describe("Configure while its import is pending (w4/280)", () => {
  it("freezes every payload control until the request settles, and submits once", async () => {
    const onSubmit = vi.fn();
    render(<PendingHarness onSubmit={onSubmit} />);

    for (const control of payloadControls()) expect(control).toBeEnabled();
    fireEvent.change(source(), { target: { value: "Assets:Bank:Checking" } });
    fireEvent.change(target(), {
      target: { value: "Expenses:Food:Groceries" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "importer.configure.importButton:1" }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    for (const control of payloadControls()) expect(control).toBeDisabled();
    expect(source()).toHaveValue("Assets:Bank:Checking");
    expect(target()).toHaveValue("Expenses:Food:Groceries");
    expect(
      screen.getByRole("button", { name: "importer.configure.importing" }),
    ).toBeDisabled();
    expect(onSubmit.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        sourceAccount: "Assets:Bank:Checking",
        targetAccount: "Expenses:Food:Groceries",
        currency: "USD",
        amount: "-1.25",
      }),
    ]);

    // A failed import keeps the form, and it is editable again.
    fireEvent.click(screen.getByRole("button", { name: "settle" }));
    for (const control of payloadControls()) expect(control).toBeEnabled();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(categorizeTransactions).not.toHaveBeenCalled();
  });
});
