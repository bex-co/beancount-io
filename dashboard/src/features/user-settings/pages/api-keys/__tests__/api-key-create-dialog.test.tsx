import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiKeysDocument, CreateApiKeyDocument } from "@/graphql/definitions";
import { ApiKeyCreateDialog } from "../api-key-create-dialog";

const mockCreate = vi.fn();
const mockReset = vi.fn();
const mockWriteText = vi.fn();
let mockLoading = false;

vi.mock("@apollo/client/react", () => ({
  useMutation: (document: unknown, options: unknown) => {
    expect(document).toBe(CreateApiKeyDocument);
    expect(options).toEqual({ fetchPolicy: "no-cache" });
    return [mockCreate, { loading: mockLoading, reset: mockReset }];
  },
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error",
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("ApiKeyCreateDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoading = false;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: mockWriteText },
    });
    mockCreate.mockResolvedValue({
      data: {
        createApiKey: {
          plaintext: "bcio_only-shown-once",
          key: { id: "key-1" },
        },
      },
    });
  });

  it("explains the Git HTTPS password and the permissions for reading and pushing", () => {
    render(
      <ApiKeyCreateDialog>
        <button>New token</button>
      </ApiKeyCreateDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "New token" }));

    expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
      /as your Git password over HTTPS/,
    );
    expect(
      screen.getByRole("checkbox", { name: "ledger.read" }).parentElement,
    ).toHaveTextContent("Clone and pull with Git over HTTPS.");
    expect(
      screen.getByRole("checkbox", { name: "ledger.write" }).parentElement,
    ).toHaveTextContent("Push with Git over HTTPS.");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates a least-privilege token and reveals its secret once", async () => {
    render(
      <ApiKeyCreateDialog>
        <button>New token</button>
      </ApiKeyCreateDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "New token" }));
    fireEvent.change(screen.getByLabelText("Token name"), {
      target: { value: "Monthly reporting" },
    });
    fireEvent.change(screen.getByLabelText("Ledger restriction (optional)"), {
      target: { value: "alice/books" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create token" }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        variables: {
          input: {
            name: "Monthly reporting",
            scopes: ["ledger.read"],
            ledgerScope: "alice/books",
            expiresAt: undefined,
          },
        },
        refetchQueries: [ApiKeysDocument],
      }),
    );
    expect(
      await screen.findByDisplayValue("bcio_only-shown-once"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() =>
      expect(mockWriteText).toHaveBeenCalledWith("bcio_only-shown-once"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    fireEvent.click(screen.getByRole("button", { name: "New token" }));
    expect(
      screen.queryByDisplayValue("bcio_only-shown-once"),
    ).not.toBeInTheDocument();
    expect(mockReset).toHaveBeenCalled();
  });

  it("shows creation failures without revealing a secret", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Paid plan required"));
    render(
      <ApiKeyCreateDialog>
        <button>New token</button>
      </ApiKeyCreateDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "New token" }));
    fireEvent.change(screen.getByLabelText("Token name"), {
      target: { value: "CI" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create token" }));

    expect(await screen.findByText("Paid plan required")).toBeInTheDocument();
    expect(screen.queryByText("Copy this token now")).not.toBeInTheDocument();
  });

  it("submits selected scopes and an optional UTC expiry", async () => {
    render(
      <ApiKeyCreateDialog>
        <button>New token</button>
      </ApiKeyCreateDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "New token" }));
    fireEvent.change(screen.getByLabelText("Token name"), {
      target: { value: "Importer" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "ledger.write" }));
    fireEvent.change(screen.getByLabelText("Expiration date (optional)"), {
      target: { value: "2099-12-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create token" }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: {
            input: {
              name: "Importer",
              scopes: ["ledger.read", "ledger.write"],
              ledgerScope: undefined,
              expiresAt: "2099-12-31T23:59:59.999Z",
            },
          },
        }),
      ),
    );
  });

  it("validates required fields and ledger restrictions before mutation", async () => {
    render(
      <ApiKeyCreateDialog>
        <button>New token</button>
      </ApiKeyCreateDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "New token" }));
    fireEvent.click(screen.getByRole("button", { name: "Create token" }));
    expect(await screen.findByText("Enter a token name.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Token name"), {
      target: { value: "CI" },
    });
    fireEvent.change(screen.getByLabelText("Ledger restriction (optional)"), {
      target: { value: "not-a-ledger" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create token" }));
    expect(
      await screen.findByText(
        "Use owner/ledger format for the ledger restriction.",
      ),
    ).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("requires at least one scope", async () => {
    render(
      <ApiKeyCreateDialog>
        <button>New token</button>
      </ApiKeyCreateDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "New token" }));
    fireEvent.change(screen.getByLabelText("Token name"), {
      target: { value: "CI" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "ledger.read" }));
    fireEvent.click(screen.getByRole("button", { name: "Create token" }));

    expect(
      await screen.findByText("Select at least one permission."),
    ).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();

    const firstScope = screen.getByRole("checkbox", { name: "ledger.read" });
    expect(firstScope).toHaveFocus();
    expect(firstScope).toHaveAttribute("aria-invalid", "true");
    expect(firstScope).toHaveAccessibleDescription(
      /Select at least one permission/i,
    );
  });

  it("cannot be dismissed with Escape while creation is in flight", () => {
    mockLoading = true;
    render(
      <ApiKeyCreateDialog>
        <button>New token</button>
      </ApiKeyCreateDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "New token" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  /**
   * A typed token name and chosen permissions vanished on Escape with no
   * question (w2/134, after w2/123).
   */
  describe("asks before discarding what was typed", () => {
    const tokenDialog = () =>
      screen.queryByRole("dialog", { name: "Create personal access token" });
    const confirm = () =>
      screen.queryByRole("dialog", { name: "Discard what you typed?" });
    const renderDialog = () =>
      render(
        <>
          <p>Page behind</p>
          <ApiKeyCreateDialog>
            <button>New token</button>
          </ApiKeyCreateDialog>
        </>,
      );

    it("closes an untouched form at once", async () => {
      const user = userEvent.setup();
      renderDialog();
      await user.click(screen.getByRole("button", { name: "New token" }));
      expect(tokenDialog()).toBeVisible();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(tokenDialog()).toBeNull());
      expect(confirm()).toBeNull();
    });

    // Focus goes back to where it was when leaving was asked for.
    it.each([
      [
        "Escape",
        async (user: ReturnType<typeof userEvent.setup>) =>
          user.keyboard("{Escape}"),
        () => screen.getByLabelText("Token name"),
      ],
      [
        "Close",
        async (user: ReturnType<typeof userEvent.setup>) =>
          user.click(screen.getByRole("button", { name: /^close$/i })),
        () => screen.getByRole("button", { name: /^close$/i }),
      ],
      [
        "Cancel",
        async (user: ReturnType<typeof userEvent.setup>) =>
          user.click(screen.getByRole("button", { name: "Cancel" })),
        () => screen.getByRole("button", { name: "Cancel" }),
      ],
      [
        "an outside click",
        // Radix dismisses on a pointerdown outside its content; the page
        // behind a modal has pointer-events: none, so dispatch it directly.
        async () => {
          fireEvent.pointerDown(screen.getByText("Page behind"));
        },
        () => screen.getByLabelText("Token name"),
      ],
    ])(
      "asks on %s, and Keep editing keeps the form",
      async (_exit, leave, focusTarget) => {
        const user = userEvent.setup();
        renderDialog();
        await user.click(screen.getByRole("button", { name: "New token" }));
        await user.click(
          screen.getByRole("checkbox", { name: "ledger.write" }),
        );
        await user.type(screen.getByLabelText("Token name"), "Importer");

        await leave(user);
        expect(
          await screen.findByRole("dialog", {
            name: "Discard what you typed?",
          }),
        ).toBeVisible();
        await user.click(screen.getByRole("button", { name: "Keep editing" }));

        await waitFor(() => expect(confirm()).toBeNull());
        expect(screen.getByLabelText("Token name")).toHaveValue("Importer");
        expect(
          screen.getByRole("checkbox", { name: "ledger.write" }),
        ).toBeChecked();
        await waitFor(() => expect(focusTarget()).toHaveFocus());
      },
    );

    it("asks for a changed option alone, and Discard resets it", async () => {
      const user = userEvent.setup();
      renderDialog();
      await user.click(screen.getByRole("button", { name: "New token" }));
      await user.click(screen.getByRole("checkbox", { name: "ledger.write" }));
      await user.keyboard("{Escape}");
      await user.click(await screen.findByRole("button", { name: "Discard" }));
      await waitFor(() => expect(tokenDialog()).toBeNull());

      await user.click(screen.getByRole("button", { name: "New token" }));
      expect(
        screen.getByRole("checkbox", { name: "ledger.write" }),
      ).not.toBeChecked();
    });

    it("closes the created token's view without asking", async () => {
      const user = userEvent.setup();
      renderDialog();
      await user.click(screen.getByRole("button", { name: "New token" }));
      await user.type(screen.getByLabelText("Token name"), "CI");
      await user.click(screen.getByRole("button", { name: "Create token" }));
      expect(
        await screen.findByDisplayValue("bcio_only-shown-once"),
      ).toBeInTheDocument();

      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(confirm()).toBeNull();
    });
  });
});
