import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it.each([
    { variant: "ghost", style: "hover:bg-accent" },
    { variant: "outline", style: "border" },
    { variant: "default", style: "bg-primary" },
  ] as const)(
    "emits a forced-colors keyboard outline for $variant and preserves native activation",
    async ({ variant, style }) => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button variant={variant} size="sm" onClick={onClick}>
          Run action
        </Button>,
      );
      const button = screen.getByRole("button", { name: "Run action" });
      // jsdom does not paint forced colors. These are the emitted CSS rules;
      // native browser focus/pixel checks establish the visible outline.
      expect(button).toHaveClass(
        "forced-colors:focus-visible:[outline-style:solid]",
        "forced-colors:focus-visible:outline-2",
        "forced-colors:focus-visible:outline-offset-2",
        "forced-colors:focus-visible:outline-[CanvasText]",
      );
      expect(button).toHaveClass(style, "h-8", "focus-visible:ring-[3px]");
      await user.tab();
      expect(button).toHaveFocus();
      await user.keyboard("{Enter} ");
      expect(onClick).toHaveBeenCalledTimes(2);
      expect(button).toHaveFocus();
    },
  );

  it("skips disabled and pending buttons during Tab and prevents their activation", async () => {
    const user = userEvent.setup();
    const blocked = vi.fn();
    const enabled = vi.fn();
    render(
      <>
        <Button disabled onClick={blocked}>
          Disabled action
        </Button>
        <Button loading onClick={blocked}>
          Pending action
        </Button>
        <Button onClick={enabled}>Ready action</Button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Ready action" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(enabled).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Disabled action" }));
    await user.click(screen.getByRole("button", { name: "Pending action" }));
    expect(blocked).not.toHaveBeenCalled();
  });

  it("keeps the forced-colors outline and keyboard callback on an asChild link", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((event) => event.preventDefault());
    render(
      <Button asChild variant="ghost" onClick={onClick}>
        <a href="/help">Help</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Help" });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/help");
    expect(link).toHaveClass(
      "forced-colors:focus-visible:[outline-style:solid]",
      "forced-colors:focus-visible:outline-[CanvasText]",
    );
    await user.tab();
    expect(link).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledOnce();
    expect(link).toHaveFocus();
  });
});
