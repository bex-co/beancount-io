import * as Dialog from "@radix-ui/react-dialog";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { settleDeferredUnmount } from "./settle-deferred-unmount";

/**
 * Radix returns focus from a timer queued by unmount, so a test file that ends
 * with a dialog open leaves that timer pending when Vitest tears jsdom down
 * (see `settle-deferred-unmount.ts`). These cases stage that ordering by hand
 * instead of racing the real teardown.
 */

function ArchiveDialog({ open }: { open: boolean }) {
  return (
    <Dialog.Root open={open}>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content aria-describedby={undefined}>
          <Dialog.Title>Archive</Dialog.Title>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("settleDeferredUnmount", () => {
  it("waits for Radix to hand focus back to the trigger after the dialog closes", async () => {
    const view = render(<ArchiveDialog open />);
    // An open modal hides the trigger from the accessibility tree.
    const trigger = screen.getByText("Open");
    expect(trigger).not.toHaveFocus();

    view.rerender(<ArchiveDialog open={false} />);
    // Radix has only queued the focus return; nothing has happened yet.
    expect(trigger).not.toHaveFocus();

    await settleDeferredUnmount();
    expect(trigger).toHaveFocus();
  });

  it("leaves nothing pending to run once jsdom's CustomEvent is gone", async () => {
    const uncaught: unknown[] = [];
    const record = (error: unknown) => uncaught.push(error);
    process.on("uncaughtException", record);
    try {
      render(<ArchiveDialog open />).unmount();
      await settleDeferredUnmount();

      // What Vitest's jsdom teardown does: Node's CustomEvent is not a jsdom
      // Event, so dispatching it on a jsdom element throws.
      vi.stubGlobal("CustomEvent", class NotAJsdomEvent {});
      await new Promise((resolve) => setTimeout(resolve, 20));
    } finally {
      process.off("uncaughtException", record);
    }

    expect(uncaught).toEqual([]);
  });
});
