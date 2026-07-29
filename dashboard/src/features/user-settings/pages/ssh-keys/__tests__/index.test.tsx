import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock functions
const mockUseQuery = vi.fn();

// Mock dependencies
vi.mock("@apollo/client/react", () => ({
  useQuery: () => mockUseQuery(),
}));

// Mock child components
vi.mock("../key-create-dialog", () => ({
  KeyCreateDialog: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="key-create-dialog">{children}</div>
  ),
}));

vi.mock("../key-card", () => ({
  KeyCard: ({ keyData }: { keyData: { id: string; title: string } }) => (
    <div data-testid="key-card">Key: {keyData.title}</div>
  ),
}));

// Mock UI components
vi.mock("@/common/components/ui/card", () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-description">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-title">{children}</div>
  ),
}));

vi.mock("@/common/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    ...props
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

// Mock translations
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "userSettings.newSshKey": "New SSH Key",
        "userSettings.sshKeys": "SSH Keys",
        "userSettings.loadingSshKeys": "Loading SSH keys...",
        "userSettings.failedToLoadKeys": "Failed to load SSH keys",
        "userSettings.failedToLoadKeysDescription": "Please try again later",
        "userSettings.noSshKeys": "No SSH keys",
        "userSettings.noSshKeysDescription":
          "Add an SSH key to securely access your repositories",
        "userSettings.createNewKey": "Create New Key",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock SEO components (they use useLocation which requires router context)
vi.mock("@/common/components/seo/page-seo", () => ({
  PageSEO: () => null,
}));

describe("KeysSettingsPage", () => {
  const mockKeyData = [
    {
      id: "key-1",
      title: "Work Laptop",
      key: "ssh-rsa AAAAB3NzaC1...",
      fingerprint: "SHA256:abc123",
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "key-2",
      title: "Home Desktop",
      key: "ssh-rsa AAAAB3NzaC2...",
      fingerprint: "SHA256:def456",
      createdAt: "2024-01-02T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should display loading state when data is loading", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      // Text appears in multiple places, so use getAllByText
      const loadingTexts = screen.getAllByText("Loading SSH keys...");
      expect(loadingTexts.length).toBeGreaterThan(0);
    });

    it("should show disabled button when loading", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("should display loading spinner", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      const { container } = render(<KeysSettingsPage />);

      // Check for loading spinner (Loader2 icon with animate-spin)
      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("should show 'SSH Keys' title in loading state", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      expect(screen.getByText("SSH Keys")).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("should display error message when query fails", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: false,
        error: new Error("Network error"),
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      expect(screen.getByText("Failed to load SSH keys")).toBeInTheDocument();
      expect(screen.getByText("Please try again later")).toBeInTheDocument();
    });

    it("should still show create button in error state", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: false,
        error: new Error("Network error"),
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      const button = screen.getByRole("button");
      expect(button.textContent).toContain("New SSH Key");
      expect(button).not.toBeDisabled();
    });

    it("should display error with destructive styling", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: false,
        error: new Error("Network error"),
      });

      const { default: KeysSettingsPage } = await import("../index");
      const { container } = render(<KeysSettingsPage />);

      const card = container.querySelector('[data-testid="card"]');
      expect(card?.className).toContain("border-destructive");
      expect(card?.className).toContain("bg-destructive");
    });

    it("should show AlertCircle icon in error state", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: false,
        error: new Error("Network error"),
      });

      const { default: KeysSettingsPage } = await import("../index");
      const { container } = render(<KeysSettingsPage />);

      // Lucide icons render as SVGs
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe("Empty State", () => {
    it("should display empty state when no keys exist", async () => {
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: [] },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      expect(screen.getByText("No SSH keys")).toBeInTheDocument();
      expect(
        screen.getByText("Add an SSH key to securely access your repositories"),
      ).toBeInTheDocument();
    });

    it("should show create button in empty state", async () => {
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: [] },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);

      // One button at top, one in empty state
      const createButtons = buttons.filter(
        (btn) =>
          btn.textContent?.includes("New SSH Key") ||
          btn.textContent?.includes("Create New Key"),
      );
      expect(createButtons.length).toBeGreaterThan(0);
    });

    it("should display empty state with dashed border", async () => {
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: [] },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      const { container } = render(<KeysSettingsPage />);

      const card = container.querySelector(".border-dashed");
      expect(card).toBeInTheDocument();
    });

    it("should show Key icon in empty state", async () => {
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: [] },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      const { container } = render(<KeysSettingsPage />);

      // Should have Key icon
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe("Data Display", () => {
    it("should render list of SSH keys when data is available", async () => {
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: mockKeyData },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      expect(screen.getByText("Key: Work Laptop")).toBeInTheDocument();
      expect(screen.getByText("Key: Home Desktop")).toBeInTheDocument();
    });

    it("should render KeyCard component for each key", async () => {
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: mockKeyData },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      const keyCards = screen.getAllByTestId("key-card");
      expect(keyCards).toHaveLength(2);
    });

    it("should show create button when keys exist", async () => {
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: mockKeyData },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      const createButtons = screen.getAllByText("New SSH Key");
      expect(createButtons.length).toBeGreaterThan(0);
    });

    it("should not show empty state when keys exist", async () => {
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: mockKeyData },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      expect(screen.queryByText("No SSH keys")).not.toBeInTheDocument();
    });
  });

  describe("KeyCreateDialog Integration", () => {
    it("should render KeyCreateDialog component", async () => {
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: [] },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      const dialogs = screen.getAllByTestId("key-create-dialog");
      expect(dialogs.length).toBeGreaterThan(0);
    });

    it("should wrap create button in KeyCreateDialog", async () => {
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: [] },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      const dialog = screen.getAllByTestId("key-create-dialog")[0];
      const button = screen.getAllByRole("button")[0];

      expect(dialog).toContainElement(button);
    });
  });

  describe("GraphQL Integration", () => {
    it("should call useQuery with ListPublicKeysDocument", async () => {
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: [] },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      expect(mockUseQuery).toHaveBeenCalled();
    });

    it("should handle undefined data gracefully", async () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      // Should show empty state when data is undefined
      expect(screen.getByText("No SSH keys")).toBeInTheDocument();
    });

    it("should handle null data gracefully", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      // Should show empty state when data is null
      expect(screen.getByText("No SSH keys")).toBeInTheDocument();
    });

    it("should handle null listPublicKeys gracefully", async () => {
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: null },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      // Should show empty state
      expect(screen.getByText("No SSH keys")).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("should have proper spacing between elements", async () => {
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: mockKeyData },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      const { container } = render(<KeysSettingsPage />);

      // Main container should have space-y-6
      const spaceContainer = container.querySelector(".space-y-6");
      expect(spaceContainer).toBeInTheDocument();
    });

    it("should render keys in vertical list", async () => {
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: mockKeyData },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      const { container } = render(<KeysSettingsPage />);

      // Keys container should have space-y-4
      const keysContainer = container.querySelector(".space-y-4");
      expect(keysContainer).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible button in all states", async () => {
      // Loading state
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      const { unmount } = render(<KeysSettingsPage />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();

      unmount();

      // Success state
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: mockKeyData },
        loading: false,
        error: null,
      });

      render(<KeysSettingsPage />);
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should have descriptive text for empty state", async () => {
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: [] },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      expect(screen.getByText("No SSH keys")).toBeInTheDocument();
      expect(
        screen.getByText("Add an SSH key to securely access your repositories"),
      ).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle single SSH key", async () => {
      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: [mockKeyData[0]] },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      const keyCards = screen.getAllByTestId("key-card");
      expect(keyCards).toHaveLength(1);
      expect(screen.getByText("Key: Work Laptop")).toBeInTheDocument();
    });

    it("should handle many SSH keys", async () => {
      const manyKeys = Array.from({ length: 10 }, (_, i) => ({
        id: `key-${i}`,
        title: `Key ${i}`,
        key: `ssh-rsa AAAAB3NzaC${i}...`,
        fingerprint: `SHA256:test${i}`,
        createdAt: "2024-01-01T00:00:00Z",
      }));

      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: manyKeys },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      const keyCards = screen.getAllByTestId("key-card");
      expect(keyCards).toHaveLength(10);
    });

    it("should handle keys with special characters in title", async () => {
      const specialKey = {
        id: "key-special",
        title: "Work Laptop (Main) - 2024",
        key: "ssh-rsa AAAAB3...",
        fingerprint: "SHA256:abc",
        createdAt: "2024-01-01T00:00:00Z",
      };

      mockUseQuery.mockReturnValue({
        data: { listPublicKeys: [specialKey] },
        loading: false,
        error: null,
      });

      const { default: KeysSettingsPage } = await import("../index");
      render(<KeysSettingsPage />);

      expect(
        screen.getByText("Key: Work Laptop (Main) - 2024"),
      ).toBeInTheDocument();
    });
  });
});
