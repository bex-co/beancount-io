import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordInput } from "../index";

describe("PasswordInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render password input", () => {
    render(<PasswordInput placeholder="Enter password" />);

    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
  });

  it("should render as password type by default", () => {
    render(<PasswordInput data-testid="password-input" />);

    const input = screen.getByTestId("password-input");
    expect(input).toHaveAttribute("type", "password");
  });

  it("should toggle password visibility when toggle button is clicked", async () => {
    const user = userEvent.setup();
    render(<PasswordInput data-testid="password-input" />);

    const input = screen.getByTestId("password-input");
    const toggleButton = screen.getByRole("button", { name: "Show password" });

    // Initially password is hidden
    expect(input).toHaveAttribute("type", "password");

    // Click to show password
    await user.click(toggleButton);
    expect(input).toHaveAttribute("type", "text");

    // Click to hide password again
    await user.click(toggleButton);
    expect(input).toHaveAttribute("type", "password");
  });

  it("should update aria-label when visibility is toggled", async () => {
    const user = userEvent.setup();
    render(<PasswordInput data-testid="password-input" />);

    const showButton = screen.getByRole("button", { name: "Show password" });
    await user.click(showButton);

    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toBeInTheDocument();
  });

  it("should pass through standard input props", () => {
    render(
      <PasswordInput
        id="test-password"
        name="password"
        autoComplete="current-password"
        data-testid="password-input"
      />,
    );

    const input = screen.getByTestId("password-input");
    expect(input).toHaveAttribute("id", "test-password");
    expect(input).toHaveAttribute("name", "password");
    expect(input).toHaveAttribute("autocomplete", "current-password");
  });

  it("should accept user input", async () => {
    const user = userEvent.setup();
    render(<PasswordInput data-testid="password-input" />);

    const input = screen.getByTestId("password-input");
    await user.type(input, "mypassword123");

    expect(input).toHaveValue("mypassword123");
  });

  it("should apply custom className", () => {
    render(
      <PasswordInput className="custom-class" data-testid="password-input" />,
    );

    const container = screen.getByTestId("password-input").closest(".relative");
    const input = screen.getByTestId("password-input");
    expect(container).toBeInTheDocument();
    expect(input).toHaveClass("custom-class");
  });

  it("should not lose focus when toggle button is clicked", async () => {
    const user = userEvent.setup();
    render(<PasswordInput data-testid="password-input" />);

    const input = screen.getByTestId("password-input");
    const toggleButton = screen.getByRole("button", { name: "Show password" });

    // Focus the input
    await user.click(input);
    expect(document.activeElement).toBe(input);

    // Click the toggle button - focus should stay on input
    // The button has onMouseDown={(e) => e.preventDefault()} to prevent focus loss
    await user.click(toggleButton);
    expect(document.activeElement).toBe(input);
  });

  it("should work with ref", () => {
    const ref = vi.fn();
    render(<PasswordInput ref={ref} />);

    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLInputElement);
  });

  it("should toggle button have tabIndex -1", () => {
    render(<PasswordInput data-testid="password-input" />);

    const toggleButton = screen.getByRole("button", { name: "Show password" });
    expect(toggleButton).toHaveAttribute("tabIndex", "-1");
  });

  it("should have displayName set", () => {
    expect(PasswordInput.displayName).toBe("PasswordInput");
  });
});
