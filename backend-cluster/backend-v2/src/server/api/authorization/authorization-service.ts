import {
  identityHasCapability,
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
  parseAuthorizationResource,
  userResource,
  USER_RELATIONSHIPS,
  type AuthorizationAction,
  type AuthorizationDecision,
  type AuthorizationDenyReason,
  type AuthorizationResourceType,
  type AuthorizeInput,
  type UserRelationship,
} from "./authorization-contract";
import type { IRelationshipEvaluator } from "./source-backed-relationship-evaluator";

const authorizationLogger = logger.child({ module: "authorization" });

type CredentialRequirement = {
  readonly methods: readonly AuthMethod[];
  readonly capability?: OperationClass;
  readonly denyMessageByMethod?: Partial<Record<AuthMethod, string>>;
};

type AuditClass = "read" | "write" | "admin";

interface DenialConcealment {
  readonly reasons: readonly AuthorizationDenyReason[];
  readonly category: ErrorCategory;
  readonly message: string;
}

interface ActionRequirement {
  readonly resourceType: AuthorizationResourceType;
  readonly relationship: UserRelationship;
  readonly credential: CredentialRequirement;
  readonly auditClass: AuditClass;
  readonly concealDenialAs?: DenialConcealment;
}

const EVERY_CREDENTIAL = ["session", "oauth", "apikey"] as const;
const INTERACTIVE_OR_OAUTH = ["session", "oauth"] as const;
const SESSION_ONLY = ["session"] as const;

const BILLING_CREDENTIAL: CredentialRequirement = {
  methods: SESSION_ONLY,
  denyMessageByMethod: {
    oauth: "Managing billing requires a full signed-in session",
    apikey: "Managing billing requires a full signed-in session",
  },
};

/** The one executable policy catalog for the migrated user domain. */
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
): string | undefined => {
  // Preserve provenance: only a real session is capability-exempt, and every
  // delegated credential is scope-constrained. A malformed envelope fails
  // closed instead of turning `capabilityExempt` into a privilege bit.
  if (identity.capabilityExempt !== (identity.method === "session")) {
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
    ledgerId: principal.ledgerScope,
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
      );
    const requirement = isAuthorizationAction(action)
      ? ACTION_REQUIREMENTS[action]
      : undefined;
    if (!requirement) {
      return deny("unknown_action");
    }

    const resource = parseAuthorizationResource(input.resource);
    if (!resource || resource.type !== requirement.resourceType) {
      return deny("unknown_resource", { auditClass: requirement.auditClass });
    }

    const credentialMessage = credentialDenial(
      input.principal,
      requirement.credential,
    );
    if (credentialMessage) {
      return deny("credential_not_permitted", {
        message: credentialMessage,
        auditClass: requirement.auditClass,
      });
    }

    let relationshipAllowed: boolean;
    try {
      relationshipAllowed = await this.relationships.check({
        user: userResource(input.principal.userId),
        relation: requirement.relationship,
        object: input.resource,
      });
    } catch (error) {
      authorizationLogger.error("Relationship evaluation unavailable", {
        op: getOperationId() ?? action,
        action,
        userId: input.principal.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      this.recordAudit(
        input.principal,
        { action, outcome: "error" },
        requirement.auditClass,
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
    );
  }

  private finish<TDecision extends AuthorizationDecision>(
    principal: Identity,
    decision: TDecision,
    auditClass?: AuditClass,
  ): TDecision {
    this.recordAudit(
      principal,
      {
        action: decision.action,
        outcome: decision.allowed ? "allowed" : "denied",
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
