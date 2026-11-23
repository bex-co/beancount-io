import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountName } from "../account-name";

describe("AccountName", () => {
  it("reads as the ledger's whole name, said once", () => {
    const { container } = render(
      <AccountName account="Expenses:Taxes:Y2017:US:Federal" />,
    );

    // Assistive technology hears one name, not a title and its path.
    expect(
      screen.getByText("Expenses:Taxes:Y2017:US:Federal"),
    ).toBeInTheDocument();
    const shown = container.querySelector("[aria-hidden='true']");
    expect(shown?.textContent).toBe("Expenses:Taxes:Y2017:US:Federal");
    // The last segment stands out and never shrinks; the path gives way.
    expect(screen.getByText("Federal")).toHaveClass("font-medium");
    expect(screen.getByText("Expenses:Taxes:Y2017:US")).toHaveClass(
      "truncate",
      "text-muted-foreground",
    );
    expect(screen.getByText("Federal").parentElement).toHaveClass("shrink-0");
  });

  it("shows a root-only name without a separator", () => {
    const { container } = render(<AccountName account="Equity" />);

    expect(container.querySelector("[aria-hidden='true']")?.textContent).toBe(
      "Equity",
    );
  });

  it.each(["rtl", "ltr"] as const)(
    "keeps the path root first in %s with Persian segments",
    (direction) => {
      const account = "Expenses:Qa:خوراک:سفر:رستوران";
      const { container } = render(
        <div dir={direction}>
          <AccountName account={account} />
        </div>,
      );
      const visible = container.querySelector('[aria-hidden="true"]')!;
      expect(visible).toHaveAttribute("dir", "ltr");
      expect(visible).toHaveClass("[unicode-bidi:isolate]");
      expect(visible.textContent).toBe(account);
      expect(
        Array.from(
          visible.querySelectorAll('[dir="auto"]'),
          (segment) => segment.textContent,
        ),
      ).toEqual(account.split(":"));
      expect(screen.getByText(account)).toHaveClass("sr-only");
    },
  );
});
