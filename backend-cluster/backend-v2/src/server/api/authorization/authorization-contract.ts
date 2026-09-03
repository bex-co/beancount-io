import type { Identity } from "@/server/api/identity";

/**
 * Transport-neutral domain actions understood by the centralized PDP.
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
  LEDGER_CATALOG_READ: "ledger.catalog.read",
  LEDGER_METADATA_READ: "ledger.metadata.read",
  LEDGER_REPORTS_READ: "ledger.reports.read",
  LEDGER_JOURNAL_READ: "ledger.journal.read",
  LEDGER_ACCOUNTS_READ: "ledger.accounts.read",
  LEDGER_FILES_READ: "ledger.files.read",
  LEDGER_FILES_WRITE: "ledger.files.write",
  LEDGER_REPOSITORY_READ: "ledger.repository.read",
  LEDGER_SHELL_READ: "ledger.shell.read",
  LEDGER_ARCHIVE_READ: "ledger.archive.read",
  LEDGER_ENTRIES_WRITE: "ledger.entries.write",
  LEDGER_RECEIPTS_WRITE: "ledger.receipts.write",
  LEDGER_PULL_REQUEST_READ: "ledger.pull_request.read",
  LEDGER_PULL_REQUEST_CREATE: "ledger.pull_request.create",
  LEDGER_PULL_REQUEST_APPROVE: "ledger.pull_request.approve",
  LEDGER_PULL_REQUEST_REJECT: "ledger.pull_request.reject",
  LEDGER_CREATE: "ledger.create",
  LEDGER_ADMINISTRATION_UPDATE: "ledger.administration.update",
  LEDGER_ADMINISTRATION_DELETE: "ledger.administration.delete",
  LEDGER_COLLABORATORS_LIST: "ledger.collaborators.list",
  LEDGER_COLLABORATORS_PERMISSION_READ: "ledger.collaborators.permission.read",
  LEDGER_COLLABORATORS_UPDATE: "ledger.collaborators.update",
  LEDGER_COLLABORATORS_DELETE: "ledger.collaborators.delete",
  LEDGER_COLLABORATORS_LEAVE: "ledger.collaborators.leave",
  USER_PUBLIC_KEYS_LIST: "user.public_keys.list",
  USER_PUBLIC_KEYS_READ: "user.public_keys.read",
  USER_PUBLIC_KEYS_CREATE: "user.public_keys.create",
  USER_PUBLIC_KEYS_DELETE: "user.public_keys.delete",
  LEDGER_READ: "ledger.read",
  LEDGER_WRITE: "ledger.write",
  LEDGER_ADMIN: "ledger.admin",
  ASSISTED_FILE_PARSE: "assisted.file.parse",
  ASSISTED_RECEIPT_PARSE: "assisted.receipt.parse",
  ASSISTED_CATEGORIES_SUGGEST: "assisted.categories.suggest",
  ASSISTED_BANK_CATEGORIES_SUGGEST: "assisted.bank_categories.suggest",
  ASSISTED_BANK_ACCOUNT_MAPPING_SUGGEST:
    "assisted.bank_account_mapping.suggest",
  ASSISTED_RECEIPT_INSERT: "assisted.receipt.insert",
  TEMP_ASSET_UPLOAD_CREATE: "temp_asset.upload.create",
  TEMP_ASSET_DOWNLOAD_READ: "temp_asset.download.read",
  AI_MODEL_INVOKE: "ai.model.invoke",
  AI_LEDGER_ASK: "ai.ledger.ask",
  AI_LEDGER_AGENT: "ai.ledger.agent",
  BANK_CONNECTIONS_LIST: "bank.connections.list",
  BANK_CONNECTION_READ: "bank.connection.read",
  BANK_ACCOUNTS_READ: "bank.accounts.read",
  BANK_LINK_CREATE: "bank.link.create",
  BANK_LINK_UPDATE: "bank.link.update",
  BANK_LINK_EXCHANGE: "bank.link.exchange",
  BANK_CONNECTION_UNLINK: "bank.connection.unlink",
  BANK_ACCOUNTS_RECONCILE: "bank.accounts.reconcile",
  BANK_ACCOUNT_MAPPING_UPDATE: "bank.account.mapping.update",
  BANK_ACCOUNT_CURRENCY_UPDATE: "bank.account.currency.update",
  BANK_CONNECTION_STATUS_REFRESH: "bank.connection.status.refresh",
  BANK_TRANSACTIONS_READ: "bank.transactions.read",
  BANK_TRANSACTION_CATEGORIES_SUGGEST: "bank.transaction.categories.suggest",
  BANK_ACCOUNT_MAPPING_SUGGEST: "bank.account.mapping.suggest",
  BANK_TRANSACTIONS_SYNC: "bank.transactions.sync",
  BANK_TRANSACTIONS_SUBMIT: "bank.transactions.submit",
  BANK_TRANSACTIONS_DELETE: "bank.transactions.delete",
  BANK_WEBHOOK_ITEM_APPLY: "bank.webhook.item.apply",
} as const;

export type AuthorizationAction =
  (typeof AUTHORIZATION_ACTIONS)[keyof typeof AUTHORIZATION_ACTIONS];

export const USER_RELATIONSHIPS = {
  OWNER: "owner",
  READ_PROFILE: "can_read_profile",
  WRITE_PROFILE: "can_write_profile",
  READ_CREDENTIALS: "can_read_credentials",
  WRITE_CREDENTIALS: "can_write_credentials",
  READ_BILLING: "can_read_billing",
  WRITE_BILLING: "can_write_billing",
  WRITE_LIFECYCLE: "can_write_lifecycle",
  READ_SOCIAL: "can_read_social",
  WRITE_SOCIAL: "can_write_social",
  WRITE_LEDGERS: "can_write_ledgers",
  READ_LEDGERS: "can_read_ledgers",
  READ_PUBLIC_KEYS: "can_read_public_keys",
  WRITE_PUBLIC_KEYS: "can_write_public_keys",
} as const;

type UserRelationship =
  (typeof USER_RELATIONSHIPS)[keyof typeof USER_RELATIONSHIPS];

export const LEDGER_RELATIONSHIPS = {
  READ_CONTENTS: "can_read_contents",
  WRITE_CONTENTS: "can_write_contents",
  READ_ASSETS: "can_read_assets",
  WRITE_ASSETS: "can_write_assets",
  READ_ADMINISTRATION: "can_read_administration",
  WRITE_ADMINISTRATION: "can_write_administration",
  READ_COLLABORATORS: "can_read_collaborators",
  WRITE_COLLABORATORS: "can_write_collaborators",
  LEAVE: "can_leave",
  READ: "reader",
  WRITE: "writer",
  ADMIN: "administrator",
  WRITE_AI: "can_write_ai",
  READ_BANK_CONNECTIONS: "can_read_bank_connections",
  WRITE_BANK_CONNECTIONS: "can_write_bank_connections",
} as const;

type LedgerRelationship =
  (typeof LEDGER_RELATIONSHIPS)[keyof typeof LEDGER_RELATIONSHIPS];
export const TEMP_ASSET_RELATIONSHIPS = {
  OWNER: "owner",
} as const;

type TempAssetRelationship =
  (typeof TEMP_ASSET_RELATIONSHIPS)[keyof typeof TEMP_ASSET_RELATIONSHIPS];

export type AuthorizationRelationship =
  | UserRelationship
  | LedgerRelationship
  | TempAssetRelationship;

export type UserResource = `user:${string}`;
export type ApiKeyResource = `api_key:${string}`;
export type LedgerResource = `ledger:${string}`;
export type TempAssetResource = `temp_asset:${string}`;
export type BankConnectionResource = `bank_connection:${string}`;
export type AuthorizationResource =
  | UserResource
  | ApiKeyResource
  | LedgerResource
  | TempAssetResource
  | BankConnectionResource;
export type AuthorizationResourceType =
  | "user"
  | "api_key"
  | "ledger"
  | "temp_asset"
  | "bank_connection";
export type AuthorizationTarget =
  | AuthorizationResource
  | readonly AuthorizationResource[];

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

/** Runtime locator backed by the trusted tmp/{userId}/... key invariant. */
export function tempAssetResource(objectKey: string): TempAssetResource {
  return `temp_asset:${objectKey}`;
}

