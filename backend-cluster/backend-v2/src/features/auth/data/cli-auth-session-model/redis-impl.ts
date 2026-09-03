import type { Cache } from "cache-manager";
import { prefixedNanoidBase58 } from "@/shared/nanoid-base58";
import { CACHE_KEYS } from "@/shared/cache";
import {
  createRedisRecordStore,
  type RedisRecordStore,
} from "@/shared/redis-record-store";
import {
  CliAuthSession,
  CreateCliAuthSessionInput,
  ICliAuthSessionModel,
} from "./types";

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

type Opts = {
  cache: Cache;
};

/**
 * Redis-backed store for in-flight CLI device-authorization sessions.
 *
 * One record, addressed three ways: by its own id, by the digest of the device
 * code (what the CLI presents), and by the user code (what the person types).
 * The two secondary keys are pointers, not copies — a session's state has one
 * home, so an approval cannot be visible through one lookup and stale through
 * another.
 */
export class CliAuthSessionRedisModel implements ICliAuthSessionModel {
  // Strict Redis-backed store: a dropped session write must surface (not fail open).
  private store: RedisRecordStore;

  constructor({ cache }: Opts) {
    this.store = createRedisRecordStore(cache);
  }

  private sessionKey(id: string): string {
    return CACHE_KEYS.auth.cliAuthSessionById(id);
  }

  public async createSession(
    input: CreateCliAuthSessionInput,
  ): Promise<CliAuthSession> {
    const id = prefixedNanoidBase58("clis_");
    const session: CliAuthSession = {
      id,
      status: "pending",
      deviceCodeDigest: input.deviceCodeDigest,
      userCode: input.userCode,
      client: input.client,
      createdAt: new Date().toISOString(),
    };

    await this.store.putRecord(this.sessionKey(id), session, SESSION_TTL_MS);
    // Pointers last: a dangling pointer resolves to nothing, while a record no
    // pointer reaches would be a session the CLI could never poll.
    await this.store.putRaw(
      CACHE_KEYS.auth.cliAuthSessionByDeviceDigest(input.deviceCodeDigest),
      id,
      SESSION_TTL_MS,
    );
    await this.store.putRaw(
      CACHE_KEYS.auth.cliAuthSessionByUserCode(input.userCode),
      id,
      SESSION_TTL_MS,
    );

    return session;
  }

  public async findById(id: string): Promise<CliAuthSession | null> {
    return this.store.getRecord<CliAuthSession>(this.sessionKey(id));
  }

  public async findByDeviceCodeDigest(
    digest: string,
  ): Promise<CliAuthSession | null> {
    return this.findByPointer(
      CACHE_KEYS.auth.cliAuthSessionByDeviceDigest(digest),
    );
  }

  public async findByUserCode(
    userCode: string,
  ): Promise<CliAuthSession | null> {
    return this.findByPointer(
      CACHE_KEYS.auth.cliAuthSessionByUserCode(userCode),
    );
  }

  public async authorize(
    id: string,
    token: string,
    expireAt: string,
    approvedByUserId: string,
  ): Promise<void> {
    const session = await this.findById(id);
    if (!session) return;

    const updated: CliAuthSession = {
      ...session,
      status: "authorized",
      token,
      expireAt,
      approvedByUserId,
    };

    await this.store.putRecord(
      this.sessionKey(id),
      updated,
      this.remainingTtlMs(session),
    );
  }

  public async deny(id: string): Promise<void> {
    const session = await this.findById(id);
    if (!session) return;

    const updated: CliAuthSession = { ...session, status: "denied" };

    await this.store.putRecord(
      this.sessionKey(id),
      updated,
      this.remainingTtlMs(session),
    );
  }

  public async consume(id: string): Promise<CliAuthSession | null> {
    const session = await this.findById(id);
    if (!session) return null;

    const consumed: CliAuthSession = {
      ...session,
      status: "consumed",
      token: undefined,
      expireAt: undefined,
    };

    await this.store.putRecord(
      this.sessionKey(id),
      consumed,
      this.remainingTtlMs(session),
    );
    // The user code is spent with the session: leaving the pointer alive would
    // let the code keep naming a request nobody can act on.
    await this.store.deleteRecord(
      CACHE_KEYS.auth.cliAuthSessionByUserCode(session.userCode),
    );

    return session; // Return original (with token) before clearing
  }

  /** Resolve a secondary key to its record, tolerating a pointer left dangling by TTL. */
  private async findByPointer(
    pointerKey: string,
  ): Promise<CliAuthSession | null> {
    const id = await this.store.getRaw(pointerKey);
    if (!id) return null;
    return this.findById(id);
  }

  /** Preserve the remaining 10-minute window from creation (min 30s to poll). */
  private remainingTtlMs(session: CliAuthSession): number {
    const remaining =
      SESSION_TTL_MS - (Date.now() - new Date(session.createdAt).getTime());
    return Math.max(remaining, 30_000);
  }
}
