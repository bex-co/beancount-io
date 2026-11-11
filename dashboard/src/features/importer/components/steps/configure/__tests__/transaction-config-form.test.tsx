import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionConfigForm } from "../transaction-config-form";
import type { ParsedRow } from "../../../../types";
import type { ImportConfigDraft } from "../../../../lib/import-config-draft";

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
      // The field's id and error association reach the real combobox too.
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

/** Preview can make row 2 invalid and repair it again, keeping its id. */
function RepairHarness({ startInvalid = false }: { startInvalid?: boolean }) {
  const [draft, setDraft] = useState<ImportConfigDraft | null>(null);
  const [step, setStep] = useState<"configure" | "preview">(
    startInvalid ? "preview" : "configure",
  );
  const [broken, setBroken] = useState(startInvalid);
  const current = rows.map((row) =>
    row.id === "row-exclude" && broken
      ? {
          ...row,
          amountInput: "invalid",
          amount: 0,
          errors: ["invalid amount"],
        }
      : row,
  );
  if (step === "preview") {
    return (
      <div>
        <button type="button" onClick={() => setBroken(true)}>
          break row 2
        </button>
        <button type="button" onClick={() => setBroken(false)}>
          repair row 2
        </button>
        <button type="button" onClick={() => setStep("configure")}>
          continue
        </button>
      </div>
    );
  }
  return (
    <TransactionConfigForm
      rows={current}
      ledgerId="open_ledger/freelancer-invoicing"
      configDraft={draft}
      onConfigDraftChange={setDraft}
      onSubmit={vi.fn()}
      onBack={() => setStep("preview")}
      isSubmitting={false}
    />
  );
}

/**
 * Saving a Configure edit while an excluded row was invalid in Preview
 * dropped that row's exclusion, so repairing it reselected it (w4/309).
 */
describe("TransactionConfigForm with a row held back as invalid", () => {
  const rowTwo = () =>
    screen.getByRole("checkbox", {
      name: "importer.accountMapping.selectTransaction 2",
    });
  const source = () =>
    screen.getByLabelText("importer.configure.sourceAccountPlaceholder");

  it("keeps an exclusion through a Configure edit and the row's repair", async () => {
    const user = userEvent.setup();
    render(<RepairHarness />);
    await user.click(rowTwo());
    expect(rowTwo()).not.toBeChecked();
    await user.click(
      screen.getByRole("button", { name: "importer.configure.back" }),
    );

    await user.click(screen.getByRole("button", { name: "break row 2" }));
    await user.click(screen.getByRole("button", { name: "continue" }));
    expect(
      screen.queryByRole("checkbox", {
        name: "importer.accountMapping.selectTransaction 2",
      }),
    ).toBeNull();
    await user.type(source(), "Assets:Bank:Checking");
    await user.click(
      screen.getByRole("button", { name: "importer.configure.back" }),
    );

    await user.click(screen.getByRole("button", { name: "repair row 2" }));
    await user.click(screen.getByRole("button", { name: "continue" }));
    expect(source()).toHaveValue("Assets:Bank:Checking");
    expect(rowTwo()).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "importer.configure.importButton:1" }),
    ).toBeInTheDocument();
  });

  it("still selects a repaired row that was never configured", async () => {
    const user = userEvent.setup();
    render(<RepairHarness startInvalid />);
    await user.click(screen.getByRole("button", { name: "continue" }));
    await user.type(source(), "Assets:Cash");
    await user.click(
      screen.getByRole("button", { name: "importer.configure.back" }),
    );
    await user.click(screen.getByRole("button", { name: "repair row 2" }));
    await user.click(screen.getByRole("button", { name: "continue" }));
    expect(rowTwo()).toBeChecked();
    expect(source()).toHaveValue("Assets:Cash");
  });
});

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

  // The amount filter and the mapping table carry stable names, not their
  // current value or nothing at all (w4/319).
  it("names the amount filter and the mapping table by their purpose", async () => {
    const user = userEvent.setup();
    render(
      <TransactionConfigForm
        rows={rows}
        ledgerId="open_ledger/freelancer-invoicing"
        configDraft={null}
        onConfigDraftChange={vi.fn()}
        onSubmit={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    const table = screen.getByRole("table", {
      name: "importer.configure.assignTargetAccounts",
    });
    const filter = screen.getByRole("combobox", {
      name: "importer.accountMapping.filterByAmount",
    });
    expect(filter).toHaveTextContent("importer.accountMapping.allAmounts");
    expect(table.querySelectorAll("tbody tr")).toHaveLength(2);

    filter.focus();
    await user.keyboard("{Enter}");
    await user.click(
      await screen.findByRole("option", {
        name: "importer.accountMapping.negativeOnly",
      }),
    );
    // The name stays put while the value and the rows change.
    await waitFor(() =>
      expect(table.querySelectorAll("tbody tr")).toHaveLength(1),
    );
    expect(
      screen.getByRole("combobox", {
        name: "importer.accountMapping.filterByAmount",
      }),
    ).toHaveTextContent("importer.accountMapping.negativeOnly");
  });

  it("says why an empty Source Account stops the import (w4/322)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TransactionConfigForm
        rows={rows}
        ledgerId="open_ledger/freelancer-invoicing"
        configDraft={null}
        onConfigDraftChange={vi.fn()}
        onSubmit={onSubmit}
        onBack={vi.fn()}
      />,
    );
    for (const target of screen.getAllByLabelText(
      "importer.accountMapping.selectAccountPlaceholder",
    )) {
      await user.type(target, "Expenses:Food");
    }
    const source = screen.getByLabelText(
      "importer.configure.sourceAccountPlaceholder",
    );
    await user.click(
      screen.getByRole("button", { name: "importer.configure.importButton:2" }),
    );

    const message = await screen.findByText(
      "importer.configure.sourceAccountRequired",
    );
    expect(source).toHaveAttribute("aria-invalid", "true");
    expect(source.getAttribute("aria-describedby")?.split(" ")).toContain(
      message.id,
    );
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(source, "Assets:Cash");
    await waitFor(() =>
      expect(
        screen.queryByText("importer.configure.sourceAccountRequired"),
      ).toBeNull(),
    );
  });
});
