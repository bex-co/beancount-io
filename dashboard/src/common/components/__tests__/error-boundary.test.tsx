import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../error-boundary";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "common.errorBoundary.title": "Something went wrong",
        "common.errorBoundary.description":
          "This section couldn't be displayed. The rest of the page should still work.",
        "common.tryAgain": "Try Again",
        "common.errorDetails": "Error Details",
        "common.copy": "Copy",
        "common.reloadPage": "Reload page",
        "common.errorBoundary.updateTitle": "A new version is available",
      };
      return translations[key] || key;
    },
  }),
}));

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("secret internal failure");
  }
  return <div>panel content</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React logs caught render errors; keep test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <div>healthy content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("healthy content")).toBeInTheDocument();
  });

  it("renders the localized fallback when a child throws", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("keeps the raw error out of the fallback copy", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    const alert = screen.getByRole("alert");
    const visibleText = Array.from(alert.querySelectorAll("h3, p, button")).map(
      (node) => node.textContent,
    );
    expect(visibleText.join(" ")).not.toContain("secret internal failure");
  });

  it("offers the error behind a collapsed disclosure the reader can copy", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    const details = screen.getByText("Error Details").closest("details");
    expect(details).not.toHaveAttribute("open");
    expect(details).toHaveTextContent("Error: secret internal failure");

    fireEvent.click(screen.getByText("Copy"));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Error: secret internal failure"),
    );
    vi.unstubAllGlobals();
  });

  it("offers a full reload when the page predates the current build", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    function StaleChunk(): never {
      throw new TypeError(
        "Failed to fetch dynamically imported module: /lgassets/a.js",
      );
    }

    render(
      <ErrorBoundary>
        <StaleChunk />
      </ErrorBoundary>,
    );
    expect(screen.getByText("A new version is available")).toBeInTheDocument();
    expect(screen.queryByText("Try Again")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Reload page"));
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("leaves sibling content outside the boundary intact", () => {
    render(
      <div>
        <div>sibling panel</div>
        <ErrorBoundary>
          <Bomb shouldThrow />
        </ErrorBoundary>
      </div>,
    );
    expect(screen.getByText("sibling panel")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("only degrades the boundary whose child threw", () => {
    render(
      <div>
        <ErrorBoundary>
          <Bomb shouldThrow={false} />
        </ErrorBoundary>
        <ErrorBoundary>
          <Bomb shouldThrow />
        </ErrorBoundary>
      </div>,
    );
    expect(screen.getByText("panel content")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("recovers via the retry button once the cause is gone", () => {
    function Toggle() {
      return <Bomb shouldThrow={shouldThrow} />;
    }
    let shouldThrow = true;
    render(
      <ErrorBoundary>
        <Toggle />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByText("Try Again"));
    expect(screen.getByText("panel content")).toBeInTheDocument();
  });

  it("renders a custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText("custom fallback")).toBeInTheDocument();
  });
});
