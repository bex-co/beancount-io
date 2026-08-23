import { z } from "zod";
import type { ServiceLayer } from "@/foundation/composition";
import type { ILLMService } from "@/features/llm/service/llm-service";
import type { ILedgerReceiptWorkflow } from "@/features/ledger/workflow/ledger-receipt-workflow";
import type { Identity } from "@/server/api/identity";

/**
 * The ledger services the four ADR-0006 tools call — the same services the
 * dashboard's GraphQL resolvers call, so a tool and a resolver invoking the
 * same verb get identical authorization and identical data (ADR 0006 D1).
 */
export type ToolServices = Pick<
  ServiceLayer,
  "ledgerShell" | "ledgerRepo" | "apiKey"
>;

export interface ToolContext {
  services: ToolServices;
  /**
   * The caller driving this tool call. Always present: MCP requires a
   * ledger-scoped credential (mcp-route.ts refuses anything else), and the
   * chat/agent routes authenticate the request before building this context.
   * Every tool passes it straight to `authorizeLedger` via the service call —
   * per-call, not once per session, so a mid-session revocation takes effect
   * on the very next tool invocation (ADR 0006 D4/D9).
   */
  identity: Identity;
  ledgerId: string;
  llmService: ILLMService;
  ledgerReceiptWorkflow: ILedgerReceiptWorkflow;
}

export const toolErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});
export type ToolError = z.infer<typeof toolErrorSchema>;

/**
 * Build a tool output schema with the uniform success shape
 * `{ ok: true, result }`, where `result` carries the tool-specific payload.
 * Pairs with {@link runToolSafely}, which produces exactly this shape.
 */
export const toolOutputSchema = <S extends z.ZodTypeAny>(result: S) =>
  z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), result }),
    toolErrorSchema,
  ]);
