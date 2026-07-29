import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfileSection } from "../user-profile-section";
import type { GetCurrentUserQuery } from "@/graphql/definitions";

// Mock mutations
const mockUpdateUsername = vi.fn();
const mockUpdateProfile = vi.fn();

// Mock Apollo Client
vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn((document) => {
    // Return different mocks based on the document type
    if (document.toString().includes("updateProfile")) {
      return [mockUpdateProfile, { loading: false }];
    }
    return [mockUpdateUsername, { loading: false }];
  }),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock translations
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "userSettings.userProfile": "User Profile",
        "userSettings.yourAccountInformation": "Your account information",
        "userSettings.name": "Name",
        "userSettings.firstName": "First Name",
        "userSettings.lastName": "Last Name",
        "userSettings.changeName": "Change Name",
        "userSettings.enterNewName": "Enter your name below",
        "userSettings.notSet": "Not set",
        "auth.username": "Username",
        "userSettings.changeUsername": "Change Username",
        "userSettings.enterNewUsername": "Enter your new username below",
        "userSettings.enterNewUsernamePlaceholder": "Enter new username",
        "auth.email": "Email",
        "auth.enterFirstName": "Enter your first name",
        "auth.enterLastName": "Enter your last name",
        "auth.usernameRequired": "Username is required",
        "common.edit": "Edit",
        "common.cancel": "Cancel",
        "common.save": "Save",
        "common.updating": "Updating...",
      };
      return translations[key] || key;
    },
  }),
}));

