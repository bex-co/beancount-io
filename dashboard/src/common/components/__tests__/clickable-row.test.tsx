import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { getClickableRowProps } from "../clickable-row";

describe("getClickableRowProps", () => {
  it("is tabbable and activates with click, Enter, and Space", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();

    render(
      <div {...getClickableRowProps<HTMLDivElement>(onActivate)}>Open row</div>,
    );

    const row = screen.getByRole("link", { name: "Open row" });
    expect(row).toHaveAttribute("tabindex", "0");
    expect(row).toHaveClass("focus-visible:ring-2", "focus-visible:ring-ring");

    await user.tab();
    expect(row).toHaveFocus();

    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    await user.click(row);

    expect(onActivate).toHaveBeenCalledTimes(3);
  });

  it("does not activate for events from nested interactive controls", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    const onNestedClick = vi.fn();

    render(
      <div {...getClickableRowProps<HTMLDivElement>(onActivate)}>
        <button type="button" onClick={onNestedClick}>
          Row action
        </button>
      </div>,
    );

    const nestedButton = screen.getByRole("button", { name: "Row action" });
    await user.click(nestedButton);
    nestedButton.focus();
    await user.keyboard("{Enter}");

    expect(onNestedClick).toHaveBeenCalledTimes(2);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("supports pointer-only table rows without overwriting native semantics", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();

    render(
      <table>
        <tbody>
          <tr
            {...getClickableRowProps<HTMLTableRowElement>(onActivate, {
              preserveTableSemantics: true,
            })}
          >
            <td>
              <button type="button">Account</button>
            </td>
          </tr>
        </tbody>
      </table>,
    );

    const row = screen.getByRole("button", { name: "Account" }).closest("tr");
    expect(row).not.toHaveAttribute("role");
    expect(row).not.toHaveAttribute("tabindex");
    await user.click(row as HTMLElement);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});
