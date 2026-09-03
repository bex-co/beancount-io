import Router from "@koa/router";
import { z } from "zod";
import { type AppLayers } from "@/foundation/composition";
import { BadUserInputError } from "@/shared/errors";
import { resolveAuthUser } from "../utils/route-guards";

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
): void {
  router.post("/api-gateway/ai/openai/chat/completions", async (ctx) => {
    const { identity } = await resolveAuthUser(ctx, {
      models: layers.database.models,
      db: layers.database.db,
    });

    const parseResult = chatCompletionBodySchema.safeParse(ctx.request.body);
    if (!parseResult.success) {
      throw new BadUserInputError("Invalid request body");
    }

    ctx.body = await layers.services.llm.invokeOpenAI(
      identity,
      parseResult.data,
    );
  });
}
