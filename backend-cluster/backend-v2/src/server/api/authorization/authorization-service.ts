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
  userResource,
  USER_RELATIONSHIPS,
  type AuthorizationAction,
  type AuthorizationDecision,
  type AuthorizationDenyReason,
  type AuthorizationResource,
  type AuthorizationResourceType,
  type AuthorizeInput,
  type LedgerRelationship,
  type UserRelationship,
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
  readonly category: ErrorCategory;
  readonly message: string;
}

type ActionRequirement = {
  readonly credential: CredentialRequirement;
  readonly auditClass: AuditClass;
  readonly concealDenialAs?: DenialConcealment;
} & (
  | { readonly resourceType: "user"; readonly relationship: UserRelationship }
  | {
      readonly resourceType: "api_key";
      readonly relationship: UserRelationship;
    }
  | {
      readonly resourceType: "ledger";
      readonly relationship: LedgerRelationship;
    }
);

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
const ACTION_REQUIREMENTS: Readonly<
  Record<AuthorizationAction, ActionRequirement>
> = {
  [AUTHORIZATION_ACTIONS.USER_PROFILE_READ]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.READ_PROFILE,
    credential: { methods: EVERY_CREDENTIAL, capability: "read" },
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.USER_PROFILE_SEARCH]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.READ_PROFILE,
    credential: { methods: SESSION_ONLY },
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.WRITE_PROFILE,
    credential: { methods: SESSION_ONLY },
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.USER_DELETE]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.WRITE_LIFECYCLE,
    credential: { methods: INTERACTIVE_OR_OAUTH },
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.USER_CREDENTIALS_LIST]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.READ_CREDENTIALS,
    credential: { methods: EVERY_CREDENTIAL, capability: "admin" },
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.USER_CREDENTIALS_CREATE]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.WRITE_CREDENTIALS,
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
    resourceType: "api_key",
    relationship: USER_RELATIONSHIPS.WRITE_CREDENTIALS,
    credential: { methods: EVERY_CREDENTIAL, capability: "admin" },
    auditClass: "admin",
    concealDenialAs: {
      reasons: ["relationship_denied", "unknown_resource"],
      category: ErrorCategory.NOT_FOUND,
      message: "API key not found",
    },
  },
  [AUTHORIZATION_ACTIONS.USER_BILLING_STATUS_READ]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.READ_BILLING,
    credential: BILLING_CREDENTIAL,
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.USER_BILLING_CHECKOUT_CREATE]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.WRITE_BILLING,
    credential: BILLING_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.USER_BILLING_PORTAL_CREATE]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.WRITE_BILLING,
    credential: BILLING_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_CANCEL]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.WRITE_BILLING,
    credential: BILLING_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_RESUME]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.WRITE_BILLING,
    credential: BILLING_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_UPGRADE]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.WRITE_BILLING,
    credential: BILLING_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.USER_SOCIAL_FEED_READ]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.READ_SOCIAL,
    credential: { methods: SESSION_ONLY },
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.USER_SOCIAL_FOLLOW_CREATE]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.WRITE_SOCIAL,
    credential: { methods: SESSION_ONLY },
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.USER_SOCIAL_FOLLOW_DELETE]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.WRITE_SOCIAL,
    credential: { methods: SESSION_ONLY },
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_STATUS_READ]: {
    resourceType: "ledger",
    relationship: LEDGER_RELATIONSHIPS.READ_CONTENTS,
    credential: LEDGER_SOCIAL_READ_CREDENTIAL,
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_CREATE]: {
    resourceType: "ledger",
    relationship: LEDGER_RELATIONSHIPS.READ_CONTENTS,
    credential: LEDGER_SOCIAL_WRITE_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_DELETE]: {
    resourceType: "ledger",
    relationship: LEDGER_RELATIONSHIPS.READ_CONTENTS,
    credential: LEDGER_SOCIAL_WRITE_CREDENTIAL,
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_CREATE]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.WRITE_LEDGERS,
    credential: USER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_ADMINISTRATION_UPDATE]: {
    resourceType: "ledger",
    relationship: LEDGER_RELATIONSHIPS.WRITE_ADMINISTRATION,
    credential: LEDGER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: LEDGER_NOT_FOUND_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.LEDGER_ADMINISTRATION_DELETE]: {
    resourceType: "ledger",
    relationship: LEDGER_RELATIONSHIPS.WRITE_ADMINISTRATION,
    credential: LEDGER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: LEDGER_NOT_FOUND_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_LIST]: {
    resourceType: "ledger",
    relationship: LEDGER_RELATIONSHIPS.READ_COLLABORATORS,
    credential: LEDGER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: LEDGER_NOT_FOUND_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_PERMISSION_READ]: {
    resourceType: "ledger",
    relationship: LEDGER_RELATIONSHIPS.READ_COLLABORATORS,
    credential: LEDGER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: LEDGER_NOT_FOUND_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_UPDATE]: {
    resourceType: "ledger",
    relationship: LEDGER_RELATIONSHIPS.WRITE_COLLABORATORS,
    credential: LEDGER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: LEDGER_NOT_FOUND_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_DELETE]: {
    resourceType: "ledger",
    relationship: LEDGER_RELATIONSHIPS.WRITE_COLLABORATORS,
    credential: LEDGER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: LEDGER_NOT_FOUND_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_LEAVE]: {
    resourceType: "ledger",
    relationship: LEDGER_RELATIONSHIPS.LEAVE,
    credential: LEDGER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
    concealDenialAs: LEDGER_NOT_FOUND_CONCEALMENT,
  },
  [AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_LIST]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.READ_PUBLIC_KEYS,
    credential: USER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_READ]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.READ_PUBLIC_KEYS,
    credential: USER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_CREATE]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.WRITE_PUBLIC_KEYS,
    credential: USER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_DELETE]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.WRITE_PUBLIC_KEYS,
    credential: USER_CONTROL_PLANE_CREDENTIAL,
    auditClass: "admin",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_READ]: {
    resourceType: "ledger",
    relationship: LEDGER_RELATIONSHIPS.READ,
    credential: {
      methods: EVERY_AUTHENTICATED_ACTOR,
      capability: "read",
    },
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_WRITE]: {
    resourceType: "ledger",
    relationship: LEDGER_RELATIONSHIPS.WRITE,
    credential: {
      methods: EVERY_AUTHENTICATED_ACTOR,
      capability: "write",
    },
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.LEDGER_ADMIN]: {
    resourceType: "ledger",
    relationship: LEDGER_RELATIONSHIPS.ADMIN,
    credential: {
      methods: EVERY_AUTHENTICATED_ACTOR,
      capability: "admin",
    },
    auditClass: "admin",
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
    const concealed = concealment?.reasons.includes(decision.reason)
      ? concealment
      : undefined;
    super(
      concealed?.category ?? ErrorCategory.FORBIDDEN,
      concealed?.message ?? decision.message,
      {
        action: decision.action,
        resource: decision.resource,
        reason: decision.reason,
      },
    );
  }
}

