import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountPrefixNavigation } from "../account-prefix-navigation";

describe("AccountPrefixNavigation", () => {
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
