import { z } from "@/shared/zod-openapi-setup";
import { API_SCOPES } from "@/server/api/identity";

/**
 * One description of an API key, feeding the REST spec, the REST validator, and
 * the MCP tools' input schemas (ADR 0006 D8). GraphQL keeps its own
 * TypeGraphQL types because its schema is generated from classes — the shapes
 * are checked against each other by the parity test rather than by sharing an
 * object.
 */

const scopeSchema = z.enum(API_SCOPES).openapi({
  description: "One of the three ledger scopes",
  example: "ledger.read",
});

export const createApiKeySchema = z
  .object({
    name: z.string().min(1).max(200).openapi({
      description: "What this key is for — shown in the key list",
      example: "CI: nightly ledger export",
    }),
    scopes: z
      .array(scopeSchema)
      .min(1)
      .openapi({
        description:
          "What the key may do. A key can never hold more than its creator did.",
        example: ["ledger.read"],
      }),
    ledgerScope: z.string().min(1).optional().openapi({
      description:
        "Confine the key to one ledger, as `owner/name`. Omit to inherit the caller's own confinement (all its ledgers, or the one its credential is pinned to). A credential pinned to one ledger cannot name a different one.",
      example: "alice/main-ledger",
    }),
    expiresAt: z.coerce.date().optional().openapi({
      description: "When the key stops working (ISO 8601). Omit for no expiry.",
    }),
  })
  .openapi("CreateApiKey", { description: "A new API key to mint" });

export const apiKeyIdSchema = z.object({
  id: z.string().min(1).openapi({
    description: "The key's id (`akey_…`), not the key itself",
    example: "akey_7wXzK9mNpQrSt2VxYaBc",
  }),
});

export const publicApiKeySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    keyPrefix: z.string().openapi({
      description: "The first characters of the key, for telling keys apart",
      example: "bcio_7wXzK9mN",
    }),
    scopes: z.array(z.string()),
    ledgerScope: z.string().optional(),
    lastUsedAt: z.date().optional(),
    expiresAt: z.date().optional(),
    revokedAt: z.date().optional(),
    createdAt: z.date(),
  })
  .openapi("ApiKey", {
    description: "An API key as it can be shown — never the key itself",
  });

export const mintedApiKeySchema = z
  .object({
    key: publicApiKeySchema,
    plaintext: z.string().openapi({
      description:
        "The key. Returned exactly once, by this response, and never recoverable afterwards — store it now.",
      example: "bcio_7wXzK9mNpQrSt2VxYaBcDeF3gH4jK5mN",
    }),
  })
  .openapi("MintedApiKey", {
    description: "A newly minted key, including its one and only plaintext",
  });
