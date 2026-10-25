import { describe, expect, it, vi } from "vitest";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportPreviewTable } from "../import-preview-table";
import { useCSVParser } from "../../../../hooks/use-csv-parser";
import type { CSVParseResult } from "../../../../types";

// The preview's inline check must read amounts with the parser's column
// decision, or a comma-decimal file paints valid rows red (w3/644).
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, options?: { field?: string; row?: number }) =>
      options?.field ? `${options.field} ${options.row}` : key,
    i18n: { language: "en" },
  }),
}));

function parse(csv: string): CSVParseResult {
  const { result } = renderHook(() => useCSVParser());
  return result.current.parseCSV(csv);
}

function renderPreview(csv: string) {
  const onResultChange = vi.fn();
  render(
    <ImportPreviewTable result={parse(csv)} onResultChange={onResultChange} />,
  );
  return onResultChange;
}

const amountCell = (row: number) =>
  screen.getByRole("button", { name: `importer.preview.amount ${row}` });
const payeeCell = (row: number) =>
  screen.getByRole("button", { name: `importer.preview.payee ${row}` });

async function edit(cell: HTMLElement, value: string) {
  const user = userEvent.setup();
  await user.click(cell);
  await user.keyboard("{Control>}a{/Control}");
  await user.keyboard(`${value}{Enter}`);
}

const EU_QUOTED = [
  "Date,Payee,Description,Amount",
  '2026-09-05,qa-comma,quoted comma,"-4,50"',
  "2026-09-06,qa-thousand,quoted thousand,-1.000",
  '2026-09-07,qa-grouped,quoted grouped,"2.500,00"',
].join("\n");

const MIXED = [
  "Date,Payee,Description,Amount",
  '2026-09-01,US,Point,"1,234.56"',
  '2026-09-02,EU,Comma,"1.234,56"',
].join("\n");

describe("ImportPreviewTable amount column convention", () => {
  it("shows a comma-decimal file's rows valid, with the amounts they import as", async () => {
    renderPreview(EU_QUOTED);

    expect(
      screen.getByText("importer.preview.validCount"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("-4.50")).toBeInTheDocument();
    });
    expect(screen.getByText("-1000")).toBeInTheDocument();
    expect(screen.getByText("2500.00")).toBeInTheDocument();
    expect(
      screen.queryByText("importer.validation.amountInvalid"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("amount:")).not.toBeInTheDocument();
  });

  it("keeps the raw token editable and an edited comma amount valid", async () => {
    const onResultChange = renderPreview(EU_QUOTED);

    await edit(amountCell(1), "-7,25");

    await waitFor(() => {
      expect(screen.getByText("-7.25")).toBeInTheDocument();
    });
    expect(
      screen.queryByText("importer.validation.amountInvalid"),
    ).not.toBeInTheDocument();
    const next = onResultChange.mock.calls.at(-1)?.[0] as CSVParseResult;
    expect(next.rows[0].amountInput).toBe("-7,25");
    expect(next.rows[0].amount).toBe(-7.25);
    expect(next.validCount).toBe(3);
  });

  it("still rejects a comma decimal typed into a dot-decimal file", async () => {
    renderPreview(
      "Date,Payee,Description,Amount\n2026-09-01,Cafe,Coffee,-4.50",
    );

    await edit(amountCell(1), "-4,50");

    await waitFor(() => {
      expect(
        screen.getAllByText("importer.validation.amountInvalid").length,
      ).toBeGreaterThan(0);
    });
  });

  it("names the mixed convention, keeps it across other edits, and lets an amount edit resolve the row", async () => {
    const onResultChange = renderPreview(MIXED);

    expect(
      screen.getByText("importer.preview.validCount"),
    ).toBeInTheDocument();
    // Each refused row names it under its cell and in its diagnostic row.
    await waitFor(() => {
      expect(
        screen.getAllByText("importer.validation.amountMixedDecimals"),
      ).toHaveLength(4);
    });
    // A mixed row has no reading to show.
    expect(screen.queryByText("1234.56")).not.toBeInTheDocument();

    await edit(payeeCell(1), "US Renamed");
    let next = onResultChange.mock.calls.at(-1)?.[0] as CSVParseResult;
    expect(next.rows[0].payee).toBe("US Renamed");
    expect(next.rows[0].errors?.join(" ")).toMatch(/mixes point decimals/);
    expect(next.validCount).toBe(0);

    await edit(amountCell(1), "1234.56");
    next = onResultChange.mock.calls.at(-1)?.[0] as CSVParseResult;
    expect(next.rows[0].errors).toBeUndefined();
    expect(next.rows[0].amount).toBe(1234.56);
    expect(next.validCount).toBe(1);
    // Only row 2 is still refused.
    await waitFor(() => {
      expect(
        screen.getAllByText("importer.validation.amountMixedDecimals"),
      ).toHaveLength(2);
    });
  });
});
