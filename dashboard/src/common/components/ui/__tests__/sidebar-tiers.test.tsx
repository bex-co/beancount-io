import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Cookies from "js-cookie";
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "../sidebar";
import { SIDEBAR_STATE_COOKIE } from "../sidebar-state";

/**
 * Three tiers by screen width. A phone opens the sidebar as a sheet. A tablet
 * or small laptop (768–1279px) keeps the icon rail and opens the sidebar over
 * the page, so the content never narrows, and nothing it does there is
 * remembered. From 1280px the sidebar sits beside the page and the reader's
 * open or collapsed choice is kept.
 */

vi.mock("@/common/hooks/use-cookie-storage-state/cookie", async () => {
  const jsCookie = (await import("js-cookie")).default;
  return {
    getCookie: (key: string) => jsCookie.get(key),
    setCookie: (
      key: string,
      value: string,
      options?: Cookies.CookieAttributes,
    ) => jsCookie.set(key, value, options),
    removeCookie: (key: string, options?: Cookies.CookieAttributes) =>
      jsCookie.remove(key, options),
  };
});

function Probe() {
  const { state, isTablet } = useSidebar();
  return (
    <span data-testid="probe">
      {state} {isTablet ? "tablet" : "not-tablet"}
    </span>
  );
}

function renderAt(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  return render(
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <a href="/ledger/alice/books/journal">Journal</a>
        </SidebarContent>
      </Sidebar>
      <SidebarTrigger />
      <Probe />
    </SidebarProvider>,
  );
}

const sidebar = () =>
  document.querySelector<HTMLElement>('[data-slot="sidebar"]')!;
const trigger = () => screen.getByRole("button", { name: /sidebar/i });

let originalMatchMedia: typeof window.matchMedia;

beforeEach(() => {
  Cookies.remove(SIDEBAR_STATE_COOKIE, { path: "/" });
  originalMatchMedia = window.matchMedia;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as MediaQueryList,
  });
});

afterEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: originalMatchMedia,
  });
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1024,
  });
  Cookies.remove(SIDEBAR_STATE_COOKIE, { path: "/" });
});

describe("the sidebar from 1280px", () => {
  it("sits beside the page, open by default, and keeps a collapse", () => {
    renderAt(1440);
    expect(screen.getByTestId("probe")).toHaveTextContent(
      "expanded not-tablet",
    );
    expect(trigger()).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(trigger());
    expect(sidebar()).toHaveAttribute("data-state", "collapsed");
    expect(Cookies.get(SIDEBAR_STATE_COOKIE)).toBe("false");
  });
});

describe("the sidebar on a tablet (768–1279px)", () => {
  it("rests as the icon rail even where a wider screen left it open", () => {
    Cookies.set(SIDEBAR_STATE_COOKIE, "true", { path: "/" });
    renderAt(1024);

    expect(screen.getByTestId("probe")).toHaveTextContent("collapsed tablet");
    expect(sidebar()).toHaveAttribute("data-collapsible", "icon");
    // The rail's look from the first paint, before script knows the width.
    expect(sidebar()).toHaveAttribute("data-rail", "auto");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens over the page without remembering it, and closes on Escape", () => {
    renderAt(900);

    fireEvent.click(trigger());
    expect(sidebar()).toHaveAttribute("data-state", "expanded");
    expect(sidebar()).not.toHaveAttribute("data-rail");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    // The page keeps its width: the gap stays the rail's.
    expect(document.querySelector('[data-slot="sidebar-gap"]')).toHaveClass(
      "max-xl:w-(--sidebar-width-icon)",
    );
    // A wider screen's own choice is untouched.
    expect(Cookies.get(SIDEBAR_STATE_COOKIE)).toBeUndefined();

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    expect(sidebar()).toHaveAttribute("data-state", "collapsed");
  });

  it("closes when the page around it, or a link inside it, is clicked", () => {
    renderAt(1100);

    fireEvent.click(trigger());
    const backdrop = sidebar().querySelector<HTMLElement>(
      ".fixed.inset-0[aria-hidden='true']",
    )!;
    fireEvent.click(backdrop);
    expect(sidebar()).toHaveAttribute("data-state", "collapsed");

    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("link", { name: "Journal" }));
    expect(sidebar()).toHaveAttribute("data-state", "collapsed");
  });
});
