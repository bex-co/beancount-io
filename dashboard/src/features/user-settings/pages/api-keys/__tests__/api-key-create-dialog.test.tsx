import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
});
