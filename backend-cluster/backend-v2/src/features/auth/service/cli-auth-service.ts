import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { IModels } from "@/foundation/models";
import type { CliAuthSessionStatus } from "@/features/auth/data/cli-auth-session-model/types";
import {
  assertFirstPartyInteractiveIdentity,
  type Identity,
} from "@/server/api/identity";
import { BadUserInputError } from "@/shared/errors";

/** CLI auth sessions expire 10 minutes after creation. */
const SESSION_TTL_MINS = 10;

export interface ICliAuthService {
  createSession(): Promise<{ sessionId: string; expiresAt: string }>;
  authorizeSession(sessionId: string, identity: Identity): Promise<void>;
  denySession(sessionId: string, identity: Identity): Promise<void>;
  getSessionStatus(sessionId: string): Promise<CliAuthSessionStatus | null>;
  consumeSession(
    sessionId: string,
  ): Promise<{ token: string; expireAt: string }>;
}

/**
 * Cohesive service for the CLI device-authorization flow. Owns the business
 * rules around the `cliAuthSession` resource (status validation, JWT issuance)
 * so the resolver stays a thin transport layer that only maps to GraphQL types
 * (strict resolver→service→model boundary).
 */
export class CliAuthService implements ICliAuthService {
  constructor(
    private readonly models: Pick<IModels, "cliAuthSession" | "jwt">,
    private readonly postgresDb: NodePgDatabase,
  ) {}

  /**
   * Initiate a CLI auth session. Returns the sessionId the CLI polls plus the
   * session's expiry timestamp.
   */
  async createSession(): Promise<{ sessionId: string; expiresAt: string }> {
    const session = await this.models.cliAuthSession.createSession();
    const expiresAt = new Date(
      Date.now() + SESSION_TTL_MINS * 60 * 1000,
    ).toISOString();
    return { sessionId: session.id, expiresAt };
  }

  /**
   * Authorize a pending session from the exact first-party Dashboard identity:
   * issues a JWT and stores it in the session for the CLI to consume.
   */
  async authorizeSession(sessionId: string, identity: Identity): Promise<void> {
    assertFirstPartyInteractiveIdentity(
      identity,
      "Approving CLI authentication",
    );
    await this.assertPendingSession(sessionId);

    const { token, expireAt } = await this.models.jwt.create(
      this.postgresDb,
      identity.userId,
    );

    await this.models.cliAuthSession.authorize(
      sessionId,
      token,
      expireAt.toISOString(),
    );
  }

  /** Deny a pending session. */
  async denySession(sessionId: string, identity: Identity): Promise<void> {
    assertFirstPartyInteractiveIdentity(identity, "Denying CLI authentication");
    await this.assertPendingSession(sessionId);
    await this.models.cliAuthSession.deny(sessionId);
  }

  /**
   * Current status of a session, or `null` when it no longer exists (treated as
   * expired by the caller).
   */
  async getSessionStatus(
    sessionId: string,
  ): Promise<CliAuthSessionStatus | null> {
    const session = await this.models.cliAuthSession.findById(sessionId);
    return session?.status ?? null;
  }

  /**
   * Retrieve and consume the token from an authorized session. Single-use: the
   * token is cleared from the session after being returned.
   */
  async consumeSession(
    sessionId: string,
  ): Promise<{ token: string; expireAt: string }> {
    const session = await this.models.cliAuthSession.findById(sessionId);

    if (!session || session.status !== "authorized") {
      throw new BadUserInputError(
        "CLI auth session not found, already consumed, or not yet authorized",
      );
    }

    const original = await this.models.cliAuthSession.consume(sessionId);

    return {
      token: original!.token!,
      expireAt: original!.expireAt!,
    };
  }

  /**
   * Load a session and assert it is still pending; throws otherwise. Shared by
   * authorize/deny which both require a fresh pending session.
   */
  private async assertPendingSession(sessionId: string): Promise<void> {
    const session = await this.models.cliAuthSession.findById(sessionId);

    if (!session) {
      throw new BadUserInputError("CLI auth session not found or expired");
    }

    if (session.status !== "pending") {
      throw new BadUserInputError("CLI auth session has already been used");
    }
  }
}
