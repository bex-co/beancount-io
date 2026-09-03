import {
  identityAllowsLedgerScope,
  identityAssuranceIsValid,
  identityHasCapability,
  identityUserId,
  type AuthMethod,
  type OperationClass,
} from "@/server/api/identity";
import {
  auditSubject,
  emitAuditEvent,
  shouldAudit,
  type AuditOutcome,
} from "@/server/api/audit";
import {
  DomainError,
  ErrorCategory,
  UnauthenticatedError,
} from "@/shared/errors";
import { logger } from "@/shared/logger";
import { getOperationId } from "@/shared/async-context";
import {
  AUTHORIZATION_ACTIONS,
  isTrustedAnonymousPrincipal,
  isTrustedPlaidBackgroundPrincipal,
  LEDGER_RELATIONSHIPS,
  parseBankConnectionResource,
  parseAuthorizationResource,
  TEMP_ASSET_RELATIONSHIPS,
  userResource,
  USER_RELATIONSHIPS,
  type AuthorizationAction,
  type AuthorizationDecision,
  type AuthorizationDenyReason,
  type AuthorizationRelationship,
  type AuthorizationResource,
  type AuthorizationResourceType,
  type AuthorizationTarget,
  type AuthorizeInput,
  type AuthorizationPrincipal,
  type PlaidBackgroundProvenance,
} from "./authorization-contract";
import type {
  IRelationshipEvaluator,
  RelationshipCheck,
} from "./source-backed-relationship-evaluator";

const authorizationLogger = logger.child({ module: "authorization" });

type CredentialRequirement = {
  readonly methods: readonly AuthMethod[];
  readonly allowAnonymous?: boolean;
  readonly backgroundProvenance?: readonly PlaidBackgroundProvenance[];
  readonly capability?: OperationClass;
  readonly denyMessageByMethod?: Partial<Record<AuthMethod, string>>;
  readonly enforceLedgerScope?: boolean;
};

type AuditClass = "read" | "write" | "admin";

interface DenialConcealment {
  readonly reasons: readonly AuthorizationDenyReason[];
  readonly resourceTypes?: readonly AuthorizationResourceType[];
  readonly category: ErrorCategory;
  readonly message: string;
}

interface ActionRequirement {
  readonly relationships: readonly {
    readonly resourceType: AuthorizationResourceType;
    readonly relationship: AuthorizationRelationship;
  }[];
  readonly credential: CredentialRequirement;
  readonly auditClass: AuditClass;
  readonly concealDenialAs?: DenialConcealment;
}

const EVERY_CREDENTIAL = ["session", "oauth", "apikey"] as const;
const EVERY_AUTHENTICATED_ACTOR = [
  "session",
  "oauth",
  "apikey",
  "system",
] as const;
const INTERACTIVE_OR_OAUTH = ["session", "oauth"] as const;
const SESSION_ONLY = ["session"] as const;

const BILLING_CREDENTIAL: CredentialRequirement = {
  methods: SESSION_ONLY,
  denyMessageByMethod: {
    oauth: "Managing billing requires a full signed-in session",
    apikey: "Managing billing requires a full signed-in session",
  },
};

const LEDGER_SOCIAL_READ_CREDENTIAL: CredentialRequirement = {
  methods: EVERY_CREDENTIAL,
  capability: "read",
  enforceLedgerScope: true,
};

const LEDGER_SOCIAL_WRITE_CREDENTIAL: CredentialRequirement = {
  methods: EVERY_CREDENTIAL,
  capability: "write",
  enforceLedgerScope: true,
};

const LEDGER_CONTENT_READ_CREDENTIAL: CredentialRequirement = {
  methods: EVERY_AUTHENTICATED_ACTOR,
  allowAnonymous: true,
  capability: "read",
  enforceLedgerScope: true,
};

const LEDGER_CONTENT_WRITE_CREDENTIAL: CredentialRequirement = {
  methods: EVERY_CREDENTIAL,
  capability: "write",
  enforceLedgerScope: true,
};

const LEDGER_CONTROL_PLANE_CREDENTIAL: CredentialRequirement = {
  methods: EVERY_CREDENTIAL,
  capability: "admin",
  enforceLedgerScope: true,
};

const BANK_ADMIN_CREDENTIAL: CredentialRequirement = {
  methods: EVERY_CREDENTIAL,
  capability: "admin",
  enforceLedgerScope: true,
};

const USER_CONTROL_PLANE_CREDENTIAL: CredentialRequirement = {
  methods: EVERY_CREDENTIAL,
  capability: "admin",
};

