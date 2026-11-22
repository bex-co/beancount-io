import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useSearch } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type FileUIPart,
} from "ai";
import { Button } from "@/common/components/ui/button";
import { LedgerPageHeading } from "@/common/components/ledger-page";
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
import { ChevronDown, LockKeyhole } from "lucide-react";

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
  const { sessionId } = useAgentSession("ai-agent-session");

  const [input, setInput] = useState(() => initialQuestion?.trim() ?? "");
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
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
    sendMessage,
    status,
    stop,
    error,
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
      toast.error(formatError(chatError));
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

  // Per-response timer, for evaluating how long each agent turn takes. Measures
  // wall-clock from the user's submit (status → submitted) to the turn settling
  // (status → ready), keyed by the assistant message that just completed.
  const responseStartRef = useRef<number | null>(null);
  const prevStatusRef = useRef(status);
  const [responseDurationsMs, setResponseDurationsMs] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    const active = status === "submitted" || status === "streaming";
    const wasActive = prev === "submitted" || prev === "streaming";
    if (!wasActive && active) {
      responseStartRef.current = performance.now();
    } else if (
      wasActive &&
      status === "ready" &&
      responseStartRef.current != null
    ) {
      const elapsed = performance.now() - responseStartRef.current;
      responseStartRef.current = null;
      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.role === "assistant");
      if (lastAssistant) {
        const id = lastAssistant.id;
        setResponseDurationsMs((prevDur) => ({ ...prevDur, [id]: elapsed }));
      }
    }
  }, [status, messages]);

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

  const welcomeIntro = useMemo(() => {
    const full = t("aiAgent.welcome");
    return full.split("\n\n")[0]?.trim() || full;
  }, [t]);

  const starterPrompts = useMemo(
    () => [
      t("aiAgent.starterPromptExpenses"),
      t("aiAgent.starterPromptNetWorth"),
      t("aiAgent.starterPromptAssets"),
      t("aiAgent.starterPromptReview"),
    ],
    [t],
  );

  const composerAlerts = notConfiguredError ? (
    <div
      role="alert"
      className="mb-2 rounded-lg border border-border/70 bg-muted/50 px-3 py-2.5"
    >
      <p className="break-words text-sm text-muted-foreground">
        {formatError(error)}
      </p>
    </div>
  ) : canRetryNetworkError ? (
    <div
      role="alert"
      className="mb-2 flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground">{formatError(error)}</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0 self-start sm:self-auto"
        disabled={isLoading}
        onClick={() => {
          void regenerate();
        }}
      >
        {t("common.tryAgain")}
      </Button>
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
    />
  );

  const pageMetaBlocks = (
    <>
      {isAuthenticated ? <AiCfoUpgradePanel className="mb-0" /> : null}
      {isReadOnly ? (
        <div
          role="status"
          className="flex gap-3 rounded-lg border border-border/70 bg-muted/50 px-4 py-3 text-sm"
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
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[85rem] flex-col">
      <div className="shrink-0 pb-4">
        <LedgerPageHeading
          title={t("aiAgent.title", { ledgerName: ledgerDisplayName })}
          description={t("common.pageDescription.ask", {
            ledgerName: ledgerDisplayName ?? ledgerName,
          })}
        />
      </div>

      {!hasConversation ? (
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain"
        >
          <div className="flex w-full max-w-4xl flex-col gap-4 pb-8 pt-1 sm:gap-5 sm:pt-2">
            {pageMetaBlocks}
            <div className="rounded-2xl border bg-card/60 px-4 py-3.5 shadow-sm sm:px-5 sm:py-4">
              <p className="text-sm leading-relaxed text-foreground sm:text-base">
                {welcomeIntro}
              </p>
            </div>
            {!isAwaitingApproval && (
              <div className="space-y-3">
                {composerAlerts}
                {composerInput}
                <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setInput(prompt)}
                      className="inline-flex min-h-10 cursor-pointer items-center rounded-xl border border-border bg-card px-3.5 py-2.5 text-start text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="flex w-full max-w-4xl flex-col gap-6 pb-8 pt-2">
              {pageMetaBlocks}
              <AgentMessageList
                messages={messages}
                isLoading={isLoading}
                addToolApprovalResponse={addToolApprovalResponse}
                durations={responseDurationsMs}
              />
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
              className="absolute bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-background/95 shadow-md backdrop-blur sm:bottom-28"
              aria-label={t("aiAgent.scrollToBottom")}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}

          {!isAwaitingApproval && (
            <div className="relative z-40 shrink-0">
              <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background to-transparent" />
              <div className="w-full max-w-4xl pb-1 pt-2 sm:pb-2">
                {composerAlerts}
                {composerInput}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
