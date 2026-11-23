import { useState } from "react";
import {
  isStaticToolUIPart,
  isTextUIPart,
  type DynamicToolUIPart,
  type ToolUIPart,
  type UIMessage,
} from "ai";
import { cn } from "@/common/lib/utils/utils";
import { MarkdownRenderer } from "@/common/components/markdown-renderer";
import { useTranslations } from "@/common/hooks/use-translations";
import { TypingIndicator } from "../../../components/typing-indicator";
import { FileEditApproval } from "../file-edit-approval";
import { ReceiptInsertApproval } from "../receipt-insert-approval";
import type { AgentUITools } from "../../../types/agent-tool-types";
import { Bot, Check, Copy } from "lucide-react";
import { ToolActivityGroup } from "./tool-activity-group";
import { DynamicToolActivityGroup } from "./dynamic-tool-activity-group";
import { SentFileParts } from "./sent-file-parts";
import { UnknownBlock } from "./unknown-block";

type AgentDataTypes = {
  "file-upload": { objectKey: string; filename: string };
};
export type AgentUIMessage = UIMessage<unknown, AgentDataTypes, AgentUITools>;
export type AgentToolPart = ToolUIPart<AgentUITools>;

type MessageDisplayBlock =
  | { type: "text"; key: string; text: string }
  | { type: "activity"; key: string; parts: AgentToolPart[] }
  | { type: "edit"; key: string; part: AgentToolPart }
  | { type: "receipt-insert"; key: string; part: AgentToolPart }
  | { type: "dynamic-activity"; key: string; parts: DynamicToolUIPart[] };

function buildMessageDisplayBlocks(
  parts: AgentUIMessage["parts"],
): MessageDisplayBlock[] {
  const blocks: MessageDisplayBlock[] = [];

  parts.forEach((part, partIndex) => {
    if (isTextUIPart(part)) {
      blocks.push({
        type: "text",
        key: `text-${partIndex}`,
        text: part.text,
      });
      return;
    }

    if (part.type === "dynamic-tool") {
      const previousBlock = blocks[blocks.length - 1];
      if (previousBlock?.type === "dynamic-activity") {
        previousBlock.parts.push(part);
      } else {
        blocks.push({
          type: "dynamic-activity",
          key: `dynamic-activity-${partIndex}`,
          parts: [part],
        });
      }
      return;
    }

    if (!isStaticToolUIPart<AgentUITools>(part)) {
      return;
    }

    if (part.type === "tool-insertReceiptTransaction") {
      blocks.push({
        type: "receipt-insert",
        key: `receipt-insert-${partIndex}`,
        part,
      });
      return;
    }

    if (part.type === "tool-editLedgerFiles") {
      blocks.push({
        type: "edit",
        key: `edit-${partIndex}`,
        part,
      });
      return;
    }

    const previousBlock = blocks[blocks.length - 1];
    if (previousBlock?.type === "activity") {
      previousBlock.parts.push(part);
      return;
    }

    blocks.push({
      type: "activity",
      key: `activity-${partIndex}`,
      parts: [part],
    });
  });

  return blocks;
}

function CopyReplyButton({ text }: { text: string }) {
  const { t } = useTranslations();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard permission failures.
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="mt-2 inline-flex min-h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors motion-reduce:transition-none hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11 pointer-coarse:px-3"
      aria-label={copied ? t("common.copied") : t("common.copy")}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span>{copied ? t("common.copied") : t("common.copy")}</span>
    </button>
  );
}

interface AgentMessageListProps {
  messages: AgentUIMessage[];
  isLoading: boolean;
  addToolApprovalResponse: (args: {
    id: string;
    approved: boolean;
  }) => void | PromiseLike<void>;
}

