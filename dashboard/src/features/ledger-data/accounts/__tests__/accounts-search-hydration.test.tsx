import { act, fireEvent, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Accounts search is server-rendered and controlled. Text typed before
 * hydration attaches its onChange is wiped when React takes the field over,
 * so it is unavailable until then (w4/1099), as Gallery search is (w4/211).
 * The type pills and header Clear share the gate (w4/1108): a click before
 * onClick attaches would otherwise be lost without replay.
 * Real SSR markup, real hydration, the page's own controls.
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

  it("keeps type pills and header Clear unavailable until hydration, then takes the first activation (w4/1108)", async () => {
    router.search = { search: "Checking", type: "Assets" };
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(<LedgerAccountsPage />);

    const pills = [
      ...container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]"),
    ];
    expect(pills.map((p) => p.textContent)).toEqual([
      "All Types",
      "Assets",
      "Liabilities",
      "Equity",
      "Income",
      "Expenses",
    ]);
    // Bookmarked selection intact, every pill honestly unavailable.
    expect(pills[1]).toHaveAttribute("aria-pressed", "true");
    expect(pills[0]).toHaveAttribute("aria-pressed", "false");
    for (const pill of pills) expect(pill).toBeDisabled();

    const clear = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Clear"]',
    )!;
    expect(clear).not.toBeNull();
    expect(clear).toBeDisabled();

    const field = container.querySelector<HTMLInputElement>(
      'input[aria-label="Search accounts..."]',
    )!;
    expect(field).toHaveValue("Checking");

    const recoverable = vi.fn();
    await act(async () => {
      hydrateRoot(container, <LedgerAccountsPage />, {
        onRecoverableError: recoverable,
      });
    });
    await waitFor(() => expect(pills[1]).toBeEnabled());
    for (const pill of pills) expect(pill).toBeEnabled();
    expect(clear).toBeEnabled();
    expect(field).toBeEnabled();
    expect(pills[1]).toHaveAttribute("aria-pressed", "true");

    // First ordinary activation after readiness reaches the URL, no retry.
    // Expenses is pills[5].
    fireEvent.click(pills[5]);
    expect(router.navigate).toHaveBeenCalled();
    const typeCall = router.navigate.mock.calls.at(-1)![0] as {
      search: (previous: Record<string, unknown>) => Record<string, unknown>;
      replace: boolean;
    };
    expect(typeCall.search({ search: "Checking" })).toMatchObject({
      search: "Checking",
      type: "Expenses",
    });
    expect(typeCall.replace).toBe(true);

    // First Clear activation empties the search and focuses the field,
    // preserving the composed state handback.
    fireEvent.click(clear);
    expect(field).toHaveValue("");
    expect(field).toHaveFocus();
    const clearCall = router.navigate.mock.calls.at(-1)![0] as {
      search: (previous: Record<string, unknown>) => Record<string, unknown>;
    };
    expect(clearCall.search({})).toMatchObject({ search: undefined });
    expect(recoverable).not.toHaveBeenCalled();
    container.remove();
    router.search = { search: "Bank" };
  });
});
