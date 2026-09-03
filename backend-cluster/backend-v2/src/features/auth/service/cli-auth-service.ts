import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { IModels } from "@/foundation/models";
import type {
  CliAuthClientInfo,
  CliAuthSession,
  CliAuthSessionStatus,
} from "@/features/auth/data/cli-auth-session-model/types";
import {
  deviceCodeDigest,
  deviceCodeDigestsMatch,
  generateDeviceCode,
  generateUserCode,
  normalizeUserCode,
} from "@/features/auth/utils/cli-auth-codes";
import { incrementInWindow } from "@/foundation/redis/redis-counter";
import { CACHE_KEYS } from "@/shared/cache";
import { assertSessionIdentity, type Identity } from "@/server/api/identity";
import {
  BadUserInputError,
  RateLimitedError,
  ServiceUnavailableError,
} from "@/shared/errors";

/** CLI auth sessions expire 10 minutes after creation. */
const SESSION_TTL_MINS = 10;

/** How long an atomic claim on one session outlives the session itself. */
const CLAIM_TTL_MS = (SESSION_TTL_MINS + 5) * 60 * 1000;

/**
 * The CLI's credential lives 30 days, not the browser session's year.
 *
 * The ceremony's whole purpose is to hand a token to a machine that keeps it on
 * disk, where it is neither watched nor logged out of. A shorter life is the one
 * thing that bounds a token nobody notices has escaped.
 */
const CLI_TOKEN_TTL_MINS = 30 * 24 * 60;

/** Attempts to name a user code, per approving user, before we stop answering. */
const USER_CODE_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const USER_CODE_MAX_ATTEMPTS = 20;

/** Caps on the self-reported strings rendered on the consent screen. */
const CLIENT_NAME_MAX = 40;
const CLIENT_FIELD_MAX = 60;

export interface CliAuthClientInput {
  name?: string;
  version?: string;
  deviceLabel?: string;
  platform?: string;
}

export interface CreateCliAuthSessionResult {
  /** The CLI's private verifier. Returned once; only its digest is stored. */
  deviceCode: string;
  /** The short code the person enters in the browser. */
  userCode: string;
  expiresAt: string;
  pollIntervalSeconds: number;
}

/** What the browser consent screen is allowed to learn about a request. */
export interface CliAuthRequestView {
  status: CliAuthSessionStatus;
  client: CliAuthClientInfo;
  requestedAt: string;
  expiresAt: string;
}

export interface ICliAuthService {
  createSession(
    client: CliAuthClientInput,
    ipAddress?: string,
  ): Promise<CreateCliAuthSessionResult>;
  describeRequest(
    userCode: string,
    identity: Identity,
  ): Promise<CliAuthRequestView>;
  authorizeSession(userCode: string, identity: Identity): Promise<void>;
  denySession(userCode: string, identity: Identity): Promise<void>;
  getSessionStatus(deviceCode: string): Promise<CliAuthSessionStatus | null>;
  consumeSession(
    deviceCode: string,
  ): Promise<{ token: string; expireAt: string }>;
}

/**
 * The CLI device-authorization ceremony (RFC 8628 shaped).
 *
 * The rule the whole design turns on: **the value the browser sees never
 * redeems the credential.** The CLI keeps a 256-bit device code and polls and
 * redeems with that; the person gets a short user code, which names the request
 * on the consent screen and can do nothing else. Before this split, one
 * browser-visible session id both identified the request and redeemed its
 * token, so anyone who could get a signed-in user to open a link — or who
 * later read that link out of history, a referrer, or an analytics payload --
 * held the victim's session (2026 security review, finding 1).
 *
 * Approval is therefore not "the browser said yes to an id it was handed". It
 * is: a signed-in person names a code they read off their own terminal, sees
 * which device claims to be asking, and approves that request exactly once.
 */
export class CliAuthService implements ICliAuthService {
  constructor(
    private readonly models: Pick<IModels, "cliAuthSession" | "jwt">,
    private readonly postgresDb: NodePgDatabase,
  ) {}

