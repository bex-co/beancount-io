import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountPrefixNavigation } from "../account-prefix-navigation";

function mockPrefixGeometry(
  buttons: HTMLElement[],
  width: number,
  direction: "ltr" | "rtl",
) {
  const viewport = buttons[0].parentElement!;
  // A 208px viewport leaves only 10px of the 68px Federal segment visible.
  // jsdom has no layout or native focus scrolling, so moving the viewport's
  // actual scrollLeft changes the mocked rectangles as it would in a browser.
  const widths = [70, 44, 58, 26, 68, 93];
  vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue(
    new DOMRect(100, 0, width, 20),
  );
  let offset = 0;
  buttons.forEach((button, index) => {
    const start = offset;
    const buttonWidth = widths[index];
    vi.spyOn(button, "getBoundingClientRect").mockImplementation(() => {
      const left =
        direction === "ltr"
          ? 100 + start - viewport.scrollLeft
          : 100 + width - start - buttonWidth - viewport.scrollLeft;
      return new DOMRect(left, 0, buttonWidth, 20);
    });
    offset += buttonWidth;
  });
  return viewport;
}

function expectFullyVisible(button: HTMLElement, viewport: HTMLElement) {
  const focused = button.getBoundingClientRect();
  const visible = viewport.getBoundingClientRect();
  expect(button).toHaveFocus();
  expect(focused.left).toBeGreaterThanOrEqual(visible.left);
  expect(focused.right).toBeLessThanOrEqual(visible.right);
}

describe("AccountPrefixNavigation", () => {
  it.each(["ltr", "rtl"] as const)(
    "reveals every prefix through native Tab and Shift+Tab in a clipped %s row",
    async (direction) => {
      const user = userEvent.setup();
      const onAccountClick = vi.fn();
      const onParentClick = vi.fn();
      const accountName = "Expenses:Taxes:Y2017:US:Federal:PreTax401k";
      render(
        <div dir={direction} onClick={onParentClick}>
          <button>Before account</button>
          <AccountPrefixNavigation
            accountName={accountName}
            isClosed={false}
            onAccountClick={onAccountClick}
          />
          <button>After account</button>
        </div>,
      );
      const leaf = screen.getByRole("button", { name: accountName });
      const buttons = within(leaf.parentElement!).getAllByRole("button");
      const viewport = mockPrefixGeometry(buttons, 208, direction);
      await user.tab();
      expect(
        screen.getByRole("button", { name: "Before account" }),
      ).toHaveFocus();

      for (const [index, button] of buttons.entries()) {
        await user.tab();
        expectFullyVisible(button, viewport);
        if (index < 4) expect(viewport.scrollLeft).toBe(0);
        if (index === 4) {
          expect(viewport.scrollLeft).toBe(direction === "ltr" ? 58 : -58);
          expect(button).toHaveClass("bg-primary/10");
          await user.keyboard("{Enter}");
          expect(onAccountClick).toHaveBeenCalledExactlyOnceWith(
            "Expenses:Taxes:Y2017:US:Federal",
          );
          expect(onParentClick).not.toHaveBeenCalled();
          expect(button).toHaveFocus();
        }
      }
      expect(viewport.scrollLeft).toBe(direction === "ltr" ? 151 : -151);
      // jsdom cannot paint Tailwind text overflow. Native browser checks
      // verify that focused text is drawn instead of covered by ellipsis.
      expect(viewport).toHaveClass("truncate", "focus-within:text-clip");

      await user.tab();
      expect(
        screen.getByRole("button", { name: "After account" }),
      ).toHaveFocus();
      expect(viewport.scrollLeft).toBe(0);
      expect(buttons[4]).not.toHaveClass("bg-primary/10");

      // Re-enter at the leaf, then reveal earlier segments without resetting
      // the offset between buttons inside the same account-name viewport.
      await user.tab({ shift: true });
      expectFullyVisible(leaf, viewport);
      expect(viewport.scrollLeft).toBe(direction === "ltr" ? 151 : -151);
      for (const button of buttons.slice(0, -1).reverse()) {
        await user.tab({ shift: true });
        expectFullyVisible(button, viewport);
      }
      expect(viewport.scrollLeft).toBe(0);
      await user.tab({ shift: true });
      expect(
        screen.getByRole("button", { name: "Before account" }),
      ).toHaveFocus();
      expect(viewport.scrollLeft).toBe(0);
    },
  );

  it("leaves already-visible desktop prefixes at the original horizontal offset", async () => {
    const user = userEvent.setup();
    render(
      <AccountPrefixNavigation
        accountName="Expenses:Taxes:Y2017:US:Federal:PreTax401k"
        isClosed={false}
        onAccountClick={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole("button");
    const viewport = mockPrefixGeometry(buttons, 500, "ltr");
    for (const button of buttons) {
      await user.tab();
      expectFullyVisible(button, viewport);
      expect(viewport.scrollLeft).toBe(0);
    }
  });

  it("renders and navigates to every cumulative account prefix", async () => {
    const user = userEvent.setup();
    const onAccountClick = vi.fn();
    const accountName = "Expenses:Taxes:Y2017:US:SocSec";
    const prefixes = [
      "Expenses",
      "Expenses:Taxes",
      "Expenses:Taxes:Y2017",
      "Expenses:Taxes:Y2017:US",
      "Expenses:Taxes:Y2017:US:SocSec",
    ];

    const { container } = render(
      <AccountPrefixNavigation
        accountName={accountName}
        isClosed={false}
        onAccountClick={onAccountClick}
      />,
    );

    expect(container).toHaveTextContent(accountName);

    for (const prefix of prefixes) {
      await user.click(screen.getByRole("button", { name: prefix }));
    }

    expect(onAccountClick.mock.calls.map(([prefix]) => prefix)).toEqual(
      prefixes,
    );
  });

  it("highlights the entire active prefix and does not trigger its parent", async () => {
    const user = userEvent.setup();
    const onAccountClick = vi.fn();
    const onParentClick = vi.fn();

    render(
      <div onClick={onParentClick}>
        <AccountPrefixNavigation
          accountName="Expenses:Taxes:Y2017:US:SocSec"
          isClosed={false}
          onAccountClick={onAccountClick}
        />
      </div>,
    );

    const expenses = screen.getByRole("button", { name: "Expenses" });
    const taxes = screen.getByRole("button", { name: "Expenses:Taxes" });
    const year = screen.getByRole("button", {
      name: "Expenses:Taxes:Y2017",
    });
    const us = screen.getByRole("button", {
      name: "Expenses:Taxes:Y2017:US",
    });

    expect(expenses).toHaveClass("cursor-pointer");

    fireEvent.mouseEnter(year);

    expect(expenses).toHaveClass("bg-primary/10");
    expect(taxes).toHaveClass("bg-primary/10");
    expect(year).toHaveClass("bg-primary/10");
    expect(us).not.toHaveClass("bg-primary/10");

    await user.click(taxes);

    expect(onAccountClick).toHaveBeenCalledWith("Expenses:Taxes");
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
