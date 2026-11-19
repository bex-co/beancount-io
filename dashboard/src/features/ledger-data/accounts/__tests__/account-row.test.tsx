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
  return { balanceCell: cells[3]! };
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
  it("labels a balance the server did not compute instead of showing a zero", () => {
    const { balanceCell } = renderRow({ balance: null });

    expect(balanceCell).toHaveTextContent("Not computed");
    expect(balanceCell).not.toHaveTextContent("0");
  });

  async function openMenu(account: string) {
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: `Actions for ${account}` }),
    );
    return {
      close: await screen.findByRole("menuitem", { name: /^Close/ }),
      remove: screen.getByRole("menuitem", { name: /^Delete/ }),
    };
  }

  it("does not treat an uncomputed balance as an emptied account", async () => {
    renderRow({ balance: null });
    const { close, remove } = await openMenu("Income:US:Hoogle:Salary");
    // Both stay in the menu, greyed, each with its reason.
    expect(close).toHaveAttribute("aria-disabled", "true");
    expect(close).toHaveTextContent(
      "Only an account with a zero balance can be closed.",
    );
    expect(remove).toHaveAttribute("aria-disabled", "true");
    expect(remove).toHaveTextContent(
      "Only an account with no postings can be deleted.",
    );
  });

  it("offers Delete but not Close for an unused account whose balance was not computed", async () => {
    renderRow({ balance: null, entryCount: 0 });
    const { close, remove } = await openMenu("Income:US:Hoogle:Salary");
    expect(remove).not.toHaveAttribute("aria-disabled");
    expect(close).toHaveAttribute("aria-disabled", "true");
  });

  it("shows a computed zero balance as 0 and offers Close", async () => {
    const { balanceCell } = renderRow({
      account: "Liabilities:AccountsPayable",
      balance: {},
      entryCount: 6,
    });

    expect(balanceCell).toHaveTextContent(/^0$/);
    const { close } = await openMenu("Liabilities:AccountsPayable");
    expect(close).not.toHaveAttribute("aria-disabled");
    expect(close).toHaveTextContent(/^Close Account$/);
  });

  it("shows a computed nonzero balance and keeps Close blocked", async () => {
    const { balanceCell } = renderRow({
      account: "Liabilities:US:Chase:Slate",
      balance: { USD: "-8123.35" },
      entryCount: 528,
    });

    expect(within(balanceCell).getByText("-8,123.35 USD")).toBeInTheDocument();
    const { close } = await openMenu("Liabilities:US:Chase:Slate");
    expect(close).toHaveAttribute("aria-disabled", "true");
  });
});

describe("AccountRow for a parent account", () => {
  it("shows what its sub-accounts hold when it holds nothing itself, and says so", () => {
    render(
      <table>
        <tbody>
          <AccountRow
            account={{
              account: "Assets:US:BofA",
              openedAt: "2023-01-01",
              closedAt: null,
              balance: {},
              entryCount: 0,
              entryHash: "bofa",
              closeEntryHash: null,
            }}
            subtotal={{ USD: "2757.51" }}
            onAccountClick={vi.fn()}
            onDelete={vi.fn()}
            onClose={vi.fn()}
          />
        </tbody>
      </table>,
    );
    const balanceCell = screen.getAllByRole("cell")[3]!;
    expect(balanceCell).toHaveTextContent("2,757.51 USD");
    expect(balanceCell).toHaveTextContent("with sub-accounts");
    expect(balanceCell).not.toHaveTextContent(/^0$/);
  });
});
