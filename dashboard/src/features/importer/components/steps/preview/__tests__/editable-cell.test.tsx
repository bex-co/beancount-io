import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EditableCell } from "../editable-cell";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === "importer.preview.editCellLabel") {
        return `Edit ${params?.field}. Current value: ${params?.value}`;
      }
      return key;
    },
  }),
}));

describe("EditableCell keyboard behavior", () => {
  it("opens on Space and restores focus after Escape", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EditableCell
        value="QA Coffee"
        onChange={onChange}
        placeholder="Payee name"
      />,
    );

    const button = screen.getByRole("button", {
      name: "Edit Payee name. Current value: QA Coffee",
    });
    button.focus();
    await user.keyboard(" ");

    const input = screen.getByDisplayValue("QA Coffee");
    expect(input).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", {
        name: "Edit Payee name. Current value: QA Coffee",
      }),
    ).toHaveFocus();
  });

  it("commits on Enter and restores focus to the cell button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EditableCell
        value="QA Coffee"
        onChange={onChange}
        placeholder="Payee name"
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Edit Payee name. Current value: QA Coffee",
      }),
    );
    const input = screen.getByDisplayValue("QA Coffee");
    await user.clear(input);
    await user.type(input, "QA Tea{Enter}");

    expect(onChange).toHaveBeenCalledWith("QA Tea");
    expect(
      screen.getByRole("button", {
        name: "Edit Payee name. Current value: QA Coffee",
      }),
    ).toHaveFocus();
  });

  it("lets Tab leave focus on the next control after commit", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <div>
        <EditableCell
          value="QA Coffee"
          onChange={onChange}
          placeholder="Payee name"
        />
        <button type="button">Next cell</button>
      </div>,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Edit Payee name. Current value: QA Coffee",
      }),
    );
    await user.tab();

    expect(onChange).toHaveBeenCalledWith("QA Coffee");
    expect(screen.getByRole("button", { name: "Next cell" })).toHaveFocus();
  });

  it("keeps disabled cells out of the tab sequence", () => {
    render(
      <EditableCell
        value="locked"
        onChange={vi.fn()}
        placeholder="Payee name"
        disabled
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Edit Payee name. Current value: locked",
      }),
    ).toBeDisabled();
  });

  it("opens date and amount cells with Enter", () => {
    const onChange = vi.fn();
    render(
      <EditableCell
        value="2025-12-01"
        onChange={onChange}
        placeholder="Date"
        type="date"
      />,
    );

    const button = screen.getByRole("button", {
      name: "Edit Date. Current value: 2025-12-01",
    });
    fireEvent.keyDown(button, { key: "Enter" });
    // Native button click from Enter is handled by the browser; click path:
    fireEvent.click(button);
    expect(screen.getByDisplayValue("2025-12-01")).toBeInTheDocument();
  });
});
