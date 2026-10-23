import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import ResetPasswordPage from "../index";

vi.mock("@tanstack/react-router", () => ({
  useSearch: () => ({ token: "qa-token" }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("@/features/auth/lib/redirect-to-login", () => ({
  redirectToLogin: vi.fn(),
}));
vi.mock("@/common/components/seo/page-seo", () => ({ PageSEO: () => null }));

/**
 * The real Apollo refetch clears `error` and reports loading while it runs;
 * the unavailable card must survive that rather than flash to the skeleton
 * (w4/983).
 */
describe("ResetPasswordPage token check retry", () => {
  it("keeps the unavailable card busy, hands focus back on failure, and recovers", async () => {
    const user = userEvent.setup();
    const checks: unknown[] = [];
    const held: ((ok: boolean) => void)[] = [];
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        (operation) =>
          new Observable((observer) => {
            checks.push(operation.variables);
            const settle = (ok: boolean) => {
              if (!ok) return observer.error(new TypeError("Failed to fetch"));
              observer.next({
                data: {
                  validateEmailToken: {
                    __typename: "ValidateEmailTokenResult",
                    isValid: true,
                  },
                },
              });
              observer.complete();
            };
            if (checks.length === 1) settle(false);
            else held.push(settle);
          }),
      ),
    });
    render(
      <ApolloProvider client={client}>
        <ResetPasswordPage />
      </ApolloProvider>,
    );

    const retry = await screen.findByRole("button", { name: "Try Again" });
    const title = screen.getByText("Couldn't check your reset link");
    retry.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(checks).toHaveLength(2));
    expect(title).toBeInTheDocument();
    expect(retry).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(checks).toHaveLength(2);
    // A browser drops focus from the disabled control; jsdom keeps it.
    const away = document.createElement("button");
    document.body.appendChild(away);
    away.focus();
    away.remove();

    held.shift()!(false);
    await waitFor(() => expect(retry).toHaveFocus());
    expect(title).toBeInTheDocument();

    await user.keyboard("{Enter}");
    await waitFor(() => expect(checks).toHaveLength(3));
    held.shift()!(true);
    expect(await screen.findByText("Reset your password")).toBeInTheDocument();
    // Every retry checked the same link.
    expect(checks).toEqual(Array(3).fill({ token: "qa-token" }));
  });
});
