/**
 * Visual preview test for state components.
 * Run with: npx vitest run src/common/components/__tests__/state-components-visual.test.tsx --reporter=verbose
 *
 * This test renders each component and can be used for visual verification.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import {
  ReportLoadingState,
  ReportErrorState,
  ReportEmptyState,
} from "../state-components";
import { TrendingUp, BarChart3, Wallet } from "lucide-react";

// Mock the useTranslations hook
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "common.loadingData": "Loading data...",
        "common.tryAgain": "Try Again",
        "component.errorState.title": "Error loading data",
        "component.errorState.retry": "Please try again later",
        "component.emptyState.title": "No data available",
        "component.emptyState.noDataForFilters":
          "No data found for selected filters",
      };
      return translations[key] || key;
    },
  }),
}));

describe("State Components Visual Preview", () => {
  describe("ReportLoadingState", () => {
    it("renders default state with modern spinner", () => {
      const { container } = render(<ReportLoadingState />);

      // Verify key visual elements
      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass("border-primary");
      expect(spinner).toHaveClass("rounded-full");

      // Verify fade-in animation
      const fadeIn = container.querySelector(".animate-in.fade-in");
      expect(fadeIn).toBeInTheDocument();

      // Verify accessibility
      const status = container.querySelector('[role="status"]');
      expect(status).toHaveAttribute("aria-busy", "true");
    });

    it("renders with custom message", () => {
      const { getByText } = render(
        <ReportLoadingState message="Fetching your financial data..." />,
      );
      expect(getByText("Fetching your financial data...")).toBeInTheDocument();
    });
  });

  describe("ReportErrorState", () => {
    it("renders default error with icon and alert styling", () => {
      const { container } = render(<ReportErrorState />);

      // Verify error icon
      const icon = container.querySelector(".text-destructive");
      expect(icon).toBeInTheDocument();

      // Verify alert role
      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveAttribute("aria-live", "assertive");

      // Verify zoom animation on icon container
      const zoomIn = container.querySelector(".zoom-in-50");
      expect(zoomIn).toBeInTheDocument();
    });

    it("renders with retry button", () => {
      const onRetry = vi.fn();
      const { getByText } = render(
        <ReportErrorState
          title="Connection Failed"
          message="Unable to reach the server."
          onRetry={onRetry}
        />,
      );

      expect(getByText("Connection Failed")).toBeInTheDocument();
      expect(getByText("Unable to reach the server.")).toBeInTheDocument();
      expect(getByText("Try Again")).toBeInTheDocument();
    });
  });

  describe("ReportEmptyState", () => {
    it("renders with default FileSpreadsheet icon", () => {
      const { container } = render(<ReportEmptyState />);

      // Verify icon container with muted background
      const iconContainer = container.querySelector(".bg-muted.rounded-full");
      expect(iconContainer).toBeInTheDocument();

      // Verify default icon
      const icon = container.querySelector(".lucide-file-spreadsheet");
      expect(icon).toBeInTheDocument();
    });

    it("renders with custom TrendingUp icon", () => {
      const { container, getByText } = render(
        <ReportEmptyState
          Icon={TrendingUp}
          title="No Trends Yet"
          message="Add more transactions to see spending trends."
        />,
      );

      const icon = container.querySelector(".lucide-trending-up");
      expect(icon).toBeInTheDocument();
      expect(getByText("No Trends Yet")).toBeInTheDocument();
    });

    it("renders with BarChart3 icon", () => {
      const { container } = render(
        <ReportEmptyState Icon={BarChart3} title="No Reports Available" />,
      );

      // lucide-react uses lucide-chart-bar-big for BarChart3
      const icon = container.querySelector('[class*="lucide-chart"]');
      expect(icon).toBeInTheDocument();
    });

    it("renders with Wallet icon", () => {
      const { container } = render(
        <ReportEmptyState Icon={Wallet} title="No Accounts Found" />,
      );

      const icon = container.querySelector(".lucide-wallet");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    it("uses responsive padding classes in loading state", () => {
      const { container } = render(<ReportLoadingState />);
      const content = container.querySelector(".py-12.sm\\:py-16");
      expect(content).toBeInTheDocument();
    });

    it("uses responsive text sizes in error state", () => {
      const { container } = render(<ReportErrorState />);
      const title = container.querySelector(".text-base.sm\\:text-lg");
      expect(title).toBeInTheDocument();
    });

    it("uses responsive icon sizes in empty state", () => {
      const { container } = render(<ReportEmptyState />);
      const iconContainer = container.querySelector(
        ".h-14.w-14.sm\\:h-16.sm\\:w-16",
      );
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("Animation Classes", () => {
    it("has slide-in animations for content", () => {
      const onRetry = vi.fn();
      const { container } = render(<ReportErrorState onRetry={onRetry} />);
      const slideIn = container.querySelector(".slide-in-from-bottom-2");
      expect(slideIn).toBeInTheDocument();
    });

    it("has delay classes for staggered animations", () => {
      const onRetry = vi.fn();
      const { container } = render(<ReportErrorState onRetry={onRetry} />);
      const delayed = container.querySelector(".delay-200");
      expect(delayed).toBeInTheDocument();
    });
  });
});