  /**
   * Start a session. The device code is returned to the caller and immediately
   * forgotten by us — the CLI is the only holder from here on.
   */
  async createSession(
    client: CliAuthClientInput,
    ipAddress?: string,
  ): Promise<CreateCliAuthSessionResult> {
    const deviceCode = generateDeviceCode();
    const userCode = generateUserCode();

    const session = await this.models.cliAuthSession.createSession({
      deviceCodeDigest: deviceCodeDigest(deviceCode),
      userCode,
      client: describeClient(client, ipAddress),
    });

    return {
      deviceCode,
      userCode,
      expiresAt: expiresAt(session),
      pollIntervalSeconds: 2,
    };
  }

  /**
   * What the consent screen shows: who is asking, from where, and how they
   * describe themselves. Deliberately excludes the device code, the session id,
   * and the token — a browser that cannot learn those cannot leak them.
   */
  async describeRequest(
    userCode: string,
    identity: Identity,
  ): Promise<CliAuthRequestView> {
    assertSessionIdentity(identity, "Reviewing CLI authentication");
    const session = await this.findByUserCode(userCode, identity);

    return {
      status: session.status,
      client: session.client,
      requestedAt: session.createdAt,
      expiresAt: expiresAt(session),
    };
  }

  /**
   * Approve a request named by its user code: mint the CLI's token and store it
   * against the session, where only the matching device code can collect it.
   */
  async authorizeSession(userCode: string, identity: Identity): Promise<void> {
    assertSessionIdentity(identity, "Approving CLI authentication");
    const session = await this.findByUserCode(userCode, identity);
    assertPending(session);

    // Claim before minting: two clicks on Authorize must not put two live
    // one-month credentials into the world, only one of which is ever revoked.
    await this.claimOnce(
      CACHE_KEYS.auth.cliAuthApprovalClaim(session.id),
      "CLI authorization",
    );

    const { token, expireAt } = await this.models.jwt.create(
      this.postgresDb,
      identity.userId,
      CLI_TOKEN_TTL_MINS,
    );

    await this.models.cliAuthSession.authorize(
      session.id,
      token,
      expireAt.toISOString(),
      identity.userId,
    );
  }

  /** Deny a pending request named by its user code. */
  async denySession(userCode: string, identity: Identity): Promise<void> {
    assertSessionIdentity(identity, "Denying CLI authentication");
    const session = await this.findByUserCode(userCode, identity);
    assertPending(session);
    await this.models.cliAuthSession.deny(session.id);
  }

  /**
   * Status for the polling CLI, which proves it is the initiating device by
   * presenting the device code. `null` when no session answers to it — a wrong
   * code and an expired one are the same answer, so polling cannot be used to
   * discover that a session exists.
   */
  async getSessionStatus(
    deviceCode: string,
  ): Promise<CliAuthSessionStatus | null> {
    const session = await this.findByDeviceCode(deviceCode);
    return session?.status ?? null;
  }

  /**
   * Redeem the token. Single-use and bound to the verifier: the caller must
   * present the device code, and exactly one caller wins the claim.
   */
  async consumeSession(
    deviceCode: string,
  ): Promise<{ token: string; expireAt: string }> {
    const session = await this.findByDeviceCode(deviceCode);

    if (!session || session.status !== "authorized") {
      throw new BadUserInputError(
        "CLI auth session not found, already consumed, or not yet authorized",
      );
    }

    await this.claimOnce(
      CACHE_KEYS.auth.cliAuthRedemptionClaim(session.id),
      "CLI token redemption",
    );

    const original = await this.models.cliAuthSession.consume(session.id);

    if (!original?.token || !original.expireAt) {
      throw new BadUserInputError(
        "CLI auth session not found, already consumed, or not yet authorized",
      );
    }

    return { token: original.token, expireAt: original.expireAt };
  }

  /**
   * Resolve the session a device code addresses, verifying the digest in
   * constant time. Returns `null` for both "no such session" and "digest did
   * not match": the caller must not be able to tell them apart.
   */
  private async findByDeviceCode(
    deviceCode: string,
  ): Promise<CliAuthSession | null> {
    if (!deviceCode) return null;

    const digest = deviceCodeDigest(deviceCode);
    const session =
      await this.models.cliAuthSession.findByDeviceCodeDigest(digest);

    if (!session || !deviceCodeDigestsMatch(session.deviceCodeDigest, digest)) {
      return null;
    }

    return session;
  }

