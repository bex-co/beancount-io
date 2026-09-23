import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardLayout } from "../dashboard-layout";
import { MAIN_CONTENT_ID } from "@/common/lib/main-content";

vi.mock("../dashboard-sidebar", () => ({
  DashboardSidebar: () => (
    <nav aria-label="Dashboard">
      <a href="/ledger/alice/book">Personal</a>
    </nav>
  ),
}));

vi.mock("@/common/components/authenticated", () => ({
  Authenticated: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/common/components/user-nav.tsx", () => ({
  UserNav: () => <button type="button">Account</button>,
}));

describe("DashboardLayout shell accessibility", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it("keeps the sidebar gap on the fixed pane's side in RTL (w4/178)", () => {
    render(<DashboardLayout />);
    // The pane is fixed to the physical left; an unreversed RTL row put its
    // gap on the right and slid the content underneath the pane.
    const row = document.getElementById(MAIN_CONTENT_ID)?.parentElement;
    expect(row).toHaveClass("flex", "rtl:flex-row-reverse");
  });

  it("renders a skip link and a distinct Dashboard navigation landmark", () => {
    render(
      <DashboardLayout>
        <nav aria-label="Related pages">
          <a href="/ledger/alice/book">Overview help</a>
        </nav>
      </DashboardLayout>,
    );

    expect(
      screen.getByRole("link", { name: "Skip to main content" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Related pages" }),
    ).toBeInTheDocument();

    const main = document.getElementById(MAIN_CONTENT_ID);
    expect(main).not.toBeNull();
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("moves focus into main when the skip link is activated", async () => {
    const user = userEvent.setup();
    render(
      <DashboardLayout>
        <p>Dashboard body</p>
      </DashboardLayout>,
    );

    const skip = screen.getByRole("link", { name: "Skip to main content" });
    await user.click(skip);

    expect(document.activeElement).toBe(
      document.getElementById(MAIN_CONTENT_ID),
    );
  });
});
