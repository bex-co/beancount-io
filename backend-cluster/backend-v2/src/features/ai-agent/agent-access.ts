import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  ledgerResource,
  type IAuthorizationService,
} from "@/server/api/authorization";

export type AgentAccessMode = "read" | "write";
export type AgentRequestedMode = "ask" | "agent";

/**
 * Resolve the tool authority for one agent turn.
 *
 * Reading the ledger is the baseline for every conversation. Agent mode is a
 * best-effort write upgrade: a reader still gets a useful assistant, while an
 * authorization-source failure continues to fail closed instead of looking
 * like an ordinary read-only downgrade.
 */
export async function resolveAgentAccessMode(args: {
  authorization: IAuthorizationService;
  identity: Identity;
  ledgerId: string;
  requestedMode: AgentRequestedMode;
}): Promise<AgentAccessMode> {
  const resource = ledgerResource(args.ledgerId);
  await args.authorization.authorizeOrThrow({
    principal: args.identity,
    action: AUTHORIZATION_ACTIONS.AI_LEDGER_ASK,
    resource,
  });

  if (args.requestedMode === "ask") return "read";

  const writeDecision = await args.authorization.authorize({
    principal: args.identity,
    action: AUTHORIZATION_ACTIONS.AI_LEDGER_AGENT,
    resource,
  });
  return writeDecision.allowed ? "write" : "read";
}
