import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LedgerLayoutError } from "../ledger-layout-error";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
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
    expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
    expect(
      screen.getByText("Please sign in to continue."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/session has expired/i)).not.toBeInTheDocument();
  });
});
