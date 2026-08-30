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
} as const;

export type AuthorizationAction =
  (typeof AUTHORIZATION_ACTIONS)[keyof typeof AUTHORIZATION_ACTIONS];

/** Kept as a named export for the already-shipped m12 call site. */
export const USER_DELETE_ACTION = AUTHORIZATION_ACTIONS.USER_DELETE;

export const USER_RELATIONSHIPS = {
  READ_PROFILE: "can_read_profile",
  WRITE_PROFILE: "can_write_profile",
  READ_CREDENTIALS: "can_read_credentials",
  WRITE_CREDENTIALS: "can_write_credentials",
  WRITE_LIFECYCLE: "can_write_lifecycle",
} as const;

export type UserRelationship =
  (typeof USER_RELATIONSHIPS)[keyof typeof USER_RELATIONSHIPS];

export type UserResource = `user:${string}`;
export type ApiKeyResource = `api_key:${string}`;
export type AuthorizationResource = UserResource | ApiKeyResource;
export type AuthorizationResourceType = "user" | "api_key";

export function userResource(userId: string): UserResource {
  return `user:${userId}`;
}

/** Runtime locator for a row, not an OpenFGA resource type or tuple. */
export function apiKeyResource(apiKeyId: string): ApiKeyResource {
  return `api_key:${apiKeyId}`;
}

export function parseAuthorizationResource(
  resource: string,
): { type: AuthorizationResourceType; id: string } | undefined {
  const separator = resource.indexOf(":");
  if (separator <= 0 || separator === resource.length - 1) return undefined;
  const type = resource.slice(0, separator);
  const id = resource.slice(separator + 1);
  if ((type !== "user" && type !== "api_key") || !id.trim()) {
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
