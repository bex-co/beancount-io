import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRef } from "react";
import { en, de } from "@/i18n/locales";
import {
  act,
  cleanup,
  render as renderComponent,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserAvatarButton, UserNav } from "../user-nav";
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

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

const originalWidth = window.innerWidth;
const viewportListeners = new Set<() => void>();

function setViewport(width: number) {
  window.innerWidth = width;
  viewportListeners.forEach((listener) => listener());
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.innerWidth = originalWidth;
  viewportListeners.clear();
});

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
    window.innerWidth = 1440;
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: window.innerWidth < 768,
        addEventListener: (_: string, listener: () => void) =>
          viewportListeners.add(listener),
        removeEventListener: (_: string, listener: () => void) =>
          viewportListeners.delete(listener),
      })),
    );
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      createMockQueryResult({
        data: { userProfile: mockUser },
        loading: false,
      }),
    );
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
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
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

    const trigger = screen.getByRole("button", {
      name: "User menu",
      expanded: false,
    });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Stars")).toBeInTheDocument();
      expect(screen.getByText("Theme")).toBeInTheDocument();
      expect(screen.getByText(en["auth.logout"])).toBeInTheDocument();
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

    const trigger = screen.getByRole("button", {
      name: "User menu",
      expanded: false,
    });
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

    const trigger = screen.getByRole("button", {
      name: "User menu",
      expanded: false,
    });
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

    const trigger = screen.getByRole("button", {
      name: "User menu",
      expanded: false,
    });
    await user.click(trigger);

    const starsLink = await screen.findByText("Stars");
    await user.click(starsLink);

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it.each([1440, 390])(
    "keeps the action name independent of profile resolution and username changes at %ipx",
    (width) => {
      setViewport(width);
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createMockQueryResult({ loading: true }),
      );
      const { rerender } = render(<UserNav />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(document.querySelector(".animate-pulse")).toBeInTheDocument();

      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createMockQueryResult({
          data: { userProfile: { ...mockUser, username: "zoe" } },
          loading: false,
        }),
      );
      rerender(<UserNav />);
      const label = width < 768 ? en["common.settings"] : en["common.userMenu"];
      expect(screen.getByRole("button", { name: label })).toHaveTextContent(
        "Z",
      );

      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createMockQueryResult({
          data: { userProfile: { ...mockUser, username: "beta" } },
          loading: false,
        }),
      );
      rerender(<UserNav />);
      expect(screen.getByRole("button", { name: label })).toHaveTextContent(
        "B",
      );
      expect(
        screen.queryByRole("button", { name: "B" }),
      ).not.toBeInTheDocument();
    },
  );

  it.each([1440, 390])(
    "names the fallback avatar action without a resolved profile at %ipx",
    (width) => {
      setViewport(width);
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createMockQueryResult({ loading: false }),
      );
      render(<UserNav />);

      expect(
        screen.getByRole("button", {
          name: width < 768 ? en["common.settings"] : en["common.userMenu"],
        }),
      ).toHaveTextContent("U");
    },
  );

  it("opens the named desktop Radix menu with Enter and restores trigger focus after Escape", async () => {
    const user = userEvent.setup();
    render(<UserNav />);
    const trigger = screen.getByRole("button", { name: "User menu" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    trigger.focus();

    await user.keyboard("{Enter}");

    const menu = await screen.findByRole("menu");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", menu.id);
    expect(
      screen.getByRole("menuitem", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Language/ }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(trigger).toHaveFocus();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("navigates directly to settings from the named narrow action using Enter", async () => {
    setViewport(390);
    const user = userEvent.setup();
    render(<UserNav />);
    const trigger = screen.getByRole("button", { name: "Settings" });
    expect(trigger).not.toHaveAttribute("aria-haspopup");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    trigger.focus();

    await user.keyboard("{Enter}");

    expect(mockNavigate).toHaveBeenCalledExactlyOnceWith({ to: "/settings" });
  });

  it("updates the localized action during live viewport and language changes", async () => {
    const { localization } = render(<UserNav />);
    expect(
      screen.getByRole("button", { name: en["common.userMenu"] }),
    ).toHaveTextContent("T");

    await act(() => localization.changeLanguage("de"));
    expect(
      screen.getByRole("button", { name: de["common.userMenu"] }),
    ).toHaveAttribute("aria-haspopup", "menu");
    expect(
      screen.queryByRole("button", { name: en["common.userMenu"] }),
    ).not.toBeInTheDocument();

    act(() => setViewport(390));
    const settings = screen.getByRole("button", {
      name: de["common.settings"],
    });
    expect(settings).toHaveTextContent("T");
    expect(settings).not.toHaveAttribute("aria-haspopup");

    await act(() => localization.changeLanguage("en"));
    expect(
      screen.getByRole("button", { name: en["common.settings"] }),
    ).toHaveTextContent("T");

    act(() => setViewport(1440));
    expect(
      screen.getByRole("button", { name: en["common.userMenu"] }),
    ).toHaveAttribute("aria-haspopup", "menu");
  });

  it("forwards native trigger attributes, event handlers and ref to the avatar button", async () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    const user = userEvent.setup();
    render(
      <UserAvatarButton
        ref={ref}
        userInitial="Q"
        aria-label="Profile controls"
        id="profile-controls"
        aria-haspopup="menu"
        aria-expanded={false}
        data-state="closed"
        onClick={onClick}
        onKeyDown={onKeyDown}
        className="text-primary"
      />,
    );
    const button = screen.getByRole("button", { name: "Profile controls" });
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute("id", "profile-controls");
    expect(button).toHaveAttribute("aria-haspopup", "menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("data-state", "closed");
    expect(button).toHaveClass("rounded-full", "text-primary");
    expect(button).toHaveTextContent("Q");

    button.focus();
    await user.keyboard("{Enter}");

    expect(onClick).toHaveBeenCalledOnce();
    expect(onKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({ key: "Enter" }),
    );
  });
});

function render(ui: React.ReactNode) {
  const localization = createLocalization();
  return {
    localization,
    ...renderComponent(ui, {
      wrapper: ({ children }) => (
        <LocalizationProvider localization={localization}>
          {children}
        </LocalizationProvider>
      ),
    }),
  };
}