/**
 * A runtime authorization locator, not an OpenFGA object or persisted tuple.
 * Item ids are internal row ids only; access tokens and Plaid item ids never
 * enter this value. Multiple ids let a batch submit/delete get one complete
 * composite decision.
 */
export function bankConnectionResource(
  ledgerId: string,
  plaidItemIds: string | readonly string[] = [],
): BankConnectionResource {
  const itemIds = Array.isArray(plaidItemIds)
    ? [...new Set(plaidItemIds)].sort()
    : [plaidItemIds];
  const items = itemIds.filter(Boolean).map(encodeURIComponent).join(",");
  return `bank_connection:${encodeURIComponent(ledgerId)}${
    items ? `?items=${items}` : ""
  }`;
}

export function parseBankConnectionResource(resource: string):
  | {
      ledgerId: string;
      plaidItemIds: readonly string[];
    }
  | undefined {
  const parsed = parseAuthorizationResource(resource);
  if (parsed?.type !== "bank_connection") return undefined;
  const [encodedLedgerId, encodedItems] = parsed.id.split("?items=", 2);
  try {
    const ledgerId = decodeURIComponent(encodedLedgerId);
    const plaidItemIds = encodedItems
      ? encodedItems.split(",").map(decodeURIComponent)
      : [];
    if (!ledgerId.trim() || plaidItemIds.some((id) => !id.trim())) {
      return undefined;
    }
    return { ledgerId, plaidItemIds };
  } catch {
    return undefined;
  }
}
export function parseAuthorizationResource(
  resource: string,
): { type: AuthorizationResourceType; id: string } | undefined {
  const separator = resource.indexOf(":");
  if (separator <= 0 || separator === resource.length - 1) return undefined;
  const type = resource.slice(0, separator);
  const id = resource.slice(separator + 1);
  if (
    (type !== "user" &&
      type !== "api_key" &&
      type !== "ledger" &&
      type !== "temp_asset" &&
      type !== "bank_connection") ||
    !id.trim()
  ) {
    return undefined;
  }
  return { type: type as AuthorizationResourceType, id };
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
      resource: AuthorizationTarget;
    }
  | {
      allowed: false;
      action: string;
      resource: AuthorizationTarget | string;
      reason: AuthorizationDenyReason;
      failedResourceType?: AuthorizationResourceType;
      /** Safe, actionable text for GraphQL, REST, and MCP clients. */
      message: string;
    };

