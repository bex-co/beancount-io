import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  retainSearchParams,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params/schema";
import { createLocalization } from "@/i18n/init";
import en from "@/i18n/locales/en";
import de from "@/i18n/locales/de";
import { LocalizationProvider } from "@/i18n/provider";
import type { NetWorthValuation } from "../../lib/net-worth-valuation";
import { overviewSearchSchema } from "../../search";
import { NetWorthCard } from "../net-worth-card";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

// The card, localized quantities, router links, and Radix focus scope are real.
// Canvas rendering and the ledger read are outside this interaction.
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: () => null,
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { renderCommas: true } } }),
}));

const valuation: NetWorthValuation = {
  holdings: [
    "BTC",
    "ETH",
    "ATOM",
    "AVAX",
    "BNB",
    "DOT",
    "LINK",
    "LTC",
    "SOL",
    "UNI",
    "USDC",
    "USDT",
    "WETH",
  ].map((currency, index) => ({
    currency,
    units: index === 0 ? 0.00012 : index + 1,
    basis: index === 2 ? "cost" : index === 3 ? "notInTotal" : "market",
    priceDate: index === 2 || index === 3 ? null : "2026-05-31",
    stale: index === 1,
    managed: index === 0,
  })),
  staleSince: "2026-05-31",
  costBasis: 100,
  unrealized: 1,
};

async function mountCards(count = 1) {
  const localization = createLocalization();
  const rootRoute = createRootRoute({ component: Outlet });
  const ledgerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
    search: {
      middlewares: [retainSearchParams(["account", "filter", "time"])],
    },
    component: Outlet,
  });
  const overviewRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/",
    validateSearch: (search) => overviewSearchSchema.parse(search),
    component: () => (
      <>
        {Array.from({ length: count }, (_, index) => (
          <NetWorthCard
            key={index}
            data={[{ date: "2026-05-31", balance: { USD: 101 } }]}
            valuation={valuation}
            primaryCurrency="USD"
            ledgerOwner="open_ledger"
            ledgerName="crypto-example"
          />
        ))}
      </>
    ),
  });
  const commoditiesRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/commodities",
    component: () => <h1>Commodities destination</h1>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      ledgerRoute.addChildren([overviewRoute, commoditiesRoute]),
    ]),
    history: createMemoryHistory({
      initialEntries: [
        "/ledger/open_ledger/crypto-example/?account=Assets%3ABrokerage&filter=currency%3AUSD&time=2026-05",
      ],
    }),
  });
  await router.load();
  render(
    <LocalizationProvider localization={localization}>
      <RouterProvider router={router} />
    </LocalizationProvider>,
  );
  await screen.findAllByRole("button", {
    name: new RegExp(en["page.overview.valuationDetails"]),
  });
  return { localization, router };
}

function valuationTrigger(index = 0) {
  return screen.getAllByRole("button", {
    name: new RegExp(en["page.overview.valuationDetails"]),
  })[index];
}

