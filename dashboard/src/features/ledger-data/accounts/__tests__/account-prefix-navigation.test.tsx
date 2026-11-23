import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderLedgerNavigation } from "@/test/render-ledger-navigation";
import { AccountPrefixNavigation } from "../account-prefix-navigation";

const account = "Expenses:Taxes:Y2017:US:Federal";
const filters = "?account=Assets&filter=sample&time=2026";
const href = (prefix: string) =>
  `/ledger/alice/books/account/${encodeURIComponent(prefix)}${filters}`;

describe("AccountPrefixNavigation", () => {
  it("shows the whole name and links every prefix with retained filters", async () => {
    const accountName = `${account}:PreTax401k`;
    const onParentClick = vi.fn();
    const { router } = await renderLedgerNavigation(
      <div onClick={onParentClick}>
        <AccountPrefixNavigation
          accountName={accountName}
          isClosed={false}
          ledgerOwner="alice"
          ledgerName="books"
        />
      </div>,
      "accounts",
      filters,
    );
    const leaf = screen.getByRole("link", { name: accountName });
    const name = leaf.parentElement!;
    expect(name).not.toHaveClass("truncate");
    expect(name.querySelectorAll("wbr")).toHaveLength(5);
    expect(name).toHaveTextContent(accountName);
    expect(leaf).toHaveClass("font-medium");

    const user = userEvent.setup();
    const links = within(name).getAllByRole("link");
    const segments = accountName.split(":");
    for (const [index, link] of links.entries()) {
      expect(link).toHaveAttribute(
        "href",
        href(segments.slice(0, index + 1).join(":")),
      );
      await user.tab();
      expect(link).toHaveFocus();
    }
    const parent = screen.getByRole("link", { name: account });
    parent.focus();
    await waitFor(() => expect(parent).toHaveClass("bg-muted"));
    fireEvent.click(parent, { metaKey: true, button: 0 });
    expect(router.state.location.pathname).toBe("/ledger/alice/books/accounts");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(router.state.location.href).toBe(href(account)));
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it("isolates the root-first path and preserves the segments on a Persian page", async () => {
    const accountName = "Expenses:خوراک:رستوران";
    const { router } = await renderLedgerNavigation(
      <div dir="rtl">
        <AccountPrefixNavigation
          accountName={accountName}
          isClosed={false}
          ledgerOwner="alice"
          ledgerName="books"
        />
      </div>,
      "accounts",
      filters,
    );
    const leaf = screen.getByRole("link", { name: accountName });
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
    await userEvent.click(screen.getByRole("link", { name: "Expenses:خوراک" }));
    await waitFor(() =>
      expect(router.state.location.href).toBe(href("Expenses:خوراک")),
    );
  });

  it("highlights the entire active prefix on hover", async () => {
    await renderLedgerNavigation(
      <AccountPrefixNavigation
        accountName={account}
        isClosed={false}
        ledgerOwner="alice"
        ledgerName="books"
      />,
    );
    const expenses = screen.getByRole("link", { name: "Expenses" });
    const taxes = screen.getByRole("link", { name: "Expenses:Taxes" });
    const year = screen.getByRole("link", { name: "Expenses:Taxes:Y2017" });
    const us = screen.getByRole("link", { name: "Expenses:Taxes:Y2017:US" });
    expect(expenses).toHaveClass("cursor-pointer");
    fireEvent.mouseEnter(year);
    expect(expenses).toHaveClass("bg-muted");
    expect(taxes).toHaveClass("bg-muted");
    expect(year).toHaveClass("bg-muted");
    expect(us).not.toHaveClass("bg-muted");
  });
});
