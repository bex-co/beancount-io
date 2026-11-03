import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LedgerProvider } from "@/common/providers/ledger-provider";
import {
  BudgetInterval,
  GetLedgerCurrenciesDocument,
  GetLedgerIntervalTotalsDocument,
  LedgerEntryType,
  type GetLedgerQuery,
} from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { BudgetChartCard } from "../budget-chart-card";
import type { BudgetGroup } from "../types";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: () => [mutate, { loading: false }],
  useQuery: (document: unknown) => {
    if (document === GetLedgerIntervalTotalsDocument) {
      return { data: { getLedgerIntervalTotals: [] }, loading: false };
    }
    if (document === GetLedgerCurrenciesDocument) {
      return { data: { getLedgerCurrencies: ["USD", "EUR"] }, loading: false };
    }
    throw new Error("Unexpected budget query");
  },
}));
vi.mock("@/common/hooks/use-root-context", () => ({
  useRootContext: () => ({ userProfile: { username: "alice" } }),
}));
// Keep the card, translated controls, form, comboboxes and Radix dialog real.
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: () => null,
}));

const targets = [
  {
    account: "Expenses:Groceries",
    currency: "USD",
    interval: BudgetInterval.Monthly,
  },
  {
    account: "Expenses:Groceries",
    currency: "EUR",
    interval: BudgetInterval.Quarterly,
  },
  {
    account: "Expenses:Rent",
    currency: "USD",
    interval: BudgetInterval.Yearly,
  },
];

const ledgerData = {
  id: "alice/books",
  name: "books",
  permissions: { admin: true, push: true, pull: true },
  options: { operatingCurrency: ["USD"], renderCommas: true },
} as GetLedgerQuery["getLedger"];

function group(target: (typeof targets)[number]): BudgetGroup {
  const entry = {
    date: "2025-01-01",
    amount: `100 ${target.currency}`,
    interval: target.interval.toLowerCase(),
    entry_hash: `${target.account}-${target.currency}`,
  };
  return { ...target, ...entry, budgetHistory: [entry] };
}

async function mountCards(language: "en" | "de") {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  render(
    <LocalizationProvider localization={localization}>
      <LedgerProvider
        ledgerOwner="alice"
        ledgerName="books"
        ledgerData={ledgerData}
      >
        {targets.map((target) => (
          <BudgetChartCard
            key={`${target.account}-${target.currency}`}
            group={group(target)}
            ledgerId="alice/books"
            conversion="AT_COST"
            primaryCurrency="USD"
            onDelete={vi.fn()}
          />
        ))}
      </LedgerProvider>
    </LocalizationProvider>,
  );
  return localization.i18n;
}

const updateName = (
  language: "en" | "de",
  account: string,
  currency: string,
) =>
  language === "de"
    ? `Budget für ${account} (${currency}) aktualisieren`
    : `Update budget for ${account} (${currency})`;

beforeEach(() => {
  mutate.mockReset();
  mutate.mockResolvedValue({ data: { bulkEntries: { success: true } } });
});
afterEach(cleanup);

describe("Budget update triggers identify their card", () => {
  it.each(["en", "de"] as const)(
    "names each account and currency in %s",
    async (language) => {
      const i18n = await mountCards(language);
      expect(
        screen.getAllByText(i18n.t("page.budget.budgetAddEntry")),
      ).toHaveLength(3);
      const triggers = targets.map(({ account, currency }) =>
        screen.getByRole("button", {
          name: updateName(language, account, currency),
        }),
      );
      expect(new Set(triggers).size).toBe(3);
      for (const trigger of triggers) {
        expect(trigger).toHaveTextContent(i18n.t("page.budget.budgetAddEntry"));
        expect(trigger.querySelector("svg")).not.toBeNull();
      }
    },
  );

  it.each([
    { language: "en", close: "Cancel" },
    { language: "en", close: "Escape" },
    { language: "de", close: "Cancel" },
    { language: "de", close: "Escape" },
  ] as const)(
    "returns focus to the EUR trigger after $close in $language",
    async ({ language, close }) => {
      const user = userEvent.setup();
      const i18n = await mountCards(language);
      const opener = screen.getByRole("button", {
        name: updateName(language, "Expenses:Groceries", "EUR"),
      });
      opener.focus();
      await user.keyboard("{Enter}");
      const dialog = await screen.findByRole("dialog", {
        name: i18n.t("page.budget.budgetAddBudget"),
      });
      const account = within(dialog).getByRole("textbox", {
        name: i18n.t("page.accounts.account"),
      });
      expect(account).toHaveValue("Expenses:Groceries");
      expect(account).toBeDisabled();
      expect(
        within(dialog).getByRole("combobox", {
          name: i18n.t("page.budget.budgetCurrency"),
        }),
      ).toHaveValue("EUR");
      expect(
        within(dialog).getByRole("combobox", {
          name: i18n.t("page.budget.budgetInterval"),
        }),
      ).toHaveTextContent(i18n.t("page.budget.budgetIntervalQuarterly"));

      if (close === "Escape") {
        await user.keyboard("{Escape}");
      } else {
        await user.click(
          within(dialog).getByRole("button", { name: i18n.t("common.cancel") }),
        );
      }
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      await waitFor(() => expect(opener).toHaveFocus());
      expect(mutate).not.toHaveBeenCalled();
    },
  );

  it.each(targets)(
    "keeps $account ($currency) as the mutation target",
    async ({ account, currency, interval }) => {
      const user = userEvent.setup();
      const i18n = await mountCards("en");
      const opener = screen.getByRole("button", {
        name: updateName("en", account, currency),
      });
      await user.click(opener);
      const dialog = await screen.findByRole("dialog");
      await user.type(
        within(dialog).getByRole("spinbutton", {
          name: i18n.t("page.budget.budgetAmount"),
        }),
        "125.5",
      );
      const submit = within(dialog).getByRole("button", {
        name: i18n.t("page.budget.budgetAddBudget"),
      });
      await waitFor(() => expect(submit).toBeEnabled());
      await user.click(submit);
      await waitFor(() => expect(mutate).toHaveBeenCalledOnce());
      expect(mutate.mock.calls[0][0].variables).toEqual({
        ledgerId: "alice/books",
        // Every entry save is retry-safe (w3/m61).
        requestId: expect.any(String),
        entries: [
          {
            type: LedgerEntryType.Budget,
            budget: {
              date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
              account,
              interval,
              amount: { number: "125.5", currency },
            },
          },
        ],
      });
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      await waitFor(() => expect(opener).toHaveFocus());
    },
  );
});
