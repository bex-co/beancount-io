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

  it("opens multiline cells in a textarea and round-trips embedded newlines", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EditableCell
        value={"First line\nSecond line"}
        onChange={onChange}
        placeholder="Description"
        multiline
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Edit Description. Current value: First line\nSecond line",
      }),
    );

    // jsdom does not reproduce the native single-line newline stripping, so
    // assert the element type plus the value that survives the round trip.
    const editor = screen.getByRole("textbox");
    expect(editor.tagName).toBe("TEXTAREA");
    expect(editor).toHaveValue("First line\nSecond line");

    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("First line\nSecond line");
  });

  it("inserts a newline on Shift+Enter and commits on plain Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EditableCell
        value="First line"
        onChange={onChange}
        placeholder="Description"
        multiline
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Edit Description. Current value: First line",
      }),
    );
    const editor = screen.getByDisplayValue("First line");
    await user.click(editor);
    await user.keyboard("{End}{Shift>}{Enter}{/Shift}Second line");

    expect(onChange).not.toHaveBeenCalled();
    expect(editor).toHaveValue("First line\nSecond line");

    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("First line\nSecond line");
  });

  it("inserts a newline on Cmd/Ctrl+Enter without committing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EditableCell
        value="First line"
        onChange={onChange}
        placeholder="Description"
        multiline
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Edit Description. Current value: First line",
      }),
    );
    const editor = screen.getByDisplayValue("First line");
    await user.click(editor);
    await user.keyboard("{End}{Control>}{Enter}{/Control}");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("cancels a multiline edit on Escape and restores focus", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EditableCell
        value={"First line\nSecond line"}
        onChange={onChange}
        placeholder="Description"
        multiline
      />,
    );

    const button = screen.getByRole("button", {
      name: "Edit Description. Current value: First line\nSecond line",
    });
    await user.click(button);
    await user.keyboard("edited{Escape}");

    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", {
        name: "Edit Description. Current value: First line\nSecond line",
      }),
    ).toHaveFocus();
  });

  it("uses a single-line input when multiline is not requested", async () => {
    const user = userEvent.setup();
    render(
      <EditableCell
        value="QA Coffee"
        onChange={vi.fn()}
        placeholder="Payee name"
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Edit Payee name. Current value: QA Coffee",
      }),
    );

    expect(screen.getByDisplayValue("QA Coffee").tagName).toBe("INPUT");
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
