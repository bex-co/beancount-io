import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LedgerRouteError } from "../ledger-route-error";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  invalidate: vi.fn(() => Promise.resolve()),
  unauthenticated: false,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useRouter: () => ({ invalidate: mocks.invalidate }),
  // `href` is what the router composes from the raw location — the parsed
  // `hash` has already had its `#` sliced off, so only `href` can rebuild the
  // destination faithfully.
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({
      location: {
        pathname: "/ledger/alice/books/commits",
        href: "/ledger/alice/books/commits?time=2016#entry-7",
      },
    }),
}));

vi.mock("@/common/apollo/links/auth-error-link", () => ({
  isUnauthenticatedError: () => mocks.unauthenticated,
}));

vi.mock("../ledger-layout-error", () => ({
  LedgerLayoutError: ({
    error,
    onRetry,
    onBackToDashboard,
  }: {
    error: Error;
    onRetry: () => void;
    onBackToDashboard: () => void;
  }) => (
    <div data-testid="ledger-layout-error">
      {error.message}
      <button type="button" onClick={onRetry}>
        Retry
      </button>
      <button type="button" onClick={onBackToDashboard}>
        Dashboard
      </button>
    </div>
  ),
}));

describe("LedgerRouteError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.unauthenticated = false;
    document.head.innerHTML = "";
  });

  it("keeps parent-loader failures inside the ledger-scoped experience", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(
      <LedgerRouteError
        error={new Error("ledger unavailable")}
        reset={reset}
        info={undefined}
      />,
    );

    expect(screen.getByTestId("ledger-layout-error")).toHaveTextContent(
      "ledger unavailable",
    );
    expect(
      document.head
        .querySelector('meta[name="robots"]')
        ?.getAttribute("content"),
    ).toBe("noindex, follow");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(mocks.invalidate).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(reset).toHaveBeenCalledOnce();
    });
  });

  it("sends the whole destination to login, not just its path", async () => {
    // This component is the errorComponent of the ledger route whose loader
    // already keeps path, query and fragment. Keeping only the path here meant
    // one route had two continuation producers that disagreed, and a reader
    // sent here lost their time filter and their anchor.
    mocks.unauthenticated = true;
    render(
      <LedgerRouteError
        error={new Error("unauthenticated")}
        reset={vi.fn()}
        info={undefined}
      />,
    );

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: "/auth/login",
        search: {
          next: "/ledger/alice/books/commits?time=2016#entry-7",
        },
      });
    });
  });
});