const LEDGER_NOT_FOUND_CONCEALMENT: DenialConcealment = {
  reasons: ["relationship_denied", "unknown_resource"],
  category: ErrorCategory.NOT_FOUND,
  message: "Ledger not found",
};

const BANK_LINK_CREDENTIAL: CredentialRequirement = {
  methods: INTERACTIVE_OR_OAUTH,
  capability: "admin",
  enforceLedgerScope: true,
  denyMessageByMethod: {
    apikey: "Plaid Link requires an interactive signed-in client",
  },
};

const BANK_TRANSACTION_READ_CREDENTIAL: CredentialRequirement = {
  methods: EVERY_CREDENTIAL,
  capability: "read",
  enforceLedgerScope: true,
};

const BANK_TRANSACTION_WRITE_CREDENTIAL: CredentialRequirement = {
  methods: EVERY_CREDENTIAL,
  capability: "write",
  enforceLedgerScope: true,
  backgroundProvenance: ["plaid_webhook", "plaid_scheduler"],
};

const BANK_WEBHOOK_CREDENTIAL: CredentialRequirement = {
  methods: [],
  backgroundProvenance: ["plaid_webhook"],
};

const BANK_CONNECTION_CONCEALMENT: DenialConcealment = {
  reasons: ["relationship_denied", "unknown_resource"],
  category: ErrorCategory.NOT_FOUND,
  message: "Bank connection not found",
};

const ledgerContentReadRequirement = (): ActionRequirement => ({
  relationships: [relationship("ledger", LEDGER_RELATIONSHIPS.READ_CONTENTS)],
  credential: LEDGER_CONTENT_READ_CREDENTIAL,
  auditClass: "read",
});

/** The one executable policy catalog for protected application domains. */
const relationship = (
  resourceType: AuthorizationResourceType,
  required: AuthorizationRelationship,
) => ({ resourceType, relationship: required });

const userRelationship = (required: AuthorizationRelationship) => [
  relationship("user", required),
];

const TEMP_ASSET_NOT_FOUND: DenialConcealment = {
  reasons: ["relationship_denied"],
  resourceTypes: ["temp_asset"],
  category: ErrorCategory.NOT_FOUND,
  message: "Temporary asset not found",
};

/** Helpers for declaring exact single- and multi-resource requirements. */
const ACTION_REQUIREMENTS: Readonly<
  Record<AuthorizationAction, ActionRequirement>
