import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LedgerFileBreadcrumb from "../ledger-file-breadcrumb";

// Mock @tanstack/react-router
const mockParams = {
  ledgerOwner: "testOwner",
  ledgerName: "testLedger",
};

vi.mock("@tanstack/react-router", () => ({
  useParams: () => mockParams,
}));

// Mock use-file-navigate hook
const mockFileNavigate = vi.fn();
vi.mock("@/common/hooks/use-file-navigate", () => ({
  useFileNavigate: () => mockFileNavigate,
}));

// Mock encode utility
vi.mock("@/common/lib/utils/encode", () => ({
  createLedgerId: (owner: string, name: string) => `${owner}/${name}`,
}));

describe("LedgerFileBreadcrumb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("directory breadcrumb", () => {
    it("should render root for empty path", () => {
      render(<LedgerFileBreadcrumb type="dir" path="" />);

      expect(screen.getByText("File")).toBeInTheDocument();
    });

    it("should render root and single segment for single-level path", () => {
      render(<LedgerFileBreadcrumb type="dir" path="accounts" />);

      expect(screen.getByText("File")).toBeInTheDocument();
      expect(screen.getByText("accounts")).toBeInTheDocument();
    });

    it("should render all segments for multi-level path", () => {
      render(<LedgerFileBreadcrumb type="dir" path="accounts/2024/january" />);

      expect(screen.getByText("File")).toBeInTheDocument();
      expect(screen.getByText("accounts")).toBeInTheDocument();
      expect(screen.getByText("2024")).toBeInTheDocument();
      expect(screen.getByText("january")).toBeInTheDocument();
    });

    it("should navigate to root when clicking File", () => {
      render(<LedgerFileBreadcrumb type="dir" path="accounts" />);

      const rootButton = screen.getByText("File");
      fireEvent.click(rootButton);

      // fileNavigate is called with: ledgerId, type, path
      expect(mockFileNavigate).toHaveBeenCalledWith(
        "testOwner/testLedger", // base64 encoded ledgerId
        "dir",
        "",
      );
    });

    it("should navigate to correct path when clicking segment", () => {
      render(<LedgerFileBreadcrumb type="dir" path="accounts/2024" />);

      const accountsButton = screen.getByText("accounts");
      fireEvent.click(accountsButton);

      expect(mockFileNavigate).toHaveBeenCalledWith(
        "testOwner/testLedger",
        "dir",
        "accounts",
      );
    });

    it("should navigate to cumulative path for nested segments", () => {
      render(
        <LedgerFileBreadcrumb type="dir" path="accounts/2024/january/data" />,
      );

      const yearButton = screen.getByText("2024");
      fireEvent.click(yearButton);

      expect(mockFileNavigate).toHaveBeenCalledWith(
        "testOwner/testLedger",
        "dir",
        "accounts/2024",
      );
    });

    it("should apply custom className", () => {
      const { container } = render(
        <LedgerFileBreadcrumb
          type="dir"
          path="accounts"
          className="custom-class"
        />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("custom-class");
    });
  });

  describe("file breadcrumb", () => {
    it("should render root and filename for file at root", () => {
      render(<LedgerFileBreadcrumb type="file" path="main.beancount" />);

      expect(screen.getByText("File")).toBeInTheDocument();
      expect(screen.getByText("main.beancount")).toBeInTheDocument();
    });

    it("should render parent directories and filename for nested file", () => {
      render(
        <LedgerFileBreadcrumb
          type="file"
          path="accounts/2024/data.beancount"
        />,
      );

      expect(screen.getByText("File")).toBeInTheDocument();
      expect(screen.getByText("accounts")).toBeInTheDocument();
      expect(screen.getByText("2024")).toBeInTheDocument();
      expect(screen.getByText("data.beancount")).toBeInTheDocument();
    });

    it("should navigate to parent directory when clicking parent segment", () => {
      render(
        <LedgerFileBreadcrumb
          type="file"
          path="accounts/2024/data.beancount"
        />,
      );

      const accountsButton = screen.getByText("accounts");
      fireEvent.click(accountsButton);

      expect(mockFileNavigate).toHaveBeenCalledWith(
        "testOwner/testLedger",
        "dir",
        "accounts",
      );
    });

    it("should not make filename clickable", () => {
      render(<LedgerFileBreadcrumb type="file" path="main.beancount" />);

      const filename = screen.getByText("main.beancount");
      expect(filename.tagName).not.toBe("BUTTON");
    });

    it("should display filename with font-medium class", () => {
      render(<LedgerFileBreadcrumb type="file" path="main.beancount" />);

      const filename = screen.getByText("main.beancount");
      expect(filename).toHaveClass("font-medium");
    });
  });

  describe("name prop", () => {
    it("should use name prop over derived name from path", () => {
      render(
        <LedgerFileBreadcrumb
          type="file"
          path="accounts/data.beancount"
          name="Custom Name"
        />,
      );

      expect(screen.getByText("Custom Name")).toBeInTheDocument();
      expect(screen.queryByText("data.beancount")).not.toBeInTheDocument();
    });

    it("should derive name from path when name is not provided", () => {
      render(
        <LedgerFileBreadcrumb type="file" path="accounts/important.txt" />,
      );

      expect(screen.getByText("important.txt")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle path with trailing slash", () => {
      render(<LedgerFileBreadcrumb type="dir" path="accounts/" />);

      expect(screen.getByText("File")).toBeInTheDocument();
      expect(screen.getByText("accounts")).toBeInTheDocument();
    });

    it("should handle path with leading slash", () => {
      render(<LedgerFileBreadcrumb type="dir" path="/accounts" />);

      expect(screen.getByText("File")).toBeInTheDocument();
      expect(screen.getByText("accounts")).toBeInTheDocument();
    });

    it("should handle undefined path", () => {
      render(<LedgerFileBreadcrumb type="dir" />);

      expect(screen.getByText("File")).toBeInTheDocument();
    });

    it("should handle file with no name and empty path", () => {
      const { container } = render(<LedgerFileBreadcrumb type="file" />);

      expect(screen.getByText("File")).toBeInTheDocument();
      // Filename should be empty, but component should not crash
      expect(container).toBeInTheDocument();
    });
  });

  describe("icons", () => {
    it("should render Home icon", () => {
      const { container } = render(<LedgerFileBreadcrumb type="dir" path="" />);

      // Home icon from lucide-react should be present
      const homeIcon = container.querySelector("svg");
      expect(homeIcon).toBeInTheDocument();
    });

    it("should render ChevronRight between segments", () => {
      const { container } = render(
        <LedgerFileBreadcrumb type="dir" path="accounts/2024" />,
      );

      // Should have ChevronRight icons (at least 2 for this path)
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThanOrEqual(3); // Home + 2 chevrons
    });
  });
});
