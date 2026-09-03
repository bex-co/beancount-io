import {
  identityAllowsLedgerScope,
  identityAssuranceIsValid,
  identityHasCapability,
  identityUserId,
  type AuthMethod,
  type Identity,
  type OperationClass,
} from "@/server/api/identity";
import {
  auditSubject,
  emitAuditEvent,
  shouldAudit,
  type AuditOutcome,
} from "@/server/api/audit";
import { DomainError, ErrorCategory } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { getOperationId } from "@/shared/async-context";
import {
  AUTHORIZATION_ACTIONS,
  LEDGER_RELATIONSHIPS,
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
} from "./authorization-contract";
import type { IRelationshipEvaluator } from "./source-backed-relationship-evaluator";

const authorizationLogger = logger.child({ module: "authorization" });

type CredentialRequirement = {
  readonly methods: readonly AuthMethod[];
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

const LEDGER_CONTROL_PLANE_CREDENTIAL: CredentialRequirement = {
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

/** The one executable policy catalog for migrated application domains. */
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
  [AUTHORIZATION_ACTIONS.LEDGER_READ]: {
    relationships: [relationship("ledger", LEDGER_RELATIONSHIPS.READ)],
    credential: {
      methods: EVERY_AUTHENTICATED_ACTOR,
      capability: "read",
    },
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_WRITE]: {
    relationships: [relationship("ledger", LEDGER_RELATIONSHIPS.WRITE)],
    credential: {
      methods: EVERY_AUTHENTICATED_ACTOR,
      capability: "write",
    },
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_ADMIN]: {
    relationships: [relationship("ledger", LEDGER_RELATIONSHIPS.ADMIN)],
    credential: {
      methods: EVERY_AUTHENTICATED_ACTOR,
      capability: "admin",
    },
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
  [AUTHORIZATION_ACTIONS.ASSISTED_BANK_CATEGORIES_SUGGEST]: {
    relationships: [
      relationship("ledger", LEDGER_RELATIONSHIPS.READ_CONTENTS),
      relationship("ledger", LEDGER_RELATIONSHIPS.READ_BANK_CONNECTIONS),
      relationship("ledger", LEDGER_RELATIONSHIPS.WRITE_AI),
    ],
    credential: { methods: EVERY_AUTHENTICATED_ACTOR, capability: "read" },
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.ASSISTED_BANK_ACCOUNT_MAPPING_SUGGEST]: {
    relationships: [
      relationship("ledger", LEDGER_RELATIONSHIPS.READ_CONTENTS),
      relationship("ledger", LEDGER_RELATIONSHIPS.READ_BANK_CONNECTIONS),
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
  identity: Identity,
  requirement: CredentialRequirement,
  resource?: { type: AuthorizationResourceType; id: string },
): string | undefined => {
  if (!identityAssuranceIsValid(identity)) {
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
    (resource?.type !== "ledger" ||
      !identityAllowsLedgerScope(identity, resource.id))
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
  principal: Identity,
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
    ...auditSubject(principal),
    ledgerId: record.ledgerId ?? principal.ledgerScope,
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
    const auditLedgerId = ledger?.id;

    const credentialMessage = credentialDenial(
      input.principal,
      requirement.credential,
      ledger ? { type: "ledger", id: ledger.id } : undefined,
    );
    if (credentialMessage) {
      return deny("credential_not_permitted", {
        message: credentialMessage,
        auditClass: requirement.auditClass,
        ledgerId: auditLedgerId,
      });
    }

    if (
      ledger &&
      input.principal.ledgerScope &&
      input.principal.ledgerScope !== ledger.id
    ) {
      return deny("credential_not_permitted", {
        message:
          "Forbidden - this credential is not authorized for this ledger",
        auditClass: requirement.auditClass,
        failedResourceType: "ledger",
        ledgerId: auditLedgerId,
      });
    }

    const userId = identityUserId(input.principal);
    if (!userId) {
      return deny("credential_not_permitted", {
        auditClass: requirement.auditClass,
        ledgerId: auditLedgerId,
      });
    }

    for (const relationshipRequirement of requirement.relationships) {
      const object = resourcesByType.get(relationshipRequirement.resourceType);
      let relationshipAllowed: boolean;
      try {
        relationshipAllowed = await this.relationships.check({
          user: userResource(userId),
          relation: relationshipRequirement.relationship,
          object: object!.raw,
        });
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
          failedResourceType: relationshipRequirement.resourceType,
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
    principal: Identity,
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
    principal: Identity,
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
    if (!decision.allowed) throw new AuthorizationDeniedError(decision);
    return decision;
  }
}

function normalizeAuthorizationTarget(
  target: AuthorizationTarget,
): readonly AuthorizationResource[] {
  return typeof target === "string" ? [target] : target;
}