> = {
  [AUTHORIZATION_ACTIONS.USER_PROFILE_READ]: {
    relationships: userRelationship(USER_RELATIONSHIPS.READ_PROFILE),
    credential: { methods: EVERY_CREDENTIAL, capability: "read" },
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.USER_PROFILE_SEARCH]: {
    relationships: userRelationship(USER_RELATIONSHIPS.READ_PROFILE),
    credential: { methods: SESSION_ONLY },
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE]: {
    relationships: userRelationship(USER_RELATIONSHIPS.WRITE_PROFILE),
    credential: { methods: SESSION_ONLY },
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.USER_DELETE]: {
    relationships: userRelationship(USER_RELATIONSHIPS.WRITE_LIFECYCLE),
    credential: { methods: INTERACTIVE_OR_OAUTH },
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.USER_CREDENTIALS_LIST]: {
    relationships: userRelationship(USER_RELATIONSHIPS.READ_CREDENTIALS),
    credential: { methods: EVERY_CREDENTIAL, capability: "admin" },
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.USER_CREDENTIALS_CREATE]: {
    relationships: userRelationship(USER_RELATIONSHIPS.WRITE_CREDENTIALS),
    credential: {
      methods: INTERACTIVE_OR_OAUTH,
      capability: "admin",
      denyMessageByMethod: {
        apikey:
          "An API key cannot mint another API key. Sign in, or use an OAuth grant, to create one.",
      },
    },
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE]: {
    relationships: [
      relationship("api_key", USER_RELATIONSHIPS.WRITE_CREDENTIALS),
    ],
    credential: { methods: EVERY_CREDENTIAL, capability: "admin" },
    auditClass: "admin",
    concealDenialAs: {
      reasons: ["relationship_denied", "unknown_resource"],
      category: ErrorCategory.NOT_FOUND,
      message: "API key not found",
    },
  },
  [AUTHORIZATION_ACTIONS.USER_BILLING_STATUS_READ]: {
    relationships: userRelationship(USER_RELATIONSHIPS.READ_BILLING),
    credential: BILLING_CREDENTIAL,
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.USER_BILLING_CHECKOUT_CREATE]: {
    relationships: userRelationship(USER_RELATIONSHIPS.WRITE_BILLING),
    credential: BILLING_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.USER_BILLING_PORTAL_CREATE]: {
    relationships: userRelationship(USER_RELATIONSHIPS.WRITE_BILLING),
    credential: BILLING_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_CANCEL]: {
    relationships: userRelationship(USER_RELATIONSHIPS.WRITE_BILLING),
    credential: BILLING_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_RESUME]: {
    relationships: userRelationship(USER_RELATIONSHIPS.WRITE_BILLING),
    credential: BILLING_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_UPGRADE]: {
    relationships: userRelationship(USER_RELATIONSHIPS.WRITE_BILLING),
    credential: BILLING_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.USER_AI_USAGE_READ]: {
    relationships: userRelationship(USER_RELATIONSHIPS.OWNER),
    credential: { methods: EVERY_CREDENTIAL, capability: "read" },
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.USER_SOCIAL_FEED_READ]: {
    relationships: userRelationship(USER_RELATIONSHIPS.READ_SOCIAL),
    credential: { methods: SESSION_ONLY },
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.USER_SOCIAL_FOLLOW_CREATE]: {
    relationships: userRelationship(USER_RELATIONSHIPS.WRITE_SOCIAL),
    credential: { methods: SESSION_ONLY },
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.USER_SOCIAL_FOLLOW_DELETE]: {
    relationships: userRelationship(USER_RELATIONSHIPS.WRITE_SOCIAL),
    credential: { methods: SESSION_ONLY },
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_STATUS_READ]: {
    relationships: [relationship("ledger", LEDGER_RELATIONSHIPS.READ_CONTENTS)],
    credential: LEDGER_SOCIAL_READ_CREDENTIAL,
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_CREATE]: {
    relationships: [relationship("ledger", LEDGER_RELATIONSHIPS.READ_CONTENTS)],
    credential: LEDGER_SOCIAL_WRITE_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_DELETE]: {
    relationships: [relationship("ledger", LEDGER_RELATIONSHIPS.READ_CONTENTS)],
    credential: LEDGER_SOCIAL_WRITE_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_CATALOG_READ]: {
    relationships: userRelationship(USER_RELATIONSHIPS.READ_LEDGERS),
    credential: { methods: EVERY_AUTHENTICATED_ACTOR, capability: "read" },
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_METADATA_READ]: ledgerContentReadRequirement(),
  [AUTHORIZATION_ACTIONS.LEDGER_REPORTS_READ]: ledgerContentReadRequirement(),
  [AUTHORIZATION_ACTIONS.LEDGER_JOURNAL_READ]: ledgerContentReadRequirement(),
  [AUTHORIZATION_ACTIONS.LEDGER_ACCOUNTS_READ]: ledgerContentReadRequirement(),
  [AUTHORIZATION_ACTIONS.LEDGER_FILES_READ]: ledgerContentReadRequirement(),
  [AUTHORIZATION_ACTIONS.LEDGER_REPOSITORY_READ]:
    ledgerContentReadRequirement(),
  [AUTHORIZATION_ACTIONS.LEDGER_SHELL_READ]: ledgerContentReadRequirement(),
  [AUTHORIZATION_ACTIONS.LEDGER_ARCHIVE_READ]: ledgerContentReadRequirement(),
  [AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_READ]:
    ledgerContentReadRequirement(),
  [AUTHORIZATION_ACTIONS.LEDGER_FILES_WRITE]: {
    relationships: [
      relationship("ledger", LEDGER_RELATIONSHIPS.WRITE_CONTENTS),
    ],
    credential: LEDGER_CONTENT_WRITE_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_ENTRIES_WRITE]: {
    relationships: [
      relationship("ledger", LEDGER_RELATIONSHIPS.WRITE_CONTENTS),
    ],
    credential: LEDGER_CONTENT_WRITE_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_CREATE]: {
    relationships: [
      relationship("ledger", LEDGER_RELATIONSHIPS.WRITE_CONTENTS),
    ],
    credential: LEDGER_CONTENT_WRITE_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_APPROVE]: {
    relationships: [
      relationship("ledger", LEDGER_RELATIONSHIPS.WRITE_CONTENTS),
    ],
    credential: LEDGER_CONTENT_WRITE_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_REJECT]: {
    relationships: [
      relationship("ledger", LEDGER_RELATIONSHIPS.WRITE_CONTENTS),
    ],
    credential: LEDGER_CONTENT_WRITE_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_CREATE]: {
    relationships: userRelationship(USER_RELATIONSHIPS.WRITE_LEDGERS),
    credential: USER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_ADMINISTRATION_UPDATE]: {
    relationships: [
      relationship("ledger", LEDGER_RELATIONSHIPS.WRITE_ADMINISTRATION),
    ],
    credential: LEDGER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: LEDGER_NOT_FOUND_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.LEDGER_ADMINISTRATION_DELETE]: {
    relationships: [
      relationship("ledger", LEDGER_RELATIONSHIPS.WRITE_ADMINISTRATION),
    ],
    credential: LEDGER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: LEDGER_NOT_FOUND_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_LIST]: {
    relationships: [
      relationship("ledger", LEDGER_RELATIONSHIPS.READ_COLLABORATORS),
    ],
    credential: LEDGER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: LEDGER_NOT_FOUND_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_PERMISSION_READ]: {
    relationships: [
      relationship("ledger", LEDGER_RELATIONSHIPS.READ_COLLABORATORS),
    ],
    credential: LEDGER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: LEDGER_NOT_FOUND_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_UPDATE]: {
    relationships: [
      relationship("ledger", LEDGER_RELATIONSHIPS.WRITE_COLLABORATORS),
    ],
    credential: LEDGER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: LEDGER_NOT_FOUND_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_DELETE]: {
    relationships: [
      relationship("ledger", LEDGER_RELATIONSHIPS.WRITE_COLLABORATORS),
    ],
    credential: LEDGER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: LEDGER_NOT_FOUND_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_LEAVE]: {
    relationships: [relationship("ledger", LEDGER_RELATIONSHIPS.LEAVE)],
    credential: LEDGER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: LEDGER_NOT_FOUND_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_LIST]: {
    relationships: userRelationship(USER_RELATIONSHIPS.READ_PUBLIC_KEYS),
    credential: USER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_READ]: {
    relationships: userRelationship(USER_RELATIONSHIPS.READ_PUBLIC_KEYS),
    credential: USER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_CREATE]: {
    relationships: userRelationship(USER_RELATIONSHIPS.WRITE_PUBLIC_KEYS),
    credential: USER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_DELETE]: {
    relationships: userRelationship(USER_RELATIONSHIPS.WRITE_PUBLIC_KEYS),
    credential: USER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.ASSISTED_FILE_PARSE]: {
    relationships: [
      relationship("user", USER_RELATIONSHIPS.OWNER),
      relationship("temp_asset", TEMP_ASSET_RELATIONSHIPS.OWNER),
    ],
    credential: { methods: EVERY_AUTHENTICATED_ACTOR, capability: "read" },
    auditClass: "read",
    concealDenialAs: TEMP_ASSET_NOT_FOUND,
  },
  [AUTHORIZATION_ACTIONS.ASSISTED_RECEIPT_PARSE]: {
    relationships: [
      relationship("temp_asset", TEMP_ASSET_RELATIONSHIPS.OWNER),
      relationship("ledger", LEDGER_RELATIONSHIPS.READ_CONTENTS),
      relationship("ledger", LEDGER_RELATIONSHIPS.READ_ASSETS),
    ],
    credential: { methods: EVERY_AUTHENTICATED_ACTOR, capability: "read" },
    auditClass: "read",
    concealDenialAs: TEMP_ASSET_NOT_FOUND,
  },
  [AUTHORIZATION_ACTIONS.ASSISTED_CATEGORIES_SUGGEST]: {
    relationships: [
      relationship("ledger", LEDGER_RELATIONSHIPS.READ_CONTENTS),
      relationship("ledger", LEDGER_RELATIONSHIPS.WRITE_AI),
    ],
    credential: { methods: EVERY_AUTHENTICATED_ACTOR, capability: "read" },
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.ASSISTED_RECEIPT_INSERT]: {
    relationships: [
      relationship("temp_asset", TEMP_ASSET_RELATIONSHIPS.OWNER),
      relationship("ledger", LEDGER_RELATIONSHIPS.WRITE_CONTENTS),
      relationship("ledger", LEDGER_RELATIONSHIPS.WRITE_ASSETS),
    ],
    credential: { methods: EVERY_AUTHENTICATED_ACTOR, capability: "write" },
    auditClass: "write",
    concealDenialAs: TEMP_ASSET_NOT_FOUND,
  },
  [AUTHORIZATION_ACTIONS.TEMP_ASSET_UPLOAD_CREATE]: {
    relationships: userRelationship(USER_RELATIONSHIPS.OWNER),
    credential: { methods: EVERY_AUTHENTICATED_ACTOR, capability: "read" },
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.TEMP_ASSET_DOWNLOAD_READ]: {
    relationships: [relationship("temp_asset", TEMP_ASSET_RELATIONSHIPS.OWNER)],
    credential: { methods: EVERY_AUTHENTICATED_ACTOR, capability: "read" },
    auditClass: "read",
    concealDenialAs: TEMP_ASSET_NOT_FOUND,
  },
  [AUTHORIZATION_ACTIONS.AI_MODEL_INVOKE]: {
    relationships: userRelationship(USER_RELATIONSHIPS.OWNER),
    credential: { methods: EVERY_AUTHENTICATED_ACTOR, capability: "write" },
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.AI_LEDGER_ASK]: {
    relationships: [relationship("ledger", LEDGER_RELATIONSHIPS.READ_CONTENTS)],
    credential: { methods: EVERY_AUTHENTICATED_ACTOR, capability: "read" },
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.AI_LEDGER_AGENT]: {
    relationships: [
      relationship("ledger", LEDGER_RELATIONSHIPS.WRITE_CONTENTS),
      relationship("ledger", LEDGER_RELATIONSHIPS.WRITE_AI),
    ],
    credential: { methods: EVERY_AUTHENTICATED_ACTOR, capability: "write" },
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.BANK_CONNECTIONS_LIST]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.READ_BANK_CONNECTIONS,
      ),
    ],
    credential: BANK_ADMIN_CREDENTIAL,
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.BANK_CONNECTION_READ]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.READ_BANK_CONNECTIONS,
      ),
    ],
    credential: BANK_ADMIN_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: BANK_CONNECTION_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.BANK_ACCOUNTS_READ]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.READ_BANK_CONNECTIONS,
      ),
    ],
    credential: BANK_ADMIN_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: BANK_CONNECTION_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.BANK_LINK_CREATE]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.WRITE_BANK_CONNECTIONS,
      ),
    ],
    credential: BANK_LINK_CREDENTIAL,
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.BANK_LINK_UPDATE]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.WRITE_BANK_CONNECTIONS,
      ),
    ],
    credential: BANK_LINK_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: BANK_CONNECTION_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.BANK_LINK_EXCHANGE]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.WRITE_BANK_CONNECTIONS,
      ),
    ],
    credential: BANK_LINK_CREDENTIAL,
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.BANK_CONNECTION_UNLINK]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.WRITE_BANK_CONNECTIONS,
      ),
    ],
    credential: BANK_ADMIN_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: BANK_CONNECTION_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.BANK_ACCOUNTS_RECONCILE]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.WRITE_BANK_CONNECTIONS,
      ),
    ],
    credential: BANK_ADMIN_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: BANK_CONNECTION_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.BANK_ACCOUNT_MAPPING_UPDATE]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.WRITE_BANK_CONNECTIONS,
      ),
    ],
    credential: BANK_ADMIN_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: BANK_CONNECTION_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.BANK_ACCOUNT_CURRENCY_UPDATE]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.WRITE_BANK_CONNECTIONS,
      ),
    ],
    credential: BANK_ADMIN_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: BANK_CONNECTION_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.BANK_CONNECTION_STATUS_REFRESH]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.WRITE_BANK_CONNECTIONS,
      ),
    ],
    credential: BANK_ADMIN_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: BANK_CONNECTION_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.BANK_TRANSACTIONS_READ]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.READ_BANK_CONNECTIONS,
      ),
      relationship("bank_connection", LEDGER_RELATIONSHIPS.READ_CONTENTS),
    ],
    credential: BANK_TRANSACTION_READ_CREDENTIAL,
    auditClass: "read",
    concealDenialAs: BANK_CONNECTION_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.BANK_TRANSACTION_CATEGORIES_SUGGEST]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.READ_BANK_CONNECTIONS,
      ),
      relationship("bank_connection", LEDGER_RELATIONSHIPS.READ_CONTENTS),
      relationship("bank_connection", LEDGER_RELATIONSHIPS.WRITE_AI),
    ],
    credential: BANK_TRANSACTION_READ_CREDENTIAL,
    auditClass: "read",
    concealDenialAs: BANK_CONNECTION_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.BANK_ACCOUNT_MAPPING_SUGGEST]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.READ_BANK_CONNECTIONS,
      ),
      relationship("bank_connection", LEDGER_RELATIONSHIPS.READ_CONTENTS),
      relationship("bank_connection", LEDGER_RELATIONSHIPS.WRITE_AI),
    ],
    credential: BANK_TRANSACTION_READ_CREDENTIAL,
    auditClass: "read",
    concealDenialAs: BANK_CONNECTION_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.BANK_TRANSACTIONS_SYNC]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.WRITE_BANK_CONNECTIONS,
      ),
      relationship("bank_connection", LEDGER_RELATIONSHIPS.WRITE_CONTENTS),
    ],
    credential: BANK_TRANSACTION_WRITE_CREDENTIAL,
    auditClass: "write",
    concealDenialAs: BANK_CONNECTION_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.BANK_TRANSACTIONS_SUBMIT]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.WRITE_BANK_CONNECTIONS,
      ),
      relationship("bank_connection", LEDGER_RELATIONSHIPS.WRITE_CONTENTS),
    ],
    credential: BANK_TRANSACTION_WRITE_CREDENTIAL,
    auditClass: "write",
    concealDenialAs: BANK_CONNECTION_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.BANK_TRANSACTIONS_DELETE]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.WRITE_BANK_CONNECTIONS,
      ),
      relationship("bank_connection", LEDGER_RELATIONSHIPS.WRITE_CONTENTS),
    ],
    credential: BANK_TRANSACTION_WRITE_CREDENTIAL,
    auditClass: "write",
    concealDenialAs: BANK_CONNECTION_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.BANK_WEBHOOK_ITEM_APPLY]: {
    relationships: [
      relationship(
        "bank_connection",
        LEDGER_RELATIONSHIPS.WRITE_BANK_CONNECTIONS,
      ),
    ],
    credential: BANK_WEBHOOK_CREDENTIAL,
    auditClass: "write",
    concealDenialAs: BANK_CONNECTION_CONCEALMENT,
  },
};

