import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Table, TableBody } from "@/common/components/ui/table";
import { EditablePreviewRow } from "../editable-preview-row";
import { buildParsedRow } from "../../../../utils/csv-validator";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en-US" },
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
    expect(screen.getByText("12/1/2025")).toBeInTheDocument();
    expect(
      screen.queryByText("importer.validation.invalidDateFormat"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("date:")).not.toBeInTheDocument();
  });
});

/**
 * A quoted CSV payee keeps its newline (`… LLC` / `Branch`). Payee opened a
 * single-line input, which drops line breaks from what it holds, so the first
 * typed edit joined the lines (w4/1023). Description already had a textarea.
 */
describe("EditablePreviewRow multiline payee", () => {
  const PAYEE = 'qa Café "North", LLC\nBranch';
  const row = () =>
    buildParsedRow({
      date: "2026-10-23",
      payee: PAYEE,
      description: "line 1\nline 2",
      amountInput: "12.50",
    });

  function renderEditable() {
    const onChange = vi.fn();
    render(
      <Table>
        <TableBody>
          <EditablePreviewRow
            row={row()}
            index={0}
            onChange={onChange}
            onDelete={vi.fn()}
          />
        </TableBody>
      </Table>,
    );
    // Re-read each time: the cell's button is replaced while it edits.
    const payeeCell = () =>
      screen
        .getAllByRole("button")
        .find((button) => button.textContent?.includes("Branch"))!;
    return { onChange, payeeCell };
  }

  it("keeps the payee's line break through a typed edit", async () => {
    const user = userEvent.setup();
    const { onChange, payeeCell } = renderEditable();

    await user.click(payeeCell());
    // The one editor open, the Payee cell's.
    const editor = screen.getByRole("textbox");
    expect(editor.tagName).toBe("TEXTAREA");
    expect(editor).toHaveValue(PAYEE);

    await user.keyboard("{End} updated{Enter}");
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        0,
        expect.objectContaining({ payee: `${PAYEE} updated` }),
      ),
    );
  });

  it("keeps the original payee when the edit is cancelled", async () => {
    const user = userEvent.setup();
    const { onChange, payeeCell } = renderEditable();

    await user.click(payeeCell());
    await user.keyboard(" discarded{Escape}");
    expect(onChange).not.toHaveBeenCalledWith(
      0,
      expect.objectContaining({ payee: expect.stringContaining("discarded") }),
    );
    await waitFor(() => expect(payeeCell()).toHaveFocus());
  });
});
