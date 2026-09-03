import Router from "@koa/router";
import { z } from "zod";
import { type AppLayers } from "@/foundation/composition";
import { BadUserInputError } from "@/shared/errors";
import { resolveAuthUser } from "../utils/route-guards";

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

const anthropicMessageBodySchema = z.object({
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
): void {
  router.post("/api-gateway/ai/anthropic/v1/messages", async (ctx) => {
    const { identity } = await resolveAuthUser(ctx, {
      models: layers.database.models,
      db: layers.database.db,
    });

    const parseResult = anthropicMessageBodySchema.safeParse(ctx.request.body);
    if (!parseResult.success) {
      throw new BadUserInputError("Invalid request body");
    }

    ctx.body = await layers.services.llm.invokeAnthropic(
      identity,
      parseResult.data,
    );
  });
}
