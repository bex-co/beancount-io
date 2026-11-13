import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../alert-dialog";
import { Sheet, SheetContent, SheetTitle } from "../sheet";

/**
 * In Persian (`dir="rtl"`) every dialog's title sat on the physical left and
 * the close button stayed top-right, over the first line of a dialog whose
 * text starts on the right (w2/132). The primitives now use logical sides.
 */
const rtl = { container: document.body.appendChild(rtlRoot()) };

function rtlRoot() {
  const root = document.createElement("div");
  root.setAttribute("dir", "rtl");
  return root;
}

describe("dialog primitives under dir=rtl", () => {
  it("starts a dialog's header at the reading start and puts × at the end", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>این دفتر عمومی شود؟</DialogTitle>
            <DialogDescription>موقعیت: main.bean:83</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
      rtl,
    );

    const header = document.querySelector('[data-slot="dialog-header"]');
    expect(header).toHaveClass("sm:text-start");
    expect(header).not.toHaveClass("sm:text-left");
    const close = document.querySelector('[data-slot="dialog-close"]');
    expect(close).toHaveClass("end-4");
    expect(close).not.toHaveClass("right-4");
    // The header keeps clear of the close button in either direction.
    expect(
      document.querySelector('[data-slot="dialog-content"]')!.className,
    ).toContain("[&>[data-slot=dialog-header]]:pe-6");
  });

  it("leaves the header's end free when the dialog has no close button", () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
      rtl,
    );

    expect(
      document.querySelector('[data-slot="dialog-content"]')!.className,
    ).not.toContain("dialog-header]]:pe-6");
  });

  it("starts an alert dialog's header at the reading start", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>این دفتر عمومی شود؟</AlertDialogTitle>
            <AlertDialogDescription>توضیح</AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>,
      rtl,
    );

    const header = screen.getByText("این دفتر عمومی شود؟").parentElement;
    expect(header).toHaveClass("sm:text-start");
    expect(header).not.toHaveClass("sm:text-left");
  });

  it("puts a sheet's × at the end", () => {
    render(
      <Sheet open>
        <SheetContent aria-describedby={undefined}>
          <SheetTitle>منو</SheetTitle>
        </SheetContent>
      </Sheet>,
      rtl,
    );

    const close = screen.getByRole("button", {
      name: /common\.closeDialog|close/i,
    });
    expect(close).toHaveClass("end-4");
    expect(close).not.toHaveClass("right-4");
  });

  it("keeps New Entry's title and description at the reading start", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "../../../../features/journal/components/new-directive-dialog/index.tsx",
      ),
      "utf8",
    );
    expect(source).not.toMatch(/Dialog(Title|Description)[^>]*text-left/);
  });
});