/** Used by surface-parity accounting without duplicating credential policy. */
export const authorizationActionAcceptsDelegatedCredential = (
  action: AuthorizationAction,
): boolean =>
  ACTION_REQUIREMENTS[action].credential.methods.some(
    (method) => method !== "session",
  );

const isAuthorizationAction = (action: string): action is AuthorizationAction =>
  Object.prototype.hasOwnProperty.call(ACTION_REQUIREMENTS, action);

const credentialDenial = (
  principal: AuthorizationPrincipal,
  requirement: CredentialRequirement,
  resource?: { type: AuthorizationResourceType; id: string },
): string | undefined => {
  if (isTrustedAnonymousPrincipal(principal)) {
    return requirement.allowAnonymous ? undefined : "Authentication required";
  }
  if (isTrustedPlaidBackgroundPrincipal(principal)) {
    return requirement.backgroundProvenance?.includes(principal.provenance)
      ? undefined
      : "This background invocation cannot perform this operation";
  }
  const identity = principal;
  if (!identityAssuranceIsValid(identity) || !identityUserId(identity)) {
    return "Authorization denied";
  }
  if (!requirement.methods.includes(identity.method)) {
    const configuredMessage =
      requirement.denyMessageByMethod?.[identity.method];
    if (configuredMessage) return configuredMessage;
    if (
      requirement.methods.length === 1 &&
      requirement.methods[0] === "session"
    ) {
      return "This operation is reachable only from a browser session";
    }
    return "This credential type cannot perform this operation";
  }
  if (
    requirement.capability !== undefined &&
    !identityHasCapability(identity, requirement.capability)
  ) {
    return `This operation requires the "ledger.${requirement.capability}" scope`;
  }
  if (
    requirement.enforceLedgerScope &&
    (resource === undefined ||
      (resource.type !== "ledger" && resource.type !== "bank_connection") ||
      !identityAllowsLedgerScope(
        identity,
        resource.type === "bank_connection"
          ? (parseBankConnectionResource(`bank_connection:${resource.id}`)
              ?.ledgerId ?? "")
          : resource.id,
      ))
  ) {
    return "This credential is not authorized for this ledger";
  }
  return undefined;
};

