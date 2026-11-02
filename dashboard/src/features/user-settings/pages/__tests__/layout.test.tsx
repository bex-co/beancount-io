import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsLayout } from "../layout";

const mockBack = vi.fn();
const mockReactNative = vi.hoisted(() => ({ isReactNative: false }));

// The failed-renewal banner reads billing state the shell under test does
// not provide; it has its own tests.
vi.mock("@/common/components/billing/failed-renewal-banner", () => ({
  FailedRenewalBanner: () => null,
}));
vi.mock("@/common/components/billing/billing-status-banner", () => ({
  BillingStatusBanner: () => null,
}));
vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge-context",
  () => ({ useReactNativeContext: () => mockReactNative }),
);

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  Link: ({
    children,
    to,
    replace,
    "aria-current": ariaCurrent,
  }: {
    children: React.ReactNode;
    to: string;
    replace?: boolean;
    "aria-current"?: string;
  }) => (
    <a href={to} data-replace={replace} aria-current={ariaCurrent}>
      {children}
    </a>
  ),
  useLocation: () => ({
    pathname: "/settings/general",
  }),
  useRouter: () => ({
    history: {
      back: mockBack,
    },
  }),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "common.back": "Back",
        "userSettings.general": "General",
        "userSettings.billing": "Billing",
        "userSettings.sshKeys": "SSH Keys",
        "userSettings.apiKeys": "Personal access tokens",
        "userSettings.dangerZone": "Danger Zone",
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock("@/common/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock("@/common/lib/utils/utils", () => ({
  cn: (...classes: (string | undefined | false)[]) =>
    classes.filter(Boolean).join(" "),
}));

describe("SettingsLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Layout Structure", () => {
    it("should render semantic landmark elements", () => {
      const { container } = render(<SettingsLayout />);

      expect(container.querySelector("header")).toBeInTheDocument();
      expect(container.querySelector("nav")).toBeInTheDocument();
      expect(container.querySelector("main")).toBeInTheDocument();
    });

    it("should render child routes via Outlet", () => {
      render(<SettingsLayout />);

      expect(screen.getByTestId("outlet")).toBeInTheDocument();
      expect(screen.getByText("Outlet Content")).toBeInTheDocument();
    });
  });

  describe("Header", () => {
    it("should render a back button", () => {
      render(<SettingsLayout />);

      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });

    it("should navigate back when back button is clicked", async () => {
      const user = userEvent.setup();
      render(<SettingsLayout />);

      await user.click(screen.getByRole("button", { name: /back/i }));

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple back button clicks", async () => {
      const user = userEvent.setup();
      render(<SettingsLayout />);

      const backButton = screen.getByRole("button", { name: /back/i });
      await user.click(backButton);
      await user.click(backButton);
      await user.click(backButton);

      expect(mockBack).toHaveBeenCalledTimes(3);
    });
  });

  describe("Navigation Tabs", () => {
    it("should render all settings navigation tabs", () => {
      render(<SettingsLayout />);

      expect(screen.getByRole("link", { name: "General" })).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "SSH Keys" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Personal access tokens" }),
      ).toBeInTheDocument();
    });

    it("links Billing on the web and hides it in the native app's web view", () => {
      const { unmount } = render(<SettingsLayout />);
      expect(screen.getByRole("link", { name: "Billing" })).toHaveAttribute(
        "href",
        "/settings/billing",
      );
      unmount();

      mockReactNative.isReactNative = true;
      try {
        render(<SettingsLayout />);
        expect(
          screen.queryByRole("link", { name: "Billing" }),
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole("link", { name: "General" }),
        ).toBeInTheDocument();
      } finally {
        mockReactNative.isReactNative = false;
      }
    });

    it("should link to correct settings paths", () => {
      render(<SettingsLayout />);

      expect(screen.getByRole("link", { name: "General" })).toHaveAttribute(
        "href",
        "/settings/general",
      );
      expect(screen.getByRole("link", { name: "SSH Keys" })).toHaveAttribute(
        "href",
        "/settings/ssh-keys",
      );
      expect(
        screen.getByRole("link", { name: "Personal access tokens" }),
      ).toHaveAttribute("href", "/settings/api-keys");
    });

    it("should use replace navigation to avoid polluting browser history", () => {
      render(<SettingsLayout />);

      const generalLink = screen.getByRole("link", { name: "General" });
      expect(generalLink).toHaveAttribute("data-replace", "true");
    });
  });

  describe("Active State", () => {
    it("should mark the current page tab with aria-current", () => {
      // pathname is mocked to /settings/general
      render(<SettingsLayout />);

      expect(screen.getByRole("link", { name: "General" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    it("should not mark inactive tabs with aria-current", () => {
      render(<SettingsLayout />);

      expect(
        screen.getByRole("link", { name: "SSH Keys" }),
      ).not.toHaveAttribute("aria-current");
    });
  });
});
