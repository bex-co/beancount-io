import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/common/components/ui/dropdown-menu";
import { Button } from "@/common/components/ui/button";
import { ChevronDown, AlignLeft, MessageSquare, ChevronUp } from "lucide-react";

// Mock navigator.platform for platform detection tests
const mockNavigatorPlatform = (platform: string) => {
  Object.defineProperty(window.navigator, "platform", {
    value: platform,
    configurable: true,
  });
};

describe("Editor Menu with Keyboard Shortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Platform Detection", () => {
    it("should detect Mac platform", () => {
      mockNavigatorPlatform("MacIntel");
      const isMac =
        typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
      expect(isMac).toBe(true);
    });

    it("should detect non-Mac platform", () => {
      mockNavigatorPlatform("Win32");
      const isMac =
        typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
      expect(isMac).toBe(false);
    });

    it("should handle undefined navigator", () => {
      const originalNavigator = global.navigator;
      // @ts-expect-error - Testing undefined case
      delete global.navigator;

      const isMac =
        typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
      expect(isMac).toBe(false);

      global.navigator = originalNavigator;
    });
  });

  describe("Keyboard Shortcut Display", () => {
    it("should render Mac shortcuts with Unicode symbols", () => {
      mockNavigatorPlatform("MacIntel");
      const isMac =
        typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <MessageSquare className="h-4 w-4 mr-2" />
              Toggle Comment
              <DropdownMenuShortcut>
                {isMac ? "⌘/" : "Ctrl+/"}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("⌘/")).toBeInTheDocument();
      expect(screen.queryByText("Ctrl+/")).not.toBeInTheDocument();
    });

    it("should render Windows/Linux shortcuts with text", () => {
      mockNavigatorPlatform("Win32");
      const isMac =
        typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <MessageSquare className="h-4 w-4 mr-2" />
              Toggle Comment
              <DropdownMenuShortcut>
                {isMac ? "⌘/" : "Ctrl+/"}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Ctrl+/")).toBeInTheDocument();
      expect(screen.queryByText("⌘/")).not.toBeInTheDocument();
    });

    it("should render fold all shortcut for Mac", () => {
      mockNavigatorPlatform("MacIntel");
      const isMac =
        typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <ChevronUp className="h-4 w-4 mr-2" />
              Fold All
              <DropdownMenuShortcut>
                {isMac ? "⌘⌥[" : "Ctrl+Alt+["}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("⌘⌥[")).toBeInTheDocument();
    });

    it("should render fold all shortcut for Windows", () => {
      mockNavigatorPlatform("Win32");
      const isMac =
        typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <ChevronUp className="h-4 w-4 mr-2" />
              Fold All
              <DropdownMenuShortcut>
                {isMac ? "⌘⌥[" : "Ctrl+Alt+["}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Ctrl+Alt+[")).toBeInTheDocument();
    });

    it("should render unfold all shortcut for Mac", () => {
      mockNavigatorPlatform("MacIntel");
      const isMac =
        typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <ChevronDown className="h-4 w-4 mr-2" />
              Unfold All
              <DropdownMenuShortcut>
                {isMac ? "⌘⌥]" : "Ctrl+Alt+]"}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("⌘⌥]")).toBeInTheDocument();
    });

    it("should render unfold all shortcut for Windows", () => {
      mockNavigatorPlatform("Win32");
      const isMac =
        typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <ChevronDown className="h-4 w-4 mr-2" />
              Unfold All
              <DropdownMenuShortcut>
                {isMac ? "⌘⌥]" : "Ctrl+Alt+]"}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Ctrl+Alt+]")).toBeInTheDocument();
    });
  });

  describe("Editor Menu Structure", () => {
    it("should render editor menu trigger button", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <span className="hidden sm:inline">Editor</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </DropdownMenu>,
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should render all menu items", () => {
      const handleAlignAmounts = vi.fn();
      const handleToggleComment = vi.fn();
      const handleFoldAll = vi.fn();
      const handleUnfoldAll = vi.fn();

      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleAlignAmounts}>
              <AlignLeft className="h-4 w-4 mr-2" />
              Align Amounts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleComment}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Toggle Comment
              <DropdownMenuShortcut>⌘/</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleFoldAll}>
              <ChevronUp className="h-4 w-4 mr-2" />
              Fold All
              <DropdownMenuShortcut>⌘⌥[</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleUnfoldAll}>
              <ChevronDown className="h-4 w-4 mr-2" />
              Unfold All
              <DropdownMenuShortcut>⌘⌥]</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Align Amounts")).toBeInTheDocument();
      expect(screen.getByText("Toggle Comment")).toBeInTheDocument();
      expect(screen.getByText("Fold All")).toBeInTheDocument();
      expect(screen.getByText("Unfold All")).toBeInTheDocument();
    });

    it("should call handler when Align Amounts is clicked", async () => {
      const user = userEvent.setup();
      const handleAlignAmounts = vi.fn();

      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleAlignAmounts}>
              <AlignLeft className="h-4 w-4 mr-2" />
              Align Amounts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      const menuItem = screen.getByText("Align Amounts").closest("div");
      if (menuItem) {
        await user.click(menuItem);
        expect(handleAlignAmounts).toHaveBeenCalledTimes(1);
      }
    });

    it("should call handler when Toggle Comment is clicked", async () => {
      const user = userEvent.setup();
      const handleToggleComment = vi.fn();

      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleToggleComment}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Toggle Comment
              <DropdownMenuShortcut>⌘/</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      const menuItem = screen.getByText("Toggle Comment").closest("div");
      if (menuItem) {
        await user.click(menuItem);
        expect(handleToggleComment).toHaveBeenCalledTimes(1);
      }
    });

    it("should call handler when Fold All is clicked", async () => {
      const user = userEvent.setup();
      const handleFoldAll = vi.fn();

      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleFoldAll}>
              <ChevronUp className="h-4 w-4 mr-2" />
              Fold All
              <DropdownMenuShortcut>⌘⌥[</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      const menuItem = screen.getByText("Fold All").closest("div");
      if (menuItem) {
        await user.click(menuItem);
        expect(handleFoldAll).toHaveBeenCalledTimes(1);
      }
    });

    it("should call handler when Unfold All is clicked", async () => {
      const user = userEvent.setup();
      const handleUnfoldAll = vi.fn();

      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleUnfoldAll}>
              <ChevronDown className="h-4 w-4 mr-2" />
              Unfold All
              <DropdownMenuShortcut>⌘⌥]</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      const menuItem = screen.getByText("Unfold All").closest("div");
      if (menuItem) {
        await user.click(menuItem);
        expect(handleUnfoldAll).toHaveBeenCalledTimes(1);
      }
    });

    it("should show shortcut for Align Amounts", () => {
      mockNavigatorPlatform("MacIntel");
      const isMac =
        typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <AlignLeft className="h-4 w-4 mr-2" />
              Align Amounts
              <DropdownMenuShortcut>
                {isMac ? "⌘D" : "Ctrl+D"}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("⌘D")).toBeInTheDocument();
    });
  });

  describe("DropdownMenuShortcut Component", () => {
    it("should apply correct styling classes", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Test
              <DropdownMenuShortcut>⌘/</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      const shortcut = screen.getByText("⌘/");
      expect(shortcut).toHaveClass("ml-auto");
      expect(shortcut).toHaveClass("text-xs");
    });

    it("should be right-aligned", () => {
      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Test
              <DropdownMenuShortcut>⌘/</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      const shortcut = screen.getByText("⌘/");
      // ml-auto should push it to the right
      expect(shortcut).toHaveClass("ml-auto");
    });
  });

  describe("Accessibility", () => {
    it("should have accessible button role", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>Editor</Button>
          </DropdownMenuTrigger>
        </DropdownMenu>,
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });
});
