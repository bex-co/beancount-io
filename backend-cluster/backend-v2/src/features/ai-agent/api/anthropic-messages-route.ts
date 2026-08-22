import Router from "@koa/router";
import { z } from "zod";
import { logger } from "@/shared/logger";
import { type AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import { BadUserInputError } from "@/shared/errors";
import { resolveAuthUser } from "../utils/route-guards";
import { InternalServerError } from "@/shared/errors";

const routeLogger = logger.child({ module: "anthropic-messages-handler" });

const anthropicMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const anthropicToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  input_schema: z.object({
    type: z.literal("object"),
    properties: z.record(z.string(), z.unknown()).optional(),
    required: z.array(z.string()).optional(),
  }),
});

export const anthropicMessageBodySchema = z.object({
  model: z.string().optional().default("claude-sonnet-4-5-20250929"),
  messages: z.array(anthropicMessageSchema).min(1),
  max_tokens: z.number().int().positive().default(1024),
  system: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  tools: z.array(anthropicToolSchema).optional(),
});

export function setAnthropicMessagesRoute(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): void {
  router.post("/api-gateway/ai/anthropic/v1/messages", async (ctx) => {
    const { user } = await resolveAuthUser(ctx, {
      models: layers.database.models,
      db: layers.database.db,
    });
    await layers.services.aiCfoUsage.assertQuotaAvailable(user.id);

    const parseResult = anthropicMessageBodySchema.safeParse(ctx.request.body);
    if (!parseResult.success) {
      throw new BadUserInputError("Invalid request body");
    }

    const { accessKey } = config.blockeden;
    const upstreamUrl = `https://api.blockeden.xyz/anthropic/${accessKey}/v1/messages`;

    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ ...parseResult.data, stream: false }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      throw new InternalServerError(text, undefined, upstream.status);
    }

    const responseJson = (await upstream.json()) as {
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const totalTokens =
      (responseJson.usage?.input_tokens ?? 0) +
      (responseJson.usage?.output_tokens ?? 0);
    if (totalTokens > 0) {
      routeLogger.debug("AI CFO token usage", { userId: user.id, totalTokens });
      await layers.services.aiCfoUsage.addTokenUsage(user.id, totalTokens);
    }
    ctx.body = responseJson;
  });
}
