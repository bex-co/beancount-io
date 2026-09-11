import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../button";

describe("Button", () => {
  it("should render button with children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("should not be disabled by default", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should show spinner while keeping the label when loading is true", () => {
    render(<Button loading>Submit</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    const spinner = button.querySelector("span.animate-spin");
    expect(spinner).toBeInTheDocument();
    expect(button.textContent).toContain("Submit");
  });

  it("should keep a pending button's accessible name", () => {
    render(<Button loading>Submit</Button>);
    const button = screen.getByRole("button");
    // The label is hidden with transparency, not `visibility: hidden`:
    // visibility-hidden text is excluded from the accessible name computation,
    // so a pending button would announce as an unnamed spinner.
    const label = button.querySelector("span:not(.absolute)");
    expect(label?.textContent).toBe("Submit");
    expect(label).toHaveClass("opacity-0");
    expect(label).not.toHaveClass("invisible");
    expect(label).not.toHaveAttribute("aria-hidden");
    expect(button).toHaveAccessibleName("Submit");
  });

  it("should keep an explicit aria-label on a pending button", () => {
    render(
      <Button loading aria-label="Execute query">
        Submit
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName("Execute query");
  });

  it("should have relative positioning class when loading", () => {
    render(<Button loading>Submit</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("relative");
  });

  it("should not show spinner when loading is false", () => {
    render(<Button loading={false}>Submit</Button>);
    const button = screen.getByRole("button");
    expect(button).not.toBeDisabled();
    expect(button.querySelector("span.animate-spin")).not.toBeInTheDocument();
    expect(screen.getByText("Submit")).toBeInTheDocument();
  });

  it("should be disabled when loading is true even without disabled prop", () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should apply custom className", () => {
    render(<Button className="custom-class">Click me</Button>);
    expect(screen.getByRole("button")).toHaveClass("custom-class");
  });

  it("should render with variant styles", () => {
    render(<Button variant="outline">Click me</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("border");
  });
});
