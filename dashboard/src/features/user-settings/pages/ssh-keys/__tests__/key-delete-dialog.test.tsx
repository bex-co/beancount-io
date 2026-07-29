import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { KeyDeleteDialog } from "../key-delete-dialog";
import type { PublicKey } from "@/graphql/definitions";

// Mock mutation function
const mockDeleteKeyMutation = vi.fn();

// Mock Apollo Client
vi.mock("@apollo/client/react", () => ({
  useMutation: () => [mockDeleteKeyMutation, { loading: false }],
}));

// Mock translations
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "userSettings.deleteSshKey": "Delete SSH Key",
        "userSettings.deleteSshKeyConfirmation":
          "Are you sure you want to delete",
        "userSettings.cannotBeUndone": "This action cannot be undone.",
        "userSettings.deletingKey": "Deleting...",
        "userSettings.deleteKey": "Delete Key",
        "common.delete": "Delete",
        "common.cancel": "Cancel",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock UI components
vi.mock("@/common/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange: _onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="dialog" data-open={open}>
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-description">{children}</div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-title">{children}</div>
  ),
  DialogTrigger: ({
    children,
    asChild: _asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <div data-testid="dialog-trigger">{children}</div>,
}));

vi.mock("@/common/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

describe("KeyDeleteDialog", () => {
  const mockKeyData: PublicKey = {
    id: "key-123",
    title: "Test SSH Key",
    key: "ssh-rsa AAAAB3NzaC1...",
    fingerprint: "SHA256:abc123def456",
    createdAt: "2024-01-15T10:30:00Z",
    lastUsedAt: null,
    readOnly: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteKeyMutation.mockResolvedValue({
      data: { deletePublicKey: { success: true } },
    });
  });

  describe("Rendering", () => {
    it("should render with default trigger button", () => {
      render(<KeyDeleteDialog keyData={mockKeyData} />);

      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("should render with custom children as trigger", () => {
      render(
        <KeyDeleteDialog keyData={mockKeyData}>
          <button>Remove Key</button>
        </KeyDeleteDialog>,
      );

      expect(screen.getByText("Remove Key")).toBeInTheDocument();
    });

    it("should render dialog structure", () => {
      render(<KeyDeleteDialog keyData={mockKeyData} />);

      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByTestId("dialog-trigger")).toBeInTheDocument();
    });

    it("should render dialog title", () => {
      render(<KeyDeleteDialog keyData={mockKeyData} />);

      expect(screen.getByText("Delete SSH Key")).toBeInTheDocument();
    });
  });

  describe("Dialog Content", () => {
    it("should render confirmation message with key title", () => {
      render(<KeyDeleteDialog keyData={mockKeyData} />);

      expect(
        screen.getByText(/Are you sure you want to delete/),
      ).toBeInTheDocument();
      expect(screen.getByText(/"Test SSH Key"/)).toBeInTheDocument();
    });

    it("should render warning about action being irreversible", () => {
      render(<KeyDeleteDialog keyData={mockKeyData} />);

      const dialogDescription = screen.getByTestId("dialog-description");
      expect(dialogDescription.textContent).toContain(
        "This action cannot be undone.",
      );
    });

    it("should display different key titles correctly", () => {
      const customKeyData = { ...mockKeyData, title: "My Work Laptop Key" };
      render(<KeyDeleteDialog keyData={customKeyData} />);

      expect(screen.getByText(/"My Work Laptop Key"/)).toBeInTheDocument();
    });
  });

  describe("Dialog Footer", () => {
    it("should render Cancel button", () => {
      render(<KeyDeleteDialog keyData={mockKeyData} />);

      expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeInTheDocument();
    });

    it("should render Delete Key button", () => {
      render(<KeyDeleteDialog keyData={mockKeyData} />);

      expect(
        screen.getByRole("button", { name: "Delete Key" }),
      ).toBeInTheDocument();
    });

    it("should have Cancel button with outline variant", () => {
      render(<KeyDeleteDialog keyData={mockKeyData} />);

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      expect(cancelButton).toHaveAttribute("data-variant", "outline");
    });

    it("should have Delete Key button with destructive variant", () => {
      render(<KeyDeleteDialog keyData={mockKeyData} />);

      const deleteButton = screen.getByRole("button", { name: "Delete Key" });
      expect(deleteButton).toHaveAttribute("data-variant", "destructive");
    });
  });

  describe("Default Trigger Button", () => {
    it("should have outline variant", () => {
      render(<KeyDeleteDialog keyData={mockKeyData} />);

      const triggerButton = screen
        .getByTestId("dialog-trigger")
        .querySelector("button");
      expect(triggerButton).toHaveAttribute("data-variant", "outline");
    });

    it("should have sm size", () => {
      render(<KeyDeleteDialog keyData={mockKeyData} />);

      const triggerButton = screen
        .getByTestId("dialog-trigger")
        .querySelector("button");
      expect(triggerButton).toHaveAttribute("data-size", "sm");
    });

    it("should have red text styling class", () => {
      render(<KeyDeleteDialog keyData={mockKeyData} />);

      const triggerButton = screen
        .getByTestId("dialog-trigger")
        .querySelector("button");
      expect(triggerButton?.className).toContain("text-red");
    });
  });

  describe("Dialog State", () => {
    it("should start with dialog closed", () => {
      render(<KeyDeleteDialog keyData={mockKeyData} />);

      const dialog = screen.getByTestId("dialog");
      expect(dialog).toHaveAttribute("data-open", "false");
    });
  });

  describe("Custom Children", () => {
    it("should render custom button as trigger", () => {
      render(
        <KeyDeleteDialog keyData={mockKeyData}>
          <button className="custom-delete">Remove</button>
        </KeyDeleteDialog>,
      );

      expect(screen.getByText("Remove")).toBeInTheDocument();
    });

    it("should render complex children structure", () => {
      render(
        <KeyDeleteDialog keyData={mockKeyData}>
          <div data-testid="custom-trigger">
            <span>🗑️</span>
            <span>Delete</span>
          </div>
        </KeyDeleteDialog>,
      );

      expect(screen.getByTestId("custom-trigger")).toBeInTheDocument();
      expect(screen.getByText("🗑️")).toBeInTheDocument();
    });
  });

  describe("Key Data Props", () => {
    it("should handle key with special characters in title", () => {
      const specialKeyData = {
        ...mockKeyData,
        title: "Key (2024) - Main <laptop>",
      };
      render(<KeyDeleteDialog keyData={specialKeyData} />);

      expect(
        screen.getByText(/"Key \(2024\) - Main <laptop>"/),
      ).toBeInTheDocument();
    });

    it("should handle key with very long title", () => {
      const longTitle = "A".repeat(100);
      const longKeyData = { ...mockKeyData, title: longTitle };
      render(<KeyDeleteDialog keyData={longKeyData} />);

      const dialogDescription = screen.getByTestId("dialog-description");
      expect(dialogDescription.textContent).toContain(longTitle);
    });

    it("should handle key with empty title", () => {
      const emptyKeyData = { ...mockKeyData, title: "" };
      render(<KeyDeleteDialog keyData={emptyKeyData} />);

      const dialogDescription = screen.getByTestId("dialog-description");
      // Empty title renders as just ""
      expect(dialogDescription.textContent).toContain('""');
    });
  });

  describe("Accessibility", () => {
    it("should have descriptive dialog title", () => {
      render(<KeyDeleteDialog keyData={mockKeyData} />);

      expect(screen.getByTestId("dialog-title")).toBeInTheDocument();
      expect(screen.getByText("Delete SSH Key")).toBeInTheDocument();
    });

    it("should have descriptive dialog description", () => {
      render(<KeyDeleteDialog keyData={mockKeyData} />);

      expect(screen.getByTestId("dialog-description")).toBeInTheDocument();
    });

    it("should have clear button labels", () => {
      render(<KeyDeleteDialog keyData={mockKeyData} />);

      expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Delete Key" }),
      ).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle no children gracefully", () => {
      expect(() =>
        render(<KeyDeleteDialog keyData={mockKeyData} />),
      ).not.toThrow();
    });

    it("should render with null children (uses default button)", () => {
      render(<KeyDeleteDialog keyData={mockKeyData}>{null}</KeyDeleteDialog>);

      // Should fall back to default button
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
  });
});
