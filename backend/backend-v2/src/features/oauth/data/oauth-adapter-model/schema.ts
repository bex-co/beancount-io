import {
  pgTable,
  text,
  jsonb,
  timestamp,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterPayload } from "oidc-provider";

// Composite (model, id) primary key — mirrors oidc-provider's own MemoryAdapter
// key scheme (`${model}:${id}`). No prefixedNanoidBase58 ID here: the primary id
// is oidc-provider's own generated id, passed into upsert(id, ...) — not ours to
// prefix, the same exception jwt-model/schema.ts takes for the JWT's own `jti`.
export const oauthAdapterStorage = pgTable(
  "oauth_adapter_storage",
  {
    model: text("model").notNull(),
    id: text("id").notNull(),
    payload: jsonb("payload").$type<AdapterPayload>().notNull(),
    // Denormalized out of `payload` at write time purely for indexed lookups
    // (findByUserCode / findByUid / revokeByGrantId) — avoids querying into jsonb.
    grantId: text("grant_id"),
    userCode: text("user_code"),
    uid: text("uid"),
    // NULL = no TTL (e.g. dynamically-registered Client, RegistrationAccessToken,
    // InitialAccessToken) — must never be swept by the cleanup job.
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.model, table.id] }),
    index("oauth_adapter_storage_grant_id_idx").on(table.model, table.grantId),
    index("oauth_adapter_storage_user_code_idx").on(
      table.model,
      table.userCode,
    ),
    index("oauth_adapter_storage_uid_idx").on(table.model, table.uid),
    index("oauth_adapter_storage_expires_at_idx").on(table.expiresAt),
  ],
);