export class AuthorizationDeniedError extends DomainError {
  constructor(decision: Extract<AuthorizationDecision, { allowed: false }>) {
    const requirement = isAuthorizationAction(decision.action)
      ? ACTION_REQUIREMENTS[decision.action]
      : undefined;
    const concealment = requirement?.concealDenialAs;
    const concealed =
      concealment?.reasons.includes(decision.reason) &&
      (!concealment.resourceTypes ||
        (decision.failedResourceType !== undefined &&
          concealment.resourceTypes.includes(decision.failedResourceType)))
        ? concealment
        : undefined;
    const parsedResource =
      typeof decision.resource === "string"
        ? parseAuthorizationResource(decision.resource)
        : undefined;
    super(
      concealed?.category ?? ErrorCategory.FORBIDDEN,
      concealed?.message ?? decision.message,
      {
        action: decision.action,
        ...(parsedResource?.type !== "temp_asset" && parsedResource
          ? { resource: decision.resource }
          : {}),
        reason: decision.reason,
        ...(decision.failedResourceType && {
          resourceType: decision.failedResourceType,
        }),
      },
    );
  }
}

export class AuthorizationUnavailableError extends DomainError {
  constructor(action: string) {
    super(
      ErrorCategory.SERVICE_UNAVAILABLE,
      "Authorization relationship source unavailable",
      { action },
    );
  }
}

