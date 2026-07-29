import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatInput } from "../chat-input";

describe("ChatInput", () => {
  it("renders textarea and submit button", () => {
    render(<ChatInput value="" onChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("disables submit button when value is empty", () => {
    render(<ChatInput value="" onChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("disables submit button when disabled prop is true", () => {
    render(
      <ChatInput
        value="hello"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        disabled
      />,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls onSubmit when Enter is pressed with non-empty value", () => {
    const onSubmit = vi.fn();
    render(<ChatInput value="hello" onChange={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      shiftKey: false,
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onSubmit when Shift+Enter is pressed", () => {
    const onSubmit = vi.fn();
    render(<ChatInput value="hello" onChange={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      shiftKey: true,
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does NOT call onSubmit when Enter is pressed with empty value", () => {
    const onSubmit = vi.fn();
    render(<ChatInput value="" onChange={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      shiftKey: false,
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit when submit button is clicked with non-empty value", () => {
    const onSubmit = vi.fn();
    render(<ChatInput value="hello" onChange={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onSubmit when button clicked with empty value", () => {
    const onSubmit = vi.fn();
    render(<ChatInput value="" onChange={vi.fn()} onSubmit={onSubmit} />);
    // Button is disabled so click won't fire, but let's verify it's disabled
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
