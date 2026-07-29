import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { JournalPagination } from "../journal-pagination";

describe("JournalPagination", () => {
  let setOffsetMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    setOffsetMock = vi.fn();
  });

  describe("visibility", () => {
    it("should not render when total is less than or equal to limit and offset is 0", () => {
      const { container } = render(
        <JournalPagination
          total={10}
          limit={20}
          offset={0}
          setOffset={setOffsetMock}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("should not render when total equals limit and offset is 0", () => {
      const { container } = render(
        <JournalPagination
          total={20}
          limit={20}
          offset={0}
          setOffset={setOffsetMock}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render when total exceeds limit + offset", () => {
      render(
        <JournalPagination
          total={50}
          limit={20}
          offset={0}
          setOffset={setOffsetMock}
        />,
      );

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("should render when offset is greater than 0", () => {
      render(
        <JournalPagination
          total={30}
          limit={20}
          offset={20}
          setOffset={setOffsetMock}
        />,
      );

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });
  });

  describe("page calculation", () => {
    it("should show correct current page number", () => {
      render(
        <JournalPagination
          total={100}
          limit={10}
          offset={20}
          setOffset={setOffsetMock}
        />,
      );

      // Current page should be 3 (offset 20 / limit 10 + 1)
      const page3Link = screen.getByText("3");
      expect(page3Link).toHaveAttribute("aria-current", "page");
    });

    it("should calculate total pages correctly", () => {
      render(
        <JournalPagination
          total={100}
          limit={10}
          offset={0}
          setOffset={setOffsetMock}
        />,
      );

      // Should show page 10 (last page)
      expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("should show first page when offset is 0", () => {
      render(
        <JournalPagination
          total={100}
          limit={10}
          offset={0}
          setOffset={setOffsetMock}
        />,
      );

      const page1Link = screen.getByText("1");
      expect(page1Link).toHaveAttribute("aria-current", "page");
    });
  });

  describe("pagination navigation", () => {
    it("should call setOffset with 0 when clicking first page", () => {
      render(
        <JournalPagination
          total={100}
          limit={10}
          offset={50}
          setOffset={setOffsetMock}
        />,
      );

      const page1Link = screen.getByText("1");
      page1Link.click();

      expect(setOffsetMock).toHaveBeenCalledWith(0);
    });

    it("should call setOffset with correct value when clicking a page", () => {
      render(
        <JournalPagination
          total={100}
          limit={10}
          offset={0}
          setOffset={setOffsetMock}
        />,
      );

      // Click page 3
      const page3Link = screen.getByText("3");
      page3Link.click();

      // Offset should be (3 - 1) * 10 = 20
      expect(setOffsetMock).toHaveBeenCalledWith(20);
    });

    it("should call setOffset with correct value for last page", () => {
      render(
        <JournalPagination
          total={100}
          limit={10}
          offset={0}
          setOffset={setOffsetMock}
        />,
      );

      const page10Link = screen.getByText("10");
      page10Link.click();

      // Offset should be (10 - 1) * 10 = 90
      expect(setOffsetMock).toHaveBeenCalledWith(90);
    });
  });

  describe("previous/next buttons", () => {
    it("should render previous button", () => {
      render(
        <JournalPagination
          total={100}
          limit={10}
          offset={20}
          setOffset={setOffsetMock}
        />,
      );

      expect(screen.getByText("Previous")).toBeInTheDocument();
    });

    it("should render next button", () => {
      render(
        <JournalPagination
          total={100}
          limit={10}
          offset={20}
          setOffset={setOffsetMock}
        />,
      );

      expect(screen.getByText("Next")).toBeInTheDocument();
    });

    it("should set aria-disabled on previous button when on first page", () => {
      render(
        <JournalPagination
          total={100}
          limit={10}
          offset={0}
          setOffset={setOffsetMock}
        />,
      );

      const prevButton = screen.getByText("Previous").closest("a");
      expect(prevButton).toHaveAttribute("aria-disabled", "true");
    });

    it("should set aria-disabled on next button when on last page", () => {
      render(
        <JournalPagination
          total={100}
          limit={10}
          offset={90}
          setOffset={setOffsetMock}
        />,
      );

      const nextButton = screen.getByText("Next").closest("a");
      expect(nextButton).toHaveAttribute("aria-disabled", "true");
    });

    it("should call setOffset with previous page offset when clicking previous", () => {
      render(
        <JournalPagination
          total={100}
          limit={10}
          offset={30}
          setOffset={setOffsetMock}
        />,
      );

      const prevButton = screen.getByText("Previous").closest("a");
      prevButton?.click();

      expect(setOffsetMock).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should call setOffset with next page offset when clicking next", () => {
      render(
        <JournalPagination
          total={100}
          limit={10}
          offset={30}
          setOffset={setOffsetMock}
        />,
      );

      const nextButton = screen.getByText("Next").closest("a");
      nextButton?.click();

      expect(setOffsetMock).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe("ellipsis", () => {
    it("should show start ellipsis when current page is far from start", () => {
      render(
        <JournalPagination
          total={200}
          limit={10}
          offset={80}
          setOffset={setOffsetMock}
        />,
      );

      // Should show ellipsis between page 1 and page 7
      const ellipses = screen.queryAllByText("More pages");
      expect(ellipses.length).toBeGreaterThan(0);
    });

    it("should show end ellipsis when current page is far from end", () => {
      render(
        <JournalPagination
          total={200}
          limit={10}
          offset={30}
          setOffset={setOffsetMock}
        />,
      );

      // Should show ellipsis between page 6 and page 20
      const ellipses = screen.queryAllByText("More pages");
      expect(ellipses.length).toBeGreaterThan(0);
    });

    it("should not show ellipsis when all pages are visible", () => {
      render(
        <JournalPagination
          total={50}
          limit={10}
          offset={20}
          setOffset={setOffsetMock}
        />,
      );

      const ellipses = screen.queryAllByText("More pages");
      expect(ellipses.length).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should handle single extra page", () => {
      render(
        <JournalPagination
          total={25}
          limit={20}
          offset={0}
          setOffset={setOffsetMock}
        />,
      );

      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should handle total equal to limit + 1", () => {
      render(
        <JournalPagination
          total={21}
          limit={20}
          offset={0}
          setOffset={setOffsetMock}
        />,
      );

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("should handle very large total", () => {
      render(
        <JournalPagination
          total={10000}
          limit={10}
          offset={0}
          setOffset={setOffsetMock}
        />,
      );

      // Should show page 1000 (last page)
      expect(screen.getByText("1000")).toBeInTheDocument();
    });

    it("should handle limit of 1", () => {
      render(
        <JournalPagination
          total={5}
          limit={1}
          offset={0}
          setOffset={setOffsetMock}
        />,
      );

      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });
});
