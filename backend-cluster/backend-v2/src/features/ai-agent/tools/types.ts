import { z } from "zod";
import type { ServiceLayer } from "@/foundation/composition";
import type { ILLMService } from "@/features/llm/service/llm-service";
import type { ILedgerReceiptWorkflow } from "@/features/ledger/workflow/ledger-receipt-workflow";
import type { IApiKeyService } from "@/features/apikeys/service/api-key-service";
import type { Identity } from "@/server/api/identity";

/**
 * The ledger services the four ADR-0006 tools call — the same services the
 * dashboard's GraphQL resolvers call, so a tool and a resolver invoking the
 * same verb get identical authorization and identical data (ADR 0006 D1).
 */
export type ToolServices = Pick<
  ServiceLayer,
  | "ledgerShell"
  | "ledgerRepo"
  | "ledgerData"
  | "ledgerFinance"
  | "ledgerJournal"
  | "ledgerAccount"
  | "plaidItem"
  | "plaidSync"
>;

export interface ToolContext {
  services: ToolServices;
  /**
   * The caller driving this tool call. Always present: MCP requires a
   * bearer credential with a ledger selected for ledger tools, and the
   * chat/agent routes authenticate the request before building this context.
   * Every tool passes it straight to `authorizeLedger` via the service call —
   * per-call, not once per session, so a mid-session revocation takes effect
   * on the very next tool invocation (ADR 0006 D4/D9).
   */
  identity: Identity;
  ledgerId: string;
  llmService: ILLMService;
  apiKeyService: IApiKeyService;
  ledgerReceiptWorkflow: ILedgerReceiptWorkflow;
}

const toolErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  /**
   * The thrown error's {@link ErrorCategory}, when it had one (w2/m28). The
   * MCP boundary turns this into the machine `code` an agent branches on;
   * `runToolSafely` is the only place the error's class is still available.
   */
  errorCode: z.string().optional(),
  /** The actionable next step the error carried, when it carried one. */
  errorHint: z.string().optional(),
  /** Seconds to wait, for a rate-limit refusal. */
  retryAfter: z.number().optional(),
});
export type ToolError = z.infer<typeof toolErrorSchema>;

/**
 * The failure half of every MCP tool result (w2/m28:t003).
 *
 * One shape across tools and resources: a machine code, prose, and the next
 * call to make. Published in `tools/list` so a client can rely on `code` and
 * `hint` existing rather than parsing the message.
 *
 * Deliberately undocumented field by field. This object is inlined into every
 * tool's published output schema, so a sentence here is paid ~25 times per
 * `tools/list`; the field names carry their own meaning, and what the codes
 * are and how to react to them is stated once in the server instructions and
 * the MCP guide, where it costs one copy.
 */
export const mcpErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  hint: z.string(),
  retryAfter: z.number().optional(),
});

/**
 * One bean-check error, reduced to what an agent can act on: the message plus
 * the `file:line` the loader reports, when it reports one.
 */
const beanCheckErrorSchema = z.object({
  message: z.string(),
  source: z
    .string()
    .optional()
    .describe("`file:line` of the offending directive, when known"),
});
// The named type lives in `@/features/ledger/utils/bean-check-errors`; this
// schema exists only to shape `withWriteOutcome` below.

/**
 * bean-check's verdict around a write: how many errors existed before and
 * after, and which ones the write introduced (diffed by message+source).
 */
export const writeValidationSchema = z.object({
  errorsBefore: z.number().int(),
  errorsAfter: z.number().int(),
  newErrors: z.array(beanCheckErrorSchema),
});


export const wroteFileSchema = z.object({
  path: z.string(),
  line: z
    .number()
    .int()
    .optional()
    .describe("1-based line the directive landed on, when known"),
});

/**
 * The write outcome every MCP write tool carries (w2/m26): what was written,
 * which entries it touched, and what bean-check says afterwards — so an agent
 * learns about a broken ledger from the write itself instead of remembering
 * to read the `errors` resource.
 *
 * `summary` is intentionally the first field: MCP serializes the result as
 * JSON text, so the text content's first line states what was written and how
 * many new errors, if any, were introduced.
 */
export function withWriteOutcome<T extends z.ZodRawShape>(shape: T) {
  return z.object({
    summary: z
      .string()
      .describe(
        "What was written and how many new bean-check errors it introduced.",
      ),
    ...shape,
    wrote: z
      .array(wroteFileSchema)
      .describe("Files (and lines, when known) the write landed in"),
    entryHashes: z
      .array(z.string())
      .describe("Entry hashes the write created or touched, when known"),
    validation: writeValidationSchema,
  });
}

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
  error: z.ZodOptional<typeof mcpErrorSchema>;
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
  // The envelope carries no per-field descriptions, and deliberately so: it is
  // the *same* three fields on all ~25 tools, so a sentence here is published
  // 25 times in one `tools/list`. `ok`/`result`/`error` and the failure codes
  // are stated once in the server instructions and once in `docs/mcp.md`
  // (w2/m28) — one copy per session instead of 25.
  return z.object({
    ok: z.boolean(),
    result: success.shape.result.optional(),
    error: mcpErrorSchema.optional(),
  });
}
