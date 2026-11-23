import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useSearch } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isTextUIPart,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type FileUIPart,
} from "ai";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  useErrorMessage,
  getErrorMessageKey,
} from "@/common/lib/errors/error-message";
import { getConfigurationError } from "@/common/lib/errors/configuration-error";
import { toast } from "sonner";
import { AiCfoUpgradePanel } from "@/common/components/ai-cfo-upgrade-panel";
import { useLedger } from "@/common/hooks/use-ledger";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import { useIsAuthenticated } from "@/common/hooks/use-is-authenticated";
import { track } from "@/common/analytics";
import { config } from "@/config/config";
import { AgentChatInput } from "./agent-chat-input";
import { AgentMessageList, type AgentUIMessage } from "./agent-message-list";

import { buildUnauthenticatedLoginHref } from "@/common/apollo/links/auth-error-link";
import { buildAgentLoginNextUrl } from "./agent-login-next-url";
import { useTempAssetUpload } from "@/common/hooks/use-temp-asset-upload";
import { useTempAssetDownloadUrl } from "./use-temp-asset-download-url";
import {
  createStagedEntries,
  markStagedUploadFailed,
  markStagedUploadSucceeded,
  removeStagedFile,
  type StagedFile,
} from "./attachment";
import { useAgentSession } from "../../hooks/use-agent-session";
import {
  AlertCircle,
  ChevronDown,
  CornerDownLeft,
  LockKeyhole,
  PieChart,
  ReceiptText,
  SquarePen,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

export function AgentPageImpl() {
  const { ledgerOwner, ledgerName } = useParams({ strict: false }) as {
    ledgerOwner: string;
    ledgerName: string;
  };
  const searchParams = useSearch({ strict: false });
  const initialQuestion = (searchParams as { q?: string }).q;
  const { t, i18n } = useTranslations();
  const formatError = useErrorMessage();
  const { ledgerDisplayName } = useLedger();
  const { canWrite } = useLedgerPermission();
  const isAuthenticated = useIsAuthenticated();
  const isReadOnly = isAuthenticated && !canWrite;
  const { sessionId, startNewSession } = useAgentSession("ai-agent-session");

  const [input, setInput] = useState(() => initialQuestion?.trim() ?? "");
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const isAutoScrollingRef = useRef(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const i18nRef = useRef(i18n);
  i18nRef.current = i18n;

  const { uploadFile } = useTempAssetUpload();
  const { fetchDownloadUrl } = useTempAssetDownloadUrl();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${config.apiUrl}agent`,
        credentials: "include",
        headers: () => ({ "Accept-Language": i18nRef.current.language }),
        // The browser's zone, read per request, so the agent knows today's date
        // where the user is (w21/856).
        body: () => ({
          ledgerId: `${ledgerOwner}/${ledgerName}`,
          sessionId,
          timeZone: browserTimeZone(),
        }),
        fetch: async (url, options) => {
          const response = await fetch(url as string, options as RequestInit);
          if (response.status === 401) {
            // Keep lang for the return URL, but drop q so login does not
            // auto-send the deep-linked question.
            const next = buildAgentLoginNextUrl(
              window.location.pathname,
              window.location.search,
            );
            window.location.assign(buildUnauthenticatedLoginHref(next));
          }
          return response;
        },
      }),
    [ledgerOwner, ledgerName, sessionId],
  );

  const initialMessages = useMemo<AgentUIMessage[]>(
    () => [
      {
        id: "welcome",
        role: "assistant",
        content: t("aiAgent.welcome"),
        parts: [{ type: "text", text: t("aiAgent.welcome") }],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    error,
    clearError,
    regenerate,
    addToolApprovalResponse,
  } = useChat<AgentUIMessage>({
    transport,
    messages: initialMessages,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onError: (chatError) => {
      if (
        chatError instanceof DOMException &&
        chatError.name === "AbortError"
      ) {
        return;
      }
      console.error("Agent chat error:", chatError);
    },
  });

  const isLoading = status === "submitted" || status === "streaming";
  const canRetryNetworkError =
    Boolean(error) &&
    getErrorMessageKey(error) === "common.errors.network" &&
    !isLoading;
  // The deployment has no AI model configured (the agent route answers 503
  // CONFIGURATION_ERROR before streaming). Keep the operator hint on screen;
  // a retry would be refused the same way.
  const notConfiguredError =
    !isLoading && error ? getConfigurationError(error) : null;

  const isAwaitingApproval = useMemo(() => {
    if (messages.length === 0) return false;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant") return false;
    return lastMessage.parts.some(
      (part) => isToolUIPart(part) && part.state === "approval-requested",
    );
  }, [messages]);

  const handleNewChat = () => {
    void stop();
    stagedFiles.forEach(({ previewObjectUrl }) => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    });
    setStagedFiles([]);
    setInput("");
    setShouldAutoScroll(true);
    clearError?.();
    setMessages?.(initialMessages);
    startNewSession?.();
    requestAnimationFrame(() => {
      if (!window.matchMedia?.("(pointer: coarse)").matches) {
        composerInputRef.current?.focus();
      }
    });
  };

  useEffect(() => {
    if (
      messages.length > 1 &&
      shouldAutoScroll &&
      messagesContainerRef.current
    ) {
      isAutoScrollingRef.current = true;
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
      requestAnimationFrame(() => {
        isAutoScrollingRef.current = false;
      });
    }
  }, [messages, shouldAutoScroll]);

  const handleScroll = () => {
    if (isAutoScrollingRef.current || !messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    setShouldAutoScroll(Math.abs(scrollHeight - scrollTop - clientHeight) < 10);
  };

  const handleFilesSelected = async (files: File[]) => {
    const newEntries = createStagedEntries(files);
    setStagedFiles((prev) => [...prev, ...newEntries]);

    for (const entry of newEntries) {
      void uploadFile(entry.file)
        .then(({ objectKey }) => {
          setStagedFiles((curr) =>
            markStagedUploadSucceeded(curr, entry.id, objectKey),
          );
        })
        .catch(() => {
          setStagedFiles((curr) => markStagedUploadFailed(curr, entry.id));
        });
    }
  };

  const handleRemoveFile = (id: string) => {
    setStagedFiles((prev) => removeStagedFile(prev, id));
  };

  const handleSubmit = async () => {
    const hasText = input.trim().length > 0;
    const readyFiles = stagedFiles.filter((sf) => sf.objectKey && !sf.error);
    const anyUploading = stagedFiles.some((sf) => sf.uploading);

    if ((!hasText && readyFiles.length === 0) || isLoading || anyUploading) {
      return;
    }

    const messageText = hasText
      ? input.trim()
      : "Please process the attached file(s).";

    type MessagePart =
      | { type: "text"; text: string }
      | FileUIPart
      | {
          type: "data-file-upload";
          data: { objectKey: string; filename: string };
        };

    const parts: MessagePart[] = [{ type: "text", text: messageText }];

    if (readyFiles.length > 0) {
      const fileParts = await Promise.all(
        readyFiles.map(async ({ file, objectKey }) => ({
          type: "file" as const,
          mediaType: file.type || "application/octet-stream",
          filename: file.name,
          url: await fetchDownloadUrl(objectKey!),
        })),
      );
      parts.push(...fileParts);

      for (const { file, objectKey } of readyFiles) {
        parts.push({
          type: "data-file-upload",
          data: { objectKey: objectKey!, filename: file.name },
        });
      }
    }

    stagedFiles.forEach(({ previewObjectUrl }) => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    });
    setStagedFiles([]);

    track("ai_agent_message_sent", {
      has_attachment: readyFiles.length > 0,
      surface: "chat_input",
    });

    setShouldAutoScroll(true);
    void sendMessage({ role: "user", parts });
    setInput("");
  };

  const hasConversation = messages.length > 1;
  const visibleMessages = useMemo(
    () => messages.filter((m) => m.id !== "welcome"),
    [messages],
  );
  const lastUserText = useMemo(() => {
    const lastUser = [...visibleMessages]
      .reverse()
      .find((m) => m.role === "user");
    if (!lastUser) return "";
    return lastUser.parts
      .filter(isTextUIPart)
      .map((p) => p.text)
      .join(" ")
      .trim();
  }, [visibleMessages]);
  const displayLedger = ledgerDisplayName ?? ledgerName;
  const heroSubtitleText = t("common.pageDescription.ask", {
    ledgerName: displayLedger,
  });
  const heroSubtitleParts =
    displayLedger && heroSubtitleText.includes(displayLedger)
      ? heroSubtitleText.split(displayLedger)
      : null;

  const handleRestorePrompt = () => {
    if (!lastUserText) return;
    setInput(lastUserText);
    clearError?.();
    requestAnimationFrame(() => {
      const el = composerInputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(lastUserText.length, lastUserText.length);
    });
  };

  const starterPrompts = useMemo(
    () => [
      {
        text: t("aiAgent.starterPromptExpenses"),
        Icon: TrendingDown,
      },
      {
        text: t("aiAgent.starterPromptNetWorth"),
        Icon: TrendingUp,
      },
      {
        text: t("aiAgent.starterPromptAssets"),
        Icon: PieChart,
      },
      {
        text: t("aiAgent.starterPromptReview"),
        Icon: ReceiptText,
      },
    ],
    [t],
  );

  const showRetryAction = !notConfiguredError && canRetryNetworkError;
  const showRestoreAction = hasConversation && lastUserText.length > 0;

  const composerAlerts =
    !isLoading && error ? (
      <div
        role="alert"
        className="mb-2.5 flex items-start gap-2.5 rounded-xl border border-destructive/55 bg-destructive/8 px-3.5 py-3 text-sm text-foreground shadow-xs dark:border-destructive/65 dark:bg-destructive/15"
      >
        <AlertCircle
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 space-y-2.5">
          <p className="break-words leading-snug text-foreground">
            {formatError(error)}
          </p>
          {showRetryAction || showRestoreAction ? (
            <div className="flex flex-wrap items-center gap-2">
              {showRetryAction ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-input bg-background/80 pointer-coarse:min-h-11"
                  disabled={isLoading}
                  onClick={() => {
                    void regenerate();
                  }}
                >
                  {t("common.tryAgain")}
                </Button>
              ) : null}
              {showRestoreAction ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-foreground/85 hover:bg-destructive/10 hover:text-foreground pointer-coarse:min-h-11"
                  onClick={handleRestorePrompt}
                >
                  {t("aiAgent.restorePrompt")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {clearError ? (
          <button
            type="button"
            onClick={() => clearError()}
            aria-label={t("common.closeDialog")}
            className="-me-1 -mt-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors motion-reduce:transition-none hover:bg-destructive/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:size-11"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    ) : null;

  const composerInput = (
    <AgentChatInput
      value={input}
      onValueChange={setInput}
      onSubmit={() => void handleSubmit()}
      onStop={() => {
        void stop();
        toast.message(t("aiAgent.stopped"));
      }}
      placeholder={t("aiAgent.placeholder")}
      disabled={isLoading}
      stagedFiles={stagedFiles}
      onFilesSelected={(files) => void handleFilesSelected(files)}
      onRemoveFile={handleRemoveFile}
      inputRef={composerInputRef}
    />
  );

  const ledgerBadge = (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/60 px-3 py-1 text-xs font-medium text-foreground dark:border-white/12 dark:bg-secondary/60">
      <span
        className="size-2 shrink-0 rounded-full bg-primary"
        aria-hidden="true"
      />
      <span dir="auto" className="max-w-44 truncate sm:max-w-56">
        {displayLedger}
      </span>
    </div>
  );

  const pageMetaBlocks = (
    <>
      {isAuthenticated ? <AiCfoUpgradePanel className="mb-0" /> : null}
      {isReadOnly ? (
        <div
          role="status"
          className="flex gap-3 rounded-xl border border-border/80 bg-muted/50 px-4 py-3 text-sm dark:border-white/12"
        >
          <LockKeyhole
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium text-foreground">
              {t("aiAgent.readOnlyTitle")}
            </p>
            <p className="text-muted-foreground">
              {t("aiAgent.readOnlyDescription")}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      {!hasConversation ? (
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain"
        >
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-start gap-6 pb-8 pt-2 sm:justify-center sm:px-6 sm:pb-20 sm:pt-4 md:max-w-3xl md:px-0 lg:pb-24">
            <header className="flex flex-col items-start gap-2.5 sm:items-center sm:text-center">
              {ledgerBadge}
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t("aiAgent.title", { ledgerName: ledgerDisplayName })}
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {heroSubtitleParts ? (
                  <>
                    {heroSubtitleParts[0]}
                    <span className="whitespace-nowrap font-medium text-foreground/90">
                      {displayLedger}
                    </span>
                    {heroSubtitleParts.slice(1).join(displayLedger)}
                  </>
                ) : (
                  heroSubtitleText
                )}
              </p>
            </header>

            {pageMetaBlocks}

            {!isAwaitingApproval && (
              <div className="space-y-4">
                <div>
                  {composerAlerts}
                  {composerInput}
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {starterPrompts.map(({ text, Icon }) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => {
                        setInput(text);
                        requestAnimationFrame(() => {
                          const el = composerInputRef.current;
                          if (!el) return;
                          el.focus();
                          el.setSelectionRange(text.length, text.length);
                        });
                      }}
                      className="group flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border/90 bg-card px-3.5 py-3 text-start text-sm font-medium text-foreground shadow-xs transition-[border-color,background-color] motion-reduce:transition-none hover:border-primary hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/15 dark:bg-card/90 dark:hover:border-primary dark:hover:bg-accent/50"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15"
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 leading-snug">
                        {text}
                      </span>
                      <CornerDownLeft
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-colors motion-reduce:transition-none group-hover:text-primary"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mx-auto flex w-full max-w-3xl shrink-0 items-center justify-between gap-2 border-b border-border/75 pb-2.5 pt-0.5 sm:pb-3 dark:border-white/12">
            <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2.5">
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                {t("aiAgent.title", { ledgerName: ledgerDisplayName })}
              </h1>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground sm:hidden">
                <span
                  className="size-1.5 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <span dir="auto" className="max-w-44 truncate">
                  {displayLedger}
                </span>
              </span>
              <div className="hidden sm:block">{ledgerBadge}</div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              className="shrink-0 gap-1.5 border-input pointer-coarse:min-h-11"
            >
              <SquarePen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("aiAgent.newChat")}</span>
            </Button>
          </div>

          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-8 pt-4">
              {pageMetaBlocks}
              <AgentMessageList
                messages={visibleMessages}
                isLoading={isLoading}
                addToolApprovalResponse={addToolApprovalResponse}
              />
              {composerAlerts}
            </div>
          </div>

          {!shouldAutoScroll && (
            <Button
              onClick={() => {
                setShouldAutoScroll(true);
                messagesContainerRef.current?.scrollTo({
                  top: messagesContainerRef.current.scrollHeight,
                  behavior: "smooth",
                });
              }}
              variant="outline"
              size="icon-sm"
              className="absolute bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border-input bg-background/95 shadow-md backdrop-blur sm:bottom-28"
              aria-label={t("aiAgent.scrollToBottom")}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}

          {!isAwaitingApproval && (
            <div className="relative z-40 shrink-0">
              <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background to-transparent" />
              <div className="mx-auto w-full max-w-3xl pb-1 pt-2 sm:pb-2">
                {composerInput}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
