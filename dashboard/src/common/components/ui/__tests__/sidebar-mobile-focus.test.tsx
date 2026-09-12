import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "../sidebar";
import { MOBILE_BREAKPOINT } from "@/common/hooks/use-mobile";

/**
 * The narrow sidebar is a controlled Radix Sheet with no `SheetTrigger`, so Radix
 * has no trigger to return focus to. These tests drive the real composition
 * (provider + Sheet + trigger) and assert `document.activeElement` after close.
 */
describe("narrow sidebar focus restoration", () => {
  let originalMatchMedia: typeof window.matchMedia;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    originalInnerWidth = window.innerWidth;

    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    });

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
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  const findSheet = () => screen.findByRole("dialog");

  it("returns focus to the trigger that opened the sheet", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <Sidebar>
          <button type="button">Inside sheet</button>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    );

    const trigger = screen.getByRole("button", { name: "Toggle Sidebar" });
    await user.click(trigger);
    await findSheet();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    expect(document.activeElement).toBe(trigger);
  });

  it("returns focus to the opener even when it is not the sidebar trigger", async () => {
    function CustomOpener() {
      const { setOpenMobile } = useSidebar();
      return (
        <button type="button" onClick={() => setOpenMobile(true)}>
          Custom opener
        </button>
      );
    }

    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <Sidebar>
          <button type="button">Inside sheet</button>
        </Sidebar>
        <SidebarTrigger />
        <CustomOpener />
      </SidebarProvider>,
    );

    const opener = screen.getByRole("button", { name: "Custom opener" });
    await user.click(opener);
    await findSheet();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    expect(document.activeElement).toBe(opener);
  });

  it("falls back to the current page's trigger after an in-sheet navigation", async () => {
    function NavigatingApp() {
      const [page, setPage] = React.useState("a");
      return (
        <SidebarProvider>
          <Sidebar>
            <SheetNavLink onNavigate={() => setPage("b")} />
          </Sidebar>
          {/* A distinct key models the trigger being remounted by the new page. */}
          <SidebarTrigger key={page} data-testid={`trigger-${page}`} />
        </SidebarProvider>
      );
    }

    function SheetNavLink({ onNavigate }: { onNavigate: () => void }) {
      const { setOpenMobile } = useSidebar();
      return (
        <button
          type="button"
          onClick={() => {
            onNavigate();
            setOpenMobile(false);
          }}
        >
          Go to page B
        </button>
      );
    }

    const user = userEvent.setup();
    render(<NavigatingApp />);

    const firstTrigger = screen.getByTestId("trigger-a");
    await user.click(firstTrigger);
    await findSheet();

    await user.click(screen.getByRole("button", { name: "Go to page B" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    const secondTrigger = screen.getByTestId("trigger-b");
    expect(firstTrigger.isConnected).toBe(false);
    expect(document.activeElement).toBe(secondTrigger);
  });

  it("does not trap focus on the body when no opener or trigger exists", async () => {
    function ProgrammaticOpen() {
      const { setOpenMobile } = useSidebar();
      React.useEffect(() => {
        setOpenMobile(true);
        // Open once on mount; the dependency is a stable provider callback.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }

    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <Sidebar>
          <button type="button">Inside sheet</button>
        </Sidebar>
        <ProgrammaticOpen />
      </SidebarProvider>,
    );

    await findSheet();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // No candidate to restore to: Radix's default behavior is left untouched
    // rather than focusing an unfocusable element.
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
