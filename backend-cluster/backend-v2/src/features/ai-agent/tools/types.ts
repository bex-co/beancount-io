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

/**
 * The same contract as {@link toolOutputSchema}, in the one shape MCP is able
 * to publish.
 *
 * MCP's SDK runs a tool's `outputSchema` through `normalizeObjectSchema`, which
 * yields an object schema or nothing at all — a discriminated union normalizes
 * to `undefined`. Registering the union directly is therefore strictly worse
 * than registering nothing: `tools/list` advertises no schema *and* every call
 * fails with `Cannot read properties of undefined (reading '_zod')`, because
 * the output validator dereferences what the normalizer declined to produce.
 * Verified against `@modelcontextprotocol/sdk` 1.30.0 (ADR 0007 D8).
 *
 * So the discriminant is widened to a plain `ok: boolean` and both payload
 * members become optional. Note what does and does not change: the **payload**
 * is untouched — a result still arrives as `{ ok: true, result }` or
 * `{ ok: false, error }`, and `runToolSafely` still produces exactly those.
 * Only the published *description* loosens, trading the union's "ok: true
 * implies result" for a schema that exists at all. The descriptions below carry
 * the implication the type system can no longer state.
 */
export function mcpOutputSchema(
  union: ReturnType<typeof toolOutputSchema>,
): z.ZodObject<{
  ok: z.ZodBoolean;
  result: z.ZodOptional<z.ZodTypeAny>;
  error: z.ZodOptional<z.ZodString>;
}> {
  type SuccessBranch = Extract<
    (typeof union.options)[number],
    { shape: { result: unknown } }
  >;
  const success = union.options.find(
    (option): option is SuccessBranch => "result" in option.shape,
  );
  // Loud rather than silent: publishing no schema is the failure this helper
  // exists to prevent, so a `toolOutputSchema` that stopped having an `ok: true`
  // branch must break the server's construction, not its tool calls.
  if (!success) {
    throw new Error(
      "mcpOutputSchema: no `{ ok: true, result }` branch in the union — " +
        "toolOutputSchema's shape changed and the MCP output contract cannot be derived",
    );
  }
  return z.object({
    ok: z
      .boolean()
      .describe(
        "True when the tool succeeded; false when it refused or failed.",
      ),
    result: success.shape.result
      .optional()
      .describe("The tool's payload. Present when `ok` is true."),
    error: z
      .string()
      .optional()
      .describe(
        "Why the tool refused or failed. Present when `ok` is false, alongside `isError` on the result.",
      ),
  });
}
