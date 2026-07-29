import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountRow } from "../index";

describe("AccountRow", () => {
  it("activates with click, Enter, and Space while preserving prefix actions", async () => {
    const user = userEvent.setup();
    const onAccountClick = vi.fn();

    render(
      <table>
        <tbody>
          <AccountRow
            account={{
              account: "Assets:Bank:Checking",
              openedAt: "2024-01-01",
              closedAt: null,
              balance: { USD: "100.00" },
              entryCount: 1,
              entryHash: "entry-1",
              closeEntryHash: null,
            }}
            onAccountClick={onAccountClick}
            onDelete={vi.fn()}
            onClose={vi.fn()}
          />
        </tbody>
      </table>,
    );

    const accountRow = screen
      .getByRole("button", { name: "Assets:Bank:Checking" })
      .closest("tr");
    expect(accountRow).toHaveAttribute("role", "link");
    expect(accountRow).toHaveAttribute("tabindex", "0");

    await user.click(accountRow as HTMLElement);
    accountRow?.focus();
    expect(accountRow).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onAccountClick).toHaveBeenCalledTimes(3);
    expect(onAccountClick).toHaveBeenLastCalledWith("Assets:Bank:Checking");

    await user.click(screen.getByRole("button", { name: "Assets" }));
    expect(onAccountClick).toHaveBeenCalledTimes(4);
    expect(onAccountClick).toHaveBeenLastCalledWith("Assets");
  });
});
