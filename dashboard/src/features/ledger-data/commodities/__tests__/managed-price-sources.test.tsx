import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { MockedProvider } from "@apollo/client/testing/react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import {
  GetLedgerManagedPricesDocument,
  RefreshLedgerManagedPricesDocument,
} from "@/graphql/definitions";
import { ManagedPriceSources } from "../managed-price-sources";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
    i18n: { language: "en" },
  }),
}));

const LEDGER = "alice/main";

function source(overrides: Record<string, unknown> = {}) {
  return {
    __typename: "ManagedPriceSource" as const,
    url: "https://beancount.io/prices/BTC-USD",
    alias: "BTC-USD",
    commodity: "BTC",
    quote: "USD",
    source: "coinbase",
    latestPriceDate: "2026-09-15",
    nextRefreshAt: "2026-09-15T08:31:00.000Z",
    freshness: "stale",
    error: null,
    ...overrides,
  };
}

const statusMock = (sources: unknown[]) => ({
  request: {
    query: GetLedgerManagedPricesDocument,
    variables: { ledgerId: LEDGER },
  },
  result: { data: { getLedgerManagedPrices: sources } },
});

function renderPanel(mocks: unknown[], canWrite = true) {
  return render(
    <MockedProvider mocks={mocks as never}>
      <ManagedPriceSources ledgerId={LEDGER} canWrite={canWrite} />
    </MockedProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("ManagedPriceSources", () => {
  it("renders nothing for a ledger with no managed include", async () => {
    const { container } = renderPanel([statusMock([])]);
    // Let the query settle, then confirm the panel never appeared.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ["recent", "page.commodities.freshness.recent"],
    ["stale", "page.commodities.freshness.stale"],
    ["unavailable", "page.commodities.freshness.unavailable"],
    // An unknown wire value must not read as up to date.
    ["something-new", "page.commodities.freshness.unavailable"],
  ])("labels freshness %s distinctly", async (freshness, label) => {
    renderPanel([statusMock([source({ freshness })])]);
    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.getByText("BTC/USD")).toBeInTheDocument();
  });

  it("shows the date of the newest price as a calendar day", async () => {
    renderPanel([statusMock([source({ latestPriceDate: "2026-11-13" })])]);
    expect(
      await screen.findByText(
        'page.commodities.latestPriceDate {"date":"Nov 13, 2026"}',
      ),
    ).toBeInTheDocument();
  });

  it("shows the cause and never-observed state of an unavailable source", async () => {
    renderPanel([
      statusMock([
        source({
          freshness: "unavailable",
          latestPriceDate: null,
          error: "fetch failed (status): 404",
        }),
      ]),
    ]);
    expect(
      await screen.findByText("page.commodities.neverObserved"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/page\.commodities\.lastError.*fetch failed/),
    ).toBeInTheDocument();
  });

  it("hides Refresh prices from viewers who cannot write", async () => {
    renderPanel([statusMock([source()])], false);
    await screen.findByText("BTC/USD");
    expect(
      screen.queryByRole("button", { name: /refreshPrices/ }),
    ).not.toBeInTheDocument();
  });

  it("refreshes, shows the pending state, and renders the refreshed status", async () => {
    // The refresh is held until the test releases it, so its pending state is
    // observed however long the click takes (w4/332 made the refresh settle
    // on its acknowledgement alone, which a fixed delay could outrun).
    let release: (() => void) | undefined;
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        (operation) =>
          new Observable((observer) => {
            const reply = (data: object) => {
              observer.next({ data });
              observer.complete();
            };
            if (operation.operationName === "RefreshLedgerManagedPrices") {
              release = () =>
                reply({
                  refreshLedgerManagedPrices: [source({ freshness: "recent" })],
                });
            } else if (operation.operationName === "GetLedgerManagedPrices") {
              reply({ getLedgerManagedPrices: [source()] });
            } else {
              reply({ getLedgerCommodities: [] });
            }
          }),
      ),
    });
    render(
      <ApolloProvider client={client}>
        <ManagedPriceSources ledgerId={LEDGER} canWrite />
      </ApolloProvider>,
    );
    const button = await screen.findByRole("button", {
      name: "page.commodities.refreshPrices",
    });
    await userEvent.click(button);
    expect(
      screen.getByRole("button", { name: "page.commodities.refreshingPrices" }),
    ).toBeDisabled();
    act(() => release!());
    expect(
      await screen.findByText("page.commodities.freshness.recent"),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: "page.commodities.refreshPrices",
      }),
    ).toBeEnabled();
    expect(toast.error).not.toHaveBeenCalled();
    client.stop();
  });

  it("tells the user when a refresh fails and keeps the last status", async () => {
    renderPanel([
      statusMock([source()]),
      {
        request: {
          query: RefreshLedgerManagedPricesDocument,
          variables: { ledgerId: LEDGER },
        },
        error: new Error("You do not have access to this ledger"),
      },
    ]);
    await userEvent.click(
      await screen.findByRole("button", {
        name: "page.commodities.refreshPrices",
      }),
    );
    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "page.commodities.refreshPricesFailed",
      ),
    );
    expect(
      screen.getByText("page.commodities.freshness.stale"),
    ).toBeInTheDocument();
  });
});
