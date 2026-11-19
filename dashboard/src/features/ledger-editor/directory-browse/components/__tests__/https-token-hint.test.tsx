import { MockedProvider } from "@apollo/client/testing/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DeploymentInfoDocument } from "@/graphql/definitions";
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

function deployment(selfHost: boolean) {
  return {
    request: { query: DeploymentInfoDocument },
    result: {
      data: {
        deploymentInfo: {
          __typename: "DeploymentInfoResponse" as const,
          selfHost,
          signUpOpen: false,
          oidcProviderName: null,
        },
      },
    },
  };
}

async function openHttpsTab(selfHost = false) {
  const user = userEvent.setup();
  render(
    <MockedProvider mocks={[deployment(selfHost)]}>
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

  it("names bea cloud git setup first on a self-hosted server, and the token second", async () => {
    // There `bea` signs Git in by itself (w22/m12), so the hint leads with the
    // command and keeps the token for a machine without bea.
    const user = await openHttpsTab(true);
    await user.click(screen.getByRole("tab", { name: "HTTP" }));

    const hint = (await screen.findByText(/bea cloud git setup/)).closest("p");
    const text = hint?.textContent ?? "";
    expect(text.indexOf("bea cloud git setup")).toBeGreaterThanOrEqual(0);
    expect(text.indexOf("bea cloud git setup")).toBeLessThan(
      text.indexOf("a personal access token"),
    );
    expect(
      screen.getByRole("link", { name: "Create a personal access token" }),
    ).toHaveAttribute("href", "/settings/api-keys");
  });

  it("does not mention bea cloud git setup on the managed service", async () => {
    const user = await openHttpsTab(false);
    await user.click(screen.getByRole("tab", { name: "HTTP" }));

    await screen.findByText(/Password: a personal access token/);
    expect(screen.queryByText(/bea cloud git setup/)).toBeNull();
  });
});
