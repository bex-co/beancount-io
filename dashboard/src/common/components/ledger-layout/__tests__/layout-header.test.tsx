import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayoutHeader } from "../layout-header";

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/ledger/alice/book" }),
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@/common/components/ui/sidebar.tsx", () => ({
  SidebarTrigger: () => <button type="button">Open sidebar</button>,
  useSidebar: () => ({ state: "expanded", isMobile: false, openMobile: false }),
}));

vi.mock("@/common/components/ledger-search-controls", () => ({
  LedgerSearchControls: () => <div>Ledger search</div>,
}));

vi.mock("@/common/hooks/use-translations.ts", () => ({
  useTranslations: () => ({
    t: (key: string) =>
      ({
        "auth.login": "Log in",
        "common.helpAndSupport": "Help and support",
        "common.helpCenter": "Help Center",
        "common.helpCenterDescription": "Browse guides and documentation",
        "common.communitySupport": "Community Support",
        "common.communitySupportDescription": "Ask the community on Telegram",
      })[key] ?? key,
  }),
}));

vi.mock("../../authenticated", () => ({
  Authenticated: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("../../user-nav.tsx", () => ({
  UserNav: () => <button type="button">User menu</button>,
}));

vi.mock("../import-dropdown.tsx", () => ({
  ImportDropdown: () => <button type="button">Import</button>,
}));

vi.mock("../ledger-out-of-date-indicator", () => ({
  LedgerOutOfDateIndicator: () => null,
}));

vi.mock("../../ledger-permission/write.tsx", () => ({
  LedgerWritePermission: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe("LayoutHeader", () => {
  it("shows accessible help options before the create menu", async () => {
    const user = userEvent.setup();
    render(<LayoutHeader ledgerId="alice/book" />);

    const helpButton = screen.getByRole("button", {
      name: "Help and support",
    });
    const importButton = screen.getByRole("button", { name: "Import" });

    expect(
      helpButton.compareDocumentPosition(importButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(helpButton);

    const helpCenterLink = screen.getByRole("menuitem", {
      name: /Help Center/,
    });
    const communitySupportLink = screen.getByRole("menuitem", {
      name: /Community Support/,
    });

    expect(helpCenterLink).toHaveAttribute(
      "href",
      "https://beancount.io/docs/help-center",
    );
    expect(communitySupportLink).toHaveAttribute(
      "href",
      "https://t.me/beancount",
    );

    for (const link of [helpCenterLink, communitySupportLink]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
