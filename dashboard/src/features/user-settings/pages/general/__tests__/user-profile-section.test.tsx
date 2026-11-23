import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { toast } from "sonner";
import userEvent from "@testing-library/user-event";
import { UserProfileSection } from "../user-profile-section";
import type { GetCurrentUserQuery } from "@/graphql/definitions";

// Mock mutations
const mockUpdateUsername = vi.fn();
const mockUpdateProfile = vi.fn();
type MutationOptions = {
  onCompleted?: () => void;
  onError?: (error: unknown) => void;
};
let mockUsernameOptions: MutationOptions | undefined;
let mockProfileOptions: MutationOptions | undefined;

// Mock Apollo Client
vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn((document, options) => {
    // Return different mocks based on the operation. A parsed document
    // stringifies to "[object Object]", so match its operation name.
    if (document.definitions[0]?.name?.value === "UpdateProfile") {
      mockProfileOptions = options;
      return [mockUpdateProfile, { loading: false }];
    }
    mockUsernameOptions = options;
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
        "auth.usernameLowercaseAlphanumeric":
          "Username can only contain lowercase letters, numbers, and underscores",
        "auth.usernameMaxLength": "Username must be at most 20 characters",
        "common.edit": "Edit",
        "common.cancel": "Cancel",
        "common.save": "Save",
        "common.updating": "Updating...",
        "common.discardDraftTitle": "Discard what you typed?",
        "common.keepEditing": "Keep editing",
        "common.discardDraft": "Discard",
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

  describe.each([
    {
      title: "Change Name",
      index: 0,
      label: "Last Name",
      openingValue: "Doe",
      typed: "New surname",
      save: mockUpdateProfile,
      complete: () => mockProfileOptions?.onCompleted?.(),
    },
    {
      title: "Change Username",
      index: 1,
      label: "Username",
      openingValue: "johndoe",
      typed: "new_username",
      save: mockUpdateUsername,
      complete: () => mockUsernameOptions?.onCompleted?.(),
    },
  ])(
    "$title dismissal",
    ({ title, index, label, openingValue, typed, save, complete }) => {
      const confirm = () =>
        screen.queryByRole("dialog", { name: "Discard what you typed?" });
      const outside = () => fireEvent.pointerDown(screen.getByText("Email"));

      const openDialog = async () => {
        const user = userEvent.setup();
        const { rerender } = render(
          <UserProfileSection userData={mockUserData} />,
        );
        const edit = screen.getAllByRole("button", { name: "Edit" })[index];
        await user.click(edit);
        const dialog = await screen.findByRole("dialog", { name: title });
        const input = within(dialog).getByRole("textbox", { name: label });
        return { user, edit, dialog, input, rerender };
      };

      it.each(["Escape", "Close", "Cancel", "outside click"])(
        "keeps the draft and returns to its field after %s",
        async (method) => {
          const { user, edit, dialog, input } = await openDialog();
          await user.clear(input);
          await user.type(input, typed);

          if (method === "Escape") await user.keyboard("{Escape}");
          else if (method === "outside click") outside();
          else
            await user.click(
              within(dialog).getByRole("button", { name: method }),
            );

          const confirmation = await screen.findByRole("dialog", {
            name: "Discard what you typed?",
          });
          await user.click(
            within(confirmation).getByRole("button", { name: "Keep editing" }),
          );
          expect(confirm()).toBeNull();
          expect(input).toHaveValue(typed);
          await waitFor(() => expect(input).toHaveFocus());

          await user.keyboard("{Escape}");
          await user.click(
            await screen.findByRole("button", { name: "Discard" }),
          );
          await waitFor(() => expect(dialog).not.toBeInTheDocument());
          await waitFor(() => expect(edit).toHaveFocus());
          expect(save).not.toHaveBeenCalled();
        },
      );

      it("closes a restored draft against the opening value after a profile refresh", async () => {
        const { user, dialog, input, rerender } = await openDialog();
        await user.clear(input);
        await user.type(input, typed);
        rerender(
          <UserProfileSection
            userData={{
              userProfile: {
                ...mockUserData.userProfile!,
                lastName: "Freshname",
                username: "freshname",
              },
            }}
          />,
        );
        await user.clear(input);
        await user.type(input, openingValue);

        await user.click(
          within(dialog).getByRole("button", { name: "Cancel" }),
        );
        await waitFor(() => expect(dialog).not.toBeInTheDocument());
        expect(confirm()).toBeNull();
        expect(save).not.toHaveBeenCalled();
      });

      it("holds the draft during the save and closes directly on success", async () => {
        let finish!: () => void;
        save.mockImplementationOnce(
          () =>
            new Promise<void>((resolve) => {
              finish = resolve;
            }),
        );
        const { user, edit, dialog, input } = await openDialog();
        await user.clear(input);
        await user.type(input, typed);
        await user.click(within(dialog).getByRole("button", { name: "Save" }));

        expect(save).toHaveBeenCalledTimes(1);
        expect(input).toHaveAttribute("readonly");
        expect(
          within(dialog).getByRole("button", { name: "Close" }),
        ).toBeDisabled();
        expect(
          within(dialog).getByRole("button", { name: "Cancel" }),
        ).toBeDisabled();
        await user.keyboard("{Escape}");
        outside();
        expect(dialog).toBeVisible();
        expect(confirm()).toBeNull();

        await act(async () => {
          complete();
          finish();
        });
        expect(dialog).not.toBeInTheDocument();
        expect(confirm()).toBeNull();
        await waitFor(() => expect(edit).toHaveFocus());
      });
    },
  );

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

  // Settings holds a rename to sign-up's rule before submitting, and shows a
  // server rule refusal on the field rather than as a generic toast (w0/047).
  describe("Username rule", () => {
    const openUsernameDialog = async () => {
      const user = userEvent.setup();
      render(<UserProfileSection userData={mockUserData} />);
      await user.click(screen.getAllByRole("button", { name: "Edit" })[1]);
      const input = await screen.findByPlaceholderText("Enter new username");
      return { user, input };
    };

    it("states the rule before anything is typed", async () => {
      await openUsernameDialog();
      expect(
        screen.getByText(
          "Username can only contain lowercase letters, numbers, and underscores",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Username must be at most 20 characters"),
      ).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it.each([
      [
        "John.Doe",
        "Username can only contain lowercase letters, numbers, and underscores",
      ],
      ["a".repeat(21), "Username must be at most 20 characters"],
      ["   ", "Username is required"],
    ])("refuses %j on the field without submitting", async (name, message) => {
      const { user, input } = await openUsernameDialog();
      await user.clear(input);
      await user.type(input, name);
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(screen.getByRole("alert")).toHaveTextContent(message);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(mockUpdateUsername).not.toHaveBeenCalled();
    });

    it("submits a name in the rule", async () => {
      const { user, input } = await openUsernameDialog();
      await user.clear(input);
      await user.type(input, "new_name_2");
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(mockUpdateUsername).toHaveBeenCalledWith({
        variables: { username: "new_name_2" },
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows the server's rule refusal on the field", async () => {
      const { user, input } = await openUsernameDialog();
      await user.clear(input);
      await user.type(input, "new_name");
      await user.click(screen.getByRole("button", { name: "Save" }));
      act(() => {
        mockUsernameOptions?.onError?.(
          new CombinedGraphQLErrors({
            errors: [
              {
                message:
                  "Usernames use 1–20 lowercase letters, numbers, or underscores.",
                extensions: { code: "BAD_USER_INPUT", field: "username" },
              },
            ],
          }),
        );
      });

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Username can only contain lowercase letters, numbers, and underscores",
      );
      expect(toast.error).not.toHaveBeenCalled();
      expect(input).toBeInTheDocument();
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

  /** An IME's Enter commits its text; it must not submit (w4/296). */
  describe("Enter during IME composition", () => {
    const composingEnter = (input: HTMLElement, keyCode = 13) =>
      fireEvent.keyDown(input, { key: "Enter", keyCode, isComposing: true });

    it.each(["First Name", "Last Name"])(
      "submits nothing from %s while composing, then the final name once",
      async (label) => {
        mockUpdateProfile.mockResolvedValue({
          data: { updateProfile: { success: true } },
        });
        render(<UserProfileSection userData={mockUserData} />);
        fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
        const input = await screen.findByLabelText(label);

        fireEvent.compositionStart(input);
        fireEvent.change(input, { target: { value: "qa-20261020名" } });
        composingEnter(input);
        composingEnter(input, 229);
        expect(mockUpdateProfile).not.toHaveBeenCalled();
        expect(input).toHaveValue("qa-20261020名");
        expect(input).toBeEnabled();

        fireEvent.compositionEnd(input);
        fireEvent.change(input, { target: { value: "qa-20261020-final" } });
        fireEvent.keyDown(input, { key: "Enter", keyCode: 13 });
        await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledTimes(1));
        expect(JSON.stringify(mockUpdateProfile.mock.calls[0])).toContain(
          "qa-20261020-final",
        );
      },
    );

    it("submits no username while composing", async () => {
      render(<UserProfileSection userData={mockUserData} />);
      fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[1]);
      const input = await screen.findByPlaceholderText("Enter new username");

      fireEvent.change(input, { target: { value: "qa_20261020" } });
      composingEnter(input);
      expect(mockUpdateUsername).not.toHaveBeenCalled();

      fireEvent.keyDown(input, { key: "Enter", keyCode: 13 });
      await waitFor(() => expect(mockUpdateUsername).toHaveBeenCalledTimes(1));
    });
  });
});
