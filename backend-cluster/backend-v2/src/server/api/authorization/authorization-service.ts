import type { Identity } from "@/server/api/identity";
import { DomainError, ErrorCategory } from "@/shared/errors";

export const USER_DELETE_ACTION = "user.delete" as const;
const USER_DELETE_RELATION = "can_write_lifecycle" as const;

export function userResource(userId: string): `user:${string}` {
  return `user:${userId}`;
}

export type AuthorizationDenyReason =
  | "unknown_action"
  | "credential_not_permitted"
  | "relationship_denied"
  | "relationship_unavailable";

export type AuthorizationDecision =
  | { allowed: true; action: typeof USER_DELETE_ACTION; resource: string }
  | {
      allowed: false;
      action: string;
      resource: string;
      reason: AuthorizationDenyReason;
    };

export interface AuthorizeInput {
  principal: Identity;
  action: string;
  resource: string;
}

export interface IRelationshipEvaluator {
  check(input: {
    user: string;
    relation: string;
    object: string;
  }): Promise<boolean>;
}

/** Local exact-self adapter until ADR 0010 calls for an OpenFGA runtime. */
export class LocalRelationshipEvaluator implements IRelationshipEvaluator {
  public async check(input: {
    user: string;
    relation: string;
    object: string;
  }): Promise<boolean> {
    return (
      input.relation === USER_DELETE_RELATION && input.user === input.object
    );
  }
}

export class AuthorizationDeniedError extends DomainError {
  constructor(decision: Extract<AuthorizationDecision, { allowed: false }>) {
    super(ErrorCategory.FORBIDDEN, "Authorization denied", {
      action: decision.action,
      resource: decision.resource,
      reason: decision.reason,
    });
  }
}

export interface IAuthorizationService {
  authorize(input: AuthorizeInput): Promise<AuthorizationDecision>;
  authorizeOrThrow(input: AuthorizeInput): Promise<void>;
}

export class AuthorizationService implements IAuthorizationService {
  constructor(
    private readonly relationships: IRelationshipEvaluator = new LocalRelationshipEvaluator(),
  ) {}

  public async authorize(
    input: AuthorizeInput,
  ): Promise<AuthorizationDecision> {
    if (input.action !== USER_DELETE_ACTION) {
      return {
        allowed: false,
        action: input.action,
        resource: input.resource,
        reason: "unknown_action",
      };
    }

    // API keys are delegated automation credentials. Account lifecycle remains
    // available only to an interactive session or an OAuth user credential.
    if (input.principal.method === "apikey") {
      return {
        allowed: false,
        action: USER_DELETE_ACTION,
        resource: input.resource,
        reason: "credential_not_permitted",
      };
    }

    let relationshipAllowed: boolean;
    try {
      relationshipAllowed = await this.relationships.check({
        user: userResource(input.principal.userId),
        relation: USER_DELETE_RELATION,
        object: input.resource,
      });
    } catch {
      return {
        allowed: false,
        action: USER_DELETE_ACTION,
        resource: input.resource,
        reason: "relationship_unavailable",
      };
    }

    if (!relationshipAllowed) {
      return {
        allowed: false,
        action: USER_DELETE_ACTION,
        resource: input.resource,
        reason: "relationship_denied",
      };
    }
    return {
      allowed: true,
      action: USER_DELETE_ACTION,
      resource: input.resource,
    };
  }

  public async authorizeOrThrow(input: AuthorizeInput): Promise<void> {
    const decision = await this.authorize(input);
    if (!decision.allowed) throw new AuthorizationDeniedError(decision);
  }
}
