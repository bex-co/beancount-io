import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeSwitch } from "../theme-switch";

// Mock useTheme hook
const mockSetTheme = vi.fn();
let mockTheme = "system";

vi.mock("@/common/hooks/use-theme", () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}));

describe("ThemeSwitch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = "system";
  });

  describe("trigger button label", () => {
    it("should display 'System' label when theme is 'system'", () => {
      mockTheme = "system";
      render(<ThemeSwitch />);
      expect(screen.getByRole("button")).toHaveTextContent("System");
    });

    it("should display 'Light' label when theme is 'light'", () => {
      mockTheme = "light";
      render(<ThemeSwitch />);
      expect(screen.getByRole("button")).toHaveTextContent("Light");
    });

    it("should display 'Dark' label when theme is 'dark'", () => {
      mockTheme = "dark";
      render(<ThemeSwitch />);
      expect(screen.getByRole("button")).toHaveTextContent("Dark");
    });
  });

  describe("dropdown menu items", () => {
    it("should open the dropdown when trigger is clicked", async () => {
      render(<ThemeSwitch />);
      await userEvent.click(screen.getByRole("button"));
      expect(screen.getAllByText("Light").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Dark").length).toBeGreaterThan(0);
      expect(screen.getAllByText("System").length).toBeGreaterThan(0);
    });

    it("should call setTheme('light') when Light option is clicked", async () => {
      render(<ThemeSwitch />);
      await userEvent.click(screen.getByRole("button"));
      const lightItems = screen.getAllByText("Light");
      await userEvent.click(lightItems[lightItems.length - 1]);
      expect(mockSetTheme).toHaveBeenCalledWith("light");
    });

    it("should call setTheme('dark') when Dark option is clicked", async () => {
      render(<ThemeSwitch />);
      await userEvent.click(screen.getByRole("button"));
      const darkItems = screen.getAllByText("Dark");
      await userEvent.click(darkItems[darkItems.length - 1]);
      expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });

    it("should call setTheme('system') when System option is clicked", async () => {
      mockTheme = "light";
      render(<ThemeSwitch />);
      await userEvent.click(screen.getByRole("button"));
      const systemItems = screen.getAllByText("System");
      await userEvent.click(systemItems[systemItems.length - 1]);
      expect(mockSetTheme).toHaveBeenCalledWith("system");
    });
  });

  describe("icons", () => {
    it("should render an SVG icon in the trigger button", () => {
      mockTheme = "system";
      const { container } = render(<ThemeSwitch />);
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });
  });
});
