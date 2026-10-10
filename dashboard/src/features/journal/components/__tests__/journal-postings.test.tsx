import type { ComponentProps } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import {
  DirectiveType,
  type JournalPosting,
  type JournalTransaction,
} from "@/common/types/journal";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import type { SupportedLanguage } from "@/i18n/config";
import { JournalPostings } from "../journal-postings";
import en from "../../locales/en";
import de from "../../locales/de";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");

// Actual reproduced public posting shapes, rendered in synthetic transaction
// shells: the posting renderer does not calculate transaction totals.
const bitcoinDisposal: JournalPosting = {
  account: "Assets:Crypto:Binance:BTC",
  units: { number: "-0.20", currency: "BTC" },
  cost: {
    number: "64504.60",
    currency: "USD",
    date: "2026-08-17",
    label: null,
  },
  price: null,
  flag: null,
};
const veaDisposal: JournalPosting = {
  account: "Assets:US:ETrade:VEA",
  units: { number: "-4", currency: "VEA" },
  cost: {
    number: "148.59",
    currency: "USD",
    date: "2017-03-19",
    label: null,
  },
  price: { number: "145.72", currency: "USD" },
  flag: null,
};

async function setup(
  postings: JournalPosting[],
  language: SupportedLanguage = "en",
  overrides: Partial<
    Omit<ComponentProps<typeof JournalPostings>, "directive">
  > = {},
) {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const props = {
    showPostings: true,
    ledgerOwner: "open_ledger",
    ledgerName: "crypto-example",
    ...overrides,
  };
  const directive: JournalTransaction = {
    directive_type: DirectiveType.TRANSACTION,
    entry_hash: "synthetic-disposal",
    date: "2026-08-27",
    flag: "*",
    narration: "Synthetic posting display",
    payee: null,
    postings,
    tags: [],
    links: [],
  };
  const root = createRootRoute({
    component: () => (
      <LocalizationProvider localization={localization}>
        <Outlet />
      </LocalizationProvider>
    ),
  });
  const journal = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/journal",
    component: () => <JournalPostings directive={directive} {...props} />,
  });
  const account = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
    component: () => <h1>Account details</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([journal, account]),
    history: createMemoryHistory({
      initialEntries: [
        `/ledger/open_ledger/${props.ledgerName ?? "crypto-example"}/journal`,
      ],
    }),
  });
  await router.load();
  const view = render(<RouterProvider router={router} />);
  await act(async () => {
    await router.load();
  });
  return { ...view, router, user: userEvent.setup() };
}

// jsdom does not apply Tailwind breakpoints. These assertions document the
// responsive branches; native browser checks establish computed visibility.
function expectNarrowDetail(text: string) {
  const detail = screen.getByText(text, { exact: true });
  expect(detail).toHaveClass("block", "sm:hidden");
  return detail;
}

function expectDesktopAmount(text: string) {
  expect(screen.getByText(text, { exact: true })).toHaveClass(
    "hidden",
    "sm:block",
  );
}

describe("JournalPostings cost and price details", () => {
  it("retains the cost-only disposal beside quantity and its actual account navigation", async () => {
    const { user, router } = await setup([bitcoinDisposal]);
    expectNarrowDetail("Cost: 64504.60 USD");
    expectDesktopAmount("64504.60 USD");
    expect(screen.queryByText(/^Price:/)).not.toBeInTheDocument();
    expect(screen.getAllByText("-0.20 BTC", { exact: true })).toHaveLength(2);
    const link = screen.getByRole("link", { name: bitcoinDisposal.account });
    const target = `/ledger/open_ledger/crypto-example/account/${bitcoinDisposal.account}`;
    expect(decodeURIComponent(link.getAttribute("href") ?? "")).toBe(target);
    await user.click(link);
    await screen.findByRole("heading", { name: "Account details" });
    expect(decodeURIComponent(router.state.location.pathname)).toBe(target);
    await act(async () => {
      router.history.back();
      await router.load();
    });
    await waitFor(() => expectNarrowDetail("Cost: 64504.60 USD"));
    expect(
      screen.getByRole("link", { name: bitcoinDisposal.account }),
    ).toBeInTheDocument();
  });

  it.each([
    ["en", en],
    ["de", de],
  ] as const)(
    "labels both cost and price distinctly in actual %s translations",
    async (language, labels) => {
      await setup([veaDisposal], language, { ledgerName: "example" });
      const cost = expectNarrowDetail(
        `${labels["journal.postingCost"].message}: 148.59 USD`,
      );
      const price = expectNarrowDetail(
        `${labels["journal.price"].message}: 145.72 USD`,
      );
      expect(cost).not.toBe(price);
      const row = screen.getByRole("listitem");
      expect(row).toContainElement(cost);
      expect(row).toContainElement(price);
      expect(
        within(row).getByRole("link", { name: veaDisposal.account }),
      ).toBeInTheDocument();
      expect(screen.getAllByText("-4 VEA", { exact: true })).toHaveLength(2);
      expectDesktopAmount("148.59 USD");
      expectDesktopAmount("145.72 USD");
    },
  );

  it("keeps absent and null fields absent and renders a plain account without ledger context", async () => {
    await setup(
      [
        {
          account: "Assets:Cash:USD",
          units: { number: "12.00", currency: "USD" },
        },
        {
          account: "Expenses:Fees",
          units: { number: "0.0040", currency: "USD" },
          cost: null,
          price: null,
        },
      ],
      "en",
      { ledgerOwner: undefined, ledgerName: undefined },
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByText("Assets:Cash:USD", { exact: true }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^(Cost|Price):/)).not.toBeInTheDocument();
    expect(screen.getAllByText("12.00 USD", { exact: true })).toHaveLength(2);
    expect(screen.getAllByText("0.0040 USD", { exact: true })).toHaveLength(2);
  });

  it("retains zero-valued cost and price objects, decimal precision, signs and posting flags", async () => {
    await setup([
      {
        account: "Assets:Crypto:Wallet:BTC",
        units: { number: "-0.00020000", currency: "BTC" },
        cost: {
          number: "0.00000000",
          currency: "USD",
          date: "2026-08-17",
          label: null,
        },
        price: { number: "0.000000000000", currency: "USD" },
        flag: "!",
      },
    ]);
    expectNarrowDetail("Cost: 0.00000000 USD");
    expectNarrowDetail("Price: 0.000000000000 USD");
    expectDesktopAmount("0.00000000 USD");
    expectDesktopAmount("0.000000000000 USD");
    expect(
      screen.getAllByText("-0.00020000 BTC", { exact: true }),
    ).toHaveLength(2);
    expect(screen.getByText("!", { exact: true })).toBeInTheDocument();
  });

  it("withholds all posting details when disabled or when there are no postings", async () => {
    const hidden = await setup([bitcoinDisposal], "en", {
      showPostings: false,
    });
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Cost:/)).not.toBeInTheDocument();
    hidden.unmount();
    await setup([]);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
