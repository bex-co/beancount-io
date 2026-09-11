import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AgentChatInput } from "../agent-chat-input";

function AgentChatInputHarness({
  initialValue = "",
  disabled = false,
}: {
  initialValue?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <AgentChatInput
      value={value}
      onValueChange={setValue}
      onSubmit={vi.fn()}
      disabled={disabled}
      placeholder="Ask anything"
    />
  );
}

describe("AgentChatInput type-to-focus", () => {
  it("keeps the composer value and placeholder at the base font size", () => {
    render(<AgentChatInputHarness />);

    expect(screen.getByPlaceholderText("Ask anything")).toHaveClass(
      "text-base",
      "md:text-base",
    );
    expect(screen.getByPlaceholderText("Ask anything")).not.toHaveClass(
      "md:text-sm",
    );
  });

  it("autofocuses the composer on mount", () => {
    render(<AgentChatInputHarness />);

    expect(screen.getByPlaceholderText("Ask anything")).toHaveFocus();
  });

  it("does NOT autofocus on coarse-pointer (touch) devices", () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
    }) as unknown as typeof window.matchMedia;
    try {
      render(<AgentChatInputHarness />);
      expect(screen.getByPlaceholderText("Ask anything")).not.toHaveFocus();
    } finally {
      window.matchMedia = original;
    }
  });

  it("focuses the composer and captures typing", async () => {
    const user = userEvent.setup();
    render(<AgentChatInputHarness />);

    const textarea = screen.getByPlaceholderText("Ask anything");
    expect(textarea).toHaveFocus();

    await user.keyboard("hello");

    expect(textarea).toHaveFocus();
    expect(textarea).toHaveValue("hello");
  });

  it("appends the first typed character to an existing draft", () => {
    render(<AgentChatInputHarness initialValue="existing draft" />);

    fireEvent.keyDown(document.body, { key: "!" });

    const textarea = screen.getByPlaceholderText("Ask anything");
    expect(textarea).toHaveFocus();
    expect(textarea).toHaveValue("existing draft!");
  });

  it("does not steal typing from another editable control", async () => {
    const user = userEvent.setup();
    render(
      <>
        <input aria-label="Another input" />
        <AgentChatInputHarness />
      </>,
    );

    const otherInput = screen.getByLabelText("Another input");
    await user.click(otherInput);
    await user.keyboard("outside");

    expect(otherInput).toHaveValue("outside");
    expect(screen.getByPlaceholderText("Ask anything")).toHaveValue("");
  });

  it("ignores shortcuts and disabled composers", () => {
    const { rerender } = render(<AgentChatInputHarness />);

    fireEvent.keyDown(document.body, { key: "k", ctrlKey: true });
    expect(screen.getByPlaceholderText("Ask anything")).toHaveValue("");

    rerender(<AgentChatInputHarness disabled />);
    fireEvent.keyDown(document.body, { key: "x" });
    expect(screen.getByPlaceholderText("Ask anything")).toHaveValue("");
  });

  it("exposes a named Ask submit control even when empty", () => {
    render(<AgentChatInputHarness />);

    const ask = screen.getByRole("button", { name: "Ask" });
    expect(ask).toBeDisabled();
    expect(screen.getByRole("button", { name: "Attach file" })).toBeInTheDocument();
  });

  it("keeps the Ask name when the composer has a sendable draft", () => {
    render(<AgentChatInputHarness initialValue="What is double-entry?" />);

    expect(screen.getByRole("button", { name: "Ask" })).toBeEnabled();
  });

  it("does not submit while an IME composition is confirming Enter", () => {
    const onSubmit = vi.fn();
    render(
      <AgentChatInput
        value="How do I record "
        onValueChange={vi.fn()}
        onSubmit={onSubmit}
        placeholder="Ask anything"
      />,
    );

    fireEvent.keyDown(screen.getByPlaceholderText("Ask anything"), {
      key: "Enter",
      shiftKey: false,
      isComposing: true,
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits on ordinary Enter after composition has finished", () => {
    const onSubmit = vi.fn();
    render(
      <AgentChatInput
        value="How do I record 记账"
        onValueChange={vi.fn()}
        onSubmit={onSubmit}
        placeholder="Ask anything"
      />,
    );

    fireEvent.keyDown(screen.getByPlaceholderText("Ask anything"), {
      key: "Enter",
      shiftKey: false,
      isComposing: false,
    });

    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