class AuthorizationUnavailableError extends DomainError {
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
}

export type AuthorizationAuditHook = (
  principal: Identity,
  record: AuthorizationAuditRecord,
  auditClass: AuditClass | undefined,
  resource?: AuthorizationResource,
) => void;

const emitAuthorizationAudit: AuthorizationAuditHook = (
  principal,
  record,
  auditClass,
  resource,
) => {
  if (!shouldAudit(record.outcome, auditClass ?? "read")) return;
  const parsedResource = resource
    ? parseAuthorizationResource(resource)
    : undefined;
  emitAuditEvent({
    op: getOperationId() ?? record.action,
    ...auditSubject(principal),
    ledgerId:
      parsedResource?.type === "ledger"
        ? parsedResource.id
        : principal.ledgerScope,
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
    let auditResource: AuthorizationResource | undefined;
    const deny = (
      reason: AuthorizationDenyReason,
      options: { message?: string; auditClass?: AuditClass } = {},
    ): Extract<AuthorizationDecision, { allowed: false }> =>
      this.finish(
        input.principal,
        {
          allowed: false,
          action,
          resource: input.resource,
          reason,
          message: options.message ?? "Authorization denied",
        },
        options.auditClass,
        auditResource,
      );
    const requirement = isAuthorizationAction(action)
      ? ACTION_REQUIREMENTS[action]
      : undefined;
    if (!requirement) {
      return deny("unknown_action");
    }

    const resource = parseAuthorizationResource(input.resource);
    if (resource?.type === "ledger" && requirement.resourceType === "ledger") {
      auditResource = input.resource;
    }
    if (!resource || resource.type !== requirement.resourceType) {
      return deny("unknown_resource", { auditClass: requirement.auditClass });
    }

    const credentialMessage = credentialDenial(
      input.principal,
      requirement.credential,
      resource,
    );
    if (credentialMessage) {
      return deny("credential_not_permitted", {
        message: credentialMessage,
        auditClass: requirement.auditClass,
      });
    }

    if (
      resource.type === "ledger" &&
      input.principal.ledgerScope &&
      input.principal.ledgerScope !== resource.id
    ) {
      return deny("credential_not_permitted", {
        message: "This credential is not authorized for this ledger",
        auditClass: requirement.auditClass,
      });
    }

    const userId = identityUserId(input.principal);
    if (!userId) {
      return deny("credential_not_permitted", {
        auditClass: requirement.auditClass,
      });
    }

    let relationshipAllowed: boolean;
    try {
      relationshipAllowed = await this.relationships.check({
        user: userResource(userId),
        relation: requirement.relationship,
        object: input.resource,
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
        { action, outcome: "error" },
        requirement.auditClass,
        auditResource,
      );
      throw new AuthorizationUnavailableError(action);
    }

    if (!relationshipAllowed) {
      return deny("relationship_denied", {
        auditClass: requirement.auditClass,
      });
    }

    return this.finish(
      input.principal,
      { allowed: true, action: input.action, resource: input.resource },
      requirement.auditClass,
      auditResource,
    );
  }

  private finish<TDecision extends AuthorizationDecision>(
    principal: Identity,
    decision: TDecision,
    auditClass?: AuditClass,
    resource?: AuthorizationResource,
  ): TDecision {
    this.recordAudit(
      principal,
      {
        action: decision.action,
        outcome: decision.allowed ? "allowed" : "denied",
      },
      auditClass,
      resource,
    );
    return decision;
  }

  private recordAudit(
    principal: Identity,
    record: AuthorizationAuditRecord,
    auditClass?: AuditClass,
    resource?: AuthorizationResource,
  ): void {
    try {
      if (resource) {
        this.audit(principal, record, auditClass, resource);
      } else {
        this.audit(principal, record, auditClass);
      }
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
