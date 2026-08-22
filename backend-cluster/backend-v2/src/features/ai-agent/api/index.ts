import Router from "@koa/router";
import { type AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import { setAgentRoute } from "./agent-route";
import { setAskAgentRoute } from "./ask-agent-route";
import { setOpenAIChatCompletionsRoute } from "./openai-chat-completions-route";
import { setAnthropicMessagesRoute } from "./anthropic-messages-route";
import { setMcpRoute } from "./mcp-route";

export function setupAiAgentRoutes(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): void {
  const aiRouter = new Router();
  // REST error translation is handled by the outermost restErrorMiddleware in
  // rest-routes.ts; routes here just throw DomainErrors.
  setAgentRoute(aiRouter, layers, config);
  setAskAgentRoute(aiRouter, layers, config);
  setOpenAIChatCompletionsRoute(aiRouter, layers, config);
  setAnthropicMessagesRoute(aiRouter, layers, config);
  setMcpRoute(aiRouter, layers, config);
  router.use(aiRouter.routes(), aiRouter.allowedMethods());
}
