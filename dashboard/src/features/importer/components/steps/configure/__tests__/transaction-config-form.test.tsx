import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionConfigForm } from "../transaction-config-form";
import type { ParsedRow } from "../../../../types";
import type { ImportConfigDraft } from "../../../../lib/import-config-draft";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params?.count !== undefined ? `${key}:${params.count}` : key,
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ primaryCurrency: "USD" }),
}));

vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: ({
    value,
    onValueChange,
    placeholder,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <input
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
    id: "row-keep",
    date: "2026-09-10",
    payee: "QA Supplies",
    description: "Keep this expense",
    amount: -4.5,
    amountInput: "-4.50",
  },
  {
    id: "row-exclude",
    date: "2026-09-11",
    payee: "QA Refund",
    description: "Exclude this refund",
    amount: 12.75,
    amountInput: "12.75",
  },
];

function DraftHarness({
  initialDraft = null,
}: {
  initialDraft?: ImportConfigDraft | null;
}) {
  const [draft, setDraft] = useState<ImportConfigDraft | null>(initialDraft);
  const [step, setStep] = useState<"configure" | "preview">("configure");

  if (step === "preview") {
    return (
      <div>
        <p>preview</p>
        <button type="button" onClick={() => setStep("configure")}>
          continue
        </button>
        <pre data-testid="draft">{JSON.stringify(draft)}</pre>
      </div>
    );
  }

  return (
    <TransactionConfigForm
      rows={rows}
      ledgerId="open_ledger/freelancer-invoicing"
      configDraft={draft}
      onConfigDraftChange={setDraft}
      onSubmit={vi.fn()}
      onBack={() => setStep("preview")}
      isSubmitting={false}
    />
  );
}

describe("TransactionConfigForm draft persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves source, currency, targets and deselection across Back then Continue", async () => {
    const user = userEvent.setup();
    render(<DraftHarness />);

    await user.type(
      screen.getByLabelText("importer.configure.sourceAccountPlaceholder"),
      "Assets:Bank:Business",
    );
    await user.clear(screen.getByLabelText("currency"));
    await user.type(screen.getByLabelText("currency"), "EUR");

    await user.click(
      screen.getByRole("checkbox", {
        name: "importer.accountMapping.selectTransaction 2",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "importer.configure.importButton:1",
        }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: "importer.configure.back" }),
    );
    expect(screen.getByText("preview")).toBeInTheDocument();

    const draft = JSON.parse(
      screen.getByTestId("draft").textContent ?? "null",
    ) as ImportConfigDraft;
    expect(draft.sourceAccount).toBe("Assets:Bank:Business");
    expect(draft.defaultCurrency).toBe("EUR");
    expect(draft.rows["row-exclude"].selected).toBe(false);

    await user.click(screen.getByRole("button", { name: "continue" }));

    expect(screen.getByLabelText("currency")).toHaveValue("EUR");
    expect(
      screen.getByLabelText("importer.configure.sourceAccountPlaceholder"),
    ).toHaveValue("Assets:Bank:Business");
    expect(
      screen.getByRole("checkbox", {
        name: "importer.accountMapping.selectTransaction 2",
      }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("button", {
        name: "importer.configure.importButton:1",
      }),
    ).toBeInTheDocument();
  });

  it("restores a prior draft without form-only defaults", () => {
    render(
      <DraftHarness
        initialDraft={{
          sourceAccount: "Assets:Bank:Business",
          defaultCurrency: "EUR",
          rows: {
            "row-keep": {
              targetAccount: "Expenses:Software",
              selected: true,
            },
            "row-exclude": { targetAccount: "", selected: false },
          },
        }}
      />,
    );

    expect(
      screen.getByLabelText("importer.configure.sourceAccountPlaceholder"),
    ).toHaveValue("Assets:Bank:Business");
    expect(screen.getByLabelText("currency")).toHaveValue("EUR");
    expect(
      screen.getByRole("checkbox", {
        name: "importer.accountMapping.selectTransaction 2",
      }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("button", {
        name: "importer.configure.importButton:1",
      }),
    ).toBeInTheDocument();
  });
});
