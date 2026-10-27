import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LedgerProvider } from "@/common/providers/ledger-provider";
import {
  BudgetInterval,
  GetLedgerCurrenciesDocument,
  GetLedgerIntervalTotalsDocument,
  type GetLedgerQuery,
} from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { BudgetChartCard } from "../budget-chart-card";
import type { BudgetGroup } from "../types";

/**
 * w4/1109: at 390px a long account path sized the Budget card header's
 * grid column to 462px inside a 372px card, clipping the title and the
 * Update action. CardHeader is a grid, and a grid item's default
 * `min-width: auto` admits its content's intrinsic width — so the nested
 * `min-w-0` title container and the title's `truncate` never engaged.
 * jsdom cannot measure layout, so this asserts the shrink contract the
 * layout depends on (as w4/150 does), on the real card.
 */

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: () => [vi.fn(), { loading: false }],
  useQuery: (document: unknown) => {
    if (document === GetLedgerIntervalTotalsDocument) {
      return { data: { getLedgerIntervalTotals: [] }, loading: false };
    }
    if (document === GetLedgerCurrenciesDocument) {
      return { data: { getLedgerCurrencies: ["USD"] }, loading: false };
    }
    throw new Error("Unexpected budget query");
  },
}));
vi.mock("@/common/hooks/use-root-context", () => ({
  useRootContext: () => ({ userProfile: { username: "alice" } }),
}));
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: () => null,
}));

const LONG_ACCOUNT = "Expenses:Qa-20261026-Budget-Account-LongName-390";

const ledgerData = {
  id: "alice/books",
  name: "books",
  permissions: { admin: true, push: true, pull: true },
  options: { operatingCurrency: ["USD"], renderCommas: true },
} as GetLedgerQuery["getLedger"];

function group(account: string): BudgetGroup {
  const entry = {
    date: "2026-10-01",
    amount: "100 USD",
    interval: "monthly",
    entry_hash: account,
  };
  return {
    account,
    currency: "USD",
    interval: BudgetInterval.Monthly,
    ...entry,
    budgetHistory: [entry],
  };
}

async function mountCard(account: string) {
  const localization = createLocalization();
  await localization.changeLanguage("en");
  render(
    <LocalizationProvider localization={localization}>
      <LedgerProvider
        ledgerOwner="alice"
        ledgerName="books"
        ledgerData={ledgerData}
      >
        <BudgetChartCard
          group={group(account)}
          ledgerId="alice/books"
          conversion="AT_COST"
          primaryCurrency="USD"
          onDelete={vi.fn()}
        />
      </LedgerProvider>
    </LocalizationProvider>,
  );
}

afterEach(cleanup);

describe("Budget card header containment (w4/1109)", () => {
  it.each([LONG_ACCOUNT, "Expenses:Qa-20261026"])(
    "lets the header grid item shrink so the title can truncate (%s)",
    async (account) => {
      await mountCard(account);
      const title = screen.getByText(account);
      const header = title.closest('[data-slot="card-header"]')!;
      // The header's direct grid child is the flex wrapper; it is the item
      // whose automatic minimum admitted the long name's intrinsic width.
      const gridItem = header.firstElementChild!;
      expect(gridItem.className.split(/\s+/)).toContain("min-w-0");
      // The nested title container still shrinks, and the title truncates
      // visually while keeping the full account path as its text.
      expect(title.parentElement!.className.split(/\s+/)).toContain("min-w-0");
      expect(title.className.split(/\s+/)).toContain("truncate");
      expect(title).toHaveTextContent(account);
    },
  );

  it("keeps the Update action named for the full long account", async () => {
    await mountCard(LONG_ACCOUNT);
    const update = screen.getByRole("button", {
      name: `Update budget for ${LONG_ACCOUNT} (USD)`,
    });
    // The action itself does not shrink; only its shrinkable row does.
    expect(update.className.split(/\s+/)).toContain("shrink-0");
  });
});
