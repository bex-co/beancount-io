import { z } from "zod";
import { logger } from "@/shared/logger";
import { API_SCOPES } from "@/server/api/identity";
import { toPublicApiKey } from "@/features/apikeys/service/api-key-service";
import type { ToolContext } from "./types";
import { toolOutputSchema } from "./types";
import { runToolSafely } from "../utils/run-tool";

const toolLogger = logger.child({ module: "tool:api-keys" });

/**
 * API-key management as agent tools (ADR 0006 D6, w1/m22).
 *
 * Named in camelCase to match the four tools already in the registry.
 * ADR 0006 open question 4 proposes moving the whole set to snake_case with a
 * compatibility alias; that is a decision for all seven at once, and shipping
 * three snake_case names now would settle it by accident and leave the registry
 * mixed in the meantime.
 *
 * An agent reaching these holds an OAuth grant, which may mint — an API *key*
 * may not, and the shared application service's PDP refuses it on every surface.
 */

const publicKeyShape = z.object({
  id: z.string(),
  name: z.string(),
  key_prefix: z.string(),
  scopes: z.array(z.string()),
  ledger_scope: z.string().optional(),
  revoked: z.boolean(),
  expires_at: z.string().optional(),
  last_used_at: z.string().optional(),
  revoked_at: z.string().optional(),
  created_at: z.string(),
});

const present = (key: ReturnType<typeof toPublicApiKey>) => ({
  id: key.id,
  name: key.name,
  key_prefix: key.keyPrefix,
  scopes: key.scopes,
  ledger_scope: key.ledgerScope,
  revoked: Boolean(key.revokedAt),
  expires_at: key.expiresAt?.toISOString(),
  last_used_at: key.lastUsedAt?.toISOString(),
  revoked_at: key.revokedAt?.toISOString(),
  created_at: key.createdAt.toISOString(),
});

// --- manageApiKeys (grouped) --------------------------------------------------------

/**
 * API-key management as one grouped MCP tool (w2/m27:t005).
 *
 * Three verbs, one family: the same subject (the caller's keys), the same
 * authorization class (`admin`), and an agent picking one is choosing among
 * them rather than between them and something unrelated — the same grouping
 * argument as `manageBankImport` (ADR 0008 D3). REST and GraphQL keep their
 * separate list/create/revoke shapes; only the MCP spelling folds, with the
 * same refusals as before on every branch.
 */

export const manageApiKeysDescription =
  "List, mint, or revoke the caller's API keys. `operation` selects the branch: `list` never returns the key itself; `create` mints a key (requires a paid plan, cannot be called with an API key; the plaintext is returned once and is unrecoverable); `revoke` takes a key id and applies on next use.";

const manageApiKeysStrictInput = z
  .object({
    operation: z
      .enum(["list", "create", "revoke"])
      .describe("Which key-management branch to run."),
    name: z
      .string()
      .min(1)
      .max(200)
      .optional()
      .describe(
        "Required by `create`: what this key is for; shown in the key list.",
      ),
    scopes: z
      .array(z.enum(API_SCOPES))
      .min(1)
      .optional()
      .describe(
        "Required by `create`: what the key may do. Cannot exceed what the caller already holds.",
      ),
    ledgerScope: z
      .string()
      .optional()
      .describe(
        "`create` only: confine the key to one ledger, as `owner/name`. Omit to inherit the caller's own confinement; a credential pinned to one ledger cannot name a different one.",
      ),
    expiresAt: z
      .string()
      .datetime({ offset: true })
      .optional()
      .describe(
        "`create` only: when the key stops working (ISO 8601). Omit for no expiry.",
      ),
    id: z
      .string()
      .optional()
      .describe(
        "Required by `revoke`: the key's id (`akey_…`), not the key itself.",
      ),
  })
  .strict();

/**
 * The advertised input carries one `expiresAt` (`format: date-time`) and one
 * `ledgerScope` — the 400-character date regex and the alias pair are gone
 * from `tools/list`. The snake_case spellings stay accepted on input for one
 * release: a snake_case value fills the camelCase field only when the
 * advertised spelling is absent, so the documented spelling always wins a
 * conflict, and both spellings are normalized away before the strict parse.
 */
export const manageApiKeysInputSchema = z.preprocess((input) => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return input;
  }
  const record = { ...(input as Record<string, unknown>) };
  if (record.ledgerScope === undefined && record.ledger_scope !== undefined) {
    record.ledgerScope = record.ledger_scope;
  }
  if (record.expiresAt === undefined && record.expires_at !== undefined) {
    record.expiresAt = record.expires_at;
  }
  delete record.ledger_scope;
  delete record.expires_at;
  return record;
}, manageApiKeysStrictInput);

export const manageApiKeysOutputSchema = toolOutputSchema(
  z.union([
    z.array(publicKeyShape),
    z.object({ key: publicKeyShape, plaintext: z.string() }),
    publicKeyShape,
  ]),
);

type ManageApiKeysContext = Pick<ToolContext, "apiKeyService" | "identity">;

/**
 * One error boundary for all three branches, so a malformed call, a missing
 * per-operation field, and a service refusal all travel as `{ ok: false }` —
 * the same envelope the three folded tools produced, and the one the MCP
 * handler turns into `isError`.
 */
export async function executeManageApiKeys(
  ctx: ManageApiKeysContext,
  input: {
    operation: "list" | "create" | "revoke";
    name?: string;
    scopes?: string[];
    ledgerScope?: string;
    expiresAt?: string;
    id?: string;
  },
): Promise<z.infer<typeof manageApiKeysOutputSchema>> {
  return runToolSafely({
    logger: toolLogger,
    message: "Failed to manage API keys",
    execute: async () => {
      const parsed = manageApiKeysInputSchema.parse(input);
      switch (parsed.operation) {
        case "list":
          return (await ctx.apiKeyService.list(ctx.identity)).map((key) =>
            present(toPublicApiKey(key)),
          );
        case "create": {
          // Deliberately not logging the name below: it is harmless, but a
          // tool that logs its arguments is one schema change away from
          // logging a secret.
          const name = required(parsed.name, "name", parsed.operation);
          const scopes = required(parsed.scopes, "scopes", parsed.operation);
          const minted = await ctx.apiKeyService.mint(ctx.identity, {
            name,
            scopes,
            ledgerScope: parsed.ledgerScope,
            expiresAt:
              parsed.expiresAt === undefined
                ? undefined
                : new Date(parsed.expiresAt),
          });
          return {
            key: present(toPublicApiKey(minted.key)),
            plaintext: minted.plaintext,
          };
        }
        case "revoke":
          return present(
            toPublicApiKey(
              await ctx.apiKeyService.revoke(
                ctx.identity,
                required(parsed.id, "id", parsed.operation),
              ),
            ),
          );
      }
    },
  });
}

function required<T>(value: T | undefined, key: string, operation: string): T {
  if (value === undefined) {
    throw new Error(`\`${key}\` is required for operation "${operation}"`);
  }
  return value;
}
