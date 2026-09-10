import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportPreviewTable } from "../import-preview-table";
import type { CSVParseResult } from "../../../types";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

function makeResult(payees: string[]): CSVParseResult {
  const rows = payees.map((payee, index) => ({
    id: `row-${index}`,
    date: `2024-01-${String(index + 1).padStart(2, "0")}`,
    payee,
    description: `${payee} purchase`,
    amount: -(index + 1),
    amountInput: String(-(index + 1)),
  }));
  return {
    rows,
    validCount: rows.length,
    errorCount: 0,
    hasErrors: false,
  };
}

describe("ImportPreviewTable row identity", () => {
  it("removes the deleted transaction from the preview, not a different row", async () => {
    const user = userEvent.setup();
    const onResultChange = vi.fn();
    render(
      <ImportPreviewTable
        result={makeResult(["Starbucks", "Walmart", "Insurance Co"])}
        onResultChange={onResultChange}
      />,
    );

    expect(screen.getByText("Starbucks")).toBeInTheDocument();
    expect(screen.getByText("Walmart")).toBeInTheDocument();
    expect(screen.getByText("Insurance Co")).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole("button", {
      name: "importer.preview.deleteRow",
    });
    await user.click(deleteButtons[0]);

    expect(screen.queryByText("Starbucks")).not.toBeInTheDocument();
    expect(screen.getByText("Walmart")).toBeInTheDocument();
    expect(screen.getByText("Insurance Co")).toBeInTheDocument();

    const next = onResultChange.mock.calls.at(-1)?.[0] as CSVParseResult;
    expect(next.rows.map((row) => row.payee)).toEqual([
      "Walmart",
      "Insurance Co",
    ]);
    expect(next.rows.map((row) => row.id)).toEqual(["row-1", "row-2"]);
  });
});
