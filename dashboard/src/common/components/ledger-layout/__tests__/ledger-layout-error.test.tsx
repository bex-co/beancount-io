import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LedgerLayoutError } from "../ledger-layout-error";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    activeOptions: _activeOptions,
    ...props
  }: React.ComponentProps<"a"> & { activeOptions?: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));

describe("LedgerLayoutError", () => {
  it("treats private-ledger authorization failures as an intentional unavailable state", () => {
    const error = new CombinedGraphQLErrors({
      errors: [
        {
          message: "Access denied",
          extensions: { code: "FORBIDDEN" },
        },
      ],
    });

    render(
      <LedgerLayoutError
        error={error}
        onBackToDashboard={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/doesn't exist or has been moved/),
    ).toBeInTheDocument();
  });

  it("asks guests to sign in without claiming a session expired", () => {
    const error = new CombinedGraphQLErrors({
      errors: [
        {
          message: "Unauthenticated",
          extensions: { code: "UNAUTHENTICATED" },
        },
      ],
    });

    render(
      <LedgerLayoutError
        error={error}
        onBackToDashboard={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("Sign in required")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sign In" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Please sign in to continue.")).toBeInTheDocument();
    expect(screen.queryByText(/session has expired/i)).not.toBeInTheDocument();
  });

  it("puts the failure content in the page's single main landmark", () => {
    // Both LedgerLayout and LedgerRouteError render this shell, and it is the
    // whole document when a ledger read fails — so it owns the main landmark.
    const error = new Error("Network request failed");

    render(
      <LedgerLayoutError
        error={error}
        onBackToDashboard={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    const mains = [...document.querySelectorAll("main, [role='main']")];
    expect(mains).toHaveLength(1);
    const main = mains[0];

    expect(main.contains(screen.getByRole("heading", { level: 1 }))).toBe(true);
    expect(
      main.contains(screen.getByRole("button", { name: /try again/i })),
    ).toBe(true);
    // The shell's own header sits outside the main, as a banner should.
    const header = document.querySelector("header");
    expect(header).not.toBeNull();
    expect(main.contains(header as Node)).toBe(false);
  });
});
