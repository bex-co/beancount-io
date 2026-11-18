import type { Cache } from "cache-manager";
import { nanoid } from "nanoid";
import { CACHE_KEYS } from "@/shared/cache";
import {
  createRedisRecordStore,
  type RedisRecordStore,
} from "@/shared/redis-record-store";
import type { IOidcLoginStateModel, OidcLoginState } from "./types";

/** Matches the OAuth interaction TTL, so an app sign-in can finish through it. */
const STATE_TTL_MS = 10 * 60 * 1000;
const LINK_TICKET_TTL_MS = 60 * 1000;

export class OidcLoginStateRedisModel implements IOidcLoginStateModel {
  private store: RedisRecordStore;

  constructor({ cache }: { cache: Cache }) {
    this.store = createRedisRecordStore(cache);
  }

  async saveState(state: string, record: OidcLoginState) {
    await this.store.putRecord(
      CACHE_KEYS.auth.oidcLoginState(state),
      record,
      STATE_TTL_MS,
    );
  }

  async takeState(state: string) {
    return this.take<OidcLoginState>(CACHE_KEYS.auth.oidcLoginState(state));
  }

  async createLinkTicket(userId: string) {
    const ticket = nanoid();
    await this.store.putRecord(
      CACHE_KEYS.auth.oidcLinkTicket(ticket),
      userId,
      LINK_TICKET_TTL_MS,
    );
    return ticket;
  }

  async takeLinkTicket(ticket: string) {
    return this.take<string>(CACHE_KEYS.auth.oidcLinkTicket(ticket));
  }

  private async take<T>(key: string): Promise<T | null> {
    const record = await this.store.getRecord<T>(key);
    if (record !== null) await this.store.deleteRecord(key);
    return record;
  }
}
