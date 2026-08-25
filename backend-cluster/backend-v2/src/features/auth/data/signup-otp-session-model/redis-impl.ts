import type { Cache } from "cache-manager";
import { randomInt } from "node:crypto";
import { nanoid } from "nanoid";
import { getExpireEpochMins } from "@/shared/expire-epoch";
import { CACHE_KEYS } from "@/shared/cache";
import {
  createRedisRecordStore,
  type RedisRecordStore,
} from "@/shared/redis-record-store";
import {
  SignupOtpSession,
  CreateSessionInput,
  ISignupOtpSessionModel,
} from "./types";

type Opts = {
  cache: Cache;
};

/** Generate a six-digit OTP code with a cryptographically secure PRNG. */
export function generateSignupOtp(): string {
  return randomInt(100_000, 1_000_000).toString();
}

export class SignupOtpSessionRedisModel implements ISignupOtpSessionModel {
  // Strict Redis-backed store: a dropped session write must surface (not fail open).
  private store: RedisRecordStore;

  constructor({ cache }: Opts) {
    this.store = createRedisRecordStore(cache);
  }

  /**
   * Create a new signup OTP session.
   * Deletes the existing session for the same email before creating a new one.
   *
   * Key naming strategy (see CACHE_KEYS.auth):
   * - auth:signup_otp_session:id:{sessionId} - Stores SignupOtpSession JSON with TTL
   * - auth:signup_otp_session:email:{email} - Single session ID for email (one-to-one)
   */
  public async createSession(
    sessionData: CreateSessionInput,
    expMins: number = 10,
  ): Promise<SignupOtpSession> {
    // 1. Delete all existing sessions for this email
    await this.deleteByEmail(sessionData.email);

    // 2. Generate session ID and OTP
    const id = nanoid();
    const otp = generateSignupOtp();
    const expireAt = new Date(getExpireEpochMins(expMins));

    // 3. Create session data
    const session: SignupOtpSession = {
      id,
      email: sessionData.email,
      password: sessionData.password,
      firstName: sessionData.firstName,
      lastName: sessionData.lastName,
      username: sessionData.username ?? null,
      ip: sessionData.ip,
      withDefaultLedger: sessionData.withDefaultLedger ?? false,
      otp,
      expireAt: expireAt.toISOString(),
    };

    // 4. Store session with TTL (in milliseconds)
    const ttlMs = expMins * 60 * 1000;
    await this.store.putRecord(
      CACHE_KEYS.auth.signupOtpSessionById(id),
      session,
      ttlMs,
    );

    // 5. Store email->session mapping (one-to-one)
    await this.store.putRaw(
      CACHE_KEYS.auth.signupOtpSessionByEmail(sessionData.email),
      id,
      ttlMs,
    );

    return session;
  }

  /**
   * Get session by ID without verifying OTP (for validation purposes).
   * Returns the session data if found, null otherwise.
   */
  public async getSessionById(
    sessionId: string,
  ): Promise<SignupOtpSession | null> {
    return this.store.getRecord<SignupOtpSession>(
      CACHE_KEYS.auth.signupOtpSessionById(sessionId),
    );
  }

  /**
   * Get session by email using the email→sessionId mapping.
   */
  public async getSessionByEmail(
    email: string,
  ): Promise<SignupOtpSession | null> {
    const sessionId = await this.store.getRaw(
      CACHE_KEYS.auth.signupOtpSessionByEmail(email),
    );
    if (!sessionId) return null;
    return this.getSessionById(sessionId);
  }

  /**
   * Delete session by ID.
   */
  public async deleteSessionById(sessionId: string): Promise<void> {
    const session = await this.getSessionById(sessionId);

    if (!session) return;

    // Delete session
    await this.store.deleteRecord(
      CACHE_KEYS.auth.signupOtpSessionById(sessionId),
    );

    // Delete email->session mapping (one-to-one)
    await this.store.deleteRecord(
      CACHE_KEYS.auth.signupOtpSessionByEmail(session.email),
    );
  }

  /**
   * Delete the session for a specific email.
   */
  public async deleteByEmail(email: string): Promise<void> {
    const emailKey = CACHE_KEYS.auth.signupOtpSessionByEmail(email);
    const existingSession = await this.store.getRaw(emailKey);

    if (!existingSession) return;

    // Delete the session key
    await this.store.deleteRecord(
      CACHE_KEYS.auth.signupOtpSessionById(existingSession),
    );

    // Delete email mapping
    await this.store.deleteRecord(emailKey);
  }
}
