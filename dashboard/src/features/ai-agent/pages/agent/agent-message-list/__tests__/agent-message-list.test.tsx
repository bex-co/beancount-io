import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AgentMessageList, type AgentUIMessage } from "../agent-message-list";

function streamingMessage(parts: AgentUIMessage["parts"]): AgentUIMessage {
  return { id: "m1", role: "assistant", parts };
}

const toolPart = (toolCallId: string): AgentUIMessage["parts"][number] => ({
  type: "dynamic-tool",
  toolName: "runBqlQuery",
  toolCallId,
  state: "output-available",
  input: {},
  output: {},
});

function renderList(message: AgentUIMessage, isLoading = true) {
  return render(
    <AgentMessageList
      messages={[message]}
      isLoading={isLoading}
      addToolApprovalResponse={() => {}}
    />,
  );
}

describe("AgentMessageList streaming caret", () => {
  it("renders one caret when text is still the trailing block", () => {
    const { container } = renderList(
      streamingMessage([
        { type: "text", text: "I'll analyze your income trends." },
        toolPart("t1"),
        { type: "text", text: "Now a yearly summary:" },
      ]),
    );

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(1);
  });

  it("renders no caret while a tool block is the trailing block", () => {
    const { container } = renderList(
      streamingMessage([
        { type: "text", text: "I'll analyze your income trends." },
        toolPart("t1"),
      ]),
    );

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(0);
  });

  it("renders no caret once streaming finishes", () => {
    const { container } = renderList(
      streamingMessage([{ type: "text", text: "Done." }]),
      false,
    );

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(0);
  });
});