describe("Net Worth valuation accessibility", () => {
  it("names the real dialog from its visible localized title and retains holding details", async () => {
    await mountCards();
    const user = userEvent.setup();
    await user.click(valuationTrigger());

    const dialog = await screen.findByRole("dialog", {
      name: en["page.overview.valuationDetails"],
    });
    const title = within(dialog).getByText(
      en["page.overview.valuationDetails"],
    );
    expect(dialog).toHaveAttribute("aria-labelledby", title.id);
    expect(title.id).not.toBe("");
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(13);
    expect(within(dialog).getByText("0.00012 BTC")).toBeVisible();
    expect(within(dialog).getByText("13 WETH")).toBeVisible();
    expect(
      within(dialog).getByText(en["page.overview.livePrice"]),
    ).toBeVisible();
    expect(
      within(dialog).getByText(en["page.overview.priceNotUpdated"]),
    ).toBeVisible();
    expect(
      within(dialog).getByText(en["page.overview.atCostTag"]),
    ).toBeVisible();
    expect(
      within(dialog).getByText(en["page.overview.notInTotalTag"]),
    ).toBeVisible();
    expect(
      within(dialog).getAllByText(en["page.overview.noPrice"]),
    ).toHaveLength(2);
    expect(
      within(dialog).getAllByText(
        en["page.overview.holdingPrice"].replace("{date}", "May 31, 2026"),
      ),
    ).toHaveLength(11);
  });

  it("includes the native holdings list in both directions of the Radix keyboard loop and restores focus on Escape", async () => {
    await mountCards();
    const user = userEvent.setup();
    const trigger = valuationTrigger();
    trigger.focus();
    await user.keyboard("{Enter}");

    // Find without a name here so this independently catches the tab-order bug.
    const dialog = await screen.findByRole("dialog");
    const list = within(dialog).getByRole("list");
    const updatePrices = within(dialog).getByRole("link", {
      name: en["page.overview.updatePrices"],
    });
    expect(list.tagName).toBe("UL");
    await waitFor(() => expect(list).toHaveFocus());
    expect(list).toHaveClass(
      "focus-visible:ring-2",
      "focus-visible:ring-inset",
      "focus-visible:ring-ring",
    );
    await user.tab();
    expect(updatePrices).toHaveFocus();
    await user.tab({ shift: true });
    expect(list).toHaveFocus();
    await user.tab();
    expect(updatePrices).toHaveFocus();
    await user.tab();
    expect(list).toHaveFocus();
    await user.tab({ shift: true });
    expect(updatePrices).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("updates the open dialog's accessible name with the actual language catalog while retaining its title association", async () => {
    const { localization } = await mountCards();
    const user = userEvent.setup();
    const trigger = valuationTrigger();
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", {
      name: en["page.overview.valuationDetails"],
    });
    const titleId = dialog.getAttribute("aria-labelledby");

    await act(async () => {
      await localization.changeLanguage("de");
    });

    expect(
      screen.getByRole("dialog", {
        name: de["page.overview.valuationDetails"],
      }),
    ).toBe(dialog);
    expect(dialog).toHaveAttribute("aria-labelledby", titleId);
    expect(document.getElementById(titleId!)).toHaveTextContent(
      de["page.overview.valuationDetails"],
    );
    expect(within(dialog).getByText("0,00012 BTC")).toBeVisible();
    expect(
      within(dialog).getByRole("link", {
        name: de["page.overview.updatePrices"],
      }),
    ).toBeVisible();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAccessibleName(
      new RegExp(de["page.overview.valuationDetails"]),
    );
  });

  it("keeps title IDs stable when reopened and distinct between card instances", async () => {
    await mountCards(2);
    const user = userEvent.setup();
    await user.click(valuationTrigger(0));
    const firstId = (await screen.findByRole("dialog")).getAttribute(
      "aria-labelledby",
    );
    expect(firstId).toBeTruthy();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await user.click(valuationTrigger(0));
    expect(await screen.findByRole("dialog")).toHaveAttribute(
      "aria-labelledby",
      firstId,
    );
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await user.click(valuationTrigger(1));
    const secondDialog = await screen.findByRole("dialog", {
      name: en["page.overview.valuationDetails"],
    });
    const secondTitle = within(secondDialog).getByText(
      en["page.overview.valuationDetails"],
    );
    expect(secondDialog).toHaveAttribute("aria-labelledby", secondTitle.id);
    expect(secondTitle.id).not.toBe(firstId);
  });

  it("keeps Update prices navigation in the ledger and retains the selected filters", async () => {
    const { router } = await mountCards();
    const user = userEvent.setup();
    await user.click(valuationTrigger());
    const dialog = await screen.findByRole("dialog");
    const updatePrices = within(dialog).getByRole("link", {
      name: en["page.overview.updatePrices"],
    });
    const destination = new URL(
      updatePrices.getAttribute("href")!,
      location.href,
    );
    expect(destination.pathname).toBe(
      "/ledger/open_ledger/crypto-example/commodities",
    );
    expect(Object.fromEntries(destination.searchParams)).toEqual({
      account: "Assets:Brokerage",
      filter: "currency:USD",
      time: "2026-05",
    });
    await user.click(updatePrices);
    await screen.findByRole("heading", { name: "Commodities destination" });
    expect(router.state.location.pathname).toBe(destination.pathname);
    expect(router.state.location.search).toEqual({
      account: "Assets:Brokerage",
      filter: "currency:USD",
      time: "2026-05",
    });
  });
});
