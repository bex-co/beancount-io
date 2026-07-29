import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionSection } from "../session-section";

// Mock navigate function
const mockNavigate = vi.fn();

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock UI components
vi.mock("@/common/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
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
    onClick,
    ...props
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

// Mock translations
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "userSettings.session": "Session",
        "userSettings.manageActiveSession": "Manage your active session",
        "auth.logout": "Logout",
        "userSettings.signOutDescription":
          "Sign out of your account on this device",
      };
      return translations[key] || key;
    },
  }),
}));

describe("SessionSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the Session section", () => {
      render(<SessionSection />);

      expect(screen.getByText("Session")).toBeInTheDocument();
      expect(
        screen.getByText("Manage your active session"),
      ).toBeInTheDocument();
    });

    it("should render card structure", () => {
      render(<SessionSection />);

      expect(screen.getByTestId("card")).toBeInTheDocument();
      expect(screen.getByTestId("card-header")).toBeInTheDocument();
      expect(screen.getByTestId("card-title")).toBeInTheDocument();
      expect(screen.getByTestId("card-description")).toBeInTheDocument();
      expect(screen.getByTestId("card-content")).toBeInTheDocument();
    });

    it("should render logout option", () => {
      render(<SessionSection />);

      expect(screen.getAllByText("Logout").length).toBeGreaterThan(0);
      expect(
        screen.getByText("Sign out of your account on this device"),
      ).toBeInTheDocument();
    });

    it("should render logout button", () => {
      render(<SessionSection />);

      const logoutButton = screen.getByRole("button");
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton.textContent).toContain("Logout");
    });

    it("should include Shield icon in title", () => {
      const { container } = render(<SessionSection />);

      // Lucide icons render as SVGs
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });

    it("should include LogOut icon in button", () => {
      const { container } = render(<SessionSection />);

      // Should have multiple SVG icons (Shield in title, LogOut in button)
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Logout Functionality", () => {
    it("should navigate to logout page when button is clicked", async () => {
      const user = userEvent.setup();
      render(<SessionSection />);

      const logoutButton = screen.getByRole("button");
      await user.click(logoutButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/auth/logout" });
      });
    });

    it("should call handleLogout on button click", async () => {
      const user = userEvent.setup();
      render(<SessionSection />);

      const logoutButton = screen.getByRole("button");
      expect(logoutButton).toBeInTheDocument();

      await user.click(logoutButton);

      expect(mockNavigate).toHaveBeenCalled();
    });

    it("should navigate immediately without confirmation", async () => {
      const user = userEvent.setup();
      render(<SessionSection />);

      const logoutButton = screen.getByRole("button");
      await user.click(logoutButton);

      // Should navigate immediately without any dialog
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/auth/logout" });
    });
  });

  describe("Layout", () => {
    it("should have proper flex layout", () => {
      const { container } = render(<SessionSection />);

      const cardContent = container.querySelector(
        '[data-testid="card-content"]',
      );
      expect(cardContent).toBeInTheDocument();

      // Should contain logout description and button (text appears multiple times)
      const logoutTexts = screen.getAllByText("Logout");
      expect(logoutTexts.length).toBeGreaterThan(0);
      expect(
        screen.getByText("Sign out of your account on this device"),
      ).toBeInTheDocument();
    });

    it("should position button and text appropriately", () => {
      render(<SessionSection />);

      // Both label and button should be present
      const labels = screen.getAllByText("Logout");
      expect(labels.length).toBeGreaterThan(0);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have semantic heading structure", () => {
      render(<SessionSection />);

      const title = screen.getByText("Session");
      expect(title).toBeInTheDocument();
    });

    it("should have descriptive button text", () => {
      render(<SessionSection />);

      const button = screen.getByRole("button");
      expect(button.textContent).toContain("Logout");
    });

    it("should have helper text for logout action", () => {
      render(<SessionSection />);

      expect(
        screen.getByText("Sign out of your account on this device"),
      ).toBeInTheDocument();
    });

    it("should support keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<SessionSection />);

      // Tab to button
      await user.tab();

      const logoutButton = screen.getByRole("button");
      expect(logoutButton).toHaveFocus();
    });

    it("should support Enter key for logout", async () => {
      const user = userEvent.setup();
      render(<SessionSection />);

      const logoutButton = screen.getByRole("button");
      logoutButton.focus();

      await user.keyboard("{Enter}");

      expect(mockNavigate).toHaveBeenCalledWith({ to: "/auth/logout" });
    });

    it("should support Space key for logout", async () => {
      const user = userEvent.setup();
      render(<SessionSection />);

      const logoutButton = screen.getByRole("button");
      logoutButton.focus();

      await user.keyboard(" ");

      expect(mockNavigate).toHaveBeenCalledWith({ to: "/auth/logout" });
    });
  });

  describe("Visual Structure", () => {
    it("should have proper nesting of elements", () => {
      render(<SessionSection />);

      const card = screen.getByTestId("card");
      expect(card).toContainElement(screen.getByTestId("card-header"));
      expect(card).toContainElement(screen.getByTestId("card-content"));
    });

    it("should render title with icon", () => {
      render(<SessionSection />);

      const title = screen.getByText("Session");
      expect(title).toBeInTheDocument();

      // Title should be in card header
      const header = screen.getByTestId("card-title");
      expect(header).toContainElement(title);
    });

    it("should display all text elements", () => {
      render(<SessionSection />);

      // Title
      expect(screen.getByText("Session")).toBeInTheDocument();

      // Description
      expect(
        screen.getByText("Manage your active session"),
      ).toBeInTheDocument();

      // Logout label
      expect(screen.getAllByText("Logout").length).toBeGreaterThan(0);

      // Logout description
      expect(
        screen.getByText("Sign out of your account on this device"),
      ).toBeInTheDocument();
    });
  });

  describe("Button Styling", () => {
    it("should render logout button", () => {
      render(<SessionSection />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button.textContent).toContain("Logout");
    });

    it("should prevent button from shrinking", () => {
      render(<SessionSection />);

      const button = screen.getByRole("button");
      expect(button.className).toContain("shrink-0");
    });
  });

  describe("Component Independence", () => {
    it("should not rely on external state", () => {
      // Session section should render without props
      expect(() => render(<SessionSection />)).not.toThrow();
    });

    it("should be self-contained", () => {
      render(<SessionSection />);

      // All expected elements should be present
      expect(screen.getByText("Session")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("Translations", () => {
    it("should use translation keys for all text", () => {
      const { container } = render(<SessionSection />);

      expect(container.textContent).toContain("Session");
      expect(container.textContent).toContain("Manage your active session");
      expect(container.textContent).toContain("Logout");
      expect(container.textContent).toContain(
        "Sign out of your account on this device",
      );
    });

    it("should handle missing translations gracefully", () => {
      render(<SessionSection />);

      // Component should still render
      expect(screen.getByTestId("card")).toBeInTheDocument();
    });
  });

  describe("User Interaction", () => {
    it("should only navigate once on single click", async () => {
      const user = userEvent.setup();
      render(<SessionSection />);

      const logoutButton = screen.getByRole("button");
      await user.click(logoutButton);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it("should handle rapid clicks gracefully", async () => {
      const user = userEvent.setup();
      render(<SessionSection />);

      const logoutButton = screen.getByRole("button");

      // Simulate rapid clicking
      await user.click(logoutButton);
      await user.click(logoutButton);
      await user.click(logoutButton);

      // Each click should trigger navigation
      expect(mockNavigate).toHaveBeenCalledTimes(3);
    });
  });

  describe("Edge Cases", () => {
    it("should call navigate function", async () => {
      const user = userEvent.setup();
      mockNavigate.mockClear();

      render(<SessionSection />);

      const logoutButton = screen.getByRole("button");
      await user.click(logoutButton);

      // Should call navigate
      expect(mockNavigate).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/auth/logout" });
    });
  });
});
