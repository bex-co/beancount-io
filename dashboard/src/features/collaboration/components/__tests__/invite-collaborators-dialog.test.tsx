import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InviteCollaboratorsDialog } from "../invite-collaborators-dialog";
import type { SearchUser } from "@/graphql/definitions";

// Mock MultiUserSearch component
let mockSelectedUsers: SearchUser[] = [];

vi.mock("../multi-user-search", () => ({
  MultiUserSearch: ({
    selectedUsers,
    onUsersChange,
  }: {
    selectedUsers: SearchUser[];
    onUsersChange: (users: SearchUser[]) => void;
  }) => {
    mockSelectedUsers = selectedUsers;
    return (
      <div data-testid="multi-user-search">
        <button
          data-testid="add-user-btn"
          onClick={() =>
            onUsersChange([
              ...selectedUsers,
              {
                username: `user${selectedUsers.length + 1}`,
                email: `user${selectedUsers.length + 1}@example.com`,
              },
            ])
          }
        >
          Add User
        </button>
        <span data-testid="selected-count">{selectedUsers.length}</span>
      </div>
    );
  },
}));

describe("InviteCollaboratorsDialog", () => {
  const mockOnInvite = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnInvite.mockResolvedValue(undefined);
    mockSelectedUsers = [];
  });

  describe("Dialog Opening", () => {
    it("should render trigger button", () => {
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      expect(screen.getByText("Invite Collaborator")).toBeInTheDocument();
    });

    it("should open dialog when trigger button is clicked", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("should display dialog title", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        expect(screen.getByText("Invite Collaborators")).toBeInTheDocument();
      });
    });

    it("should display dialog description", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        expect(
          screen.getByText(
            "Search and select users to invite as collaborators to this ledger.",
          ),
        ).toBeInTheDocument();
      });
    });
  });

  describe("MultiUserSearch Integration", () => {
    it("should render MultiUserSearch component in dialog", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        expect(screen.getByTestId("multi-user-search")).toBeInTheDocument();
      });
    });

    it("should pass selectedUsers to MultiUserSearch", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        expect(mockSelectedUsers).toEqual([]);
      });
    });

    it("should update selected users when onUsersChange is called", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        expect(screen.getByTestId("add-user-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("add-user-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("selected-count").textContent).toBe("1");
      });
    });
  });

  describe("Permission Selection", () => {
    it("should render permission select", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        expect(screen.getByText("Permission")).toBeInTheDocument();
      });
    });

    it("should have a permission combobox", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        const combobox = screen.getByRole("combobox");
        expect(combobox).toBeInTheDocument();
      });
    });
  });

  describe("Dialog Actions", () => {
    it("should render Cancel button", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Cancel" }),
        ).toBeInTheDocument();
      });
    });

    it("should render Invite button", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /invite/i }),
        ).toBeInTheDocument();
      });
    });

    it("should disable Invite button when no users selected", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        // Find invite buttons, get the one in the dialog (not the trigger)
        const buttons = screen.getAllByRole("button", { name: /invite/i });
        const dialogInviteButton = buttons.find(
          (btn) => btn.textContent !== "Invite Collaborator",
        );
        expect(dialogInviteButton).toBeDisabled();
      });
    });

    it("should enable Invite button when users are selected", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        expect(screen.getByTestId("add-user-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("add-user-btn"));

      await waitFor(() => {
        const buttons = screen.getAllByRole("button", { name: /invite/i });
        const dialogInviteButton = buttons.find((btn) =>
          btn.textContent?.includes("(1)"),
        );
        expect(dialogInviteButton).not.toBeDisabled();
      });
    });

    it("should show selected user count in Invite button", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        expect(screen.getByTestId("add-user-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("add-user-btn"));

      await waitFor(() => {
        expect(screen.getByText(/\(1\)/)).toBeInTheDocument();
      });
    });

    it("should close dialog when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("should call onInvite with selected users and permission when Invite is clicked", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        expect(screen.getByTestId("add-user-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("add-user-btn"));

      await waitFor(() => {
        const buttons = screen.getAllByRole("button", { name: /invite/i });
        const dialogInviteButton = buttons.find((btn) =>
          btn.textContent?.includes("(1)"),
        );
        expect(dialogInviteButton).not.toBeDisabled();
      });

      const inviteButtons = screen.getAllByRole("button", { name: /invite/i });
      const dialogInviteButton = inviteButtons.find((btn) =>
        btn.textContent?.includes("(1)"),
      )!;
      await user.click(dialogInviteButton);

      await waitFor(() => {
        expect(mockOnInvite).toHaveBeenCalledWith(
          [{ username: "user1", email: "user1@example.com" }],
          "read",
        );
      });
    });

    it("should close dialog after successful invite", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        expect(screen.getByTestId("add-user-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("add-user-btn"));

      const inviteButtons = screen.getAllByRole("button", { name: /invite/i });
      const dialogInviteButton = inviteButtons.find((btn) =>
        btn.textContent?.includes("(1)"),
      )!;
      await user.click(dialogInviteButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("should reset state after closing dialog", async () => {
      const user = userEvent.setup();
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      // Open dialog
      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        expect(screen.getByTestId("add-user-btn")).toBeInTheDocument();
      });

      // Add a user
      await user.click(screen.getByTestId("add-user-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("selected-count").textContent).toBe("1");
      });

      // Cancel
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      // Reopen dialog
      await user.click(screen.getByText("Invite Collaborator"));

      // State should be reset
      await waitFor(() => {
        expect(screen.getByTestId("selected-count").textContent).toBe("0");
      });
    });
  });

  describe("Loading State", () => {
    it("should disable buttons during invite", async () => {
      const user = userEvent.setup();
      // Create a promise we can control to test loading state
      let resolveInvite: () => void;
      const pendingInvite = new Promise<void>((resolve) => {
        resolveInvite = resolve;
      });
      mockOnInvite.mockReturnValue(pendingInvite);

      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      await user.click(screen.getByText("Invite Collaborator"));

      await waitFor(() => {
        expect(screen.getByTestId("add-user-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("add-user-btn"));

      const inviteButtons = screen.getAllByRole("button", { name: /invite/i });
      const dialogInviteButton = inviteButtons.find((btn) =>
        btn.textContent?.includes("(1)"),
      )!;
      await user.click(dialogInviteButton);

      // During loading, buttons should be disabled
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      });

      // Clean up by resolving the pending promise - wrap in waitFor to prevent act() warnings
      await waitFor(async () => {
        resolveInvite!();
      });
    });
  });

  describe("Trigger Button", () => {
    it("should have UserPlus icon", () => {
      const { container } = render(
        <InviteCollaboratorsDialog onInvite={mockOnInvite} />,
      );

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should have correct button styling", () => {
      render(<InviteCollaboratorsDialog onInvite={mockOnInvite} />);

      const button = screen.getByText("Invite Collaborator");
      expect(button).toBeInTheDocument();
    });
  });
});
