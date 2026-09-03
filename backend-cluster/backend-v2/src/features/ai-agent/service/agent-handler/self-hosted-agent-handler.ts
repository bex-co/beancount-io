import { convertToModelMessages, type UIMessage } from "ai";
import type { LanguageModel } from "ai";
import type { ServerResponse } from "node:http";
import { logger } from "@/shared/logger";
import { BadUserInputError } from "@/shared/errors";
import type { IAiCfoUsageService } from "@/features/feature-usage/service/ai-cfo-usage-service";
import type { ILLMService } from "@/features/llm/service/llm-service";
import type { ILedgerReceiptWorkflow } from "@/features/ledger/workflow/ledger-receipt-workflow";
import type { IAuthorizationService } from "@/server/api/authorization";
import { resolveAgentAccessMode } from "../../agent-access";
import { BeancountAgent } from "./beancount-agent";
import type { IAgentHandler, AgentHandlerContext } from "./agent-handler";

const handlerLogger = logger.child({ module: "self-hosted-agent-handler" });

type FileUploadMeta = { objectKey: string; filename: string };

function enrichMessagesWithFileContext(messages: UIMessage[]): UIMessage[] {
  return messages.map((msg) => {
    if (msg.role !== "user") return msg;

    const uploads: FileUploadMeta[] = [];
    for (const part of msg.parts ?? []) {
      if (part.type === "data-file-upload") {
        const data = (part as { type: string; data: FileUploadMeta }).data;
        if (data?.objectKey && data?.filename) {
          uploads.push(data);
        }
      }
    }
    if (uploads.length === 0) return msg;

    const contextText =
      "[Uploaded file references]\n" +
      uploads
        .map((u) => `- "${u.filename}" → objectKey: ${u.objectKey}`)
        .join("\n");

    return {
      ...msg,
      parts: [
        ...(msg.parts ?? []),
        { type: "text" as const, text: contextText },
      ],
    };
  });
}

export class SelfHostedAgentHandler implements IAgentHandler {
  constructor(
    private readonly model: LanguageModel,
    private readonly aiCfoUsage: IAiCfoUsageService,
    private readonly llmService: ILLMService,
    private readonly ledgerReceiptWorkflow: ILedgerReceiptWorkflow,
    private readonly authorization: IAuthorizationService,
  ) {}

  async handle(ctx: AgentHandlerContext, res: ServerResponse): Promise<void> {
    const { messages, ledgerId, userId, services, identity, apiKeyService } =
      ctx;

    const accessMode = await resolveAgentAccessMode({
      authorization: this.authorization,
      identity,
      ledgerId,
      requestedMode: "agent",
    });
    await this.aiCfoUsage.assertQuotaAvailable(userId);

    let modelMessages;
    try {
      modelMessages = await convertToModelMessages(
        enrichMessagesWithFileContext(messages),
      );
    } catch (err) {
      handlerLogger.error("Failed to convert messages", { err });
      throw new BadUserInputError("invalid message format");
    }

    const agent = new BeancountAgent(
      this.model,
      {
        services,
        identity,
        ledgerId,
        llmService: this.llmService,
        apiKeyService,
        ledgerReceiptWorkflow: this.ledgerReceiptWorkflow,
      },
      accessMode,
    );

    const result = await agent.stream(modelMessages, {
      onFinish: async ({ totalUsage }) => {
        const totalTokens =
          (totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0);
        handlerLogger.debug("AI CFO token usage", {
          userId,
          inputTokens: totalUsage.inputTokens,
          outputTokens: totalUsage.outputTokens,
          totalTokens,
        });
        try {
          await this.aiCfoUsage.addTokenUsage(userId, totalTokens);
        } catch (err) {
          handlerLogger.error("Failed to record token usage", {
            userId,
            totalTokens,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    });

    ctx.onStreamReady?.();
    result.pipeUIMessageStreamToResponse(res);
  }
}
