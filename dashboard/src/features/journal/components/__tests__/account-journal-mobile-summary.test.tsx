import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DirectiveType, type JournalTransaction } from "@/common/types/journal";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { formatSourceDecimal } from "@/common/lib/format/format-number";
import { JournalTable } from "../journal-table";
import en from "../../locales/en";
import fa from "../../locales/fa";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.unmock("@/i18n");

afterEach(cleanup);

const directive: JournalTransaction = {
  directive_type: DirectiveType.TRANSACTION,
  entry_hash: "synthetic-compact-account-journal",
  date: "2026-10-15",
  flag: "*",
  payee: "QA Synthetic Payroll",
  narration: "Synthetic account movement",
  tags: [],
  links: [],
  postings: [
    {
      account: "Assets:Checking",
      units: { number: "-0.00020000", currency: "BTC" },
    },
    {
      account: "Assets:Checking:EUR",
      units: { number: "4.2500", currency: "EUR" },
    },
    {
      account: "Expenses:Crypto",
      units: { number: "0.00020000", currency: "BTC" },
    },
    {
      account: "Equity:OpeningBalances",
      units: { number: "-4.2500", currency: "EUR" },
    },
  ],
};
const item = {
  directive,
  change: { USD: "-33.7100", EUR: "12.3400" },
  balance: { USD: "6377.230000", EUR: "0.00000000" },
};

async function setup(language: "en" | "fa", isAccountJournal = true) {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const onEntryClick = vi.fn();
  const root = createRootRoute({
    component: () => (
      <LocalizationProvider localization={localization}>
        <div lang={language} dir={localization.i18n.dir()}>
          <Outlet />
        </div>
      </LocalizationProvider>
    ),
  });
  const journal = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/journal",
    component: () => (
      <JournalTable
        data={[item]}
        isAccountJournal={isAccountJournal}
        accountName="Assets:Checking"
        showMetadata={false}
        showPostings={false}
        ledgerOwner="alice"
        ledgerName="example"
        onEntryClick={onEntryClick}
      />
    ),
  });
  const account = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
    component: () => <h1>Account destination</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([journal, account]),
    history: createMemoryHistory({
      initialEntries: ["/ledger/alice/example/journal"],
    }),
    isServer: false,
  });
  await router.load();
  render(<RouterProvider router={router} />);
  const table = await screen.findByRole("table");
  return { table, router, onEntryClick, user: userEvent.setup() };
}

function columnCell(table: HTMLElement, row: HTMLElement, name: string) {
  const headers = within(table).getAllByRole("columnheader");
  const header = within(table).getByRole("columnheader", { name, exact: true });
  expect(header).toHaveAttribute("scope", "col");
  return within(row).getAllByRole("cell")[headers.indexOf(header)];
}

// Amounts read as the account page's period table writes them (w2/137); the
// subject here is where they appear and that each stays isolated.
function shown(language: "en" | "fa", number: string, currency: string) {
  return `${formatSourceDecimal(number, true, language)} ${currency}`;
}

function amounts(container: HTMLElement) {
  return Array.from(container.querySelectorAll("bdi")).map((run) => {
    expect(run).toHaveAttribute("dir", "ltr");
    return run.textContent;
  });
}

