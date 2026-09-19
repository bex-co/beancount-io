import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { FileSpreadsheet } from "lucide-react";
import { LedgerGroupFlyout } from "../ledger-group-flyout";
import { SidebarProvider } from "@/common/components/ui/sidebar";
import { MOBILE_BREAKPOINT } from "@/common/hooks/use-mobile";

// Stub the router Link as a plain anchor so the flyout can render without a
// RouterProvider; we only care about the flyout's open/select behavior here.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    onClick,
  }: {
    to: string;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <a
      href={to}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
    >
      {children}
    </a>
  ),
}));

const items = [
  { id: "income", label: "Income statement", path: "/x/income" },
  { id: "balance", label: "Balance sheet", path: "/x/balance" },
];

function renderFlyout(
  props?: Partial<Parameters<typeof LedgerGroupFlyout>[0]>,
) {
  return render(
    <SidebarProvider>
      <LedgerGroupFlyout
        label="Reports"
        icon={FileSpreadsheet}
        items={items}
        currentPath="/x/income"
        isActive={false}
        onNavigate={vi.fn()}
        {...props}
      />
    </SidebarProvider>,
  );
}

describe("LedgerGroupFlyout", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string): MediaQueryList => ({
        matches: window.innerWidth < MOBILE_BREAKPOINT,
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

  it("hides the group's destinations until the icon is activated", () => {
    renderFlyout();
    // The trigger (group label) is present, but its items are not yet shown —
    // i.e. the icon is not a dead click; it gates a flyout.
    expect(screen.getByRole("button", { name: "Reports" })).toBeInTheDocument();
    expect(screen.queryByText("Income statement")).not.toBeInTheDocument();
  });

  it("opens the flyout of destinations when the icon is clicked", async () => {
    renderFlyout();
    fireEvent.click(screen.getByRole("button", { name: "Reports" }));
    expect(await screen.findByText("Income statement")).toBeInTheDocument();
    expect(screen.getByText("Balance sheet")).toBeInTheDocument();
  });

  it("opens the flyout when a mouse hovers the icon", async () => {
    const { container } = renderFlyout();
    const item = container.querySelector(
      '[data-slot="sidebar-menu-item"]',
    ) as HTMLElement;
    fireEvent.pointerEnter(item, { pointerType: "mouse" });
    expect(await screen.findByText("Income statement")).toBeInTheDocument();
  });

  it("calls onNavigate when a destination is chosen", async () => {
    const onNavigate = vi.fn();
    renderFlyout({ onNavigate });
    fireEvent.click(screen.getByRole("button", { name: "Reports" }));
    fireEvent.click(await screen.findByText("Balance sheet"));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  /**
   * A tap emits pointerenter, then the trigger's click, then pointerleave. When
   * the hover handlers answered touch as well, the enter opened the flyout, the
   * click toggled it shut and the leave scheduled a close on top — one tap could
   * never leave it open. These cases play the real event order rather than
   * calling a click handler in isolation.
   */
  it("leaves the flyout open after a tap", async () => {
    const { container } = renderFlyout();
    const item = container.querySelector(
      '[data-slot="sidebar-menu-item"]',
    ) as HTMLElement;
    const trigger = screen.getByRole("button", { name: "Reports" });

    fireEvent.pointerEnter(item, { pointerType: "touch" });
    fireEvent.pointerDown(trigger, { pointerType: "touch" });
    fireEvent.pointerUp(trigger, { pointerType: "touch" });
    fireEvent.click(trigger);
    fireEvent.pointerLeave(item, { pointerType: "touch" });

    expect(await screen.findByText("Income statement")).toBeInTheDocument();

    // And it survives past the hover close delay.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(screen.getByText("Income statement")).toBeInTheDocument();
  });

  it("navigates from a tapped flyout", async () => {
    const onNavigate = vi.fn();
    const { container } = renderFlyout({ onNavigate });
    const item = container.querySelector(
      '[data-slot="sidebar-menu-item"]',
    ) as HTMLElement;
    const trigger = screen.getByRole("button", { name: "Reports" });

    fireEvent.pointerEnter(item, { pointerType: "touch" });
    fireEvent.pointerDown(trigger, { pointerType: "touch" });
    fireEvent.pointerUp(trigger, { pointerType: "touch" });
    fireEvent.click(trigger);
    fireEvent.pointerLeave(item, { pointerType: "touch" });

    fireEvent.click(await screen.findByText("Balance sheet"));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("still closes on mouse leave after the delay", async () => {
    const { container } = renderFlyout();
    const item = container.querySelector(
      '[data-slot="sidebar-menu-item"]',
    ) as HTMLElement;

    fireEvent.pointerEnter(item, { pointerType: "mouse" });
    expect(await screen.findByText("Income statement")).toBeInTheDocument();

    fireEvent.pointerLeave(item, { pointerType: "mouse" });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(screen.queryByText("Income statement")).not.toBeInTheDocument();
  });

  it("does not close a tapped flyout when a touch pointer leaves", async () => {
    const { container } = renderFlyout();
    const item = container.querySelector(
      '[data-slot="sidebar-menu-item"]',
    ) as HTMLElement;
    fireEvent.click(screen.getByRole("button", { name: "Reports" }));
    expect(await screen.findByText("Income statement")).toBeInTheDocument();

    fireEvent.pointerLeave(item, { pointerType: "touch" });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(screen.getByText("Income statement")).toBeInTheDocument();
  });
});
