import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  describe("a rate-limited ledger read (w4/1009)", () => {
    const RATE_LIMITED = "Too many requests. Please try again later.";

    it.each([
      [
        "a RATE_LIMITED GraphQL refusal",
        new CombinedGraphQLErrors({
          errors: [
            { message: RATE_LIMITED, extensions: { code: "RATE_LIMITED" } },
          ],
        }),
      ],
      // What reaches the route error after SSR: only the message survives.
      ["the SSR-deserialized refusal", new Error(RATE_LIMITED)],
    ])("says why and to wait, for %s", async (_name, error) => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      render(
        <LedgerLayoutError
          error={error}
          onBackToDashboard={vi.fn()}
          onRetry={onRetry}
        />,
      );

      expect(
        screen.getByRole("heading", { name: "Failed to Load Ledger" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Too many requests. Please wait a moment and try again.",
        ),
      ).toBeVisible();
      expect(
        screen.queryByText(/unexpected error occurred/i),
      ).not.toBeInTheDocument();
      // Retry and the diagnostics stay.
      await user.click(screen.getByRole("button", { name: /try again/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Error Details")).toBeInTheDocument();
    });

    it("keeps the generic guidance for an error it cannot name", () => {
      render(
        <LedgerLayoutError
          error={new Error("Unexpected token < in JSON")}
          onBackToDashboard={vi.fn()}
          onRetry={vi.fn()}
        />,
      );
      expect(
        screen.getByText(/unexpected error occurred/i),
      ).toBeInTheDocument();
      expect(screen.queryByText(/wait a moment/i)).not.toBeInTheDocument();
    });
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
