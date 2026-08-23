import Router from "@koa/router";
import { type AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import { setAgentRoute } from "./agent-route";
import { setAskAgentRoute } from "./ask-agent-route";
import { setOpenAIChatCompletionsRoute } from "./openai-chat-completions-route";
import { setAnthropicMessagesRoute } from "./anthropic-messages-route";

export { setMcpRoute, type McpServerFactory } from "./mcp-route";

/**
 * The AI streaming routes. The MCP transport is registered separately
 * (`setMcpRoute`) because the two sit on opposite sides of the scope gate: an
 * AI route is one op with one class, while MCP is a surface whose ops are
 * gated per tool call.
 */
export function setupAiAgentRoutes(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): void {
  const aiRouter = new Router();
  // REST error translation is handled by the outermost restErrorMiddleware in
  // the composition root; routes here just throw DomainErrors.
  setAgentRoute(aiRouter, layers, config);
  setAskAgentRoute(aiRouter, layers, config);
  setOpenAIChatCompletionsRoute(aiRouter, layers, config);
  setAnthropicMessagesRoute(aiRouter, layers, config);
  router.use(aiRouter.routes(), aiRouter.allowedMethods());
}
