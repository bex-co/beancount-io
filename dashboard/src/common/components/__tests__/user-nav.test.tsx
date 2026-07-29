import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserNav } from "../user-nav";
import * as apolloClient from "@apollo/client/react";
import {
  createMockQueryResult,
  type GetCurrentUserQueryResult,
} from "@/test/apollo-test-utils";

// Mock dependencies
const mockNavigate = vi.fn();
const mockSetTheme = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("@/common/hooks/use-theme", () => ({
  useTheme: () => ({
    theme: "system",
    setTheme: mockSetTheme,
  }),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "common.settings": "Settings",
        "common.stars": "Stars",
        "userSettings.theme": "Theme",
        "userSettings.themeLight": "Light",
        "userSettings.themeDark": "Dark",
        "userSettings.themeSystem": "System",
        "userSettings.currentLanguage": "Language",
        "auth.logout": "Log out",
        "common.userFallback": "User",
        "common.userEmailFallback": "user@example.com",
      };
      return translations[key] || key;
    },
    i18n: {
      language: "en",
      changeLanguage: vi.fn(),
    },
  }),
}));

vi.mock("@/common/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

describe("UserNav", () => {
  const mockUser = {
    __typename: "UserProfileResponse" as const,
    id: "user-1",
    username: "testuser",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    fullName: "Test User",
    bio: null,
    location: null,
    website: null,
    avatarUrl: null,
    followersCount: 0,
    followingCount: 0,
    starredReposCount: 0,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state when data is loading", () => {
    const mockQueryResult: GetCurrentUserQueryResult = createMockQueryResult({
      data: undefined,
      loading: true,
      error: undefined,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<UserNav />);

    // Should show loading skeleton instead of dropdown
    const loadingElement = document.querySelector(".animate-pulse");
    expect(loadingElement).toBeInTheDocument();
  });

  it("should render dropdown menu with all items", async () => {
    const mockQueryResult: GetCurrentUserQueryResult = createMockQueryResult({
      data: {
        userProfile: mockUser,
      },
      loading: false,
      error: undefined,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    const user = userEvent.setup();
    render(<UserNav />);

    const trigger = screen.getByRole("button", { expanded: false });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Stars")).toBeInTheDocument();
      expect(screen.getByText("Theme")).toBeInTheDocument();
      expect(screen.getByText("Log out")).toBeInTheDocument();
    });
  });

  it("should navigate to settings when clicking Settings", async () => {
    const mockQueryResult: GetCurrentUserQueryResult = createMockQueryResult({
      data: {
        userProfile: mockUser,
      },
      loading: false,
      error: undefined,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    const user = userEvent.setup();
    render(<UserNav />);

    const trigger = screen.getByRole("button", { expanded: false });
    await user.click(trigger);

    const settingsLink = await screen.findByText("Settings");
    await user.click(settingsLink);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/settings",
      });
    });
  });

  it("should navigate to user profile with starred tab when clicking Stars", async () => {
    const mockQueryResult: GetCurrentUserQueryResult = createMockQueryResult({
      data: {
        userProfile: mockUser,
      },
      loading: false,
      error: undefined,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    const user = userEvent.setup();
    render(<UserNav />);

    const trigger = screen.getByRole("button", { expanded: false });
    await user.click(trigger);

    const starsLink = await screen.findByText("Stars");
    await user.click(starsLink);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$username",
        params: { username: "testuser" },
        search: { tab: "starred" },
      });
    });
  });

  it("should not navigate to stars if username is missing", async () => {
    const userWithoutUsername = {
      ...mockUser,
      username: "",
    };

    const mockQueryResult: GetCurrentUserQueryResult = createMockQueryResult({
      data: {
        userProfile: userWithoutUsername,
      },
      loading: false,
      error: undefined,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    const user = userEvent.setup();
    render(<UserNav />);

    const trigger = screen.getByRole("button", { expanded: false });
    await user.click(trigger);

    const starsLink = await screen.findByText("Stars");
    await user.click(starsLink);

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
