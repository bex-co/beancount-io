import { act, fireEvent, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Accounts search is server-rendered and controlled. Text typed before
 * hydration attaches its onChange is wiped when React takes the field over,
 * so it is unavailable until then (w4/1099), as Gallery search is (w4/211).
 * Real SSR markup, real hydration, the page's own field.
 */

const router = vi.hoisted(() => ({
  search: { search: "Bank" } as Record<string, unknown>,
  navigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  // The real useHydrated: false on the server and through hydration's first
  // pass, true once hydrated.
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useParams: () => ({ ledgerOwner: "alice", ledgerName: "books" }),
  useSearch: () => router.search,
  useNavigate: () => router.navigate,
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="#">{children}</a>
  ),
}));

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: () => [vi.fn(), { loading: false }],
  useQuery: () => ({
    data: { getLedgerAccountDirectives: [] },
    loading: false,
    error: undefined,
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerName: "My books",
    ledgerData: {
      options: {
        nameAssets: "Assets",
        nameLiabilities: "Liabilities",
        nameEquity: "Equity",
        nameIncome: "Income",
        nameExpenses: "Expenses",
      },
    },
  }),
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: false }),
}));

vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useApolloCacheClear: () => vi.fn(),
}));

import LedgerAccountsPage from "../index";

afterEach(() => vi.clearAllMocks());

describe("Accounts search before and after hydration", () => {
  it("is unavailable in server markup, keeps the URL search, then takes typing", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(<LedgerAccountsPage />);
    const field = container.querySelector<HTMLInputElement>(
      'input[aria-label="Search accounts..."]',
    )!;
    expect(field).not.toBeNull();

    // Before hydration: named, prefilled from the URL, honestly unavailable.
    expect(field).toBeDisabled();
    expect(field).toHaveValue("Bank");

    const recoverable = vi.fn();
    await act(async () => {
      hydrateRoot(container, <LedgerAccountsPage />, {
        onRecoverableError: recoverable,
      });
    });
    await waitFor(() => expect(field).toBeEnabled());
    expect(field).toHaveValue("Bank");

    // The first typing once it is available is kept and reaches the URL.
    fireEvent.change(field, { target: { value: "Checking" } });
    expect(field).toHaveValue("Checking");
    expect(router.navigate).toHaveBeenCalled();
    const { search } = router.navigate.mock.calls.at(-1)![0] as {
      search: (previous: Record<string, unknown>) => Record<string, unknown>;
    };
    expect(search({})).toMatchObject({ search: "Checking" });
    expect(recoverable).not.toHaveBeenCalled();
    container.remove();
  });
});
