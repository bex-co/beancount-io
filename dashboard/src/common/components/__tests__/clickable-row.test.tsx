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
});
