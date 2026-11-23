import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderLedgerNavigation } from "@/test/render-ledger-navigation";
import { AccountRow } from "../index";
import type { AccountDirective } from "../types";

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: true }),
}));

async function renderRow(overrides: Partial<AccountDirective>) {
  await renderLedgerNavigation(
    <table>
      <tbody>
        <AccountRow
          ledgerOwner="alice"
          ledgerName="books"
          account={{
            account: "Income:US:Hoogle:Salary",
            openedAt: "2015-01-01",
            closedAt: null,
            balance: null,
            entryCount: 71,
            referenceCount: 71,
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

    const { router } = await renderLedgerNavigation(
      <table>
        <tbody>
          <AccountRow
            ledgerOwner="alice"
            ledgerName="books"
            account={{
              account: "Assets:Bank:Checking",
              openedAt: "2024-01-01",
              closedAt: null,
              balance: { USD: "100.00" },
              entryCount: 1,
              referenceCount: 1,
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
      .getByRole("link", { name: "Assets:Bank:Checking" })
      .closest("tr");
    expect(accountRow).not.toHaveAttribute("role");
    expect(accountRow).not.toHaveAttribute("tabindex");
    expect(accountRow?.querySelectorAll("td").length).toBeGreaterThan(0);

    fireEvent.click(accountRow!, { metaKey: true });
    expect(onAccountClick).not.toHaveBeenCalled();
    await user.click(accountRow!);
    expect(onAccountClick).toHaveBeenCalledTimes(1);
    expect(onAccountClick).toHaveBeenLastCalledWith("Assets:Bank:Checking");

    await user.click(screen.getByRole("link", { name: "Assets" }));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        "/ledger/alice/books/account/Assets",
      ),
    );
    expect(onAccountClick).toHaveBeenCalledTimes(1);
  });
});

describe("AccountRow balance states", () => {
  it("labels a balance the server did not compute instead of showing a zero", async () => {
    const { balanceCell } = await renderRow({ balance: null });

    expect(balanceCell).toHaveTextContent("Not computed");
    expect(balanceCell).not.toHaveTextContent("0");
  });

  it.each([
    {
      account: "Assets:Qa:Frozen",
      balance: { USD: "10.00" },
      shown: "10.00 USD",
    },
    { account: "Assets:Qa:Retired", balance: {}, shown: "0" },
  ])(
    "shows the computed balance for closed account $account",
    async ({ account, balance, shown }) => {
      const { balanceCell } = await renderRow({
        account,
        balance,
        closedAt: "2024-05-01",
        closeEntryHash: "closed",
      });

      expect(screen.getByText("Closed", { exact: true })).toBeInTheDocument();
      expect(balanceCell.textContent).toBe(shown);
    },
  );

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
    await renderRow({ balance: null });
    const { close, remove } = await openMenu("Income:US:Hoogle:Salary");
    // Both stay in the menu, greyed, each with its reason.
    expect(close).toHaveAttribute("aria-disabled", "true");
    expect(close).toHaveTextContent(
      "Only an account with a zero balance can be closed.",
    );
    expect(remove).toHaveAttribute("aria-disabled", "true");
    expect(remove).toHaveTextContent(
      "An account can only be deleted if no other entry refers to it.",
    );
  });

  it("offers Delete but not Close for an unused account whose balance was not computed", async () => {
    await renderRow({ balance: null, entryCount: 0, referenceCount: 0 });
    const { close, remove } = await openMenu("Income:US:Hoogle:Salary");
    expect(remove).not.toHaveAttribute("aria-disabled");
    expect(close).toHaveAttribute("aria-disabled", "true");
  });

  it("shows a computed zero balance as 0 and offers Close", async () => {
    const { balanceCell } = await renderRow({
      account: "Liabilities:AccountsPayable",
      balance: {},
      entryCount: 6,
      referenceCount: 6,
    });

    expect(balanceCell).toHaveTextContent(/^0$/);
    const { close } = await openMenu("Liabilities:AccountsPayable");
    expect(close).not.toHaveAttribute("aria-disabled");
    expect(close).toHaveTextContent(/^Close Account$/);
  });

  it("shows a computed nonzero balance and keeps Close blocked", async () => {
    const { balanceCell } = await renderRow({
      account: "Liabilities:US:Chase:Slate",
      balance: { USD: "-8123.35" },
      entryCount: 528,
      referenceCount: 528,
    });

    expect(within(balanceCell).getByText("-8,123.35 USD")).toBeInTheDocument();
    const { close } = await openMenu("Liabilities:US:Chase:Slate");
    expect(close).toHaveAttribute("aria-disabled", "true");
  });
});

describe("AccountRow for a parent account", () => {
  it("shows what its sub-accounts hold when it holds nothing itself, and says so", async () => {
    await renderLedgerNavigation(
      <table>
        <tbody>
          <AccountRow
            ledgerOwner="alice"
            ledgerName="books"
            account={{
              account: "Assets:US:BofA",
              openedAt: "2023-01-01",
              closedAt: null,
              balance: {},
              entryCount: 0,
              referenceCount: 0,
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