export interface IAuthorizationService {
  authorize(input: AuthorizeInput): Promise<AuthorizationDecision>;
  authorizeOrThrow(
    input: AuthorizeInput,
  ): Promise<Extract<AuthorizationDecision, { allowed: true }>>;
}

export interface AuthorizationAuditRecord {
  readonly action: string;
  readonly outcome: Extract<AuditOutcome, "allowed" | "denied" | "error">;
  /** Validated target ledger; falls back to a credential pin when absent. */
  readonly ledgerId?: string;
}

export type AuthorizationAuditHook = (
  principal: AuthorizationPrincipal,
  record: AuthorizationAuditRecord,
  auditClass: AuditClass | undefined,
) => void;

const emitAuthorizationAudit: AuthorizationAuditHook = (
  principal,
  record,
  auditClass,
) => {
  if (!shouldAudit(record.outcome, auditClass ?? "read")) return;
  emitAuditEvent({
    op: getOperationId() ?? record.action,
    ...(isTrustedPlaidBackgroundPrincipal(principal)
      ? { userId: principal.userId, method: principal.provenance }
      : isTrustedAnonymousPrincipal(principal)
        ? { userId: undefined, method: undefined }
        : auditSubject(principal)),
    ledgerId:
      record.ledgerId ??
      (isTrustedPlaidBackgroundPrincipal(principal) ||
      isTrustedAnonymousPrincipal(principal)
        ? undefined
        : principal.ledgerScope),
    outcome: record.outcome,
    at: new Date(),
  });
};

