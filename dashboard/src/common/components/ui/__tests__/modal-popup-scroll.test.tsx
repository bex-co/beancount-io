import { fireEvent, render, screen } from "@testing-library/react";
import { enUS } from "react-day-picker/locale/en-US";
import { describe, expect, it, vi } from "vitest";
import { Combobox } from "../combobox";
import { DatePicker } from "../date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../sheet";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { dir: () => "ltr" },
  }),
}));
vi.mock("@/common/hooks/use-date-locale", () => ({
  useDateLocale: () => enUS,
}));

/**
 * The real Dialog/Sheet scroll lock with a real portaled popup: a wheel inside
 * the popup must stay a scroll, while one behind the modal is still cancelled
 * (w4/m40).
 */
function wheel(target: Element) {
  const event = new WheelEvent("wheel", {
    deltaY: 500,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("picker popups inside modals", () => {
  it("lets a DatePicker in a dialog scroll, keeps the page locked and caps its height", () => {
    render(
      <>
        <p>page behind</p>
        <Dialog open>
          <DialogContent>
            <DialogTitle>Open Account</DialogTitle>
            <DialogDescription>QA</DialogDescription>
            <DatePicker value="2026-08-31" onChange={() => {}} />
          </DialogContent>
        </Dialog>
      </>,
    );
    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "ArrowDown",
      keyCode: 40,
    });
    const day = screen.getByRole("button", { name: /August 30th, 2026/ });
    const popup = day.closest('[data-slot="popover-content"]')!;

    expect(wheel(day)).toBe(false);
    expect(wheel(screen.getByText("page behind"))).toBe(true);
    expect(popup.className).toContain(
      "max-h-(--radix-popover-content-available-height)",
    );
    expect(popup.className).toContain("overflow-y-auto");

    fireEvent.click(day);
    expect(screen.getByRole("textbox")).toHaveValue("2026-08-30");
  });

  it("lets an account list in a sheet scroll and still type into its field", () => {
    const options = Array.from({ length: 40 }, (_, index) => ({
      value: `Expenses:Qa:${index}`,
      label: `Expenses:Qa:${index}`,
    }));
    const onValueChange = vi.fn();
    render(
      <>
        <p>page behind</p>
        <Sheet open>
          <SheetContent>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>QA</SheetDescription>
            <Combobox
              options={options}
              value=""
              onValueChange={onValueChange}
            />
          </SheetContent>
        </Sheet>
      </>,
    );
    const input = screen.getByRole("combobox");
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    const last = screen.getByRole("option", { name: "Expenses:Qa:39" });

    expect(wheel(last)).toBe(false);
    expect(wheel(screen.getByText("page behind"))).toBe(true);

    fireEvent.change(input, { target: { value: "Qa:3" } });
    expect(input).toHaveValue("Qa:3");
    expect(input).toHaveFocus();
  });
});
