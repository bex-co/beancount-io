import type { AppConfig } from "@/config/config";
import type { DatabaseLayer } from "@/foundation/composition";
import {
  type Identity,
  identityAssurance,
  identityCapabilityScopes,
  resolveIdentity,
} from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  type IAuthorizationService,
  userResource,
} from "@/server/api/authorization";

/**
 * RFC 7662 token introspection over all three of our credential kinds
 * (ADR 0017).
 *
 * The whole of the resolution work is `resolveIdentity` — the same seam every
 * request authenticates through, which is the point. An introspection endpoint
 * that resolved credentials its own way would be a second opinion about who is
 * authenticated, free to drift from the one that actually admits requests, and
 * wrong in exactly the cases anyone would call it about.
 */
export interface IntrospectionResult {
  /** RFC 7662 §2.2. False carries nothing else; see `INACTIVE`. */
  active: boolean;
  sub?: string;
  /** Effective operation classes, in the API scope vocabulary. See D3. */
  scope?: string;
  client_id?: string;
  jti?: string;
  iat?: number;
  exp?: number;
  /** Which kind of credential this is — `session`, `oauth`, or `apikey`. */
  bio_credential_kind?: string;
  /** How the holder authenticated: interactive, delegated, or workload. */
  bio_assurance?: string;
  /** The single ledger this credential may touch, when it is confined. */
  bio_ledger_scope?: string;
}

/**
 * The only answer for a token that is not usable by this caller.
 *
 * Expired, malformed, revoked, never-issued, and belonging to someone else all
 * land here and are indistinguishable. `resolveIdentity` already refuses to
 * distinguish its failure modes; this preserves that rather than re-deriving
 * detail it deliberately discarded.
 */
const INACTIVE: IntrospectionResult = { active: false };

export interface IntrospectTokenInput {
  token: string;
  /** RFC 7662 §2.1. Accepted and ignored — see ADR 0017 D5. */
  token_type_hint?: string;
}

export interface ITokenIntrospectionService {
  introspect(
    identity: Identity,
    input: IntrospectTokenInput,
  ): Promise<IntrospectionResult>;
}

export interface TokenIntrospectionServiceDeps {
  database: DatabaseLayer;
  config: AppConfig;
  authorization: IAuthorizationService;
}

export class TokenIntrospectionService implements ITokenIntrospectionService {
  constructor(private readonly deps: TokenIntrospectionServiceDeps) {}

  async introspect(
    identity: Identity,
    input: IntrospectTokenInput,
  ): Promise<IntrospectionResult> {
    // The caller's own authority first, before the submitted token is looked
    // at at all. A caller who fails this gets an authorization error, never
    // `{active: false}` — the latter would mean the endpoint answers to
    // anyone, and an attacker would read it as "not live" and keep probing
    // (ADR 0017 D6).
    await this.deps.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_INTROSPECT,
      resource: userResource(identity.userId),
    });

    const subject = await resolveIdentity(
      { headers: { authorization: `Bearer ${input.token}` } },
      this.deps.database,
      this.deps.config,
      // Asking about a key is not that key doing work (ADR 0017 D8).
      { recordUsage: false },
    );

    if (!subject) return INACTIVE;

    // You may introspect your own credentials, and only your own (D2). Without
    // this, any caller could probe whether a captured token is live and learn
    // when it was revoked — a cross-tenant oracle. Same answer as invalid, so
    // the two cannot be told apart.
    if (subject.userId !== identity.userId) return INACTIVE;

    return {
      active: true,
      sub: subject.userId,
      scope: identityCapabilityScopes(subject).join(" "),
      ...(subject.oauthClientId ? { client_id: subject.oauthClientId } : {}),
      ...(subject.tokenId ? { jti: subject.tokenId } : {}),
      ...(subject.issuedAt !== undefined ? { iat: subject.issuedAt } : {}),
      ...(subject.expiresAt !== undefined ? { exp: subject.expiresAt } : {}),
      bio_credential_kind: subject.method,
      bio_assurance: identityAssurance(subject).type,
      ...(subject.ledgerScope
        ? { bio_ledger_scope: subject.ledgerScope }
        : {}),
    };
  }
}
