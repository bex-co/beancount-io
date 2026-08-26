import Router from "@koa/router";
import { Readable } from "node:stream";
import { type AppLayers } from "@/foundation/composition";
import { AppConfig } from "@/config/config";
import { logger } from "@/shared/logger";
import { BadUserInputError } from "@/shared/errors";
import { parseLedgerId } from "@/shared/str";
import { resolveAuthUser } from "../utils/route-guards";
import { authorizeLedger } from "@/features/ledger/utils/authorize-ledger";
import {
  AskAgentWorkflow,
  type AskAgentMode,
  type IAskAgentWorkflow,
} from "../workflow/ask-agent-workflow";

const askAgentLogger = logger.child({ module: "ask-agent-route" });

// Model for the Claude Code harness. Must be an id the pinned
// claude-agent-acp version (CLAUDE_AGENT_ACP_VERSION) actually advertises —
// an unknown id is silently DROPPED and the agent falls back to the Claude
// Code CLI default model, which defeats the pin. claude-agent-acp@0.70.0
// advertises non-dated ids like "claude-sonnet-5"; the previously pinned
// dated "claude-sonnet-4-5-20250929" is not in its catalog.
const ASK_AGENT_MODEL = "claude-sonnet-5";

interface AskAgentRequest {
  // Accept both shapes: a plain { role, content } message (e.g. API clients) and
  // a UIMessage with { role, parts: [{ type: "text", text }] } (what the
  // dashboard's useChat sends).
  messages?: Array<{
    role: string;
    content?: string;
    parts?: Array<{ type: string; text?: string }>;
  }>;
  ledgerId?: string;
  conversationId?: string;
  mode?: AskAgentMode;
}

// Extract the user's text from either a plain content string or UIMessage parts.
function messageText(message: {
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
}): string {
  if (typeof message.content === "string" && message.content.length > 0) {
    return message.content;
  }
  return (message.parts ?? [])
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

/**
 * POST /api-gateway/ask-agent — the harness-backed sandbox chat path (ADR 0005 /
 * m17). Same auth/quota/ledger-access guards as the legacy /chat route, then
 * delegates to AskAgentWorkflow and streams its UIMessage SSE response.
 *
 * `workflowFactory` is injectable so tests exercise the route guards without a
 * live sandbox; production builds the real workflow from config.
 */
export function setAskAgentRoute(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
  workflowFactory: () => IAskAgentWorkflow = () =>
    new AskAgentWorkflow({
      controlPlaneUrl: config.claudeCodeSandbox.apiUrl,
      adminToken: config.adminToken,
      gitea: config.gitea,
      model: ASK_AGENT_MODEL,
    }),
): void {
  router.post("/api-gateway/ask-agent", async (ctx) => {
    const { messages, ledgerId, conversationId, mode } = ctx.request
      .body as AskAgentRequest;

    if (!messages || messages.length === 0) {
      throw new BadUserInputError("messages array cannot be empty");
    }
    if (!ledgerId || typeof ledgerId !== "string") {
      throw new BadUserInputError("ledgerId is required");
    }
    // conversationId keys the sandbox container: every turn of one conversation
    // must share a container, so it is required and must be stable per chat.
    if (!conversationId) {
      throw new BadUserInputError("conversationId is required");
    }

    const effectiveMode: AskAgentMode = mode === "agent" ? "agent" : "ask";

    const operation = effectiveMode === "agent" ? "write" : "read";
    const { user, identity } = await resolveAuthUser(
      ctx,
      {
        models: layers.database.models,
        db: layers.database.db,
      },
      operation,
    );

    await layers.services.aiCfoUsage.assertQuotaAvailable(user.id);
    await authorizeLedger(identity, ledgerId, operation, {
      models: layers.database.models,
      db: layers.database.db,
      favaClientFactory: layers.clients.favaClientFactory,
    });

    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const lastMessage = messages[messages.length - 1];
    const prompt = messageText(lastMessage);
    if (!prompt) {
      throw new BadUserInputError("the last message has no text content");
    }

    askAgentLogger.debug("Streaming ask-agent turn", {
      ledgerId,
      conversationId,
      mode: effectiveMode,
    });

    const workflow = workflowFactory();
    const response = await workflow.streamAnswer({
      prompt,
      ledgerId,
      ledgerOwner,
      ledgerName,
      ledgerUsername: user.ledger_username,
      ledgerPassword: user.ledger_password,
      conversationId,
      mode: effectiveMode,
      recordTokenUsage: (totalTokens: number) =>
        layers.services.aiCfoUsage.addTokenUsage(user.id, totalTokens),
    });

    // Bridge the Web Response to the raw Node response: copy status + headers,
    // then pipe the UIMessage stream body through.
    ctx.respond = false;
    ctx.res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      ctx.res.setHeader(key, value);
    });
    if (response.body) {
      Readable.fromWeb(
        response.body as Parameters<typeof Readable.fromWeb>[0],
      ).pipe(ctx.res);
    } else {
      ctx.res.end();
    }
  });
}
