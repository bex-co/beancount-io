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
      screen.getByRole("heading", { name: "Ledger Not Found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/don't have permission to access it/),
    ).toBeInTheDocument();
  });
});
