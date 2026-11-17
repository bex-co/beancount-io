import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DirectiveType, type JournalTransaction } from "@/common/types/journal";
import { TransactionDescription } from "../transaction-description";

const fare: JournalTransaction = {
  directive_type: DirectiveType.TRANSACTION,
  entry_hash: "synthetic-fare",
  date: "2026-11-02",
  flag: "*",
  payee: "Metro Transport Authority",
  narration: "Monthly pass",
  tags: [],
  links: [],
  postings: [],
};

describe("TransactionDescription in a right-to-left page", () => {
  it("truncates an English payee at its end, from the line's start edge", () => {
    // At 390 px in Persian the payee took the page's direction, so its
    // ellipsis landed at the left and "Metro Transport Authority" read
    // "…tro Transport Authority" (w2/138). The payee now takes its own
    // direction; on phones it is sized to its text so a short one stays at
    // the start edge, and from `sm:` it keeps the row's baseline alignment.
    const root = document.body.appendChild(document.createElement("div"));
    root.setAttribute("dir", "rtl");
    render(<TransactionDescription directive={fare} />, { container: root });

    const payee = screen.getByText("Metro Transport Authority");
    expect(payee).toHaveAttribute("dir", "auto");
    expect(payee).toHaveClass(
      "truncate",
      "max-w-full",
      "self-start",
      "sm:self-auto",
    );

    // The narration wraps across the full width in the page's direction.
    const narration = screen.getByText("Monthly pass");
    expect(narration).not.toHaveAttribute("dir");
    expect(narration).not.toHaveClass("self-start");
  });
});
