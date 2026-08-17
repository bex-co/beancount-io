import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Cookies from "js-cookie";
import { SidebarProvider, SidebarRail, useSidebar } from "../sidebar";
import {
  SIDEBAR_STATE_COOKIE,
  SIDEBAR_WIDTH_COOKIE,
  SIDEBAR_MIN_WIDTH_PX,
  SIDEBAR_MAX_WIDTH_PX,
  SIDEBAR_DEFAULT_WIDTH_PX,
} from "../sidebar-state";
// SIDEBAR_COLLAPSE_AT_PX = 140; clientX 100 is below it, 160/300 above.
import { MOBILE_BREAKPOINT } from "@/common/hooks/use-mobile";

// The isomorphic cookie helper resolves to its server (no-op write) branch
// under vitest; back it with real js-cookie so persistence round-trips through
// document.cookie and the provider's wiring is genuinely exercised.
vi.mock("@/common/hooks/use-cookie-storage-state/cookie", async () => {
  const jsCookie = (await import("js-cookie")).default;
  return {
    getCookie: (key: string) => jsCookie.get(key),
    setCookie: (key: string, value: string, options?: Cookies.CookieAttributes) =>
      jsCookie.set(key, value, options),
    removeCookie: (key: string, options?: Cookies.CookieAttributes) =>
      jsCookie.remove(key, options),
  };
});

// Reads live sidebar context into the DOM so tests can assert on it.
function Probe() {
  const { width, state } = useSidebar();
  return (
    <>
      <span data-testid="width">{width}</span>
      <span data-testid="state">{state}</span>
    </>
  );
}

function renderSidebar() {
  const utils = render(
    <SidebarProvider>
      <SidebarRail />
      <Probe />
    </SidebarProvider>,
  );
  const rail = screen.getByRole("separator");
  const wrapper = utils.container.querySelector(
    '[data-slot="sidebar-wrapper"]',
  ) as HTMLElement;
  return { ...utils, rail, wrapper };
}

const widthVar = (el: HTMLElement) =>
  el.style.getPropertyValue("--sidebar-width");

