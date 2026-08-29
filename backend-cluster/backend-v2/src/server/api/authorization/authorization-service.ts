import {
  identityHasCapability,
  type AuthMethod,
  type Identity,
  type OperationClass,
} from "@/server/api/identity";
import {
  auditSubject,
  emitAuditEvent,
  type AuditOutcome,
} from "@/server/api/audit";
import { DomainError, ErrorCategory } from "@/shared/errors";
import {
  AUTHORIZATION_ACTIONS,
  parseAuthorizationResource,
  userResource,
  USER_RELATIONSHIPS,
  type AuthorizationAction,
  type AuthorizationDecision,
  type AuthorizationResourceType,
  type AuthorizeInput,
  type UserRelationship,
} from "./authorization-contract";
import {
  ExactSelfRelationshipEvaluator,
  type IRelationshipEvaluator,
} from "./source-backed-relationship-evaluator";

type CredentialRequirement = {
  readonly methods: readonly AuthMethod[];
  readonly capability?: OperationClass;
};

interface ActionRequirement {
  readonly resourceType: AuthorizationResourceType;
  readonly relationship: UserRelationship;
  readonly credential: CredentialRequirement;
  readonly auditClass: "read" | "write";
}

const EVERY_CREDENTIAL = ["session", "oauth", "apikey"] as const;
const INTERACTIVE_OR_OAUTH = ["session", "oauth"] as const;
const SESSION_ONLY = ["session"] as const;

/** The one executable policy catalog for the migrated user domain. */
const ACTION_REQUIREMENTS = {
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
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.USER_CREDENTIALS_LIST]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.READ_CREDENTIALS,
    credential: { methods: EVERY_CREDENTIAL, capability: "admin" },
    auditClass: "read",
  },
  [AUTHORIZATION_ACTIONS.USER_CREDENTIALS_CREATE]: {
    resourceType: "user",
    relationship: USER_RELATIONSHIPS.WRITE_CREDENTIALS,
    credential: { methods: INTERACTIVE_OR_OAUTH, capability: "admin" },
    auditClass: "write",
  },
  [AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE]: {
    resourceType: "api_key",
    relationship: USER_RELATIONSHIPS.WRITE_CREDENTIALS,
    credential: { methods: EVERY_CREDENTIAL, capability: "admin" },
    auditClass: "write",
  },
} as const satisfies Record<AuthorizationAction, ActionRequirement>;

/** Used by surface-parity accounting without duplicating credential policy. */
export const authorizationActionAcceptsDelegatedCredential = (
  action: AuthorizationAction,
): boolean =>
  ACTION_REQUIREMENTS[action].credential.methods.some(
    (method) => method !== "session",
  );

const isAuthorizationAction = (action: string): action is AuthorizationAction =>
  Object.prototype.hasOwnProperty.call(ACTION_REQUIREMENTS, action);

const credentialAllows = (
  identity: Identity,
  requirement: CredentialRequirement,
): boolean => {
  // Preserve provenance: only a real session is capability-exempt, and every
  // delegated credential is scope-constrained. A malformed envelope fails
  // closed instead of turning `capabilityExempt` into a privilege bit.
  if (identity.capabilityExempt !== (identity.method === "session")) {
    return false;
  }
  return (
    requirement.methods.includes(identity.method) &&
    (requirement.capability === undefined ||
      identityHasCapability(identity, requirement.capability))
  );
};

export class AuthorizationDeniedError extends DomainError {
  constructor(decision: Extract<AuthorizationDecision, { allowed: false }>) {
    const concealedApiKey =
      decision.action === AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE &&
      decision.reason === "relationship_denied";
    super(
      concealedApiKey ? ErrorCategory.NOT_FOUND : ErrorCategory.FORBIDDEN,
      concealedApiKey ? "API key not found" : "Authorization denied",
      {
        action: decision.action,
        resource: decision.resource,
        reason: decision.reason,
      },
    );
  }
}

export interface IAuthorizationService {
  authorize(input: AuthorizeInput): Promise<AuthorizationDecision>;
  authorizeOrThrow(
    input: AuthorizeInput,
  ): Promise<Extract<AuthorizationDecision, { allowed: true }>>;
}

export type AuthorizationAuditHook = (
  identity: Identity,
  decision: AuthorizationDecision,
  auditClass: "read" | "write" | undefined,
) => void;

const emitAuthorizationAudit: AuthorizationAuditHook = (
  identity,
  decision,
  auditClass,
) => {
  if (decision.allowed && auditClass === "read") return;
  const outcome: AuditOutcome = decision.allowed ? "allowed" : "denied";
  emitAuditEvent({
    op: `AUTHZ ${decision.action}`,
    ...auditSubject(identity),
    outcome,
    at: new Date(),
  });
};

export class AuthorizationService implements IAuthorizationService {
  constructor(
    private readonly relationships: IRelationshipEvaluator = new ExactSelfRelationshipEvaluator(),
    private readonly audit: AuthorizationAuditHook = emitAuthorizationAudit,
  ) {}

  public authorize(input: AuthorizeInput): Promise<AuthorizationDecision> {
    const memoKey = `${input.action}\u0000${input.resource}`;
    return input.request.decisionFor(memoKey, () => this.decide(input));
  }

  private async decide(input: AuthorizeInput): Promise<AuthorizationDecision> {
    const action = input.action as string;
    const requirement = isAuthorizationAction(action)
      ? ACTION_REQUIREMENTS[action]
      : undefined;
    if (!requirement) {
      return this.finish(input.request.principal, {
        allowed: false,
        action,
        resource: input.resource,
        reason: "unknown_action",
      });
    }

    const resource = parseAuthorizationResource(input.resource);
    if (!resource || resource.type !== requirement.resourceType) {
      return this.finish(
        input.request.principal,
        {
          allowed: false,
          action,
          resource: input.resource,
          reason: "unknown_resource",
        },
        requirement.auditClass,
      );
    }

    if (!credentialAllows(input.request.principal, requirement.credential)) {
      return this.finish(
        input.request.principal,
        {
          allowed: false,
          action,
          resource: input.resource,
          reason: "credential_not_permitted",
        },
        requirement.auditClass,
      );
    }

    let relationshipAllowed: boolean;
    try {
      relationshipAllowed = await this.relationships.check({
        user: userResource(input.request.principal.userId),
        relation: requirement.relationship,
        object: input.resource,
      });
    } catch {
      return this.finish(
        input.request.principal,
        {
          allowed: false,
          action,
          resource: input.resource,
          reason: "relationship_unavailable",
        },
        requirement.auditClass,
      );
    }

    if (!relationshipAllowed) {
      return this.finish(
        input.request.principal,
        {
          allowed: false,
          action,
          resource: input.resource,
          reason: "relationship_denied",
        },
        requirement.auditClass,
      );
    }

    return this.finish(
      input.request.principal,
      { allowed: true, action: input.action, resource: input.resource },
      requirement.auditClass,
    );
  }

  private finish<TDecision extends AuthorizationDecision>(
    identity: Identity,
    decision: TDecision,
    auditClass?: "read" | "write",
  ): TDecision {
    try {
      this.audit(identity, decision, auditClass);
    } catch {
      // Auditing is observability, never an availability dependency.
    }
    return decision;
  }

  public async authorizeOrThrow(
    input: AuthorizeInput,
  ): Promise<Extract<AuthorizationDecision, { allowed: true }>> {
    const decision = await this.authorize(input);
    if (!decision.allowed) throw new AuthorizationDeniedError(decision);
    return decision;
  }
}
