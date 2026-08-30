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
  created_at: key.createdAt.toISOString(),
});

// --- list -----------------------------------------------------------------

export const listApiKeysDescription =
  "List the caller's API keys. Shows each key's id, name, prefix, and scopes — never the key itself, which is only ever returned when it is created.";

export const listApiKeysInputSchema = z.object({});

export const listApiKeysOutputSchema = toolOutputSchema(
  z.array(publicKeyShape),
);

export async function executeListApiKeys(
  ctx: Pick<ToolContext, "apiKeyService" | "identity">,
): Promise<z.infer<typeof listApiKeysOutputSchema>> {
  return runToolSafely({
    logger: toolLogger,
    message: "Failed to list API keys",
    execute: async () =>
      (await ctx.apiKeyService.list(ctx.identity)).map((key) =>
        present(toPublicApiKey(key)),
      ),
  });
}

// --- create ---------------------------------------------------------------

export const createApiKeyDescription =
  "Mint an API key for scripted access. Requires a paid plan, and cannot be called with an API key. The plaintext is returned once, here, and is not recoverable afterwards.";

export const createApiKeyInputSchema = z.object({
  name: z.string().describe("What this key is for; shown in the key list."),
  scopes: z
    .array(z.enum(API_SCOPES))
    .describe(
      "What the key may do. Cannot exceed what the caller already holds.",
    ),
  ledger_scope: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Confine the key to one ledger, as `owner/name`. Omit to inherit the caller's own confinement; a credential pinned to one ledger cannot name a different one.",
    ),
});

export const createApiKeyOutputSchema = toolOutputSchema(
  z.object({ key: publicKeyShape, plaintext: z.string() }),
);

export async function executeCreateApiKey(
  ctx: Pick<ToolContext, "apiKeyService" | "identity">,
  input: { name: string; scopes: string[]; ledger_scope?: string },
): Promise<z.infer<typeof createApiKeyOutputSchema>> {
  return runToolSafely({
    logger: toolLogger,
    message: "Failed to mint API key",
    // Deliberately not logging `input`: the name is harmless, but a tool that
    // logs its arguments is one schema change away from logging a secret.
    context: { scopes: input.scopes },
    execute: async () => {
      const minted = await ctx.apiKeyService.mint(ctx.identity, {
        name: input.name,
        scopes: input.scopes,
        ledgerScope: input.ledger_scope,
      });
      return {
        key: present(toPublicApiKey(minted.key)),
        plaintext: minted.plaintext,
      };
    },
  });
}

// --- revoke ---------------------------------------------------------------

export const revokeApiKeyDescription =
  "Revoke an API key by its id. Takes effect on the key's next use.";

export const revokeApiKeyInputSchema = z.object({
  id: z.string().describe("The key's id (`akey_…`), not the key itself."),
});

export const revokeApiKeyOutputSchema = toolOutputSchema(publicKeyShape);

export async function executeRevokeApiKey(
  ctx: Pick<ToolContext, "apiKeyService" | "identity">,
  input: { id: string },
): Promise<z.infer<typeof revokeApiKeyOutputSchema>> {
  return runToolSafely({
    logger: toolLogger,
    message: "Failed to revoke API key",
    context: { keyId: input.id },
    execute: async () =>
      present(
        toPublicApiKey(await ctx.apiKeyService.revoke(ctx.identity, input.id)),
      ),
  });
}
