import { useState, useRef, useEffect } from "react";
import { useParams, useSearch } from "@tanstack/react-router";
import { config } from "@/config/config";
import { Button } from "@/common/components/ui/button";
import { PageHeader } from "@/common/components/page-header";
import { useTranslations } from "@/common/hooks/use-translations";
import { nanoidBase58 } from "@/common/lib/utils/nanoid-base58";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { SuggestionChips } from "./suggestion-chips";
import { TypingIndicator } from "../../components/typing-indicator";
import { AiCfoUpgradePanel } from "@/common/components/ai-cfo-upgrade-panel";
import type { StreamingState } from "./streaming-state";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { useLedger } from "@/common/hooks/use-ledger";
import {
  Bot,
  User,
  GitPullRequest,
  ExternalLink,
  ChevronDown,
  RotateCcw,
} from "lucide-react";

export type AskAIMode = "bql" | "sandbox";

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
    stopped?: boolean;
    retryable?: boolean;
    durationMs?: number;
  };
}

function formatDuration(ms: number): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds}s`;
}

interface AskAIPageProps {
  mode?: AskAIMode;
}

function isCoarsePointer(): boolean {
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
}

export default function AskAIPage({ mode: modeProp = "bql" }: AskAIPageProps) {
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/ask",
  });
  const searchParams = useSearch({
    from: "/ledger/$ledgerOwner/$ledgerName/ask",
  });
  const initialQuestion = (searchParams as { q?: string; mode?: AskAIMode }).q;
  const mode: AskAIMode =
    (searchParams as { q?: string; mode?: AskAIMode }).mode ?? modeProp;
  const { t, i18n } = useTranslations();
  const { ledgerDisplayName } = useLedger();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("aiAgent.welcome"),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setStreamingState] = useState<StreamingState>("idle");

  // Stable id for THIS chat conversation. The sandbox keys its container on this
  // value, so every turn here shares one container (and its git/filesystem
  // state). The container is the conversation's memory — we only send the latest
  // message, not the history. A fresh page mount starts a new conversation.
  const [conversationId] = useState(() => `conv_${nanoidBase58(16)}`);

  // Track if we've already auto-submitted to prevent duplicates
  const hasAutoSubmittedRef = useRef(false);
  const streamingStateTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastQuestionRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wasLoadingRef = useRef(false);

  // Cleanup timers and any in-flight stream on unmount
  useEffect(() => {
    return () => {
      if (streamingStateTimerRef.current) {
        clearTimeout(streamingStateTimerRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  // Return focus to the input when a turn finishes so the follow-up loop is
  // keyboard-only (skipped on touch devices — see ChatInput autofocus note).
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && !isCoarsePointer()) {
      inputRef.current?.focus();
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading]);

  // Auto-scroll refs and state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll]);

  // Detect user scroll to disable auto-scroll
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
    setShouldAutoScroll(isAtBottom);
  };

  const submitQuestion = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    lastQuestionRef.current = trimmed;
    const startedAt = Date.now();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingState("connecting");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Set when the assistant bubble has been appended, so the abort path knows
    // whether there is a partial answer to mark as stopped.
    let pushedAssistantId: string | null = null;

    try {
      const response = await fetch(`${config.apiUrl}chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": i18n.language,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: userMessage.content }],
          ledgerId: `${ledgerOwner}/${ledgerName}`,
          conversationId,
          mode,
        }),
        credentials: "include",
        signal: controller.signal,
      });

      // Handle authentication/authorization errors
      if (response.status === 401 || response.status === 403) {
        console.warn(
          "Authentication failed for chat API, clearing token and redirecting to login",
        );

        // Construct current path to preserve return URL
        const currentPath = `/ledger/${ledgerOwner}/${ledgerName}/ask`;
        const nextParam = encodeURIComponent(currentPath);
        window.location.href = `/auth/login?next=${nextParam}`;

        return; // Exit early to prevent further processing
      }

      // Handle AI CFO usage limit (429)
      if (response.status === 429) {
        const errorBody = await response.json().catch(() => null);
        if (errorBody?.code === "AI_CFO_LIMIT_REACHED") {
          const { maxAllowed } = errorBody.details || {};
          setStreamingState("error");
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "assistant",
              content: t("aiAgent.limitReached", {
                max: String(maxAllowed ?? ""),
              }),
            },
          ]);
          return;
        }
        throw new Error("Too many requests");
      }

      // Handle service unavailable (e.g. AI CFO usage check failure)
      if (response.status === 503) {
        setStreamingState("error");
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: t("aiAgent.serviceUnavailable"),
            data: { retryable: true },
          },
        ]);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      };
      pushedAssistantId = assistantMessage.id;

      setMessages((prev) => [...prev, assistantMessage]);

      let hasFinalAnswer = false;
      let hasReceivedFirstEvent = false;
      let hasError = false; // Track error state locally to avoid stale closure
      let buffer = ""; // Buffer for incomplete lines

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // CRITICAL: Process any remaining buffered data before breaking
          // This ensures final SSE events (like QUESTION-COMPLETED) are not lost
          if (buffer.length > 0) {
            const finalLines = buffer.split("\n");
            for (const line of finalLines) {
              if (line.startsWith("data:")) {
                try {
                  const data = JSON.parse(line.slice(5).trim());

                  // Process the same way as normal events
                  let updatedContent = assistantMessage.content;
                  if (data.metadata?.logs) {
                    updatedContent = data.metadata.logs;
                    hasFinalAnswer = true;
                  } else if (data.metadata?.error) {
                    updatedContent = `Error: ${data.metadata.error}`;
                    hasError = true;
                  } else if (data.content && !hasFinalAnswer) {
                    updatedContent = data.content;
                  }

                  assistantMessage = {
                    ...assistantMessage,
                    content: updatedContent,
                  };

                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessage.id
                        ? { ...assistantMessage }
                        : m,
                    ),
                  );
                } catch (err) {
                  console.error("Error parsing final buffer line:", err);
                }
              }
            }
          }
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Split by newlines but keep incomplete line in buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep last (potentially incomplete) line

        for (const line of lines) {
          if (line.startsWith("data:")) {
            try {
              const data = JSON.parse(line.slice(5).trim());

              // Transition to streaming on first event
              if (!hasReceivedFirstEvent) {
                setStreamingState("streaming");
                hasReceivedFirstEvent = true;
              }

              // Check if we have the final AI response in metadata.logs
              // eslint-disable-next-line prefer-const
              let updatedMessage = { ...assistantMessage };
              if (data.metadata?.logs) {
                // Replace content with Claude's actual answer
                updatedMessage.content = data.metadata.logs;
                hasFinalAnswer = true;
                setStreamingState("finalizing");

                // Also store branch name and diff if available
                if (data.metadata.branchName) {
                  updatedMessage.data = {
                    ...updatedMessage.data,
                    branchName: data.metadata.branchName,
                    diff: data.metadata.diff,
                  };
                }
              } else if (data.metadata?.error) {
                // Handle errors
                setStreamingState("error");
                updatedMessage.content = `Error: ${data.metadata.error}`;
                updatedMessage.data = {
                  ...updatedMessage.data,
                  retryable: true,
                };
                hasError = true;
              } else if (data.content && !hasFinalAnswer) {
                // Only show status messages if we don't have the final answer yet
                updatedMessage.content = data.content;
              }

              // Always preserve PR info
              if (data.metadata?.prUrl) {
                updatedMessage.data = {
                  ...updatedMessage.data,
                  prUrl: data.metadata.prUrl,
                  prNumber: data.metadata.prNumber,
                };
              }

              // Capture isQuestion flag
              if (data.metadata?.isQuestion !== undefined) {
                updatedMessage.data = {
                  ...updatedMessage.data,
                  isQuestion: data.metadata.isQuestion,
                };
              }

              assistantMessage = updatedMessage;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { ...assistantMessage };
                return newMessages;
              });
            } catch (err) {
              console.error("Error parsing SSE data:", err);
            }
          }
        }
      }

      // After the stream completes: stamp how long the answer took so the
      // bubble can show it (only on turns that ended without an error).
      if (!hasError && assistantMessage.content) {
        const durationMs = Date.now() - startedAt;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, data: { ...m.data, durationMs } }
              : m,
          ),
        );
      }

      if (hasFinalAnswer && !hasError) {
        setStreamingState("complete");
        // Auto-fade to idle after 2 seconds
        // Clear any existing timer
        if (streamingStateTimerRef.current) {
          clearTimeout(streamingStateTimerRef.current);
        }
        streamingStateTimerRef.current = setTimeout(
          () => setStreamingState("idle"),
          2000,
        );
      }
    } catch (error) {
      if (controller.signal.aborted) {
        // User stopped the stream: keep whatever partial answer exists and
        // mark it as stopped rather than showing an error.
        setStreamingState("idle");
        if (pushedAssistantId) {
          const stoppedId = pushedAssistantId;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === stoppedId
                ? { ...m, data: { ...m.data, stopped: true } }
                : m,
            ),
          );
        }
      } else {
        console.error("Chat error:", error);
        setStreamingState("error");
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: t("common.errors.generic"),
            data: { retryable: true },
          },
        ]);
      }
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  // Auto-submit initial question if provided (?q= deep link)
  useEffect(() => {
    if (initialQuestion?.trim() && !hasAutoSubmittedRef.current) {
      // Mark as submitted before triggering to prevent double submission
      hasAutoSubmittedRef.current = true;
      void submitQuestion(initialQuestion.trim());
    }
    // Runs once on mount; submitQuestion is re-created every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitQuestion(input);
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const handleRetry = () => {
    if (!isLoading && lastQuestionRef.current) {
      void submitQuestion(lastQuestionRef.current);
    }
  };

  return (
    <>
      <LedgerPageSEO seoKey="ledgerAsk" />

      <div className="flex flex-col h-full w-full max-w-3xl mx-auto">
        {/* Scrollable area: header + messages */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto space-y-4 pb-4 min-w-0 w-full relative p-4 sm:p-6"
        >
          {/* Header */}
          <PageHeader
            title={t("aiAgent.title", { ledgerName: ledgerDisplayName })}
            description={t("common.pageDescription.ask", {
              ledgerName: ledgerDisplayName ?? ledgerName,
            })}
          />

          {/* Upgrade panel for users near AI request limit */}
          <AiCfoUpgradePanel />
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex gap-3 w-full group animate-in fade-in duration-300 ${
                message.role === "user"
                  ? "justify-end items-end"
                  : "justify-start items-start"
              }`}
            >
              {/* Assistant avatar on left */}
              {message.role === "assistant" && (
                <div className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                </div>
              )}

              {/* Message bubble */}
              <div
                className={`w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl rounded-2xl px-4 py-3 relative ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                }`}
              >
                <ChatMessage
                  message={message}
                  isStreaming={isLoading && index === messages.length - 1}
                />

                {/* Stopped marker */}
                {message.data?.stopped && (
                  <div className="mt-2 text-xs italic opacity-70">
                    {t("aiAgent.stopped")}
                  </div>
                )}

                {/* Response duration */}
                {message.data?.durationMs !== undefined && (
                  <div className="mt-2 text-xs opacity-60">
                    {t("aiAgent.answeredIn", {
                      duration: formatDuration(message.data.durationMs),
                    })}
                  </div>
                )}

                {/* Retry button for retryable errors */}
                {message.data?.retryable && !isLoading && (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRetry}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      {t("aiAgent.retry")}
                    </Button>
                  </div>
                )}

                {/* Show PR link if present (task) */}
                {message.data?.prUrl && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
                    <GitPullRequest className="h-4 w-4 text-green-700 dark:text-green-400" />
                    <span className="text-xs text-green-700 dark:text-green-400">
                      {t("aiAgent.prCreated")}
                    </span>
                    <a
                      href={message.data.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1 text-xs"
                    >
                      {t("aiAgent.viewPR")} #{message.data.prNumber}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* User avatar on right */}
              {message.role === "user" && (
                <div className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator while loading */}
          {isLoading &&
            messages.length > 0 &&
            messages[messages.length - 1].role === "user" && (
              <div className="flex gap-3 w-full justify-start items-start">
                <div className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                </div>
                <div className="max-w-[80%] sm:max-w-lg md:max-w-xl lg:max-w-2xl rounded-2xl bg-muted rounded-bl-sm">
                  <TypingIndicator />
                </div>
              </div>
            )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {!shouldAutoScroll && (
          <Button
            onClick={() => {
              setShouldAutoScroll(true);
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            size="icon"
            className="absolute bottom-24 right-4 rounded-full shadow-lg z-10"
            aria-label={t("aiAgent.scrollToBottom")}
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        )}

        {/* Input Form - Sticky at bottom */}
        <div className="z-40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-4 sm:px-6 pt-3 pb-1">
          {/* Suggestion chips in the empty state only */}
          {messages.length === 1 && !isLoading && !initialQuestion && (
            <SuggestionChips onSelect={(q) => void submitQuestion(q)} />
          )}
          <form onSubmit={handleSubmit}>
            <ChatInput
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onSubmit={() => {
                if (!isLoading && input.trim()) {
                  void submitQuestion(input);
                }
              }}
              onStop={handleStop}
              onClear={() => setInput("")}
              isStreaming={isLoading}
              placeholder={t("aiAgent.placeholder")}
              disabled={isLoading}
              stopLabel={t("aiAgent.stop")}
            />
          </form>
        </div>
      </div>
    </>
  );
}
