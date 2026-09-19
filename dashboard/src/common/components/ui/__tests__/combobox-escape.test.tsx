import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Combobox } from "../combobox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../sheet";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.value ? `${key}:${params.value}` : key,
  }),
}));

const options = [
  { value: "2015", label: "2015" },
  { value: "2016", label: "2016" },
  { value: "2017", label: "2017" },
];

describe("Combobox Escape", () => {
  it("dismisses the suggestions without applying the draft in blur mode", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Combobox
        options={options}
        value="2016"
        onValueChange={onValueChange}
        allowCustom
        triggerOn="blur"
      />,
    );

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.clear(input);
    await user.type(input, "2026-02-30");
    expect(input).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");

    // The popup is gone, the draft survives, focus stays put, and nothing was
    // applied — Escape is a dismissal, not a commit.
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveValue("2026-02-30");
    expect(input).toHaveFocus();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("resets the active option so the next ArrowDown starts at the top", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        options={options}
        value=""
        onValueChange={vi.fn()}
        allowCustom
        triggerOn="blur"
      />,
    );

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}{ArrowDown}");
    await user.keyboard("{Escape}");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(input).toHaveValue("2015");
  });

  it("leaves the draft editable straight after dismissal", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        options={options}
        value=""
        onValueChange={vi.fn()}
        allowCustom
        triggerOn="blur"
      />,
    );

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "2026-02-30");
    await user.keyboard("{Escape}");
    await user.keyboard("{Backspace}");

    expect(input).toHaveValue("2026-02-3");
  });

  it("still commits Enter and an ordinary blur", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <>
        <Combobox
          options={options}
          value=""
          onValueChange={onValueChange}
          allowCustom
          triggerOn="blur"
        />
        <button type="button">elsewhere</button>
      </>,
    );

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "2017-01");
    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("2017-01");

    onValueChange.mockClear();
    await user.click(input);
    await user.clear(input);
    await user.type(input, "2018");
    await user.click(screen.getByText("elsewhere"));
    expect(onValueChange).toHaveBeenCalledWith("2018");
  });

  it("does not apply the draft in change mode either", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Combobox
        options={options}
        value=""
        onValueChange={onValueChange}
        allowCustom
        triggerOn="change"
      />,
    );

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "201");
    // Change mode applies as you type; Escape must add nothing of its own.
    const appliedWhileTyping = onValueChange.mock.calls.length;

    await user.keyboard("{Escape}");

    expect(onValueChange).toHaveBeenCalledTimes(appliedWhileTyping);
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveFocus();
  });

  it("lets an enclosing sheet keep its own Escape once the popup is closed", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Sheet open onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Narrow the report</SheetDescription>
          </SheetHeader>
          <Combobox
            options={options}
            value=""
            onValueChange={vi.fn()}
            allowCustom
            triggerOn="blur"
          />
        </SheetContent>
      </Sheet>,
    );

    const input = screen.getByRole("combobox");
    await user.click(input);
    expect(input).toHaveAttribute("aria-expanded", "true");

    // First Escape belongs to the suggestions.
    await user.keyboard("{Escape}");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(onOpenChange).not.toHaveBeenCalled();

    // With nothing left to dismiss, Escape reaches the sheet.
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
