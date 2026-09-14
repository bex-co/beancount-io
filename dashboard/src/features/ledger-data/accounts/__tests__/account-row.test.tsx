import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountRow } from "../index";
import type { AccountDirective } from "../types";

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: true }),
}));

function renderRow(overrides: Partial<AccountDirective>) {
  render(
    <table>
      <tbody>
        <AccountRow
          account={{
            account: "Income:US:Hoogle:Salary",
            openedAt: "2015-01-01",
            closedAt: null,
            balance: null,
            entryCount: 71,
            entryHash: "entry-1",
            closeEntryHash: null,
            ...overrides,
          }}
          onAccountClick={vi.fn()}
          onDelete={vi.fn()}
          onClose={vi.fn()}
        />
      </tbody>
    </table>,
  );
  const cells = screen.getAllByRole("cell");
  return { balanceCell: cells[5]! };
}

describe("AccountRow", () => {
  it("keeps native row structure and activates from the row or prefix controls", async () => {
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
    expect(accountRow).not.toHaveAttribute("role");
    expect(accountRow).not.toHaveAttribute("tabindex");
    expect(accountRow?.querySelectorAll("td").length).toBeGreaterThan(0);

    await user.click(accountRow as HTMLElement);
    expect(onAccountClick).toHaveBeenCalledTimes(1);
    expect(onAccountClick).toHaveBeenLastCalledWith("Assets:Bank:Checking");

    await user.click(screen.getByRole("button", { name: "Assets" }));
    expect(onAccountClick).toHaveBeenCalledTimes(2);
    expect(onAccountClick).toHaveBeenLastCalledWith("Assets");
  });
});

describe("AccountRow balance states", () => {
  it("labels a balance the server did not compute instead of showing the zero placeholder", () => {
    const { balanceCell } = renderRow({ balance: null });

    expect(balanceCell).toHaveTextContent("Not computed");
    expect(balanceCell).not.toHaveTextContent("-");
  });

  it("does not treat an uncomputed balance as an emptied account", async () => {
    renderRow({ balance: null });
    expect(
      screen.queryByRole("button", { name: "More actions" }),
    ).not.toBeInTheDocument();
  });

  it("offers Delete but not Close for an unused account whose balance was not computed", async () => {
    const user = userEvent.setup();
    renderRow({ balance: null, entryCount: 0 });

    await user.click(screen.getByRole("button", { name: "More actions" }));

    expect(
      await screen.findByRole("menuitem", { name: "Delete" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Close" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the zero placeholder and Close for a computed zero balance", async () => {
    const user = userEvent.setup();
    const { balanceCell } = renderRow({
      account: "Liabilities:AccountsPayable",
      balance: {},
      entryCount: 6,
    });

    expect(balanceCell).toHaveTextContent(/^-$/);
    await user.click(screen.getByRole("button", { name: "More actions" }));
    expect(
      await screen.findByRole("menuitem", { name: "Close" }),
    ).toBeInTheDocument();
  });

  it("shows a computed nonzero balance and keeps Close blocked", () => {
    const { balanceCell } = renderRow({
      account: "Liabilities:US:Chase:Slate",
      balance: { USD: "-8123.35" },
      entryCount: 528,
    });

    expect(within(balanceCell).getByText("-8123.35 USD")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "More actions" }),
    ).not.toBeInTheDocument();
  });
});
