import Router from "@koa/router";
import { type UIMessage } from "ai";
import { type AppLayers } from "@/foundation/composition";
import { AppConfig } from "@/config/config";
import { logger } from "@/shared/logger";
import { BadUserInputError } from "@/shared/errors";
import { resolveAuthUser } from "../utils/route-guards";
import { trustedIdentity } from "@/server/api/identity";
import { generateOAuthToken } from "@/features/oauth/utils/oauth-token-gen";
import {
  SelfHostedAgentHandler,
  type IAgentHandler,
} from "../service/agent-handler";
import { createFallbackLanguageModel } from "@/features/llm/utils/fallback-language-model";

const agentLogger = logger.child({ module: "agent-routes" });

export function setAgentRoute(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): void {
  const handler: IAgentHandler = new SelfHostedAgentHandler(
    createFallbackLanguageModel(config.blockeden.accessKey),
    layers.services.aiCfoUsage,
    layers.services.llm,
    layers.workflows.ledgerReceipt,
  );

  router.post("/api-gateway/agent", async (ctx) => {
    agentLogger.debug("Received agent request");

    const body = ctx.request.body as {
      messages?: unknown;
      ledgerId?: unknown;
      sessionId?: unknown;
    };
    const messages = body.messages as UIMessage[] | undefined;
    const ledgerId = body.ledgerId as string | undefined;
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId : undefined;

    agentLogger.debug("Agent session", { sessionId, ledgerId });

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new BadUserInputError("messages array cannot be empty");
    }
    if (!ledgerId || typeof ledgerId !== "string") {
      throw new BadUserInputError("ledgerId is required");
    }

    const { user } = await resolveAuthUser(ctx, {
      models: layers.database.models,
      db: layers.database.db,
    });
    await layers.services.aiCfoUsage.assertQuotaAvailable(user.id);

    // The route's own session check is the trust boundary here; wrapping its
    // userId is what lets the ledger services' authorizeLedger seam run on
    // every tool call without re-plumbing this route onto the OAuth/API-key
    // gate too (ADR 0006 D1 — same verbs the dashboard's resolvers call).
    const identity = trustedIdentity(user.id);

    const mcpToken = await generateOAuthToken(user.id, ledgerId, config);
    const mcpUrl = `${config.server.url}/api-gateway/mcp`;

    ctx.respond = false;
    await handler.handle(
      {
        messages,
        ledgerId,
        userId: user.id,
        services: {
          ledgerShell: layers.services.ledgerShell,
          ledgerRepo: layers.services.ledgerRepo,
        },
        identity,
        mcpToken,
        mcpUrl,
        sessionId,
      },
      ctx.res,
    );
  });
}
