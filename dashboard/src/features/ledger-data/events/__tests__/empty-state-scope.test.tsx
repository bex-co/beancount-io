import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LedgerEventsPage from "../index";

/**
 * An empty Events read means two different things. With no topbar filter it
 * says the ledger records no events; under an active filter it says only that
 * nothing matched, and must not speak for the whole ledger.
 */

const state = vi.hoisted(() => ({
  events: [] as Array<{ date: string; type: string; description: string }>,
  error: undefined as Error | undefined,
  filters: { time: "", filter: "", account: "" } as Record<string, string>,
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: { getLedgerEvents: state.events },
    loading: false,
    error: state.error,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "alice", ledgerName: "books" }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "books" }),
}));

vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({ searchParams: state.filters }),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/common/components/seo/ledger-page-seo", () => ({
  LedgerPageSEO: () => null,
}));

vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

beforeEach(() => {
  state.events = [];
  state.error = undefined;
  state.filters = { time: "", filter: "", account: "" };
});

describe("Events empty state scope", () => {
  it("speaks for the ledger when nothing is filtered", () => {
    render(<LedgerEventsPage />);
    expect(
      screen.getByText("page.events.noEventsFoundForLedger"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("page.events.noEventsMatchFilters"),
    ).not.toBeInTheDocument();
  });

  it.each(["time", "filter", "account"])(
    "speaks only for the filters when %s is active",
    (key) => {
      state.filters = { ...state.filters, [key]: "2010" };
      render(<LedgerEventsPage />);
      expect(
        screen.getByText("page.events.noEventsMatchFilters"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("page.events.noEventsFoundForLedger"),
      ).not.toBeInTheDocument();
    },
  );

  it("shows the read error rather than an empty state when the read fails", () => {
    state.error = new Error("boom");
    state.filters = { ...state.filters, time: "2010" };
    render(<LedgerEventsPage />);
    expect(
      screen.queryByText("page.events.noEventsMatchFilters"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("page.events.noEventsFoundForLedger"),
    ).not.toBeInTheDocument();
    // The read error is now classified rather than a fixed page message.
    expect(screen.getByText("common.errors.generic")).toBeInTheDocument();
  });

  it("lists the records and shows no empty state when events exist", () => {
    state.events = [
      { date: "2015-09-07", type: "location", description: "Chicago" },
    ];
    state.filters = { ...state.filters, time: "2015" };
    render(<LedgerEventsPage />);
    expect(screen.getByText("Chicago")).toBeInTheDocument();
    expect(
      screen.queryByText("page.events.noEventsMatchFilters"),
    ).not.toBeInTheDocument();
  });
});
