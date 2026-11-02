import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetCurrentUserDocument } from "@/graphql/definitions";
import { CollaboratorsSection } from "../collaborators-section";

const { mockAdd, mockToast, viewer } = vi.hoisted(() => ({
  mockAdd: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
  viewer: { username: "alice" },
}));

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@apollo/client/react", () => ({
  useQuery: (document: unknown) =>
    document === GetCurrentUserDocument
      ? { data: { userProfile: { username: viewer.username } } }
      : { data: { listLedgerCollaborators: [] }, loading: false },
  useMutation: () => [mockAdd, { loading: false }],
}));
vi.mock("sonner", () => ({ toast: mockToast }));
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
vi.mock(
  "@/features/collaboration/components/invite-collaborators-dialog",
  () => ({
    InviteCollaboratorsDialog: ({
      onInvite,
    }: {
      onInvite: (users: { username: string }[], permission: string) => void;
    }) => (
      <button onClick={() => onInvite([{ username: "newcomer" }], "write")}>
        invite
      </button>
    ),
  }),
);

const limitReached = () =>
  new CombinedGraphQLErrors({
    errors: [
      {
        message: "This ledger's owner is on the Free plan…",
        extensions: {
          code: "RESOURCE_LIMIT_REACHED",
          limitOwner: "LEDGER_OWNER",
        },
      },
    ],
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("adding a collaborator past a plan limit (w1/181)", () => {
  it("tells someone else's admin that only the owner's plan can lift the limit", async () => {
    viewer.username = "alice";
    mockAdd.mockRejectedValue(limitReached());
    render(<CollaboratorsSection ledgerId="bob/books" />);

    await userEvent.click(screen.getByRole("button", { name: "invite" }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "collaboration.failedToAddCollaborator",
      { description: "collaboration.ownerPlanLimitReached" },
    );
  });

  it("tells the owner their own plan's limit, as any other limit reads", async () => {
    viewer.username = "Bob";
    mockAdd.mockRejectedValue(limitReached());
    render(<CollaboratorsSection ledgerId="bob/books" />);

    await userEvent.click(screen.getByRole("button", { name: "invite" }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "collaboration.failedToAddCollaborator",
      { description: "common.errors.resourceLimitReached" },
    );
  });
});
