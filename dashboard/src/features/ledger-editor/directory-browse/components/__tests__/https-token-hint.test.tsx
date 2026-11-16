import { MockedProvider } from "@apollo/client/testing/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LedgerCloneUrlMenu from "../ledger-clone-url-menu";

/**
 * Git prompts for a username and password on an HTTPS clone, and the account
 * password is being phased out on that endpoint (w3/m68). The HTTPS option has
 * to say the password is a personal access token and lead to where one is made.
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@/common/components/authenticated", () => ({
  Authenticated: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/common/providers/ledger-provider", () => ({
  useLedger: () => ({
    ledgerData: {
      httpUrl: "https://example.com/git/alice/books.git",
      sshUrl: "git@example.com:alice/books.git",
    },
  }),
}));

async function openHttpsTab() {
  const user = userEvent.setup();
  render(
    <MockedProvider mocks={[]}>
      <LedgerCloneUrlMenu ledgerId="alice/books" />
    </MockedProvider>,
  );
  await user.click(screen.getByRole("button", { name: /git clone/i }));
  return user;
}

describe("HTTPS clone credentials", () => {
  it("keeps SSH the first option, without the token hint", async () => {
    await openHttpsTab();

    expect(screen.getByRole("tab", { selected: true })).toHaveTextContent(
      "SSH",
    );
    expect(screen.queryByText(/personal access token/i)).toBeNull();
  });

  it("says the HTTPS password is a personal access token and links to the token page", async () => {
    const user = await openHttpsTab();
    await user.click(screen.getByRole("tab", { name: "HTTP" }));

    expect(
      screen.getByText(/Password: a personal access token/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create a personal access token" }),
    ).toHaveAttribute("href", "/settings/api-keys");
  });
});
