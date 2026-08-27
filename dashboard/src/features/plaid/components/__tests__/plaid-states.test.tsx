import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  PlaidLoadingState,
  PlaidErrorState,
  PlaidNotFoundState,
} from "../plaid-states";

describe("PlaidLoadingState", () => {
  it("renders a loading spinner", () => {
    const { container } = render(<PlaidLoadingState />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});

describe("PlaidErrorState", () => {
  it("renders the translated load-error heading", () => {
    render(<PlaidErrorState onRetry={vi.fn()} />);
    expect(screen.getByText("Failed to Load Data")).toBeInTheDocument();
  });

  it("renders Retry button that calls onRetry when clicked", () => {
    const onRetry = vi.fn();
    render(<PlaidErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("PlaidNotFoundState", () => {
  it("renders 'Institution not found'", () => {
    render(<PlaidNotFoundState />);
    expect(screen.getByText("Institution not found")).toBeInTheDocument();
  });
});
