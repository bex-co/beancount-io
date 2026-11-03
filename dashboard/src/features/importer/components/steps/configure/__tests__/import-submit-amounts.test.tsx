import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TransactionConfigForm } from "../transaction-config-form";
import { useCSVParser } from "../../../../hooks/use-csv-parser";
import { useImportSubmit } from "../../../../hooks/use-import-submit";

// The post-write error check (w3/640) has its own suite.
vi.mock("@/common/hooks/use-write-outcome", () => ({
  useWriteOutcome: () => ({ snapshot: () => null, report: async () => false }),
}));

const { mutate } = vi.hoisted(() => ({
  mutate: vi.fn(async () => ({ data: { bulkEntries: { success: true } } })),
}));

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: () => [mutate, { loading: false }],
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: true }),
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

function parse(csv: string) {
  const { result } = renderHook(() => useCSVParser());
  const parsed = result.current.parseCSV(csv);
  expect(parsed.errorCount).toBe(0);
  return parsed.rows;
}

/** Configure → Import, as the importer wires them, over parsed rows. */
function Workflow({ rows }: { rows: ReturnType<typeof parse> }) {
  const { submitImport } = useImportSubmit("owner/ledger");
  return (
    <TransactionConfigForm
      rows={rows}
      ledgerId="owner/ledger"
      configDraft={null}
      onConfigDraftChange={() => {}}
      onSubmit={submitImport}
      onBack={() => {}}
      isSubmitting={false}
    />
  );
}

async function importAll(csv: string) {
  const rows = parse(csv);
  const user = userEvent.setup();
  render(<Workflow rows={rows} />);
  await user.type(
    screen.getByLabelText("importer.configure.sourceAccountPlaceholder"),
    "Assets:Bank:Checking",
  );
  for (const target of screen.getAllByLabelText(
    "importer.accountMapping.selectAccountPlaceholder",
  )) {
    await user.type(target, "Expenses:Food");
  }
  await user.click(
    screen.getByRole("button", {
      name: `importer.configure.importButton:${rows.length}`,
    }),
  );
  await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
  const entries = mutate.mock.calls[0]![0].variables.entries as {
    transaction: { postings: { units: { number: string } }[] };
  }[];
  mutate.mockClear();
  return entries.map(({ transaction }) =>
    transaction.postings.map((posting) => posting.units.number),
  );
}

describe("Smart Import writes the amount the preview showed (w3/564)", () => {
  it("normalizes US bank spellings, keeping the cell's digits", async () => {
    expect(
      await importAll(
        [
          "Date,Payee,Description,Amount",
          '2026-09-01,Shop,Grouped,"-1,234.56"',
          "2026-09-02,Shop,Parentheses,(12.50)",
          "2026-09-03,Shop,Symbol,$-4.75",
          "2026-09-04,Shop,Trailing minus,12.50-",
        ].join("\n"),
      ),
    ).toEqual([
      ["-1234.56", "1234.56"],
      ["-12.50", "12.50"],
      ["-4.75", "4.75"],
      ["-12.50", "12.50"],
    ]);
  });

  it("reads a comma-decimal column's 1.000 as a thousand", async () => {
    expect(
      await importAll(
        [
          "Date,Payee,Description,Amount",
          '2026-09-01,Shop,Small,"-4,50"',
          "2026-09-02,Shop,Thousand,-1.000",
          '2026-09-03,Shop,Grouped,"2.500,00"',
        ].join("\n"),
      ),
    ).toEqual([
      ["-4.50", "4.50"],
      ["-1000", "1000"],
      ["2500.00", "-2500.00"],
    ]);
  });

  it("submits plain decimals exactly as before", async () => {
    expect(
      await importAll(
        [
          "Date,Payee,Description,Amount",
          "2026-09-01,Shop,Plain,-3.21",
          "2026-09-02,Shop,Exact,0.00000001",
        ].join("\n"),
      ),
    ).toEqual([
      ["-3.21", "3.21"],
      ["0.00000001", "-0.00000001"],
    ]);
  });
});
