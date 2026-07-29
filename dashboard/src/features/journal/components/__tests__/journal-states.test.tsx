import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  JournalLoadingState,
  JournalErrorState,
  JournalEmptyState,
  LoadingSpinner,
} from "@/features/journal/components/journal-states";

describe("JournalLoadingState", () => {
  it("renders skeleton rows", () => {
    const { container } = render(<JournalLoadingState />);

    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders a header skeleton", () => {
    const { container } = render(<JournalLoadingState />);

    expect(container.querySelector(".head")).toBeInTheDocument();
  });
});

describe("JournalErrorState", () => {
  it("renders the error message", () => {
    render(<JournalErrorState message="Network timeout" />);

    expect(screen.getByText(/Network timeout/)).toBeInTheDocument();
  });

  it("renders with an error prefix from translations", () => {
    const { container } = render(<JournalErrorState message="Server error" />);

    expect(container.textContent).toMatch(/Server error/);
  });
});

describe("JournalEmptyState", () => {
  it("renders the empty state text", () => {
    render(<JournalEmptyState />);

    expect(screen.getByText(/no journal entries found/i)).toBeInTheDocument();
  });

  it("renders an icon or placeholder", () => {
    const { container } = render(<JournalEmptyState />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

describe("LoadingSpinner", () => {
  it("renders a spinning element", () => {
    const { container } = render(<LoadingSpinner />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
