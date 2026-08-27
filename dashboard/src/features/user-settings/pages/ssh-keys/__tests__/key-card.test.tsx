import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { KeyCard } from "../key-card";
import type { PublicKey } from "@/graphql/definitions";

// Mock dependencies
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "userSettings.neverUsed": "Never used",
        "userSettings.lastUsedWeek": "Used this week",
        "userSettings.lastUsed3Weeks": "Used within 3 weeks",
        "userSettings.lastUsed3Months": "Used within 3 months",
        "userSettings.fingerprint": "fingerprint",
        "userSettings.lastUsedLongAgo": "Used long ago",
        "userSettings.added": "Added",
        "common.delete": "Delete",
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock("@/common/lib/format/format", () => ({
  formatDateISO: (date: string) => {
    return new Date(date).toISOString().split("T")[0];
  },
}));

vi.mock("../key-delete-dialog", () => ({
  KeyDeleteDialog: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="key-delete-dialog">{children}</div>
  ),
}));

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
}));

vi.mock("@/common/components/ui/button", () => ({
  Button: ({
    children,
    variant,
    size,
    className: _className,
  }: {
    children?: React.ReactNode;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button data-testid="button" data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
}));

vi.mock("@/common/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children?: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

describe("KeyCard", () => {
  const baseKeyData: PublicKey = {
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
    // Mock Date.now() to a fixed point for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Rendering", () => {
    it("should render the key title", () => {
      render(<KeyCard keyData={baseKeyData} />);

      expect(screen.getByText("Test SSH Key")).toBeInTheDocument();
    });

    it("should render the key fingerprint", () => {
      render(<KeyCard keyData={baseKeyData} />);

      expect(
        screen.getByText("fingerprint:SHA256:abc123def456"),
      ).toBeInTheDocument();
    });

    it("should render the creation date", () => {
      render(<KeyCard keyData={baseKeyData} />);

      expect(screen.getByText(/Added 2024-01-15/)).toBeInTheDocument();
    });

    it("should render the delete button", () => {
      render(<KeyCard keyData={baseKeyData} />);

      expect(screen.getByTestId("button")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("should render within KeyDeleteDialog", () => {
      render(<KeyCard keyData={baseKeyData} />);

      expect(screen.getByTestId("key-delete-dialog")).toBeInTheDocument();
    });

    it("should render card structure", () => {
      render(<KeyCard keyData={baseKeyData} />);

      expect(screen.getByTestId("card")).toBeInTheDocument();
      expect(screen.getByTestId("card-content")).toBeInTheDocument();
    });
  });

  describe("Last Used Status - Never Used", () => {
    it("should show 'Never used' when lastUsedAt is null", () => {
      render(<KeyCard keyData={{ ...baseKeyData, lastUsedAt: null }} />);

      expect(screen.getByText("Never used")).toBeInTheDocument();
    });

    it("should have secondary badge variant for never used", () => {
      render(<KeyCard keyData={{ ...baseKeyData, lastUsedAt: null }} />);

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveAttribute("data-variant", "secondary");
    });
  });

  describe("Last Used Status - Within Week", () => {
    it("should show 'Used this week' for recent usage", () => {
      // 2 days ago from system time (2024-01-20)
      render(
        <KeyCard
          keyData={{ ...baseKeyData, lastUsedAt: "2024-01-18T10:00:00Z" }}
        />,
      );

      expect(screen.getByText("Used this week")).toBeInTheDocument();
    });

    it("should show 'Used this week' for usage 6 days ago", () => {
      // 6 days ago
      render(
        <KeyCard
          keyData={{ ...baseKeyData, lastUsedAt: "2024-01-14T10:00:00Z" }}
        />,
      );

      expect(screen.getByText("Used this week")).toBeInTheDocument();
    });
  });

  describe("Last Used Status - Within 3 Weeks", () => {
    it("should show 'Used within 3 weeks' for usage 8-21 days ago", () => {
      // 10 days ago
      render(
        <KeyCard
          keyData={{ ...baseKeyData, lastUsedAt: "2024-01-10T10:00:00Z" }}
        />,
      );

      expect(screen.getByText("Used within 3 weeks")).toBeInTheDocument();
    });

    it("should show 'Used within 3 weeks' for usage at edge (21 days)", () => {
      // 21 days ago
      render(
        <KeyCard
          keyData={{ ...baseKeyData, lastUsedAt: "2023-12-30T10:00:00Z" }}
        />,
      );

      expect(screen.getByText("Used within 3 weeks")).toBeInTheDocument();
    });
  });

  describe("Last Used Status - Within 3 Months", () => {
    it("should show 'Used within 3 months' for usage 22-90 days ago", () => {
      // 60 days ago
      render(
        <KeyCard
          keyData={{ ...baseKeyData, lastUsedAt: "2023-11-21T10:00:00Z" }}
        />,
      );

      expect(screen.getByText("Used within 3 months")).toBeInTheDocument();
    });

    it("should show 'Used within 3 months' for usage at edge (90 days)", () => {
      // 90 days ago
      render(
        <KeyCard
          keyData={{ ...baseKeyData, lastUsedAt: "2023-10-22T10:00:00Z" }}
        />,
      );

      expect(screen.getByText("Used within 3 months")).toBeInTheDocument();
    });
  });

  describe("Last Used Status - Long Ago", () => {
    it("should show 'Used long ago' for usage over 90 days ago", () => {
      // 100 days ago
      render(
        <KeyCard
          keyData={{ ...baseKeyData, lastUsedAt: "2023-10-12T10:00:00Z" }}
        />,
      );

      expect(screen.getByText("Used long ago")).toBeInTheDocument();
    });

    it("should have outline badge variant for usage long ago", () => {
      render(
        <KeyCard
          keyData={{ ...baseKeyData, lastUsedAt: "2023-10-01T10:00:00Z" }}
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveAttribute("data-variant", "outline");
    });
  });

  describe("Visual Indicators", () => {
    it("should have destructive variant for delete button", () => {
      render(<KeyCard keyData={baseKeyData} />);

      const button = screen.getByTestId("button");
      expect(button).toHaveAttribute("data-variant", "destructive");
    });

    it("should have sm size for delete button", () => {
      render(<KeyCard keyData={baseKeyData} />);

      const button = screen.getByTestId("button");
      expect(button).toHaveAttribute("data-size", "sm");
    });
  });

  describe("Edge Cases", () => {
    it("should handle key with very long title", () => {
      const longTitle = "A".repeat(100);
      render(<KeyCard keyData={{ ...baseKeyData, title: longTitle }} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("should handle key with special characters in title", () => {
      const specialTitle = "Work Key (Main) - 2024 <test>";
      render(<KeyCard keyData={{ ...baseKeyData, title: specialTitle }} />);

      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });

    it("should handle key with empty fingerprint", () => {
      render(<KeyCard keyData={{ ...baseKeyData, fingerprint: "" }} />);

      expect(screen.getByText("fingerprint:")).toBeInTheDocument();
    });

    it("should handle recently created key", () => {
      // Created today
      render(
        <KeyCard
          keyData={{ ...baseKeyData, createdAt: "2024-01-20T10:00:00Z" }}
        />,
      );

      expect(screen.getByText(/Added 2024-01-20/)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have semantic heading for key name", () => {
      render(<KeyCard keyData={baseKeyData} />);

      // Key name should be in a heading element
      const keyName = screen.getByText("Test SSH Key");
      expect(keyName.tagName.toLowerCase()).toBe("h3");
    });

    it("should display fingerprint as readable text", () => {
      render(<KeyCard keyData={baseKeyData} />);

      expect(
        screen.getByText("fingerprint:SHA256:abc123def456"),
      ).toBeInTheDocument();
    });
  });
});