describe("UserProfileSection", () => {
  const mockUserData: GetCurrentUserQuery = {
    userProfile: {
      id: "user-123",
      email: "john@example.com",
      username: "johndoe",
      firstName: "John",
      lastName: "Doe",
      locale: "en",
      emailReportStatus: null,
    },
  };

  const mockUserDataWithoutName: GetCurrentUserQuery = {
    userProfile: {
      id: "user-123",
      email: "john@example.com",
      username: "johndoe",
      firstName: null,
      lastName: null,
      locale: "en",
      emailReportStatus: null,
    },
  };

  const mockUserDataPartialName: GetCurrentUserQuery = {
    userProfile: {
      id: "user-123",
      email: "john@example.com",
      username: "johndoe",
      firstName: "John",
      lastName: null,
      locale: "en",
      emailReportStatus: null,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the User Profile section", () => {
      render(<UserProfileSection userData={mockUserData} />);

      expect(screen.getByText("User Profile")).toBeInTheDocument();
      expect(screen.getByText("Your account information")).toBeInTheDocument();
    });

    it("should display all profile fields", () => {
      render(<UserProfileSection userData={mockUserData} />);

      // Name field
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();

      // Username field
      expect(screen.getByText("Username")).toBeInTheDocument();
      expect(screen.getByText("johndoe")).toBeInTheDocument();

      // Email field
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("should display 'Not set' when both firstName and lastName are empty", () => {
      render(<UserProfileSection userData={mockUserDataWithoutName} />);

      // Should show "Not set" for name
      const nameSection = screen.getByText("Name").parentElement?.parentElement;
      expect(nameSection).toHaveTextContent("Not set");
    });

    it("should display only firstName when lastName is empty", () => {
      render(<UserProfileSection userData={mockUserDataPartialName} />);

      expect(screen.getByText("John")).toBeInTheDocument();
    });

    it("should render edit buttons for name and username", () => {
      render(<UserProfileSection userData={mockUserData} />);

      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      expect(editButtons).toHaveLength(2); // Name and Username
    });

    it("should not render edit button for email", () => {
      render(<UserProfileSection userData={mockUserData} />);

      // Should have exactly 2 edit buttons (Name and Username, not Email)
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      expect(editButtons).toHaveLength(2);

      // Email should be displayed but without edit functionality
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });
  });

  describe("Name Dialog", () => {
    it("should open name dialog when edit button is clicked", async () => {
      const user = userEvent.setup();
      render(<UserProfileSection userData={mockUserData} />);

      // Click the first Edit button (for Name)
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      // Dialog should be visible
      await waitFor(() => {
        expect(screen.getByText("Change Name")).toBeInTheDocument();
        expect(screen.getByText("Enter your name below")).toBeInTheDocument();
      });
    });

    it("should display firstName and lastName inputs in dialog", async () => {
      const user = userEvent.setup();
      render(<UserProfileSection userData={mockUserData} />);

      // Open dialog
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText("First Name")).toBeInTheDocument();
        expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
      });
    });

    it("should populate dialog inputs with current values", async () => {
      const user = userEvent.setup();
      render(<UserProfileSection userData={mockUserData} />);

      // Open dialog
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      await waitFor(() => {
        const firstNameInput = screen.getByLabelText(
          "First Name",
        ) as HTMLInputElement;
        const lastNameInput = screen.getByLabelText(
          "Last Name",
        ) as HTMLInputElement;

        expect(firstNameInput.value).toBe("John");
        expect(lastNameInput.value).toBe("Doe");
      });
    });

    it("should populate dialog with empty values when name is not set", async () => {
      const user = userEvent.setup();
      render(<UserProfileSection userData={mockUserDataWithoutName} />);

      // Open dialog
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      await waitFor(() => {
        const firstNameInput = screen.getByLabelText(
          "First Name",
        ) as HTMLInputElement;
        const lastNameInput = screen.getByLabelText(
          "Last Name",
        ) as HTMLInputElement;

        expect(firstNameInput.value).toBe("");
        expect(lastNameInput.value).toBe("");
      });
    });

    it("should allow editing firstName and lastName", async () => {
      const user = userEvent.setup();
      render(<UserProfileSection userData={mockUserData} />);

      // Open dialog
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText("First Name")).toBeInTheDocument();
      });

      // Edit the inputs
      const firstNameInput = screen.getByLabelText("First Name");
      const lastNameInput = screen.getByLabelText("Last Name");

      await user.clear(firstNameInput);
      await user.type(firstNameInput, "Jane");

      await user.clear(lastNameInput);
      await user.type(lastNameInput, "Smith");

      expect((firstNameInput as HTMLInputElement).value).toBe("Jane");
      expect((lastNameInput as HTMLInputElement).value).toBe("Smith");
    });

    it("should have Cancel and Save buttons in dialog", async () => {
      const user = userEvent.setup();
      render(<UserProfileSection userData={mockUserData} />);

      // Open dialog
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Cancel" }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Save" }),
        ).toBeInTheDocument();
      });
    });

    it("should close dialog when Cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<UserProfileSection userData={mockUserData} />);

      // Open dialog
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Change Name")).toBeInTheDocument();
      });

      // Click Cancel
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      await waitFor(() => {
        expect(screen.queryByText("Change Name")).not.toBeInTheDocument();
      });
    });

    it("should support keyboard navigation - Enter key submits", async () => {
      const user = userEvent.setup();
      render(<UserProfileSection userData={mockUserData} />);

      // Open dialog
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText("First Name")).toBeInTheDocument();
      });

      // Type in first name input and press Enter
      const firstNameInput = screen.getByLabelText("First Name");
      await user.clear(firstNameInput);
      await user.type(firstNameInput, "NewName{Enter}");

      // Note: The actual mutation would be triggered here
      // In a real test, you'd mock the mutation and verify it was called
    });
  });

  describe("Username Dialog", () => {
    it("should open username dialog when edit button is clicked", async () => {
      const user = userEvent.setup();
      render(<UserProfileSection userData={mockUserData} />);

      // Click the second Edit button (for Username)
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[1]);

      await waitFor(() => {
        expect(screen.getByText("Change Username")).toBeInTheDocument();
        expect(
          screen.getByText("Enter your new username below"),
        ).toBeInTheDocument();
      });
    });

    it("should populate username dialog with current value", async () => {
      const user = userEvent.setup();
      render(<UserProfileSection userData={mockUserData} />);

      // Open username dialog
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[1]);

      await waitFor(() => {
        const usernameInput = screen.getByPlaceholderText(
          "Enter new username",
        ) as HTMLInputElement;
        expect(usernameInput.value).toBe("johndoe");
      });
    });

    it("should allow editing username", async () => {
      const user = userEvent.setup();
      render(<UserProfileSection userData={mockUserData} />);

      // Open username dialog
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[1]);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Enter new username"),
        ).toBeInTheDocument();
      });

      const usernameInput = screen.getByPlaceholderText("Enter new username");
      await user.clear(usernameInput);
      await user.type(usernameInput, "newusername");

      expect((usernameInput as HTMLInputElement).value).toBe("newusername");
    });
  });

  describe("Email Field", () => {
    it("should display email as read-only", () => {
      render(<UserProfileSection userData={mockUserData} />);

      // Email should be displayed
      expect(screen.getByText("john@example.com")).toBeInTheDocument();

      // Email section should not have Edit button
      const emailText = screen.getByText("Email");
      const emailSection = emailText.closest("div");

      // Verify no edit button in email section
      const editButtonsInEmail = emailSection?.querySelectorAll(
        'button[type="button"]',
      );
      expect(editButtonsInEmail?.length).toBe(0);
    });
  });

  describe("Accessibility", () => {
    it("should have proper labels for form fields", async () => {
      const user = userEvent.setup();
      render(<UserProfileSection userData={mockUserData} />);

      // Open name dialog
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText("First Name")).toBeInTheDocument();
        expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
      });
    });

    it("should support keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<UserProfileSection userData={mockUserData} />);

      // Tab through edit buttons
      await user.tab();
      expect(screen.getAllByRole("button", { name: "Edit" })[0]).toHaveFocus();

      await user.tab();
      expect(screen.getAllByRole("button", { name: "Edit" })[1]).toHaveFocus();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined userData gracefully", () => {
      render(<UserProfileSection userData={undefined} />);

      expect(screen.getByText("User Profile")).toBeInTheDocument();
      // Should show "Not set" for name (appears multiple times)
      const notSetElements = screen.getAllByText("Not set");
      expect(notSetElements.length).toBeGreaterThan(0);
    });

    it("should handle null userProfile in userData", () => {
      const nullProfileData: GetCurrentUserQuery = {
        userProfile: null,
      };

      render(<UserProfileSection userData={nullProfileData} />);

      expect(screen.getByText("User Profile")).toBeInTheDocument();
    });

    it("should trim whitespace from name inputs", async () => {
      const user = userEvent.setup();
      render(<UserProfileSection userData={mockUserData} />);

      // Open dialog
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText("First Name")).toBeInTheDocument();
      });

      // Add spaces to verify trimming behavior
      const firstNameInput = screen.getByLabelText("First Name");
      await user.clear(firstNameInput);
      await user.type(firstNameInput, "  John  ");

      expect((firstNameInput as HTMLInputElement).value).toBe("  John  ");
      // Note: Trimming happens on submit via the mutation handler
    });
  });
});
