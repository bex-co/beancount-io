import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommoditiesPage from "../index";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "demo", ledgerName: "books" }),
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "Demo Books" }),
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: true }),
}));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));
// jsdom has no canvas; the chart's presence is what these cases observe.
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: () => <div data-testid="price-chart" />,
}));

function source(overrides: Record<string, unknown>) {
  return {
    __typename: "ManagedPriceSource",
    url: "https://beancount.io/prices/ETH-USD",
    alias: "ETH-USD",
    commodity: "ETH",
    quote: "USD",
    source: "coinbase",
    observedAt: "2026-10-20T08:00:00.000Z",
    nextRefreshAt: "2026-10-20T09:00:00.000Z",
    freshness: "stale",
    error: "controlled prior error",
    ...overrides,
  };
}

// Each read of the charts returns one more dated price than the last, so a
// landed read is visible in the card's data-point count.
function commodities(read: number) {
  return [
    {
      __typename: "CommodityPairWithPrices",
      base: "ETH",
      quote: "USD",
      prices: Array.from({ length: read + 1 }, (_, day) => ({
        __typename: "PricePoint",
        date: `2026-10-${String(day + 10).padStart(2, "0")}`,
        value: String(2400 + day),
      })),
    },
  ];
}

/**
 * A browser-local ledger: the refresh acknowledgement and each commodity read
 * settle independently. `reads` lists the outcome of each commodity read in
 * turn; reads past its end succeed.
 */
function renderPage({
  ack,
  reads,
  held,
}: {
  ack: boolean;
  reads: boolean[];
  /** When given, the refresh waits for `held.release()` to settle. */
  held?: { release?: () => void };
}) {
  const calls = { refreshes: 0, commodityReads: 0 };
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          // Settle after the request, as a network transport does. Nothing is
          // returned to the Observable, which would take it as a teardown.
          const reply = (data: object) => {
            setTimeout(() => {
              observer.next({ data });
              observer.complete();
            });
          };
          const fail = () => {
            setTimeout(() => observer.error(new TypeError("Failed to fetch")));
          };
          switch (operation.operationName) {
            case "GetLedgerManagedPrices":
              return reply({ getLedgerManagedPrices: [source({})] });
            case "RefreshLedgerManagedPrices": {
              calls.refreshes += 1;
              const settle = () =>
                ack
                  ? reply({
                      refreshLedgerManagedPrices: [
                        source({
                          freshness: "recent",
                          observedAt: "2026-10-22T12:00:00.000Z",
                          nextRefreshAt: "2026-10-22T13:00:00.000Z",
                          error: null,
                        }),
                      ],
                    })
                  : fail();
              if (held) held.release = settle;
              else settle();
              return;
            }
            case "GetLedgerCommodities":
              if (reads[calls.commodityReads++] === false) return fail();
              return reply({
                getLedgerCommodities: commodities(calls.commodityReads),
              });
          }
        }),
    ),
  });
  render(
    <ApolloProvider client={client}>
      <CommoditiesPage />
    </ApolloProvider>,
  );
  return calls;
}

const dataPoints = (count: number) => `Price history with ${count} data points`;

async function refreshWithKeyboard() {
  // The initial view settles before the action, so the follow-up read is its own.
  expect(await screen.findByText(dataPoints(2))).toBeInTheDocument();
  const button = await screen.findByRole("button", { name: "Refresh prices" });
  button.focus();
  await userEvent.keyboard("{Enter}");
  return button;
}

beforeEach(() => vi.clearAllMocks());

/** Managed-price refresh acknowledgement vs. the chart read after it (w4/332). */
describe("Commodities managed-price refresh", () => {
  it("keeps an acknowledged refresh and the shown charts when only the chart read fails", async () => {
    const calls = renderPage({ ack: true, reads: [true, false, false] });
    const refresh = await refreshWithKeyboard();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Prices refreshed, but the charts could not be reloaded.",
    );
    expect(screen.getByText("Up to date")).toBeInTheDocument();
    expect(screen.queryByText(/controlled prior error/)).toBeNull();
    expect(screen.getByText(dataPoints(2))).toBeInTheDocument();
    expect(screen.getByTestId("price-chart")).toBeInTheDocument();
    expect(screen.queryByText("Failed to Load Commodities")).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
    expect(refresh).toBeEnabled();
    expect(calls).toEqual({ refreshes: 1, commodityReads: 2 });

    // Reload charts repeats the read alone; a failed one keeps the alert and
    // hands focus back for another try.
    const reload = within(alert).getByRole("button", { name: "Reload charts" });
    reload.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(calls.commodityReads).toBe(3));
    await waitFor(() => expect(reload).toHaveFocus());
    expect(screen.getByRole("alert")).toBe(alert);

    await userEvent.keyboard("{Enter}");
    expect(await screen.findByText(dataPoints(5))).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(refresh).toHaveFocus();
    expect(screen.getByText("Up to date")).toBeInTheDocument();
    expect(calls).toEqual({ refreshes: 1, commodityReads: 4 });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("reloads the charts after an acknowledged refresh", async () => {
    const calls = renderPage({ ack: true, reads: [true, true] });
    await refreshWithKeyboard();

    expect(await screen.findByText("Up to date")).toBeInTheDocument();
    expect(await screen.findByText(dataPoints(3))).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
    expect(calls).toEqual({ refreshes: 1, commodityReads: 2 });
  });

  it("reports a refresh that fails before acknowledgement and reads nothing more", async () => {
    const calls = renderPage({ ack: false, reads: [true] });
    const button = await refreshWithKeyboard();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Could not refresh prices"),
    );
    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.getByText("Stale")).toBeInTheDocument();
    expect(
      screen.getByText("Last error: controlled prior error"),
    ).toBeInTheDocument();
    expect(screen.getByText(dataPoints(2))).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(calls).toEqual({ refreshes: 1, commodityReads: 1 });
  });
});

/** A keyboard refresh keeps its place on the card, whatever it ends in (w4/992). */
describe("Refresh prices focus", () => {
  it.each([
    [
      "lands",
      { ack: true, reads: [true, true] },
      () => screen.findByText(dataPoints(3)),
    ],
    [
      "fails before acknowledgement",
      { ack: false, reads: [true] },
      () =>
        waitFor(() =>
          expect(toast.error).toHaveBeenCalledWith("Could not refresh prices"),
        ),
    ],
    [
      "lands but its chart read fails",
      { ack: true, reads: [true, false] },
      () => screen.findByRole("alert"),
    ],
  ])(
    "returns focus to Refresh prices when the refresh %s",
    async (_name, outcome, settled) => {
      const held: { release?: () => void } = {};
      const calls = renderPage({ ...outcome, held });
      const button = await refreshWithKeyboard();
      await waitFor(() => expect(button).toBeDisabled());
      // One refresh at a time: a second Enter while it runs sends nothing.
      await userEvent.keyboard("{Enter}");
      // The browser drops focus from the control it disabled; jsdom keeps it.
      const away = document.createElement("button");
      document.body.appendChild(away);
      away.focus();
      away.remove();

      held.release!();
      await settled();
      await waitFor(() => expect(button).toBeEnabled());
      await waitFor(() => expect(button).toHaveFocus());
      expect(calls.refreshes).toBe(1);
    },
  );
});
