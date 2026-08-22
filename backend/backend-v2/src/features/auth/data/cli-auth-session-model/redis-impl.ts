import type { Cache } from "cache-manager";
import { nanoid } from "nanoid";
import { CACHE_KEYS } from "@/shared/cache";
import {
  createRedisRecordStore,
  type RedisRecordStore,
} from "@/shared/redis-record-store";
import { CliAuthSession, ICliAuthSessionModel } from "./types";

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

type Opts = {
  cache: Cache;
};

export class CliAuthSessionRedisModel implements ICliAuthSessionModel {
  // Strict Redis-backed store: a dropped session write must surface (not fail open).
  private store: RedisRecordStore;

  constructor({ cache }: Opts) {
    this.store = createRedisRecordStore(cache);
  }

  private sessionKey(id: string): string {
    return CACHE_KEYS.auth.cliAuthSessionById(id);
  }

  public async createSession(): Promise<CliAuthSession> {
    const id = nanoid();
    const session: CliAuthSession = {
      id,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    await this.store.putRecord(this.sessionKey(id), session, SESSION_TTL_MS);

    return session;
  }

  public async findById(id: string): Promise<CliAuthSession | null> {
    return this.store.getRecord<CliAuthSession>(this.sessionKey(id));
  }

  public async authorize(
    id: string,
    token: string,
    expireAt: string,
  ): Promise<void> {
    const session = await this.findById(id);
    if (!session) return;

    const updated: CliAuthSession = {
      ...session,
      status: "authorized",
      token,
      expireAt,
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

    return session; // Return original (with token) before clearing
  }

  public async findOneAndDelete(id: string): Promise<CliAuthSession | null> {
    const session = await this.findById(id);
    if (!session) return null;
    await this.store.deleteRecord(this.sessionKey(id));
    return session;
  }

  /** Preserve the remaining 10-minute window from creation (min 30s to poll). */
  private remainingTtlMs(session: CliAuthSession): number {
    const remaining =
      SESSION_TTL_MS - (Date.now() - new Date(session.createdAt).getTime());
    return Math.max(remaining, 30_000);
  }
}
