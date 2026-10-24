import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import type { ReactNode } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CollaboratorsSection } from "../collaborators-section";

/**
 * A failed Collaborators read offers Try Again in its card (w4/1050). It
 * said "Error Loading Collaborators / Failed to fetch" with no action, so an
 * administrator had to reload Settings. The real card and Apollo observer
 * run; only the network answers are scripted.
 */
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useRouteContext: () => ({ userProfile: null }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));
vi.mock("@/common/hooks/use-user-limits", () => ({
  useUserLimits: () => ({ limits: null, tier: "GROWTH" }),
}));
vi.mock("@/common/components/ledger-permission/admin", () => ({
  LedgerAdminPermission: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("@/common/components/limit-indicator", () => ({
  LimitIndicator: () => null,
}));
// The member rows have their own suites; here they only name the member.
vi.mock("@/features/collaboration/components/collaborator-row", () => ({
  CollaboratorRow: ({
    collaborator,
  }: {
    collaborator: { fullName: string | null };
  }) => (
    <tr>
      <td>{collaborator.fullName}</td>
    </tr>
  ),
}));
vi.mock(
  "@/features/collaboration/components/invite-collaborators-dialog",
  () => ({ InviteCollaboratorsDialog: () => <button>invite</button> }),
);

type Read = {
  variables: Record<string, unknown>;
  resolve: (members: string[]) => void;
  reject: () => void;
};

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

function setup() {
  const reads: Read[] = [];
  const mutations: string[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          if (operation.operationName === "GetCurrentUser") {
            observer.next({ data: { userProfile: null } });
            observer.complete();
            return;
          }
          if (operation.operationName !== "ListLedgerCollaborators") {
            mutations.push(operation.operationName ?? "");
            observer.error(new Error("Unexpected operation"));
            return;
          }
          reads.push({
            variables: { ...operation.variables },
            resolve: (members) => {
              observer.next({
                data: {
                  listLedgerCollaborators: members.map((login, index) => ({
                    __typename: "CollaboratorUser",
                    login,
                    lastLogin: null,
                    isAdmin: false,
                    id: index + 1,
                    fullName: `QA ${login}`,
                    email: null,
                    created: null,
                    active: true,
                    permission: "read",
                  })),
                },
              });
              observer.complete();
            },
            reject: () => observer.error(new TypeError("Failed to fetch")),
          });
        }),
    ),
  });
  clients.push(client);
  render(
    <ApolloProvider client={client}>
      <CollaboratorsSection ledgerId="qa-owner/qa-books" />
    </ApolloProvider>,
  );
  const tryAgain = () =>
    screen.getByRole("button", { name: "common.tryAgain" });
  const failed = () =>
    screen.queryByText("collaboration.errorLoadingCollaborators");
  return { reads, mutations, tryAgain, failed, user: userEvent.setup() };
}

describe("Collaborators read retry", () => {
  it("retries once at a time, keeps focus after another failure, and then lists members", async () => {
    const { reads, mutations, tryAgain, failed, user } = setup();
    await waitFor(() => expect(reads).toHaveLength(1));
    await act(async () => reads[0].reject());
    expect(failed()).toBeInTheDocument();
    // A localized message, never the raw transport text.
    expect(screen.getByText("common.errors.network")).toBeInTheDocument();
    expect(screen.queryByText("Failed to fetch")).toBeNull();

    tryAgain().focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(reads).toHaveLength(2));
    expect(failed()).toBeInTheDocument();
    expect(tryAgain()).toHaveAttribute("aria-busy", "true");
    await user.keyboard("{Enter}");
    expect(reads).toHaveLength(2);

    await act(async () => reads[1].reject());
    await waitFor(() => expect(tryAgain()).toBeEnabled());
    expect(tryAgain()).toHaveFocus();

    await user.keyboard("{Enter}");
    await waitFor(() => expect(reads).toHaveLength(3));
    await act(async () => reads[2].resolve(["qa-member"]));
    expect(await screen.findByText("QA qa-member")).toBeInTheDocument();
    expect(failed()).toBeNull();
    for (const read of reads) {
      expect(read.variables).toEqual({ ledgerId: "qa-owner/qa-books" });
    }
    expect(mutations).toEqual([]);
  });

  it("says a retried ledger with no members has none", async () => {
    const { reads, tryAgain, failed, user } = setup();
    await waitFor(() => expect(reads).toHaveLength(1));
    await act(async () => reads[0].reject());
    await user.click(tryAgain());
    await waitFor(() => expect(reads).toHaveLength(2));
    await act(async () => reads[1].resolve([]));

    expect(
      await screen.findByText("collaboration.noCollaborators"),
    ).toBeInTheDocument();
    expect(failed()).toBeNull();
  });
});
