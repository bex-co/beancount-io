import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ReportLoadingState,
  ReportErrorState,
  ReportEmptyState,
} from "../state-components";
import { TrendingUp } from "lucide-react";

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

describe("ReportLoadingState", () => {
  it("renders with default message", () => {
    render(<ReportLoadingState />);
    expect(screen.getByText("Loading data...")).toBeInTheDocument();
  });

  it("renders with custom message", () => {
    render(<ReportLoadingState message="Custom loading message" />);
    expect(screen.getByText("Custom loading message")).toBeInTheDocument();
  });

  it("contains an animated spinner icon", () => {
    const { container } = render(<ReportLoadingState />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
    // Check it's a CSS spinner with border-primary class
    expect(spinner).toHaveClass("border-primary");
    expect(spinner).toHaveClass("rounded-full");
  });

  it("has correct accessibility attributes", () => {
    render(<ReportLoadingState />);
    const statusElement = screen.getByRole("status");
    expect(statusElement).toHaveAttribute("aria-live", "polite");
    expect(statusElement).toHaveAttribute("aria-busy", "true");
  });

  it("contains fade-in animation classes", () => {
    const { container } = render(<ReportLoadingState />);
    const animatedElement = container.querySelector(".animate-in.fade-in");
    expect(animatedElement).toBeInTheDocument();
  });

  it("accepts custom className", () => {
    const { container } = render(
      <ReportLoadingState className="custom-class" />,
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("custom-class");
  });
});

describe("ReportErrorState", () => {
  it("renders with default title and message", () => {
    render(<ReportErrorState />);
    expect(screen.getByText("Error loading data")).toBeInTheDocument();
    expect(screen.getByText("Please try again later")).toBeInTheDocument();
  });

  it("renders with custom title", () => {
    render(<ReportErrorState title="Custom Error" />);
    expect(screen.getByText("Custom Error")).toBeInTheDocument();
  });

  it("renders with custom message", () => {
    render(<ReportErrorState message="Custom error message" />);
    expect(screen.getByText("Custom error message")).toBeInTheDocument();
  });

  it("renders with both custom title and message", () => {
    render(
      <ReportErrorState
        title="Custom Title"
        message="Custom error description"
      />,
    );
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom error description")).toBeInTheDocument();
  });

  it("has correct accessibility attributes", () => {
    render(<ReportErrorState />);
    const alertElement = screen.getByRole("alert");
    expect(alertElement).toHaveAttribute("aria-live", "assertive");
  });

  it("contains AlertCircle icon", () => {
    const { container } = render(<ReportErrorState />);
    // lucide-react uses lucide-circle-alert class for AlertCircle
    const alertIcon = container.querySelector(".lucide-circle-alert");
    expect(alertIcon).toBeInTheDocument();
  });

  it("contains fade-in animation classes", () => {
    const { container } = render(<ReportErrorState />);
    const animatedElement = container.querySelector(".animate-in.fade-in");
    expect(animatedElement).toBeInTheDocument();
  });

  it("does not show retry button when onRetry is not provided", () => {
    render(<ReportErrorState />);
    expect(screen.queryByText("Try Again")).not.toBeInTheDocument();
  });

  it("shows retry button when onRetry is provided", () => {
    const onRetry = vi.fn();
    render(<ReportErrorState onRetry={onRetry} />);
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", () => {
    const onRetry = vi.fn();
    render(<ReportErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByText("Try Again"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("accepts custom className", () => {
    const { container } = render(<ReportErrorState className="custom-class" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("custom-class");
  });
});

describe("ReportEmptyState", () => {
  it("renders with default title and message", () => {
    render(<ReportEmptyState />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
    expect(
      screen.getByText("No data found for selected filters"),
    ).toBeInTheDocument();
  });

  it("renders with custom title", () => {
    render(<ReportEmptyState title="Custom Empty Title" />);
    expect(screen.getByText("Custom Empty Title")).toBeInTheDocument();
  });

  it("renders with custom message", () => {
    render(<ReportEmptyState message="Custom empty message" />);
    expect(screen.getByText("Custom empty message")).toBeInTheDocument();
  });

  it("renders action content", () => {
    render(
      <ReportEmptyState>
        <a href="/next">Next step</a>
      </ReportEmptyState>,
    );
    expect(screen.getByRole("link", { name: "Next step" })).toHaveAttribute(
      "href",
      "/next",
    );
  });

  it("renders with custom icon", () => {
    const { container } = render(<ReportEmptyState Icon={TrendingUp} />);
    // Check that a lucide icon SVG is present
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("lucide-trending-up");
  });

  it("renders with all custom props", () => {
    render(
      <ReportEmptyState
        title="Custom Title"
        message="Custom Message"
        Icon={TrendingUp}
      />,
    );
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom Message")).toBeInTheDocument();
  });

  it("contains fade-in animation classes", () => {
    const { container } = render(<ReportEmptyState />);
    const animatedElement = container.querySelector(".animate-in.fade-in");
    expect(animatedElement).toBeInTheDocument();
  });

  it("contains zoom-in animation for icon container", () => {
    const { container } = render(<ReportEmptyState />);
    const iconContainer = container.querySelector(".zoom-in-50");
    expect(iconContainer).toBeInTheDocument();
  });

  it("accepts custom className", () => {
    const { container } = render(<ReportEmptyState className="custom-class" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("renders default FileSpreadsheet icon when no icon is provided", () => {
    const { container } = render(<ReportEmptyState />);
    const defaultIcon = container.querySelector(".lucide-file-spreadsheet");
    expect(defaultIcon).toBeInTheDocument();
  });
});
