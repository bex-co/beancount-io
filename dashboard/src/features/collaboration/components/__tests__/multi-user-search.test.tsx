import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MultiUserSearch } from "../multi-user-search";
import type {
  SearchUser,
  GetUserByExactMatchQuery,
} from "@/graphql/definitions";

// Mock Apollo Client
const mockUseQuery = vi.fn();

vi.mock("@apollo/client/react", () => ({
  useQuery: () => mockUseQuery(),
}));

describe("MultiUserSearch", () => {
  const mockOnUsersChange = vi.fn();

  const createMockSearchResult = (
    users: Array<{ username: string; email: string }>,
  ): { data: GetUserByExactMatchQuery; loading: boolean; error: null } => ({
    data: {
      getUserByExactMatch: users.map((u) => ({
        ...u,
        __typename: "SearchUser" as const,
      })),
    },
    loading: false,
    error: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: null,
    });
  });

  describe("Rendering", () => {
    it("should render search input", () => {
      render(
        <MultiUserSearch
          selectedUsers={[]}
          onUsersChange={mockOnUsersChange}
        />,
      );

      expect(
        screen.getByPlaceholderText("Type to search users..."),
      ).toBeInTheDocument();
    });

    it("should render search icon", () => {
      const { container } = render(
        <MultiUserSearch
          selectedUsers={[]}
          onUsersChange={mockOnUsersChange}
        />,
      );

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render label for search input", () => {
      render(
        <MultiUserSearch
          selectedUsers={[]}
          onUsersChange={mockOnUsersChange}
        />,
      );

      expect(screen.getByText("Search Users")).toBeInTheDocument();
    });
  });

  describe("Search Input", () => {
    it("should update input value when typing", async () => {
      const user = userEvent.setup();
      render(
        <MultiUserSearch
          selectedUsers={[]}
          onUsersChange={mockOnUsersChange}
        />,
      );

      const input = screen.getByPlaceholderText("Type to search users...");
      await user.type(input, "test");

      expect(input).toHaveValue("test");
    });

    it("should not show dropdown with less than 2 characters", async () => {
      const user = userEvent.setup();
      render(
        <MultiUserSearch
          selectedUsers={[]}
          onUsersChange={mockOnUsersChange}
        />,
      );

      const input = screen.getByPlaceholderText("Type to search users...");
      await user.type(input, "a");

      // Dropdown should not be visible (message doesn't appear with less than 2 chars)
      await waitFor(() => {
        expect(
          screen.queryByText("Please enter at least 2 characters"),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Search Results", () => {
    it("should show loading state while searching", async () => {
      const user = userEvent.setup();
      mockUseQuery.mockReturnValue({
        data: undefined,
        loading: true,
        error: null,
      });

      render(
        <MultiUserSearch
          selectedUsers={[]}
          onUsersChange={mockOnUsersChange}
        />,
      );

      const input = screen.getByPlaceholderText("Type to search users...");
      await user.type(input, "test");

      // Dropdown should show searching state
      await waitFor(() => {
        expect(screen.getByText("Searching...")).toBeInTheDocument();
      });
    });

    it("should show no results message when no users found", async () => {
      const user = userEvent.setup();
      mockUseQuery.mockReturnValue(createMockSearchResult([]));

      render(
        <MultiUserSearch
          selectedUsers={[]}
          onUsersChange={mockOnUsersChange}
        />,
      );

      const input = screen.getByPlaceholderText("Type to search users...");
      await user.type(input, "nonexistent");

      await waitFor(() => {
        expect(screen.getByText("No users found")).toBeInTheDocument();
      });
    });

    it("should display search results", async () => {
      const user = userEvent.setup();
      mockUseQuery.mockReturnValue(
        createMockSearchResult([
          { username: "johndoe", email: "john@example.com" },
        ]),
      );

      render(
        <MultiUserSearch
          selectedUsers={[]}
          onUsersChange={mockOnUsersChange}
        />,
      );

      const input = screen.getByPlaceholderText("Type to search users...");
      await user.type(input, "john");

      await waitFor(() => {
        expect(screen.getByText("johndoe")).toBeInTheDocument();
        expect(screen.getByText("john@example.com")).toBeInTheDocument();
      });
    });

    it("should filter out already selected users from results", async () => {
      const user = userEvent.setup();
      const selectedUser: SearchUser = {
        __typename: "SearchUser",
        username: "johndoe",
        email: "john@example.com",
      };

      mockUseQuery.mockReturnValue(
        createMockSearchResult([
          { username: "johndoe", email: "john@example.com" },
          { username: "janedoe", email: "jane@example.com" },
        ]),
      );

      render(
        <MultiUserSearch
          selectedUsers={[selectedUser]}
          onUsersChange={mockOnUsersChange}
        />,
      );

      const input = screen.getByPlaceholderText("Type to search users...");
      await user.type(input, "doe");

      await waitFor(() => {
        // janedoe should be in search results
        expect(screen.getByText("janedoe")).toBeInTheDocument();
        // The search results should only contain janedoe, not johndoe
        // (johndoe is already selected and shown in Selected Users section)
        const johndoeElements = screen.getAllByText("johndoe");
        // There should be only one johndoe element (the one in Selected Users section)
        expect(johndoeElements).toHaveLength(1);
      });
    });
  });

  describe("User Selection", () => {
    it("should call onUsersChange when a user is selected", async () => {
      const user = userEvent.setup();
      mockUseQuery.mockReturnValue(
        createMockSearchResult([
          { username: "johndoe", email: "john@example.com" },
        ]),
      );

      render(
        <MultiUserSearch
          selectedUsers={[]}
          onUsersChange={mockOnUsersChange}
        />,
      );

      const input = screen.getByPlaceholderText("Type to search users...");
      await user.type(input, "john");

      await waitFor(() => {
        expect(screen.getByText("johndoe")).toBeInTheDocument();
      });

      await user.click(screen.getByText("johndoe"));

      expect(mockOnUsersChange).toHaveBeenCalledWith([
        {
          username: "johndoe",
          email: "john@example.com",
          __typename: "SearchUser",
        },
      ]);
    });

    it("should clear input after selection", async () => {
      const user = userEvent.setup();
      mockUseQuery.mockReturnValue(
        createMockSearchResult([
          { username: "johndoe", email: "john@example.com" },
        ]),
      );

      render(
        <MultiUserSearch
          selectedUsers={[]}
          onUsersChange={mockOnUsersChange}
        />,
      );

      const input = screen.getByPlaceholderText("Type to search users...");
      await user.type(input, "john");

      await waitFor(() => {
        expect(screen.getByText("johndoe")).toBeInTheDocument();
      });

      await user.click(screen.getByText("johndoe"));

      expect(input).toHaveValue("");
    });
  });

  describe("Selected Users Display", () => {
    it("should display selected users", () => {
      const selectedUsers: SearchUser[] = [
        {
          __typename: "SearchUser",
          username: "johndoe",
          email: "john@example.com",
        },
      ];

      render(
        <MultiUserSearch
          selectedUsers={selectedUsers}
          onUsersChange={mockOnUsersChange}
        />,
      );

      expect(screen.getByText("Selected Users")).toBeInTheDocument();
      expect(screen.getByText("johndoe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("should display multiple selected users", () => {
      const selectedUsers: SearchUser[] = [
        {
          __typename: "SearchUser",
          username: "johndoe",
          email: "john@example.com",
        },
        {
          __typename: "SearchUser",
          username: "janedoe",
          email: "jane@example.com",
        },
      ];

      render(
        <MultiUserSearch
          selectedUsers={selectedUsers}
          onUsersChange={mockOnUsersChange}
        />,
      );

      expect(screen.getByText("johndoe")).toBeInTheDocument();
      expect(screen.getByText("janedoe")).toBeInTheDocument();
    });

    it("should not show selected users section when no users selected", () => {
      render(
        <MultiUserSearch
          selectedUsers={[]}
          onUsersChange={mockOnUsersChange}
        />,
      );

      expect(screen.queryByText("Selected Users")).not.toBeInTheDocument();
    });
  });

  describe("User Removal", () => {
    it("should render remove button for each selected user", () => {
      const selectedUsers: SearchUser[] = [
        {
          __typename: "SearchUser",
          username: "johndoe",
          email: "john@example.com",
        },
      ];

      render(
        <MultiUserSearch
          selectedUsers={selectedUsers}
          onUsersChange={mockOnUsersChange}
        />,
      );

      const removeButtons = screen.getAllByRole("button");
      expect(removeButtons.length).toBeGreaterThan(0);
    });

    it("should call onUsersChange when remove button is clicked", async () => {
      const user = userEvent.setup();
      const selectedUsers: SearchUser[] = [
        {
          __typename: "SearchUser",
          username: "johndoe",
          email: "john@example.com",
        },
        {
          __typename: "SearchUser",
          username: "janedoe",
          email: "jane@example.com",
        },
      ];

      render(
        <MultiUserSearch
          selectedUsers={selectedUsers}
          onUsersChange={mockOnUsersChange}
        />,
      );

      // Find remove buttons (X icons)
      const removeButtons = screen.getAllByRole("button");
      await user.click(removeButtons[0]);

      expect(mockOnUsersChange).toHaveBeenCalledWith([
        {
          __typename: "SearchUser",
          username: "janedoe",
          email: "jane@example.com",
        },
      ]);
    });
  });

  describe("Avatar Display", () => {
    it("should display avatar initials for search results", async () => {
      const user = userEvent.setup();
      mockUseQuery.mockReturnValue(
        createMockSearchResult([
          { username: "johndoe", email: "john@example.com" },
        ]),
      );

      render(
        <MultiUserSearch
          selectedUsers={[]}
          onUsersChange={mockOnUsersChange}
        />,
      );

      const input = screen.getByPlaceholderText("Type to search users...");
      await user.type(input, "john");

      await waitFor(() => {
        // Avatar fallback should show initials (JO for johndoe)
        expect(screen.getByText("J")).toBeInTheDocument();
      });
    });

    it("should display avatar initials for selected users", () => {
      const selectedUsers: SearchUser[] = [
        {
          __typename: "SearchUser",
          username: "johndoe",
          email: "john@example.com",
        },
      ];

      render(
        <MultiUserSearch
          selectedUsers={selectedUsers}
          onUsersChange={mockOnUsersChange}
        />,
      );

      // Avatar fallback should show initials (JO for johndoe)
      expect(screen.getByText("J")).toBeInTheDocument();
    });
  });

  describe("Dropdown Behavior", () => {
    it("should close dropdown on blur (click outside)", async () => {
      const user = userEvent.setup();
      mockUseQuery.mockReturnValue(
        createMockSearchResult([
          { username: "johndoe", email: "john@example.com" },
        ]),
      );

      render(
        <div>
          <div data-testid="outside">Outside</div>
          <MultiUserSearch
            selectedUsers={[]}
            onUsersChange={mockOnUsersChange}
          />
        </div>,
      );

      const input = screen.getByPlaceholderText("Type to search users...");
      await user.type(input, "john");

      await waitFor(() => {
        expect(screen.getByText("johndoe")).toBeInTheDocument();
      });

      // Click outside
      await user.click(screen.getByTestId("outside"));

      await waitFor(() => {
        // Dropdown should be closed (results not visible)
        expect(screen.queryByText("johndoe")).not.toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty username in initials", () => {
      const selectedUsers: SearchUser[] = [
        { __typename: "SearchUser", username: "", email: "test@example.com" },
      ];

      render(
        <MultiUserSearch
          selectedUsers={selectedUsers}
          onUsersChange={mockOnUsersChange}
        />,
      );

      // Should handle empty username gracefully
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("should handle single character username", async () => {
      const user = userEvent.setup();
      mockUseQuery.mockReturnValue(
        createMockSearchResult([{ username: "a", email: "a@example.com" }]),
      );

      render(
        <MultiUserSearch
          selectedUsers={[]}
          onUsersChange={mockOnUsersChange}
        />,
      );

      const input = screen.getByPlaceholderText("Type to search users...");
      await user.type(input, "aa");

      await waitFor(() => {
        expect(screen.getByText("a")).toBeInTheDocument();
      });
    });
  });
});
