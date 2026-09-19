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
    ledgerScope: z.string().optional().openapi({
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

export const introspectionRequestSchema = z
  .object({
    token: z.string().min(1).openapi({
      description:
        "The credential to ask about: an OAuth access token, a `bcio_` API key, or a session token.",
      example: "bcio_7wXzK9mNpQrSt2VxYaBcDeF3gH4jK5mN",
    }),
    token_type_hint: z.string().optional().openapi({
      description:
        "RFC 7662 hint. Accepted for spec compliance and ignored — the kind is determined by verification, which is cheaper than trusting a hint that can be wrong.",
      example: "access_token",
    }),
  })
  .openapi("IntrospectionRequest", {
    description: "The credential whose status you want",
  });

export const introspectionSchema = z
  .object({
    active: z.boolean().openapi({
      description:
        "Whether the credential is usable right now. False for expired, malformed, revoked, never-issued, and belonging to another user — deliberately indistinguishable, and the only field present when false.",
    }),
    sub: z.string().optional().openapi({
      description: "The user the credential acts for",
    }),
    scope: z.string().optional().openapi({
      description:
        "What this credential may do, space-delimited, in the ledger scope vocabulary. This is effective capability, not the raw grant: a session token is not scope-constrained and reports all three.",
      example: "ledger.read ledger.write ledger.admin",
    }),
    client_id: z.string().optional().openapi({
      description: "The OAuth client the token was issued to, if it was one",
    }),
    jti: z.string().optional().openapi({
      description: "The credential's stable id, for audit and revocation",
    }),
    iat: z.number().optional().openapi({
      description: "When the credential was issued (seconds since the epoch)",
    }),
    exp: z.number().optional().openapi({
      description:
        "When the credential stops working (seconds since the epoch). Absent for an API key minted without an expiry.",
    }),
    bio_credential_kind: z
      .enum(["session", "oauth", "apikey", "system"])
      .optional()
      .openapi({ description: "Which kind of credential this is" }),
    bio_assurance: z
      .enum(["interactive", "delegated", "workload"])
      .optional()
      .openapi({
        description:
          "How the holder authenticated: `interactive` for a signed-in session, `delegated` for a token acting on their behalf",
      }),
    bio_ledger_scope: z.string().optional().openapi({
      description:
        "The one ledger this credential may touch, as `owner/name`. Absent when it is not confined.",
      example: "alice/main-ledger",
    }),
  })
  .openapi("Introspection", {
    description:
      "A credential's current status. Fields prefixed `bio_` are ours, not RFC 7662.",
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
