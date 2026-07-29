import {
  isStaticToolUIPart,
  isTextUIPart,
  type DynamicToolUIPart,
  type ToolUIPart,
  type UIMessage,
} from "ai";
import { cn } from "@/common/lib/utils/utils";
import { MarkdownRenderer } from "@/common/components/markdown-renderer";
import { TypingIndicator } from "../../../components/typing-indicator";
import { FileEditApproval } from "../file-edit-approval";
import { ReceiptInsertApproval } from "../receipt-insert-approval";
import type { AgentUITools } from "../../../types/agent-tool-types";
import { Bot } from "lucide-react";
import { ToolActivityGroup } from "./tool-activity-group";
import { DynamicToolActivityGroup } from "./dynamic-tool-activity-group";
import { DynamicToolApproval } from "./dynamic-tool-approval";
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
  | { type: "dynamic-activity"; key: string; parts: DynamicToolUIPart[] }
  | { type: "dynamic-edit"; key: string; part: DynamicToolUIPart };

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
      const isApprovalRelated =
        part.state === "approval-requested" ||
        part.state === "approval-responded" ||
        part.state === "output-denied" ||
        ((part.state === "output-available" || part.state === "output-error") &&
          part.approval != null);
      if (isApprovalRelated) {
        blocks.push({
          type: "dynamic-edit",
          key: `dynamic-edit-${partIndex}`,
          part,
        });
      } else {
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
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={cn(
            "flex w-full animate-in gap-3 fade-in duration-300",
            message.role === "user"
              ? "justify-end pl-8 sm:pl-12"
              : "justify-start items-start",
          )}
        >
          {message.role === "assistant" && (
            <div className="shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/15 bg-primary/10 shadow-xs">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            </div>
          )}

          <div
            className={cn(
              "min-w-0 text-base leading-7",
              message.role === "user"
                ? "max-w-[92%] rounded-2xl rounded-br-md border border-border/70 bg-muted px-4 py-2.5 text-foreground shadow-xs sm:max-w-xl dark:bg-muted/80"
                : "min-w-0 flex-1 pt-1",
            )}
          >
            {message.role === "user" && <SentFileParts parts={message.parts} />}

            {buildMessageDisplayBlocks(message.parts).map((block) => {
              if (block.type === "text") {
                return (
                  <div key={block.key}>
                    <MarkdownRenderer
                      content={block.text}
                      className="agent-message-markdown"
                    />
                    {isLoading &&
                      index === messages.length - 1 &&
                      message.role === "assistant" && (
                        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
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

              if (block.type === "dynamic-edit") {
                return (
                  <DynamicToolApproval
                    key={block.key}
                    part={block.part}
                    onApprove={(id) =>
                      void addToolApprovalResponse({ id, approved: true })
                    }
                    onDeny={(id) =>
                      void addToolApprovalResponse({ id, approved: false })
                    }
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
          </div>
        </div>
      ))}

      {isLoading &&
        messages.length > 0 &&
        messages[messages.length - 1].role === "user" && (
          <div className="flex w-full items-start justify-start gap-3">
            <div className="shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/15 bg-primary/10 shadow-xs">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="rounded-2xl rounded-tl-md border border-border/50 bg-muted/60">
              <TypingIndicator />
            </div>
          </div>
        )}
    </div>
  );
}
