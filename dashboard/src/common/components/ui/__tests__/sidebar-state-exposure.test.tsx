import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Cookies from "js-cookie";
import {
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "../sidebar";
import {
  SIDEBAR_STATE_COOKIE,
  SIDEBAR_WIDTH_COOKIE,
  SIDEBAR_MIN_WIDTH_PX,
  SIDEBAR_MAX_WIDTH_PX,
  SIDEBAR_DEFAULT_WIDTH_PX,
  SIDEBAR_WIDTH_ICON_PX,
  SIDEBAR_WIDTH_STEP_PX,
} from "../sidebar-state";
import { MOBILE_BREAKPOINT } from "@/common/hooks/use-mobile";

/**
 * The rail is a window splitter and the trigger is a disclosure control, so
 * both have to describe the pane as it actually is. The rail used to publish
 * the remembered expanded width even while the pane was the icon rail, and the
 * trigger carried the same name in both states with no expanded property.
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
  const { width, state } = useSidebar();
  return (
    <>
      <span data-testid="width">{width}</span>
      <span data-testid="state">{state}</span>
    </>
  );
}

function renderSidebar({ defaultOpen = true }: { defaultOpen?: boolean } = {}) {
  render(
    <SidebarProvider defaultOpen={defaultOpen}>
      <SidebarRail />
      <SidebarTrigger />
      <Probe />
    </SidebarProvider>,
  );
  return {
    rail: screen.getByRole("separator"),
    trigger: screen.getByRole("button"),
  };
}

/** What the splitter currently reports, as numbers. */
function splitter(rail: HTMLElement) {
  return {
    now: Number(rail.getAttribute("aria-valuenow")),
    min: Number(rail.getAttribute("aria-valuemin")),
    max: Number(rail.getAttribute("aria-valuemax")),
  };
}

let originalMatchMedia: typeof window.matchMedia;

beforeEach(() => {
  Cookies.remove(SIDEBAR_STATE_COOKIE, { path: "/" });
  Cookies.remove(SIDEBAR_WIDTH_COOKIE, { path: "/" });

  originalMatchMedia = window.matchMedia;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: window.innerWidth < MOBILE_BREAKPOINT,
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
  Cookies.remove(SIDEBAR_STATE_COOKIE, { path: "/" });
  Cookies.remove(SIDEBAR_WIDTH_COOKIE, { path: "/" });
});

describe("splitter reports the pane's present size", () => {
  it("reports the expanded width while expanded", () => {
    const { rail } = renderSidebar();

    expect(splitter(rail)).toEqual({
      now: SIDEBAR_DEFAULT_WIDTH_PX,
      min: SIDEBAR_MIN_WIDTH_PX,
      max: SIDEBAR_MAX_WIDTH_PX,
    });
  });

  it("reports the icon rail once collapsed, not the remembered width", () => {
    const { rail } = renderSidebar();

    fireEvent.keyDown(rail, { key: "Enter" });

    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    expect(splitter(rail).now).toBe(SIDEBAR_WIDTH_ICON_PX);
    expect(splitter(rail).now).not.toBe(SIDEBAR_DEFAULT_WIDTH_PX);
  });

  it("moves the reported minimum down with the collapsed pane", () => {
    const { rail } = renderSidebar();
    expect(splitter(rail).min).toBe(SIDEBAR_MIN_WIDTH_PX);

    fireEvent.keyDown(rail, { key: "Enter" });

    // A drag minimum of 192 does not describe a 48px pane, and would leave the
    // reported position outside its own range.
    expect(splitter(rail).min).toBe(SIDEBAR_WIDTH_ICON_PX);

    fireEvent.keyDown(rail, { key: "Enter" });
    expect(splitter(rail).min).toBe(SIDEBAR_MIN_WIDTH_PX);
  });

  it("keeps the reported value inside the reported range in both states", () => {
    const { rail } = renderSidebar();

    for (const _ of [0, 1, 2]) {
      const { now, min, max } = splitter(rail);
      expect(now).toBeGreaterThanOrEqual(min);
      expect(now).toBeLessThanOrEqual(max);
      fireEvent.keyDown(rail, { key: "Enter" });
    }
  });

  it("reports the icon rail on a collapsed first render", () => {
    const { rail } = renderSidebar({ defaultOpen: false });

    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    expect(splitter(rail).now).toBe(SIDEBAR_WIDTH_ICON_PX);
  });

  it("restores a nondefault width after a collapse round trip", () => {
    const { rail } = renderSidebar();
    fireEvent.keyDown(rail, { key: "ArrowRight" });
    const widened = SIDEBAR_DEFAULT_WIDTH_PX + SIDEBAR_WIDTH_STEP_PX;
    expect(splitter(rail).now).toBe(widened);

    fireEvent.keyDown(rail, { key: "Enter" });
    expect(splitter(rail).now).toBe(SIDEBAR_WIDTH_ICON_PX);
    // The preference survives; only what is reported changed.
    expect(screen.getByTestId("width")).toHaveTextContent(String(widened));

    fireEvent.keyDown(rail, { key: "Enter" });
    expect(splitter(rail).now).toBe(widened);
  });

  it("still moves the reported value with keyboard resizing", () => {
    const { rail } = renderSidebar();

    fireEvent.keyDown(rail, { key: "ArrowRight" });
    const widened = SIDEBAR_DEFAULT_WIDTH_PX + SIDEBAR_WIDTH_STEP_PX;
    expect(splitter(rail).now).toBe(widened);
    expect(screen.getByTestId("width")).toHaveTextContent(String(widened));

    fireEvent.keyDown(rail, { key: "ArrowLeft" });
    expect(splitter(rail).now).toBe(SIDEBAR_DEFAULT_WIDTH_PX);
  });
});

describe("trigger reports whether the sidebar is open", () => {
  it("is expanded while the sidebar is open", () => {
    const { trigger } = renderSidebar();

    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("follows the sidebar through collapse and back", () => {
    const { rail, trigger } = renderSidebar();

    fireEvent.keyDown(rail, { key: "Enter" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.keyDown(rail, { key: "Enter" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("reports collapsed on a collapsed first render", () => {
    const { trigger } = renderSidebar({ defaultOpen: false });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles the sidebar when activated, and says so", () => {
    const { trigger } = renderSidebar();

    fireEvent.click(trigger);

    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
