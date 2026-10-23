import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../dialog";

/** A dialog whose write is pending holds every dismissal (w4/977). */
function Harness({
  busy,
  onOpenChange,
}: {
  busy: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        setOpen(next);
      }}
    >
      <DialogContent busy={busy}>
        <DialogTitle>Add Budget</DialogTitle>
        <DialogDescription>QA</DialogDescription>
        <input aria-label="Amount" />
      </DialogContent>
    </Dialog>
  );
}

const overlay = () =>
  document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]')!;
/** Radix starts listening for outside presses a tick after it opens. */
const pressOutside = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  fireEvent.pointerDown(overlay());
};

describe("DialogContent busy", () => {
  it("holds Escape, an outside press and the close button while busy", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Harness busy onOpenChange={onOpenChange} />);
    screen.getByRole("textbox", { name: "Amount" }).focus();

    await user.keyboard("{Escape}");
    await pressOutside();
    const close = screen.getByRole("button", { name: /close/i });
    expect(close).toBeDisabled();
    await user.click(close);

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it.each([
    ["Escape", "escape"],
    ["an outside press", "outside"],
    ["the close button", "close"],
  ])("closes on %s once idle", async (_, how) => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<Harness busy onOpenChange={onOpenChange} />);
    rerender(<Harness busy={false} onOpenChange={onOpenChange} />);
    screen.getByRole("textbox", { name: "Amount" }).focus();

    if (how === "escape") await user.keyboard("{Escape}");
    else if (how === "outside") await pressOutside();
    else await user.click(screen.getByRole("button", { name: /close/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
