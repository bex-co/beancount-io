import Router from "@koa/router";
import { z } from "zod";
import { logger } from "@/shared/logger";
import { type AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import { BadUserInputError } from "@/shared/errors";
import { resolveAuthUser } from "../utils/route-guards";
import { InternalServerError } from "@/shared/errors";

const routeLogger = logger.child({ module: "openai-chat-completions-handler" });

const chatMessageSchema = z.union([
  z.object({ role: z.literal("system"), content: z.string() }),
  z.object({ role: z.literal("user"), content: z.string() }),
  z.object({
    role: z.literal("assistant"),
    content: z.string().nullable().optional(),
    tool_calls: z
      .array(
        z.object({
          id: z.string(),
          type: z.literal("function"),
          function: z.object({ name: z.string(), arguments: z.string() }),
        }),
      )
      .optional(),
  }),
  z.object({
    role: z.literal("tool"),
    content: z.string(),
    tool_call_id: z.string(),
  }),
]);

const chatCompletionBodySchema = z.object({
  model: z.string().optional().default("gpt-4o"),
  messages: z.array(chatMessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  tools: z
    .array(
      z.object({
        type: z.literal("function"),
        function: z.object({
          name: z.string(),
          description: z.string().optional(),
          parameters: z.record(z.string(), z.unknown()).optional(),
        }),
      }),
    )
    .optional(),
});

export function setOpenAIChatCompletionsRoute(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): void {
  router.post("/api-gateway/ai/openai/chat/completions", async (ctx) => {
    const { user } = await resolveAuthUser(
      ctx,
      {
        models: layers.database.models,
        db: layers.database.db,
      },
      "read",
    );
    await layers.services.aiCfoUsage.assertQuotaAvailable(user.id);

    const parseResult = chatCompletionBodySchema.safeParse(ctx.request.body);
    if (!parseResult.success) {
      throw new BadUserInputError("Invalid request body");
    }

    const { accessKey } = config.blockeden;
    const upstreamUrl = `https://api.blockeden.xyz/openai/${accessKey}/v1/chat/completions`;

    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...parseResult.data, stream: false }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      throw new InternalServerError(text, undefined, upstream.status);
    }

    const responseJson = (await upstream.json()) as {
      usage?: { total_tokens?: number };
    };
    const totalTokens = responseJson.usage?.total_tokens ?? 0;
    if (totalTokens > 0) {
      routeLogger.debug("AI CFO token usage", { userId: user.id, totalTokens });
      await layers.services.aiCfoUsage.addTokenUsage(user.id, totalTokens);
    }
    ctx.body = responseJson;
  });
}
