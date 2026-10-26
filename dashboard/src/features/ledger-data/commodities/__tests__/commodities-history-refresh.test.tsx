import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { GetLedgerCommoditiesQuery } from "@/graphql/definitions";
import CommoditiesPage from "../index";

const route = vi.hoisted(() => ({
  params: { ledgerOwner: "open_ledger", ledgerName: "stock-example" },
}));
vi.mock("@tanstack/react-router", () => ({
  useParams: () => route.params,
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "Stock example" }),
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: false }),
}));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: () => null,
}));

type Pair = GetLedgerCommoditiesQuery["getLedgerCommodities"][number];

function pair(base: string, values: string[]): Pair {
  return {
    __typename: "CommodityPairWithPrices",
    base,
    quote: "USD",
    prices: values.map((value, index) => ({
      __typename: "PricePoint",
      date: `2026-01-0${index + 1}`,
      value,
    })),
  };
}

/**
 * Out of date → Refresh evicts the root query, and the commodity cards are
 * replaced by QueryView's loading state while the same ledger re-reads. The
 * price histories a reader opened must still be open when the new read
 * shows, with the rows it returned (w4/1097).
 */
function mount(responses: Pair[][]) {
  const held: (() => void)[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          if (operation.operationName !== "GetLedgerCommodities") {
            observer.next({ data: { getLedgerManagedPrices: [] } });
            observer.complete();
            return;
          }
          const data = responses.shift() ?? [];
          held.push(() => {
            observer.next({ data: { getLedgerCommodities: data } });
            observer.complete();
          });
        }),
    ),
  });
  const view = render(
    <ApolloProvider client={client}>
      <CommoditiesPage />
    </ApolloProvider>,
  );
  const release = async () => {
    await waitFor(() => expect(held.length).toBeGreaterThan(0));
    await act(async () => held.shift()!());
  };
  return { client, release, view };
}

const toggle = (base: string) =>
  screen.getByRole("button", {
    name: new RegExp(`price history for ${base}/USD`),
  });

const rows = (base: string) =>
  within(screen.getByRole("table", { name: `${base}/USD` }))
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.textContent);

describe("Commodities price histories across a refresh", () => {
  it("keeps the opened histories open, with the refreshed rows", async () => {
    const user = userEvent.setup();
    const { client, release } = mount([
      [
        pair("ACME", ["1.10", "1.20"]),
        pair("BMKT", ["5"]),
        pair("NWRB", ["9"]),
      ],
      [
        pair("ACME", ["1.10", "1.20", "1.30"]),
        pair("BMKT", ["5"]),
        pair("NWRB", ["9"]),
      ],
    ]);
    await release();
    await screen.findByRole("button", { name: /ACME\/USD/ });
    await user.click(toggle("ACME"));
    await user.click(toggle("BMKT"));
    expect(rows("ACME")).toEqual(["2026-01-011.10", "2026-01-021.20"]);

    act(() => {
      client.cache.evict({ id: "ROOT_QUERY" });
    });
    // Pending: the cards are replaced, so no old table is shown.
    await waitFor(() =>
      expect(screen.queryByRole("table")).not.toBeInTheDocument(),
    );
    await release();

    await waitFor(() =>
      expect(toggle("ACME")).toHaveAttribute("aria-expanded", "true"),
    );
    expect(toggle("BMKT")).toHaveAttribute("aria-expanded", "true");
    expect(toggle("NWRB")).toHaveAttribute("aria-expanded", "false");
    expect(rows("ACME")).toEqual([
      "2026-01-011.10",
      "2026-01-021.20",
      "2026-01-031.30",
    ]);
    expect(rows("BMKT")).toEqual(["2026-01-015"]);
    expect(screen.getAllByRole("table")).toHaveLength(2);
  });

  it("starts a new pair closed and forgets choices on another ledger", async () => {
    const user = userEvent.setup();
    const { client, release, view } = mount([
      [pair("ACME", ["1"])],
      [pair("ACME", ["1"]), pair("ZNEW", ["2"])],
      [pair("ACME", ["1"])],
    ]);
    await release();
    await screen.findByRole("button", { name: /ACME\/USD/ });
    await user.click(toggle("ACME"));

    act(() => {
      client.cache.evict({ id: "ROOT_QUERY" });
    });
    await release();
    await waitFor(() => expect(toggle("ZNEW")).toBeInTheDocument());
    expect(toggle("ACME")).toHaveAttribute("aria-expanded", "true");
    expect(toggle("ZNEW")).toHaveAttribute("aria-expanded", "false");

    route.params = { ledgerOwner: "open_ledger", ledgerName: "other" };
    view.rerender(
      <ApolloProvider client={client}>
        <CommoditiesPage />
      </ApolloProvider>,
    );
    await release();
    await waitFor(() =>
      expect(toggle("ACME")).toHaveAttribute("aria-expanded", "false"),
    );
    route.params = { ledgerOwner: "open_ledger", ledgerName: "stock-example" };
  });
});
