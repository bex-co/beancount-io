import type { UIMessage } from "ai";
import type { ServerResponse } from "node:http";
import type { Identity } from "@/server/api/identity";
import type { ToolServices } from "../../tools/types";
import type { IApiKeyService } from "@/features/apikeys/service/api-key-service";

export interface AgentHandlerContext {
  messages: UIMessage[];
  ledgerId: string;
  userId: string;
  /**
   * The ledger services + caller identity a locally-run agent
   * (`SelfHostedAgentHandler`) needs to build its `ToolContext`.
   */
  services: ToolServices;
  identity: Identity;
  apiKeyService: IApiKeyService;
  sessionId?: string;
  /** Called only after authorization/quota/model setup, immediately before piping. */
  onStreamReady?: () => void;
}

export interface IAgentHandler {
  handle(ctx: AgentHandlerContext, res: ServerResponse): Promise<void>;
}
