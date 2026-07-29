import { MarkdownRenderer } from "@/common/components/markdown-renderer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: {
    prUrl?: string;
    prNumber?: number;
    branchName?: string;
    diff?: string;
    isQuestion?: boolean;
  };
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  return (
    <>
      <MarkdownRenderer content={message.content} />
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
      )}
    </>
  );
}
