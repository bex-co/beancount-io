import { type DbExecutor } from "@/drizzle/drizzle";

/** One API key as everything above the model sees it — never the plaintext. */
export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyDigest: string;
  keyPrefix: string;
  scopes: string[];
  ledgerScope?: string;
  lastUsedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApiKeyInput {
  id: string;
  userId: string;
  name: string;
  keyDigest: string;
  keyPrefix: string;
  scopes: string[];
  ledgerScope?: string;
  expiresAt?: Date;
}

export interface IApiKeyModel {
  create(db: DbExecutor, input: CreateApiKeyInput): Promise<ApiKey>;
  /** Lookup for the authentication path. Returns revoked/expired rows too — the caller decides. */
  findByDigest(db: DbExecutor, keyDigest: string): Promise<ApiKey | null>;
  findById(db: DbExecutor, id: string): Promise<ApiKey | null>;
  /** A user's keys, newest first, revoked ones included so a list is a full account. */
  listByUserId(db: DbExecutor, userId: string): Promise<ApiKey[]>;
  countLiveByUserId(db: DbExecutor, userId: string, now: Date): Promise<number>;
  revoke(db: DbExecutor, id: string, revokedAt: Date): Promise<ApiKey | null>;
  touchLastUsedAt(db: DbExecutor, id: string, at: Date): Promise<void>;
  deleteByUserId(db: DbExecutor, userId: string): Promise<void>;
}
