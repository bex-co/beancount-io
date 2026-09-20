import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import LedgerEventsPage from "../index";

/**
 * A mistyped date in the Time filter comes back as a classified
 * BAD_USER_INPUT. This page passed a fixed "failed to load events" message to
 * the shared view, and that explicit message deliberately wins over the
 * classified guidance — so the reader was told something had failed but not
 * that their input was the cause.
 */

const state = vi.hoisted(() => ({
  events: [] as Array<{ date: string; type: string; description: string }>,
  error: undefined as unknown,
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

const badUserInput = new CombinedGraphQLErrors({
  errors: [
    {
      message: "Failed to parse date: 2026-02-30",
      extensions: { code: "BAD_USER_INPUT" },
    },
  ],
});

beforeEach(() => {
  state.events = [];
  state.error = undefined;
  state.filters = { time: "", filter: "", account: "" };
});

describe("events query failures", () => {
  it("asks the reader to correct an invalid filter", () => {
    state.error = badUserInput;
    state.filters = { time: "2026-02-30", filter: "", account: "" };

    render(<LedgerEventsPage />);

    expect(screen.getByText("common.errors.badUserInput")).toBeInTheDocument();
  });

  it("no longer overrides the guidance with its own message", () => {
    state.error = badUserInput;

    render(<LedgerEventsPage />);

    expect(screen.queryByText("page.events.failedToLoadEvents")).toBeNull();
  });

  it("keeps a safe fallback for an unclassified failure", () => {
    state.error = new Error("boom");

    render(<LedgerEventsPage />);

    expect(screen.getByText("common.errors.generic")).toBeInTheDocument();
    expect(screen.queryByText(/boom/)).toBeNull();
  });

  it("does not leak the server's parse message", () => {
    state.error = badUserInput;

    render(<LedgerEventsPage />);

    expect(screen.queryByText(/Failed to parse date/)).toBeNull();
  });

  it("lists the events again once the filter is corrected", () => {
    state.events = [
      { date: "2016-04-11", type: "location", description: "Los Angeles" },
      { date: "2016-11-16", type: "location", description: "Chicago" },
    ];
    state.filters = { time: "2016", filter: "", account: "" };

    render(<LedgerEventsPage />);

    expect(screen.queryByText("common.errors.badUserInput")).toBeNull();
    expect(screen.getByText("Chicago")).toBeInTheDocument();
  });
});
