import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMessage } from "../chat-message";

// Mock MarkdownRenderer to simplify testing
vi.mock("@/common/components/markdown-renderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-content">{content}</div>
  ),
}));

describe("ChatMessage", () => {
  const userMessage = {
    id: "msg-1",
    role: "user" as const,
    content: "Hello, can you help me?",
  };

  const assistantMessage = {
    id: "msg-2",
    role: "assistant" as const,
    content: "Sure, I can help you!",
  };

  describe("Content rendering", () => {
    it("should render the message content", () => {
      render(<ChatMessage message={userMessage} />);
      expect(screen.getByText("Hello, can you help me?")).toBeInTheDocument();
    });

    it("should render assistant message content", () => {
      render(<ChatMessage message={assistantMessage} />);
      expect(screen.getByText("Sure, I can help you!")).toBeInTheDocument();
    });

    it("should render content through MarkdownRenderer", () => {
      render(<ChatMessage message={userMessage} />);
      expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
    });

    it("should render empty content without crashing", () => {
      const emptyMessage = { id: "msg-3", role: "user" as const, content: "" };
      expect(() =>
        render(<ChatMessage message={emptyMessage} />),
      ).not.toThrow();
    });
  });

  describe("Streaming indicator", () => {
    it("should not show streaming indicator when isStreaming is false", () => {
      const { container } = render(
        <ChatMessage message={assistantMessage} isStreaming={false} />,
      );
      const streamingIndicator = container.querySelector(".animate-pulse");
      expect(streamingIndicator).not.toBeInTheDocument();
    });

    it("should not show streaming indicator when isStreaming is undefined", () => {
      const { container } = render(<ChatMessage message={assistantMessage} />);
      const streamingIndicator = container.querySelector(".animate-pulse");
      expect(streamingIndicator).not.toBeInTheDocument();
    });

    it("should show streaming indicator when isStreaming is true", () => {
      const { container } = render(
        <ChatMessage message={assistantMessage} isStreaming={true} />,
      );
      const streamingIndicator = container.querySelector(".animate-pulse");
      expect(streamingIndicator).toBeInTheDocument();
    });

    it("should show inline streaming cursor when streaming", () => {
      const { container } = render(
        <ChatMessage message={assistantMessage} isStreaming={true} />,
      );
      const cursor = container.querySelector(".animate-pulse");
      expect(cursor).toHaveClass("inline-block");
      expect(cursor).toHaveClass("w-2");
      expect(cursor).toHaveClass("h-4");
    });
  });

  describe("Message with data", () => {
    it("should render message with PR data without crashing", () => {
      const messageWithData = {
        id: "msg-4",
        role: "assistant" as const,
        content: "I created a PR for you",
        data: {
          prUrl: "https://github.com/owner/repo/pull/1",
          prNumber: 1,
          branchName: "feature/new-feature",
        },
      };
      expect(() =>
        render(<ChatMessage message={messageWithData} />),
      ).not.toThrow();
    });

    it("should render message with diff data without crashing", () => {
      const messageWithDiff = {
        id: "msg-5",
        role: "assistant" as const,
        content: "Here is the diff",
        data: {
          diff: "- old line\n+ new line",
          isQuestion: false,
        },
      };
      expect(() =>
        render(<ChatMessage message={messageWithDiff} />),
      ).not.toThrow();
    });
  });
});