  /**
   * Resolve the session a person's typed code names, charging an attempt first.
   *
   * A user code is short by design, so the budget is what keeps it from being
   * guessable: it is spent on every lookup — malformed, missing, or found --
   * so a rejected guess is never a free one. Keyed on the approving user,
   * because that is the account a successful guess would spend, and the request
   * IP is client-controlled (2026 security review, finding 7).
   */
  private async findByUserCode(
    userCode: string,
    identity: Identity,
  ): Promise<CliAuthSession> {
    await this.consumeUserCodeAttempt(identity.userId);

    const normalized = normalizeUserCode(userCode);
    const session = normalized
      ? await this.models.cliAuthSession.findByUserCode(normalized)
      : null;

    if (!session) {
      throw new BadUserInputError("CLI auth session not found or expired");
    }

    return session;
  }

  private async consumeUserCodeAttempt(userId: string): Promise<void> {
    const attempt = await incrementInWindow(
      CACHE_KEYS.auth.cliAuthUserCodeAttemptsByUser(userId),
      USER_CODE_ATTEMPT_WINDOW_MS,
    );

    // Fail closed. This budget is the only thing standing between a short code
    // and an offline-speed guessing loop, and a CLI login is rare enough that
    // refusing one during a Redis outage costs less than not counting.
    if (!attempt) {
      throw new ServiceUnavailableError("CLI authorization");
    }

    if (attempt.count > USER_CODE_MAX_ATTEMPTS) {
      throw new RateLimitedError(
        Math.max(1, Math.ceil(attempt.resetInMs / 1000)),
        "Too many CLI authorization attempts. Start a new login from your terminal.",
      );
    }
  }

  /**
   * Win the single-use claim on `key`, or fail. `INCR` is atomic in Redis, so
   * exactly one caller sees `1` however many instances are asking — which is
   * what the read-then-write status check alone cannot promise.
   */
  private async claimOnce(key: string, action: string): Promise<void> {
    const claim = await incrementInWindow(key, CLAIM_TTL_MS);

    if (!claim) {
      throw new ServiceUnavailableError(action);
    }

    if (claim.count > 1) {
      throw new BadUserInputError("CLI auth session has already been used");
    }
  }
}

/** Assert a session is still pending; throws otherwise. */
function assertPending(session: CliAuthSession): void {
  if (session.status !== "pending") {
    throw new BadUserInputError("CLI auth session has already been used");
  }
}

/** When a session stops being usable, derived from the one TTL that governs it. */
function expiresAt(session: CliAuthSession): string {
  return new Date(
    new Date(session.createdAt).getTime() + SESSION_TTL_MINS * 60 * 1000,
  ).toISOString();
}

/**
 * Normalize what the CLI reported about itself into what we will show.
 *
 * This text is written by the party requesting access and rendered to the party
 * granting it, so it is bounded and stripped of control characters: a "client
 * name" carrying newlines and 300 characters of instructions is a consent
 * screen the requester gets to write.
 */
function describeClient(
  client: CliAuthClientInput,
  ipAddress?: string,
): CliAuthClientInfo {
  return {
    name: sanitize(client.name, CLIENT_NAME_MAX) ?? "Unidentified client",
    version: sanitize(client.version, CLIENT_FIELD_MAX),
    deviceLabel: sanitize(client.deviceLabel, CLIENT_FIELD_MAX),
    platform: sanitize(client.platform, CLIENT_FIELD_MAX),
    ipAddress: sanitize(ipAddress, CLIENT_FIELD_MAX),
  };
}

function sanitize(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;

  const printable = [...value]
    .map((character) => (isControlCharacter(character) ? " " : character))
    .join("");
  const cleaned = printable.trim().slice(0, max).trim();

  return cleaned ? cleaned : undefined;
}

/** C0 controls and DEL: newlines and escapes are how a label becomes a layout. */
function isControlCharacter(character: string): boolean {
  const code = character.codePointAt(0) ?? 0;
  return code < 0x20 || code === 0x7f;
}
