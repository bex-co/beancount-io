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
import { PageHeader } from "@/common/components/page-header";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { toast } from "sonner";
import { AiCfoUpgradePanel } from "@/common/components/ai-cfo-upgrade-panel";
import { useLedger } from "@/common/hooks/use-ledger";
import { track } from "@/common/analytics";
import { config } from "@/config/config";
import { AgentChatInput } from "./agent-chat-input";
import { AgentMessageList, type AgentUIMessage } from "./agent-message-list";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { getLedgerAgentCanonicalUrl } from "@/common/lib/seo/indexability";

import { useTempAssetUpload } from "@/features/importer/hooks/use-temp-asset-upload";
import { useTempAssetDownloadUrl } from "./use-temp-asset-download-url";
import type { StagedFile } from "./attachment";
import { useAgentSession } from "../../hooks/use-agent-session";
import { ChevronDown } from "lucide-react";

export interface AgentPageImplProps {
  /**
   * Backend endpoint suffix appended to config.apiUrl. Defaults to "agent"
   * (the in-process ToolLoopAgent). The sandbox surface passes "ask-agent" to
   * hit the harness-backed Cloudflare-sandbox route (ADR 0005 / m17).
   */
  chatApi?: string;
  /**
   * Route suffix used for the login-return path. Defaults to "agent".
   */
  routeSuffix?: string;
  /**
   * Extra fields merged into the request body — e.g. { conversationId, mode }
   * for the ask-agent route.
   */
  bodyExtra?: Record<string, unknown>;
}

export function AgentPageImpl({
  chatApi = "agent",
  routeSuffix = "agent",
  bodyExtra,
}: AgentPageImplProps = {}) {
  // strict:false so this component works under both the /agent and /ask routes.
  const { ledgerOwner, ledgerName } = useParams({ strict: false }) as {
    ledgerOwner: string;
    ledgerName: string;
  };
  const searchParams = useSearch({ strict: false });
  const initialQuestion = (searchParams as { q?: string }).q;
  const { t, i18n } = useTranslations();
  const formatError = useErrorMessage();
  const { ledgerDisplayName } = useLedger();
  const { sessionId } = useAgentSession("ai-agent-session");

  const [input, setInput] = useState("");
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);

  const hasAutoSubmittedRef = useRef(false);
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
        api: `${config.apiUrl}${chatApi}`,
        credentials: "include",
        headers: () => ({ "Accept-Language": i18nRef.current.language }),
        body: {
          ledgerId: `${ledgerOwner}/${ledgerName}`,
          sessionId,
          ...bodyExtra,
        },
        fetch: async (url, options) => {
          const response = await fetch(url as string, options as RequestInit);
          if (response.status === 401 || response.status === 403) {
            const currentPath = `/ledger/${ledgerOwner}/${ledgerName}/${routeSuffix}`;
            window.location.href = `/auth/login?next=${encodeURIComponent(currentPath)}`;
          }
          return response;
        },
      }),
    [ledgerOwner, ledgerName, sessionId, chatApi, routeSuffix, bodyExtra],
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

  const { messages, sendMessage, status, addToolApprovalResponse } =
    useChat<AgentUIMessage>({
      transport,
      messages: initialMessages,
      sendAutomaticallyWhen:
        lastAssistantMessageIsCompleteWithApprovalResponses,
      onError: (error) => {
        console.error("Agent chat error:", error);
        toast.error(formatError(error));
      },
    });

  const isLoading = status === "submitted" || status === "streaming";

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
    if (initialQuestion?.trim() && !hasAutoSubmittedRef.current) {
      hasAutoSubmittedRef.current = true;
      track("ai_agent_message_sent", {
        has_attachment: false,
        surface: "deep_link",
      });
      void sendMessage({ text: initialQuestion.trim() });
    }
    // Run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (shouldAutoScroll && messagesContainerRef.current) {
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
    const newEntries: StagedFile[] = files.map((file) => ({
      file,
      uploading: true,
      previewObjectUrl: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }));

    setStagedFiles((prev) => {
      const startIdx = prev.length;

      files.forEach((file, i) => {
        const idx = startIdx + i;
        void uploadFile(file)
          .then(({ objectKey }) => {
            setStagedFiles((curr) =>
              curr.map((sf, sfIdx) =>
                sfIdx === idx ? { ...sf, uploading: false, objectKey } : sf,
              ),
            );
          })
          .catch(() => {
            setStagedFiles((curr) =>
              curr.map((sf, sfIdx) =>
                sfIdx === idx
                  ? { ...sf, uploading: false, error: "Upload failed" }
                  : sf,
              ),
            );
          });
      });

      return [...prev, ...newEntries];
    });
  };

  const handleRemoveFile = (idx: number) => {
    setStagedFiles((prev) => {
      const f = prev[idx];
      if (f?.previewObjectUrl) URL.revokeObjectURL(f.previewObjectUrl);
      return prev.filter((_, i) => i !== idx);
    });
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

  return (
    <>
      <LedgerPageSEO
        seoKey="ledgerAsk"
        noIndex={Boolean(initialQuestion)}
        canonicalUrl={getLedgerAgentCanonicalUrl({
          ledgerOwner,
          ledgerName,
        })}
      />
      <div className="relative flex h-full min-h-0 w-full flex-col">
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-1 pb-8 pt-1 sm:px-3 sm:pt-2">
            <PageHeader
              title={t("aiAgent.title", { ledgerName: ledgerDisplayName })}
              description={t("common.pageDescription.ask", {
                ledgerName: ledgerDisplayName ?? ledgerName,
              })}
              className="gap-1.5 space-y-0 pb-1 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-foreground [&_p]:leading-5"
            />
            <AiCfoUpgradePanel className="mb-0" />
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
            <div className="mx-auto w-full max-w-3xl px-1 pb-1 pt-2 sm:px-3 sm:pb-2">
              <AgentChatInput
                value={input}
                onValueChange={setInput}
                onSubmit={() => void handleSubmit()}
                placeholder={t("aiAgent.placeholder")}
                disabled={isLoading}
                stagedFiles={stagedFiles}
                onFilesSelected={(files) => void handleFilesSelected(files)}
                onRemoveFile={handleRemoveFile}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
