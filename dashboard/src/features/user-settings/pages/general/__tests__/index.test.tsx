import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock useQuery
const mockUseQuery = vi.fn();

// Mock Apollo Client
vi.mock("@apollo/client/react", () => ({
  useQuery: () => mockUseQuery(),
}));

// Mock child components
vi.mock("../user-profile-section", () => ({
  UserProfileSection: ({ userData: _userData }: { userData: unknown }) => (
    <div data-testid="user-profile-section">User Profile Section</div>
  ),
}));

vi.mock("../appearance-section", () => ({
  AppearanceSection: () => (
    <div data-testid="appearance-section">Appearance Section</div>
  ),
}));

vi.mock("../subscription-section", () => ({
  SubscriptionSection: () => (
    <div data-testid="subscription-section">Subscription Section</div>
  ),
}));

vi.mock("../session-section", () => ({
  SessionSection: () => (
    <div data-testid="session-section">Session Section</div>
  ),
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

vi.mock("@/common/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// Mock translations
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "userSettings.userProfile": "User Profile",
        "userSettings.loadingAccountInformation": "Loading account information",
        "userSettings.appearance": "Appearance",
        "userSettings.loadingThemePreferences": "Loading theme preferences",
        "userSettings.subscription": "Subscription",
        "userSettings.loadingSubscriptionDetails":
          "Loading subscription details",
        "userSettings.session": "Session",
        "userSettings.loadingSessionInformation": "Loading session information",
        "common.settings": "Settings",
        "userSettings.errorLoadingSettings": "Error loading settings",
        "userSettings.failedToLoadSettings": "Failed to load settings",
        "userSettings.settingsErrorMessage":
          "Something went wrong. Please try again later.",
        "common.errors.generic": "Something went wrong. Please try again.",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock ReactNativeBridgeProvider context
const mockUseReactNativeContext = vi.fn();
vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge-context",
  () => ({
    useReactNativeContext: () => mockUseReactNativeContext(),
  }),
);

// Mock SEO components (they use useLocation which requires router context)
vi.mock("@/common/components/seo/page-seo", () => ({
  PageSEO: () => null,
}));

describe("GeneralSettingsPage", () => {
  const mockUserData = {
    userProfile: {
      id: "user-123",
      email: "test@example.com",
      username: "testuser",
      firstName: "Test",
      lastName: "User",
      locale: "en",
      emailReportStatus: null,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: running in web browser (not React Native)
    mockUseReactNativeContext.mockReturnValue({ isReactNative: false });
  });

  describe("Loading State", () => {
    it("should display loading state when data is loading", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      render(<GeneralSettingsPage />);

      // Check for loading skeletons
      const skeletons = screen.getAllByTestId("skeleton");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should show section titles during loading", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      render(<GeneralSettingsPage />);

      expect(screen.getByText("User Profile")).toBeInTheDocument();
      expect(screen.getByText("Appearance")).toBeInTheDocument();
      expect(screen.getByText("Subscription")).toBeInTheDocument();
      expect(screen.getByText("Session")).toBeInTheDocument();
    });

    it("should show loading descriptions for each section", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      render(<GeneralSettingsPage />);

      expect(
        screen.getByText("Loading account information"),
      ).toBeInTheDocument();
      expect(screen.getByText("Loading theme preferences")).toBeInTheDocument();
      expect(
        screen.getByText("Loading subscription details"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Loading session information"),
      ).toBeInTheDocument();
    });

    it("should render multiple cards in loading state", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      render(<GeneralSettingsPage />);

      const cards = screen.getAllByTestId("card");
      expect(cards.length).toBe(4); // 4 sections
    });
  });

  describe("Error State", () => {
    it("should display error state when query fails", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: false,
        error: new Error("Network error"),
      });

      const { default: GeneralSettingsPage } = await import("../index");
      render(<GeneralSettingsPage />);

      expect(screen.getByText("Failed to load settings")).toBeInTheDocument();
    });

    it("should show the localized generic message instead of the raw error message", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: false,
        error: new Error("Custom error message"),
      });

      const { default: GeneralSettingsPage } = await import("../index");
      render(<GeneralSettingsPage />);

      expect(
        screen.getByText("Something went wrong. Please try again."),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Custom error message"),
      ).not.toBeInTheDocument();
    });

    it("should show the localized generic message when error has no message", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: false,
        error: { message: "" },
      });

      const { default: GeneralSettingsPage } = await import("../index");
      render(<GeneralSettingsPage />);

      expect(
        screen.getByText("Something went wrong. Please try again."),
      ).toBeInTheDocument();
    });

    it("should render AlertCircle icon in error state", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: false,
        error: new Error("Network error"),
      });

      const { default: GeneralSettingsPage } = await import("../index");
      const { container } = render(<GeneralSettingsPage />);

      // Lucide icons render as SVGs
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Success State", () => {
    it("should render all sections when data is loaded", async () => {
      mockUseQuery.mockReturnValue({
        data: mockUserData,
        loading: false,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      render(<GeneralSettingsPage />);

      expect(screen.getByTestId("subscription-section")).toBeInTheDocument();
      expect(screen.getByTestId("user-profile-section")).toBeInTheDocument();
      expect(screen.getByTestId("appearance-section")).toBeInTheDocument();
      expect(screen.getByTestId("session-section")).toBeInTheDocument();
    });

    it("should render sections in correct order", async () => {
      mockUseQuery.mockReturnValue({
        data: mockUserData,
        loading: false,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      const { container } = render(<GeneralSettingsPage />);

      const sections = container.querySelectorAll("[data-testid$='-section']");
      const sectionIds = Array.from(sections).map((s) =>
        s.getAttribute("data-testid"),
      );

      expect(sectionIds).toEqual([
        "subscription-section",
        "user-profile-section",
        "appearance-section",
        "session-section",
      ]);
    });

    it("should have proper spacing between sections", async () => {
      mockUseQuery.mockReturnValue({
        data: mockUserData,
        loading: false,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      const { container } = render(<GeneralSettingsPage />);

      const mainContainer = container.querySelector(".space-y-4");
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe("User Data Handling", () => {
    it("should pass user data to UserProfileSection", async () => {
      mockUseQuery.mockReturnValue({
        data: mockUserData,
        loading: false,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      render(<GeneralSettingsPage />);

      expect(screen.getByTestId("user-profile-section")).toBeInTheDocument();
    });

    it("should handle undefined user data", async () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        loading: false,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");

      // Should not throw when data is undefined
      expect(() => render(<GeneralSettingsPage />)).not.toThrow();
    });

    it("should handle null user data", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: false,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");

      // Null data with no loading and no error shows success state
      // but with null passed to components
      expect(() => render(<GeneralSettingsPage />)).not.toThrow();
    });
  });

  describe("Component Integration", () => {
    it("should render SubscriptionSection first", async () => {
      mockUseQuery.mockReturnValue({
        data: mockUserData,
        loading: false,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      const { container } = render(<GeneralSettingsPage />);

      const firstSection = container.querySelector(".space-y-4 > div");
      expect(firstSection?.getAttribute("data-testid")).toBe(
        "subscription-section",
      );
    });

    it("should render SessionSection last", async () => {
      mockUseQuery.mockReturnValue({
        data: mockUserData,
        loading: false,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      const { container } = render(<GeneralSettingsPage />);

      const sections = container.querySelectorAll(".space-y-4 > div");
      const lastSection = sections[sections.length - 1];
      expect(lastSection?.getAttribute("data-testid")).toBe("session-section");
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure in loading state", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      render(<GeneralSettingsPage />);

      // All section titles should be present
      expect(screen.getByText("User Profile")).toBeInTheDocument();
      expect(screen.getByText("Appearance")).toBeInTheDocument();
      expect(screen.getByText("Subscription")).toBeInTheDocument();
      expect(screen.getByText("Session")).toBeInTheDocument();
    });

    it("should have a localized, descriptive error message", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: false,
        error: new Error("Connection failed"),
      });

      const { default: GeneralSettingsPage } = await import("../index");
      render(<GeneralSettingsPage />);

      expect(
        screen.getByText("Something went wrong. Please try again."),
      ).toBeInTheDocument();
      expect(screen.getByText("Failed to load settings")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid state changes", async () => {
      // Start with loading
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      const { rerender } = render(<GeneralSettingsPage />);

      // Verify loading state
      expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);

      // Switch to success state
      mockUseQuery.mockReturnValue({
        data: mockUserData,
        loading: false,
        error: null,
      });

      rerender(<GeneralSettingsPage />);

      // Verify success state
      expect(screen.getByTestId("subscription-section")).toBeInTheDocument();
    });

    it("should handle partial user data", async () => {
      mockUseQuery.mockReturnValue({
        data: {
          userProfile: {
            id: "user-123",
            email: "test@example.com",
            username: null,
            firstName: null,
            lastName: null,
            locale: "en",
            emailReportStatus: null,
          },
        },
        loading: false,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");

      expect(() => render(<GeneralSettingsPage />)).not.toThrow();
    });
  });

  describe("Loading Icons", () => {
    it("should render User icon in loading state", async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      const { container } = render(<GeneralSettingsPage />);

      // Multiple SVG icons for sections
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe("React Native WebView", () => {
    it("should not render SubscriptionSection when in React Native webview", async () => {
      mockUseReactNativeContext.mockReturnValue({ isReactNative: true });
      mockUseQuery.mockReturnValue({
        data: mockUserData,
        loading: false,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      render(<GeneralSettingsPage />);

      // Subscription section should NOT be rendered
      expect(
        screen.queryByTestId("subscription-section"),
      ).not.toBeInTheDocument();

      // Other sections should still render
      expect(screen.getByTestId("user-profile-section")).toBeInTheDocument();
      expect(screen.getByTestId("appearance-section")).toBeInTheDocument();
      expect(screen.getByTestId("session-section")).toBeInTheDocument();
    });

    it("should render SubscriptionSection in web browser", async () => {
      mockUseReactNativeContext.mockReturnValue({ isReactNative: false });
      mockUseQuery.mockReturnValue({
        data: mockUserData,
        loading: false,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      render(<GeneralSettingsPage />);

      // All sections including subscription should render
      expect(screen.getByTestId("subscription-section")).toBeInTheDocument();
      expect(screen.getByTestId("user-profile-section")).toBeInTheDocument();
      expect(screen.getByTestId("appearance-section")).toBeInTheDocument();
      expect(screen.getByTestId("session-section")).toBeInTheDocument();
    });

    it("should not render subscription skeleton in React Native loading state", async () => {
      mockUseReactNativeContext.mockReturnValue({ isReactNative: true });
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      render(<GeneralSettingsPage />);

      // Should NOT show subscription loading text
      expect(
        screen.queryByText("Loading subscription details"),
      ).not.toBeInTheDocument();

      // Other loading sections should still show
      expect(
        screen.getByText("Loading account information"),
      ).toBeInTheDocument();
      expect(screen.getByText("Loading theme preferences")).toBeInTheDocument();
      expect(
        screen.getByText("Loading session information"),
      ).toBeInTheDocument();
    });

    it("should render subscription skeleton in web browser loading state", async () => {
      mockUseReactNativeContext.mockReturnValue({ isReactNative: false });
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      render(<GeneralSettingsPage />);

      // Should show all loading sections including subscription
      expect(
        screen.getByText("Loading subscription details"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Loading account information"),
      ).toBeInTheDocument();
      expect(screen.getByText("Loading theme preferences")).toBeInTheDocument();
      expect(
        screen.getByText("Loading session information"),
      ).toBeInTheDocument();
    });

    it("should render correct number of cards in React Native", async () => {
      mockUseReactNativeContext.mockReturnValue({ isReactNative: true });
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      render(<GeneralSettingsPage />);

      const cards = screen.getAllByTestId("card");
      // 3 sections in mobile (no subscription)
      expect(cards.length).toBe(3);
    });

    it("should render correct section order in React Native", async () => {
      mockUseReactNativeContext.mockReturnValue({ isReactNative: true });
      mockUseQuery.mockReturnValue({
        data: mockUserData,
        loading: false,
        error: null,
      });

      const { default: GeneralSettingsPage } = await import("../index");
      const { container } = render(<GeneralSettingsPage />);

      const sections = container.querySelectorAll("[data-testid$='-section']");
      const sectionIds = Array.from(sections).map((s) =>
        s.getAttribute("data-testid"),
      );

      // No subscription section in the order
      expect(sectionIds).toEqual([
        "user-profile-section",
        "appearance-section",
        "session-section",
      ]);
    });
  });
});
