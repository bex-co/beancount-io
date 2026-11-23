import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { CollaboratorsSection } from "../collaborators-section";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.unmock("@/i18n");

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/common/hooks/use-user-limits", () => ({
  useUserLimits: () => ({ limits: null, tier: "GROWTH" }),
}));
vi.mock("@/common/components/ledger-permission/admin", () => ({
  LedgerAdminPermission: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/common/components/limit-indicator", () => ({
  LimitIndicator: () => null,
}));
vi.mock("@/features/collaboration/components/collaborator-row", () => ({
  CollaboratorRow: ({ collaborator }: { collaborator: { login: string } }) => (
    <tr>
      <td>{collaborator.login}</td>
    </tr>
  ),
}));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
  vi.clearAllMocks();
});

const ledgerId = "alice/books";
const available = ["fixture-alex", "fixture-blair"];

function renderSettings({ holdFirst = false, refuseSecond = false } = {}) {
  const writes: Array<Record<string, unknown>> = [];
  const members: string[] = [];
  const listReads = vi.fn();
  const pending: Array<() => void> = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          const send = (data: Record<string, unknown>) => {
            observer.next({ data });
            observer.complete();
          };
          switch (operation.operationName) {
            case "GetCurrentUser":
              return send({ userProfile: null });
            case "GetUserByExactMatch": {
              const username = String(operation.variables.keyword);
              return send({
                getUserByExactMatch: available.includes(username)
                  ? [{ username, email: null }]
                  : [],
              });
            }
            case "ListLedgerCollaborators":
              listReads();
              return send({
                listLedgerCollaborators: members.map((login, index) => ({
                  id: index + 1,
                  login,
                  lastLogin: null,
                  isAdmin: false,
                  fullName: login,
                  email: null,
                  created: null,
                  active: true,
                  permission: "read",
                })),
              });
            case "AddLedgerCollaborator": {
              const username = String(operation.variables.collaborator);
              writes.push(operation.variables);
              if (refuseSecond && writes.length === 2) {
                return send({
                  addOrUpdateLedgerCollaborator: {
                    success: false,
                    message: "Invitation was refused",
                  },
                });
              }
              const add = () => {
                members.push(username);
                send({
                  addOrUpdateLedgerCollaborator: {
                    success: true,
                    message: null,
                  },
                });
              };
              if (holdFirst && writes.length === 1) pending.push(add);
              else add();
              return;
            }
            default:
              observer.error(
                new Error(`Unexpected operation ${operation.operationName}`),
              );
          }
        }),
    ),
  });
  clients.push(client);
  render(
    <LocalizationProvider localization={createLocalization()}>
      <ApolloProvider client={client}>
        <CollaboratorsSection ledgerId={ledgerId} />
      </ApolloProvider>
    </LocalizationProvider>,
  );
  const user = userEvent.setup();
  const search = () => screen.getByRole("textbox", { name: "Search Users" });
  const choose = async (username: string) => {
    await user.type(search(), username);
    const result = await screen.findByRole("button", {
      name: new RegExp(`${username}$`, "i"),
    });
    result.focus();
    await user.keyboard("{Enter}");
  };
  return { user, search, choose, writes, listReads, pending };
}

const openInvite = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(
    await screen.findByRole("button", { name: "Invite Collaborator" }),
  );

describe("Inviting ledger collaborators", () => {
  it("writes both collaborators sequentially and refreshes the table once", async () => {
    const { user, choose, writes, listReads, pending } = renderSettings({
      holdFirst: true,
    });
    await openInvite(user);
    await choose(available[0]!);
    await choose(available[1]!);
    await user.click(screen.getByRole("button", { name: "Invite (2)" }));
    await waitFor(() => expect(pending).toHaveLength(1));
    expect(writes).toEqual([
      { ledgerId, collaborator: available[0], permission: "read" },
    ]);
    expect(listReads).toHaveBeenCalledOnce();
    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("dialog", { name: "Invite Collaborators" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Invite (2)" })).toBeDisabled();

    await act(async () => pending[0]!());
    await waitFor(() =>
      expect(writes).toEqual(
        available.map((collaborator) => ({
          ledgerId,
          collaborator,
          permission: "read",
        })),
      ),
    );
    expect(
      await screen.findByRole("table", { name: "Collaborators" }),
    ).toHaveTextContent(available[0]!);
    expect(
      screen.getByRole("table", { name: "Collaborators" }),
    ).toHaveTextContent(available[1]!);
    expect(listReads).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenCalledWith("Added 2 collaborators");
  });

  it("keeps only the failed user selected after refreshing the initially empty list", async () => {
    const { user, choose, search, writes, listReads } = renderSettings({
      refuseSecond: true,
    });
    await openInvite(user);
    await choose(available[0]!);
    await choose(available[1]!);
    await user.click(screen.getByRole("button", { name: "Invite (2)" }));
    expect(
      await screen.findByText("Invitation was refused", { exact: false }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Remove fixture-blair" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Remove fixture-alex" }),
    ).toBeNull();
    expect(listReads).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenCalledWith("Added 1 collaborator", {
      description: "fixture-alex",
    });

    await user.type(search(), available[0]!);
    expect(await screen.findByText("No users found")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Invite (1)" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(writes.map((write) => write.collaborator)).toEqual([
      available[0],
      available[1],
      available[1],
    ]);
  });

  it("names removal, returns focus after choosing, and confirms a dirty Escape", async () => {
    const { user, choose, search, writes } = renderSettings();
    await openInvite(user);
    await choose(available[0]!);
    expect(search()).toHaveFocus();
    expect(
      screen.getByRole("button", { name: "Remove fixture-alex" }),
    ).toBeVisible();
    await user.keyboard("{Escape}");
    const confirmation = await screen.findByRole("dialog", {
      name: "Discard what you typed?",
    });
    expect(confirmation).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    await waitFor(() => expect(search()).toHaveFocus());
    expect(
      screen.getByRole("button", { name: "Remove fixture-alex" }),
    ).toBeVisible();
    await user.keyboard("{Escape}");
    await user.click(
      screen.getByRole("button", { name: "Discard", exact: true }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(writes).toHaveLength(0);
  });
});
