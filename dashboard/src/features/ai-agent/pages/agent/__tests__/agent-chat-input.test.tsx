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

  it("focuses the composer and preserves typing started elsewhere", async () => {
    const user = userEvent.setup();
    render(<AgentChatInputHarness />);

    const textarea = screen.getByPlaceholderText("Ask anything");
    expect(textarea).not.toHaveFocus();

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
});