export function AgentMessageList({
  messages,
  isLoading,
  addToolApprovalResponse,
}: AgentMessageListProps) {
  return (
    <div className="space-y-6 pb-2">
      {messages.map((message, index) => {
        const displayBlocks = buildMessageDisplayBlocks(message.parts);
        const assistantPlainText =
          message.role === "assistant"
            ? displayBlocks
                .filter(
                  (b): b is Extract<MessageDisplayBlock, { type: "text" }> =>
                    b.type === "text",
                )
                .map((b) => b.text)
                .join("\n\n")
                .trim()
            : "";
        const showCopyAction =
          message.role === "assistant" &&
          assistantPlainText.length > 0 &&
          !(isLoading && index === messages.length - 1);

        return (
          <div
            key={message.id}
            className={cn(
              "flex w-full animate-in fade-in duration-300 motion-reduce:animate-none",
              message.role === "user"
                ? "justify-end pl-6 sm:pl-12"
                : "flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:gap-3",
            )}
          >
            {message.role === "assistant" && (
              <div className="shrink-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/25 bg-primary/10 shadow-xs sm:h-8 sm:w-8 dark:border-primary/35 dark:bg-primary/15">
                  <Bot className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
                </div>
              </div>
            )}

            <div
              className={cn(
                "min-w-0 text-base leading-7",
                message.role === "user"
                  ? "max-w-[92%] rounded-2xl rounded-br-md border border-input/70 bg-muted px-4 py-2.5 text-foreground shadow-xs sm:max-w-xl dark:border-input/70 dark:bg-secondary/80"
                  : "min-w-0 flex-1 sm:pt-1",
              )}
            >
              {message.role === "user" && (
                <SentFileParts parts={message.parts} />
              )}

              {displayBlocks.map((block, blockIndex, blocks) => {
                if (block.type === "text") {
                  // Only the trailing text block of the streaming message still
                  // has text arriving, so it alone gets the caret.
                  const isStreamingTail =
                    isLoading &&
                    index === messages.length - 1 &&
                    message.role === "assistant" &&
                    blockIndex === blocks.length - 1;
                  return (
                    <div key={block.key}>
                      <MarkdownRenderer
                        content={block.text}
                        className="agent-message-markdown"
                      />
                      {isStreamingTail && (
                        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse motion-reduce:animate-none" />
                      )}
                    </div>
                  );
                }

                if (block.type === "activity") {
                  return (
                    <ToolActivityGroup key={block.key} parts={block.parts} />
                  );
                }

                if (block.type === "dynamic-activity") {
                  return (
                    <DynamicToolActivityGroup
                      key={block.key}
                      parts={block.parts}
                    />
                  );
                }

                if (block.type === "edit") {
                  return (
                    <FileEditApproval
                      key={block.key}
                      part={
                        block.part as Extract<
                          AgentToolPart,
                          { type: "tool-editLedgerFiles" }
                        >
                      }
                      onApprove={(id) =>
                        void addToolApprovalResponse({ id, approved: true })
                      }
                      onDeny={(id) =>
                        void addToolApprovalResponse({ id, approved: false })
                      }
                    />
                  );
                }

                if (block.type === "receipt-insert") {
                  return (
                    <ReceiptInsertApproval
                      key={block.key}
                      part={
                        block.part as Extract<
                          AgentToolPart,
                          { type: "tool-insertReceiptTransaction" }
                        >
                      }
                      onApprove={(id) =>
                        void addToolApprovalResponse({ id, approved: true })
                      }
                      onDeny={(id) =>
                        void addToolApprovalResponse({ id, approved: false })
                      }
                    />
                  );
                }

                return (
                  <UnknownBlock
                    key={(block as MessageDisplayBlock).key}
                    block={block}
                  />
                );
              })}

              {showCopyAction && <CopyReplyButton text={assistantPlainText} />}
            </div>
          </div>
        );
      })}

      {isLoading &&
        messages.length > 0 &&
        messages[messages.length - 1].role === "user" && (
          <div className="flex w-full flex-col items-start gap-2 sm:flex-row sm:items-start sm:gap-3">
            <div className="shrink-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/25 bg-primary/10 shadow-xs sm:h-8 sm:w-8 dark:border-primary/35 dark:bg-primary/15">
                <Bot className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="rounded-2xl rounded-tl-md border border-input/70 bg-muted/70 dark:border-input/70 dark:bg-secondary/70">
              <TypingIndicator />
            </div>
          </div>
        )}
    </div>
  );
}
