import type { Identity } from "@/server/api/identity";

/**
 * Transport-neutral user-domain actions understood by the centralized PDP.
 * GraphQL fields, REST routes, and MCP tools are aliases of these actions.
 */
export const AUTHORIZATION_ACTIONS = {
  USER_PROFILE_READ: "user.profile.read",
  USER_PROFILE_SEARCH: "user.profile.search",
  USER_PROFILE_UPDATE: "user.profile.update",
  USER_DELETE: "user.delete",
  USER_CREDENTIALS_LIST: "user.credentials.list",
  USER_CREDENTIALS_CREATE: "user.credentials.create",
  USER_CREDENTIALS_REVOKE: "user.credentials.revoke",
  USER_BILLING_STATUS_READ: "user.billing.status.read",
  USER_BILLING_CHECKOUT_CREATE: "user.billing.checkout.create",
  USER_BILLING_PORTAL_CREATE: "user.billing.portal.create",
  USER_BILLING_SUBSCRIPTION_CANCEL: "user.billing.subscription.cancel",
  USER_BILLING_SUBSCRIPTION_RESUME: "user.billing.subscription.resume",
  USER_BILLING_SUBSCRIPTION_UPGRADE: "user.billing.subscription.upgrade",
  USER_SOCIAL_FEED_READ: "user.social.feed.read",
  USER_SOCIAL_FOLLOW_CREATE: "user.social.follow.create",
  USER_SOCIAL_FOLLOW_DELETE: "user.social.follow.delete",
  LEDGER_SOCIAL_STAR_STATUS_READ: "ledger.social.star.status.read",
  LEDGER_SOCIAL_STAR_CREATE: "ledger.social.star.create",
  LEDGER_SOCIAL_STAR_DELETE: "ledger.social.star.delete",
} as const;

export type AuthorizationAction =
  (typeof AUTHORIZATION_ACTIONS)[keyof typeof AUTHORIZATION_ACTIONS];

export const USER_RELATIONSHIPS = {
  READ_PROFILE: "can_read_profile",
  WRITE_PROFILE: "can_write_profile",
  READ_CREDENTIALS: "can_read_credentials",
  WRITE_CREDENTIALS: "can_write_credentials",
  READ_BILLING: "can_read_billing",
  WRITE_BILLING: "can_write_billing",
  WRITE_LIFECYCLE: "can_write_lifecycle",
  READ_SOCIAL: "can_read_social",
  WRITE_SOCIAL: "can_write_social",
} as const;

export type UserRelationship =
  (typeof USER_RELATIONSHIPS)[keyof typeof USER_RELATIONSHIPS];

export const LEDGER_RELATIONSHIPS = {
  READ_CONTENTS: "can_read_contents",
} as const;

export type LedgerRelationship =
  (typeof LEDGER_RELATIONSHIPS)[keyof typeof LEDGER_RELATIONSHIPS];
export type AuthorizationRelationship = UserRelationship | LedgerRelationship;

export type UserResource = `user:${string}`;
export type ApiKeyResource = `api_key:${string}`;
export type LedgerResource = `ledger:${string}`;
export type AuthorizationResource =
  | UserResource
  | ApiKeyResource
  | LedgerResource;
export type AuthorizationResourceType = "user" | "api_key" | "ledger";

export function userResource(userId: string): UserResource {
  return `user:${userId}`;
}

/** Runtime locator for a row, not an OpenFGA resource type or tuple. */
export function apiKeyResource(apiKeyId: string): ApiKeyResource {
  return `api_key:${apiKeyId}`;
}

/** Canonical application ledger id (`owner/name`), never a caller identity. */
export function ledgerResource(ledgerId: string): LedgerResource {
  return `ledger:${ledgerId}`;
}

export function parseAuthorizationResource(
  resource: string,
): { type: AuthorizationResourceType; id: string } | undefined {
  const separator = resource.indexOf(":");
  if (separator <= 0 || separator === resource.length - 1) return undefined;
  const type = resource.slice(0, separator);
  const id = resource.slice(separator + 1);
  if (
    (type !== "user" && type !== "api_key" && type !== "ledger") ||
    !id.trim()
  ) {
    return undefined;
  }
  return { type, id };
}

export type AuthorizationDenyReason =
  | "unknown_action"
  | "unknown_resource"
  | "credential_not_permitted"
  | "relationship_denied";

export type AuthorizationDecision =
  | {
      allowed: true;
      action: AuthorizationAction;
      resource: AuthorizationResource;
    }
  | {
      allowed: false;
      action: string;
      resource: string;
      reason: AuthorizationDenyReason;
      /** Safe, actionable text for GraphQL, REST, and MCP clients. */
      message: string;
    };

export interface AuthorizeInput {
  principal: Identity;
  action: AuthorizationAction;
  resource: AuthorizationResource;
}