describe("compact account-journal amounts", () => {
  it.each(["en", "fa"] as const)(
    "%s keeps change and balance available before expanding postings while preserving desktop Units and navigation",
    async (language) => {
      const { table, router, onEntryClick, user } = await setup(language);
      const labels = language === "en" ? en : fa;
      const row = within(table).getAllByRole("row")[1];
      const description = columnCell(
        table,
        row,
        labels["journal.payeeNarration"].message,
      );
      const compact = description.querySelector("dl");
      expect(compact).not.toBeNull();
      expect(compact).toHaveClass("sm:hidden");
      const changeLabel = within(compact!).getByText(
        labels["journal.change"].message,
        { exact: true },
      );
      const balanceLabel = within(compact!).getByText(
        labels["journal.balanceHeader"].message,
        { exact: true },
      );
      expect(changeLabel.tagName).toBe("DT");
      expect(balanceLabel.tagName).toBe("DT");
      const change = changeLabel.nextElementSibling as HTMLElement;
      const balance = balanceLabel.nextElementSibling as HTMLElement;
      expect(change.tagName).toBe("DD");
      expect(balance.tagName).toBe("DD");
      const changeAmounts = [
        shown(language, "-33.7100", "USD"),
        shown(language, "12.3400", "EUR"),
      ];
      const balanceAmounts = [
        shown(language, "6377.230000", "USD"),
        shown(language, "0.00000000", "EUR"),
      ];
      const unitAmounts = [
        shown(language, "-0.00020000", "BTC"),
        shown(language, "4.2500", "EUR"),
      ];
      expect(amounts(change)).toEqual(changeAmounts);
      expect(amounts(balance)).toEqual(balanceAmounts);
      for (const unit of unitAmounts)
        expect(compact).not.toHaveTextContent(unit);
      expect(changeLabel.closest("bdi")).toBeNull();
      expect(changeLabel.closest("[dir]")).toHaveAttribute(
        "dir",
        language === "fa" ? "rtl" : "ltr",
      );
      expect(screen.queryByRole("list")).not.toBeInTheDocument();

      const unitsColumn = columnCell(
        table,
        row,
        labels["journal.unitsHeader"].message,
      );
      const changeColumn = columnCell(
        table,
        row,
        labels["journal.change"].message,
      );
      const balanceColumn = columnCell(
        table,
        row,
        labels["journal.balanceHeader"].message,
      );
      // jsdom exposes both branches; native compiled-CSS checks establish which is visible.
      for (const cell of [unitsColumn, changeColumn, balanceColumn])
        expect(cell).toHaveClass("hidden", "sm:table-cell");
      expect(amounts(unitsColumn)).toEqual(unitAmounts);
      expect(amounts(changeColumn)).toEqual(changeAmounts);
      expect(amounts(balanceColumn)).toEqual(balanceAmounts);

      const date = within(row).getByText("2026-10-15", { exact: true });
      await user.click(date);
      expect(onEntryClick).toHaveBeenCalledExactlyOnceWith(directive, date);
      const toggles = within(row).getAllByRole("button", { expanded: false });
      const mobileToggle = toggles.find((button) =>
        button.closest("td")?.classList.contains("sm:hidden"),
      )!;
      mobileToggle.focus();
      await user.keyboard("{Enter}");
      const targetId = mobileToggle.getAttribute("aria-controls");
      expect(targetId).toBeTruthy();
      const postings = document.getElementById(targetId!)!;
      expect(within(postings).getAllByRole("listitem")).toHaveLength(4);
      expect(onEntryClick).toHaveBeenCalledTimes(1);
      await user.click(
        within(postings).getByRole("link", { name: "Expenses:Crypto" }),
      );
      await screen.findByRole("heading", { name: "Account destination" });
      expect(decodeURIComponent(router.state.location.pathname)).toBe(
        "/ledger/alice/example/account/Expenses:Crypto",
      );
      await act(async () => {
        router.history.back();
        await router.load();
      });
      await waitFor(() =>
        expect(screen.getByRole("table")).toHaveAccessibleName(
          labels["journal.accountJournalTable"].message,
        ),
      );
      expect(
        screen.getByText(labels["journal.change"].message, { selector: "dt" }),
      ).toBeInTheDocument();
    },
  );

  it("keeps ordinary Journal rows free of account-only summaries and numeric columns", async () => {
    const { table } = await setup("en", false);
    expect(table.querySelector("dl")).toBeNull();
    for (const name of ["Units", "Change", "Balance"])
      expect(
        within(table).queryByRole("columnheader", { name, exact: true }),
      ).not.toBeInTheDocument();
    expect(within(table).getByText("QA Synthetic Payroll")).toBeInTheDocument();
    expect(
      within(table).getAllByRole("button", { expanded: false }),
    ).toHaveLength(2);
    expect(
      within(table).queryByText(shown("en", "6377.230000", "USD")),
    ).not.toBeInTheDocument();
  });
});