export interface AuthorizeInput {
  principal: AuthorizationPrincipal;
  action: AuthorizationAction;
  resource: AuthorizationTarget;
  /** Trusted request attributes that do not belong in the relationship graph. */
  context?: Readonly<Record<string, unknown>>;
}

export type PlaidBackgroundProvenance = "plaid_webhook" | "plaid_scheduler";

export interface AnonymousPrincipal {
  readonly kind: "anonymous";
  readonly userId: "anonymous";
}

const issuedAnonymousPrincipals = new WeakSet<object>();

/** Trusted subject used only for public-ledger reads. */
export function anonymousPrincipal(): AnonymousPrincipal {
  const principal: AnonymousPrincipal = Object.freeze({
    kind: "anonymous",
    userId: "anonymous",
  });
  issuedAnonymousPrincipals.add(principal);
  return principal;
}

export function isTrustedAnonymousPrincipal(
  principal: AuthorizationPrincipal,
): principal is AnonymousPrincipal {
  return (
    "kind" in principal &&
    principal.kind === "anonymous" &&
    issuedAnonymousPrincipals.has(principal)
  );
}

/**
 * An internal invocation has no request credential and is deliberately not an
 * Identity. Instances are registered in this module so a caller-controlled
 * object with the same fields cannot claim background provenance.
 */
export interface PlaidBackgroundPrincipal {
  readonly kind: "plaid_background";
  readonly userId: string;
  readonly provenance: PlaidBackgroundProvenance;
}

const issuedPlaidBackgroundPrincipals = new WeakSet<object>();

export function plaidBackgroundPrincipal(
  userId: string,
  provenance: PlaidBackgroundProvenance,
): PlaidBackgroundPrincipal {
  const principal: PlaidBackgroundPrincipal = Object.freeze({
    kind: "plaid_background",
    userId,
    provenance,
  });
  issuedPlaidBackgroundPrincipals.add(principal);
  return principal;
}

export function isTrustedPlaidBackgroundPrincipal(
  principal: AuthorizationPrincipal,
): principal is PlaidBackgroundPrincipal {
  return (
    "kind" in principal &&
    principal.kind === "plaid_background" &&
    issuedPlaidBackgroundPrincipals.has(principal)
  );
}

export type AuthorizationPrincipal =
  | Identity
  | AnonymousPrincipal
  | PlaidBackgroundPrincipal;
