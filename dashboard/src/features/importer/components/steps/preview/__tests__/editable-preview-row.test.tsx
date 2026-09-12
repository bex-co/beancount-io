import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Table, TableBody } from "@/common/components/ui/table";
import { EditablePreviewRow } from "../editable-preview-row";
import { buildParsedRow } from "../../../../utils/csv-validator";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

function renderRow(row: ReturnType<typeof buildParsedRow>) {
  return render(
    <Table>
      <TableBody>
        <EditablePreviewRow
          row={row}
          index={0}
          onChange={vi.fn()}
          onDelete={vi.fn()}
        />
      </TableBody>
    </Table>,
  );
}

describe("EditablePreviewRow initial diagnostics", () => {
  it("surfaces parser errors on mount without any edit", async () => {
    const row = buildParsedRow({
      date: "2025-02-29",
      payee: "QA Invalid",
      description: "Broken row",
      amountInput: "abc",
    });
    expect(row.errors?.length).toBeGreaterThan(0);

    renderRow(row);

    await waitFor(() => {
      expect(
        screen.getAllByText("importer.validation.invalidDateFormat").length,
      ).toBeGreaterThan(0);
    });
    expect(
      screen.getAllByText("importer.validation.amountInvalid").length,
    ).toBeGreaterThan(0);
    // The diagnostic row names the offending fields.
    expect(screen.getByText("date:")).toBeInTheDocument();
    expect(screen.getByText("amount:")).toBeInTheDocument();
  });

  it("does not steal focus while validating on mount", async () => {
    renderRow(
      buildParsedRow({
        date: "not-a-date",
        payee: "",
        description: "",
        amountInput: "",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getAllByText("importer.validation.payeeRequired").length,
      ).toBeGreaterThan(0);
    });
    expect(document.activeElement).toBe(document.body);
  });

  it("shows the same diagnostics again after a remount", async () => {
    const row = buildParsedRow({
      date: "2025-02-29",
      payee: "QA Invalid",
      description: "Broken row",
      amountInput: "abc",
    });

    const { unmount } = renderRow(row);
    await waitFor(() => {
      expect(
        screen.getAllByText("importer.validation.amountInvalid").length,
      ).toBeGreaterThan(0);
    });
    unmount();

    renderRow(row);
    await waitFor(() => {
      expect(
        screen.getAllByText("importer.validation.amountInvalid").length,
      ).toBeGreaterThan(0);
    });
  });

  it("reports no errors for a clean row", async () => {
    renderRow(
      buildParsedRow({
        date: "2025-12-01",
        payee: "QA Coffee",
        description: "Morning coffee",
        amountInput: "-4.50",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("QA Coffee")).toBeInTheDocument();
    });
    expect(
      screen.queryByText("importer.validation.invalidDateFormat"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("date:")).not.toBeInTheDocument();
  });
});