describe("SidebarRail drag-to-resize", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    Cookies.remove(SIDEBAR_WIDTH_COOKIE, { path: "/" });
    Cookies.remove(SIDEBAR_STATE_COOKIE, { path: "/" });

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

    // jsdom doesn't implement pointer capture; stub it so the handlers run.
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => true);
  });

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
    Cookies.remove(SIDEBAR_WIDTH_COOKIE, { path: "/" });
    Cookies.remove(SIDEBAR_STATE_COOKIE, { path: "/" });
  });

  it("starts at the default width", () => {
    renderSidebar();
    expect(screen.getByTestId("width")).toHaveTextContent(
      String(SIDEBAR_DEFAULT_WIDTH_PX),
    );
  });

  it("writes the live width to the CSS variable during a drag, then commits once on release", () => {
    const { rail, wrapper } = renderSidebar();

    fireEvent.pointerDown(rail, { pointerId: 1, clientX: 256, button: 0 });
    fireEvent.pointerMove(rail, { pointerId: 1, clientX: 300 });

    // Live: CSS var tracks the pointer, drag flag set, state not yet committed.
    expect(widthVar(wrapper)).toBe("300px");
    expect(wrapper.getAttribute("data-dragging")).toBe("true");
    expect(screen.getByTestId("width")).toHaveTextContent(
      String(SIDEBAR_DEFAULT_WIDTH_PX),
    );

    fireEvent.pointerUp(rail, { pointerId: 1, clientX: 300 });

    expect(screen.getByTestId("width")).toHaveTextContent("300");
    expect(wrapper.getAttribute("data-dragging")).toBeNull();
    expect(Cookies.get(SIDEBAR_WIDTH_COOKIE)).toBe("300");
  });

  it("clamps the committed width to the max when dragged far right", () => {
    const { rail } = renderSidebar();
    fireEvent.pointerDown(rail, { pointerId: 1, clientX: 256, button: 0 });
    fireEvent.pointerMove(rail, { pointerId: 1, clientX: 5000 });
    fireEvent.pointerUp(rail, { pointerId: 1, clientX: 5000 });
    expect(screen.getByTestId("width")).toHaveTextContent(
      String(SIDEBAR_MAX_WIDTH_PX),
    );
  });

  it("clamps the committed width to the min when dragged just above the collapse threshold", () => {
    const { rail } = renderSidebar();
    fireEvent.pointerDown(rail, { pointerId: 1, clientX: 256, button: 0 });
    fireEvent.pointerMove(rail, { pointerId: 1, clientX: 160 }); // >=140, <min
    fireEvent.pointerUp(rail, { pointerId: 1, clientX: 160 });
    expect(screen.getByTestId("state")).toHaveTextContent("expanded");
    expect(screen.getByTestId("width")).toHaveTextContent(
      String(SIDEBAR_MIN_WIDTH_PX),
    );
  });

  it("collapses to the icon rail when dragged narrower than the collapse threshold", () => {
    const { rail } = renderSidebar();
    expect(screen.getByTestId("state")).toHaveTextContent("expanded");
    fireEvent.pointerDown(rail, { pointerId: 1, clientX: 256, button: 0 });
    fireEvent.pointerMove(rail, { pointerId: 1, clientX: 100 }); // < 140
    fireEvent.pointerUp(rail, { pointerId: 1, clientX: 100 });
    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
  });

  it("re-expands and resizes when dragged back out past the threshold", () => {
    const { rail } = renderSidebar();
    fireEvent.pointerDown(rail, { pointerId: 1, clientX: 256, button: 0 });
    fireEvent.pointerMove(rail, { pointerId: 1, clientX: 100 }); // preview collapse
    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    fireEvent.pointerMove(rail, { pointerId: 1, clientX: 300 }); // pull back out
    fireEvent.pointerUp(rail, { pointerId: 1, clientX: 300 });
    expect(screen.getByTestId("state")).toHaveTextContent("expanded");
    expect(screen.getByTestId("width")).toHaveTextContent("300");
  });

  it("treats a press with no movement as a click that toggles the sidebar", () => {
    const { rail } = renderSidebar();
    expect(screen.getByTestId("state")).toHaveTextContent("expanded");

    fireEvent.pointerDown(rail, { pointerId: 1, clientX: 256, button: 0 });
    fireEvent.pointerUp(rail, { pointerId: 1, clientX: 256 });

    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
  });

  it("ignores non-primary buttons", () => {
    const { rail, wrapper } = renderSidebar();
    fireEvent.pointerDown(rail, { pointerId: 1, clientX: 256, button: 2 });
    fireEvent.pointerMove(rail, { pointerId: 1, clientX: 300 });
    // No drag started, so the width var is untouched.
    expect(wrapper.getAttribute("data-dragging")).toBeNull();
  });

  it("resizes by a fixed step with arrow keys", () => {
    const { rail } = renderSidebar();
    fireEvent.keyDown(rail, { key: "ArrowRight" });
    expect(screen.getByTestId("width")).toHaveTextContent(
      String(SIDEBAR_DEFAULT_WIDTH_PX + 16),
    );
    fireEvent.keyDown(rail, { key: "ArrowLeft" });
    expect(screen.getByTestId("width")).toHaveTextContent(
      String(SIDEBAR_DEFAULT_WIDTH_PX),
    );
  });
});

describe("SidebarProvider persistence", () => {
  beforeEach(() => {
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
    Cookies.remove(SIDEBAR_WIDTH_COOKIE, { path: "/" });
    Cookies.remove(SIDEBAR_STATE_COOKIE, { path: "/" });
  });

  it("seeds the initial width from the sidebar_width cookie", () => {
    Cookies.set(SIDEBAR_WIDTH_COOKIE, "320", { path: "/" });
    renderSidebarProbe();
    expect(screen.getByTestId("width")).toHaveTextContent("320");
  });

  it("seeds the initial open state from the sidebar_state cookie (fixes the reload bug)", () => {
    Cookies.set(SIDEBAR_STATE_COOKIE, "false", { path: "/" });
    renderSidebarProbe();
    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
  });
});

function renderSidebarProbe() {
  return render(
    <SidebarProvider>
      <Probe />
    </SidebarProvider>,
  );
}