export class AuthorizationService implements IAuthorizationService {
  constructor(
    private readonly relationships: IRelationshipEvaluator,
    private readonly audit: AuthorizationAuditHook = emitAuthorizationAudit,
  ) {}

  public authorize(input: AuthorizeInput): Promise<AuthorizationDecision> {
    return this.decide(input);
  }

  private async decide(input: AuthorizeInput): Promise<AuthorizationDecision> {
    const action = input.action as string;
    const deny = (
      reason: AuthorizationDenyReason,
      options: {
        message?: string;
        auditClass?: AuditClass;
        failedResourceType?: AuthorizationResourceType;
        ledgerId?: string;
      } = {},
    ): Extract<AuthorizationDecision, { allowed: false }> =>
      this.finish(
        input.principal,
        {
          allowed: false,
          action,
          resource: input.resource,
          reason,
          message: options.message ?? "Authorization denied",
          ...(options.failedResourceType && {
            failedResourceType: options.failedResourceType,
          }),
        },
        options.auditClass,
        options.ledgerId,
      );
    const requirement = isAuthorizationAction(action)
      ? ACTION_REQUIREMENTS[action]
      : undefined;
    if (!requirement) {
      return deny("unknown_action");
    }

    const resources = normalizeAuthorizationTarget(input.resource);
    const parsedResources = resources.map((raw) => ({
      raw,
      parsed: parseAuthorizationResource(raw),
    }));
    const requiredTypes = new Set(
      requirement.relationships.map(({ resourceType }) => resourceType),
    );
    const resourcesByType = new Map<
      AuthorizationResourceType,
      { raw: AuthorizationResource; id: string }
    >();
    for (const entry of parsedResources) {
      if (
        !entry.parsed ||
        !requiredTypes.has(entry.parsed.type) ||
        resourcesByType.has(entry.parsed.type)
      ) {
        return deny("unknown_resource", { auditClass: requirement.auditClass });
      }
      resourcesByType.set(entry.parsed.type, {
        raw: entry.raw,
        id: entry.parsed.id,
      });
    }
    if (resourcesByType.size !== requiredTypes.size) {
      return deny("unknown_resource", { auditClass: requirement.auditClass });
    }
    const ledger = resourcesByType.get("ledger");
    const bankConnection = resourcesByType.get("bank_connection");
    const parsedBankConnection = bankConnection
      ? parseBankConnectionResource(bankConnection.raw)
      : undefined;
    if (bankConnection && !parsedBankConnection) {
      return deny("unknown_resource", { auditClass: requirement.auditClass });
    }
    const auditLedgerId = ledger?.id ?? parsedBankConnection?.ledgerId;

    const credentialMessage = credentialDenial(
      input.principal,
      requirement.credential,
      ledger
        ? { type: "ledger", id: ledger.id }
        : bankConnection
          ? { type: "bank_connection", id: bankConnection.id }
          : undefined,
    );
    if (credentialMessage) {
      return deny("credential_not_permitted", {
        message: credentialMessage,
        auditClass: requirement.auditClass,
        ledgerId: auditLedgerId,
      });
    }

    if (
      !isTrustedAnonymousPrincipal(input.principal) &&
      !isTrustedPlaidBackgroundPrincipal(input.principal) &&
      auditLedgerId &&
      input.principal.ledgerScope &&
      input.principal.ledgerScope !== auditLedgerId
    ) {
      return deny("credential_not_permitted", {
        message:
          "Forbidden - this credential is not authorized for this ledger",
        auditClass: requirement.auditClass,
        failedResourceType: "ledger",
        ledgerId: auditLedgerId,
      });
    }

    const userId =
      isTrustedAnonymousPrincipal(input.principal) ||
      isTrustedPlaidBackgroundPrincipal(input.principal)
        ? input.principal.userId
        : identityUserId(input.principal);
    if (!userId) {
      return deny("credential_not_permitted", {
        auditClass: requirement.auditClass,
        ledgerId: auditLedgerId,
      });
    }

    const relationshipGroups = new Map<
      AuthorizationResource,
      {
        resourceType: AuthorizationResourceType;
        checks: RelationshipCheck[];
      }
    >();
    for (const relationshipRequirement of requirement.relationships) {
      const object = resourcesByType.get(relationshipRequirement.resourceType);
      const existing = relationshipGroups.get(object!.raw);
      const check: RelationshipCheck = {
        user: userResource(userId),
        relation: relationshipRequirement.relationship,
        object: object!.raw,
      };
      if (existing) {
        existing.checks.push(check);
      } else {
        relationshipGroups.set(object!.raw, {
          resourceType: relationshipRequirement.resourceType,
          checks: [check],
        });
      }
    }

    for (const group of relationshipGroups.values()) {
      let relationshipAllowed: boolean;
      try {
        if (this.relationships.checkAll) {
          relationshipAllowed = await this.relationships.checkAll(group.checks);
        } else {
          relationshipAllowed = true;
          for (const check of group.checks) {
            if (!(await this.relationships.check(check))) {
              relationshipAllowed = false;
              break;
            }
          }
        }
      } catch (error) {
        authorizationLogger.error("Relationship evaluation unavailable", {
          op: getOperationId() ?? action,
          action,
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        this.recordAudit(
          input.principal,
          {
            action,
            outcome: "error",
            ...(auditLedgerId && { ledgerId: auditLedgerId }),
          },
          requirement.auditClass,
        );
        throw new AuthorizationUnavailableError(action);
      }

      if (!relationshipAllowed) {
        return deny("relationship_denied", {
          auditClass: requirement.auditClass,
          failedResourceType: group.resourceType,
          ledgerId: auditLedgerId,
        });
      }
    }

    return this.finish(
      input.principal,
      { allowed: true, action: input.action, resource: input.resource },
      requirement.auditClass,
      auditLedgerId,
    );
  }

  private finish<TDecision extends AuthorizationDecision>(
    principal: AuthorizationPrincipal,
    decision: TDecision,
    auditClass?: AuditClass,
    ledgerId?: string,
  ): TDecision {
    this.recordAudit(
      principal,
      {
        action: decision.action,
        outcome: decision.allowed ? "allowed" : "denied",
        ...(ledgerId && { ledgerId }),
      },
      auditClass,
    );
    return decision;
  }

  private recordAudit(
    principal: AuthorizationPrincipal,
    record: AuthorizationAuditRecord,
    auditClass?: AuditClass,
  ): void {
    try {
      this.audit(principal, record, auditClass);
    } catch {
      // Auditing is observability, never an availability dependency.
    }
  }

  public async authorizeOrThrow(
    input: AuthorizeInput,
  ): Promise<Extract<AuthorizationDecision, { allowed: true }>> {
    const decision = await this.authorize(input);
    if (!decision.allowed) {
      if (isTrustedAnonymousPrincipal(input.principal)) {
        throw new UnauthenticatedError("Authentication required");
      }
      throw new AuthorizationDeniedError(decision);
    }
    return decision;
  }
}

function normalizeAuthorizationTarget(
  target: AuthorizationTarget,
): readonly AuthorizationResource[] {
  return typeof target === "string" ? [target] : target;
}
