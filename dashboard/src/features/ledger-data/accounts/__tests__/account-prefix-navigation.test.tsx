import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountPrefixNavigation } from "../account-prefix-navigation";

describe("AccountPrefixNavigation", () => {
  it("shows the whole name, breaking only after a colon, with every prefix in Tab order", async () => {
    const user = userEvent.setup();
    const onAccountClick = vi.fn();
    const onParentClick = vi.fn();
    const accountName = "Expenses:Taxes:Y2017:US:Federal:PreTax401k";
    render(
      <div onClick={onParentClick}>
        <AccountPrefixNavigation
          accountName={accountName}
          isClosed={false}
          onAccountClick={onAccountClick}
        />
      </div>,
    );
    const leaf = screen.getByRole("button", { name: accountName });
    const name = leaf.parentElement!;
    // The last part tells two accounts apart, so it is never cut off; a
    // narrow column wraps the name instead.
    expect(name).not.toHaveClass("truncate");
    expect(name.querySelectorAll("wbr")).toHaveLength(5);
    expect(name).toHaveTextContent(accountName);
    expect(leaf).toHaveClass("font-medium");

    const buttons = within(name).getAllByRole("button");
    for (const [index, button] of buttons.entries()) {
      await user.tab();
      expect(button).toHaveFocus();
      if (index === 4) {
        expect(button).toHaveClass("bg-muted");
        await user.keyboard("{Enter}");
        expect(onAccountClick).toHaveBeenCalledExactlyOnceWith(
          "Expenses:Taxes:Y2017:US:Federal",
        );
        expect(onParentClick).not.toHaveBeenCalled();
      }
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

  it("isolates the root-first path and keeps each segment's direction in a Persian page", async () => {
    const user = userEvent.setup();
    const onAccountClick = vi.fn();
    const accountName = "Expenses:خوراک:رستوران";
    render(
      <div dir="rtl">
        <AccountPrefixNavigation
          accountName={accountName}
          isClosed={false}
          onAccountClick={onAccountClick}
        />
      </div>,
    );
    const leaf = screen.getByRole("button", { name: accountName });
    const path = leaf.parentElement!;
    expect(path).toHaveAttribute("dir", "ltr");
    expect(path).toHaveClass("[unicode-bidi:isolate]");
    expect(path.textContent).toBe(accountName);
    expect(path.querySelectorAll("wbr")).toHaveLength(2);
    expect(
      Array.from(
        path.querySelectorAll('[dir="auto"]'),
        (segment) => segment.textContent,
      ),
    ).toEqual(accountName.split(":"));
    await user.click(screen.getByRole("button", { name: "Expenses:خوراک" }));
    expect(onAccountClick).toHaveBeenCalledExactlyOnceWith("Expenses:خوراک");
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

    expect(expenses).toHaveClass("bg-muted");
    expect(taxes).toHaveClass("bg-muted");
    expect(year).toHaveClass("bg-muted");
    expect(us).not.toHaveClass("bg-muted");

    await user.click(taxes);

    expect(onAccountClick).toHaveBeenCalledWith("Expenses:Taxes");
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
