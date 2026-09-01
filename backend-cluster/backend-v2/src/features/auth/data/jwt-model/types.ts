type UserId = string;

type AuthJwt = {
  jti: string;
  sub: UserId;
  exp: number;
  iat: number;
};

/**
 * Database executor type - represents any database connection/transaction.
 * This allows the interface to remain database-agnostic while supporting transactions.
 */
type DbExecutor = any;

// Database-agnostic interface
// All methods now accept a DbExecutor as the first parameter to support transactions.
export interface IJwtModel {
  create(
    db: DbExecutor,
    userId: string,
  ): Promise<{ token: string; expireAt: Date }>;
  verify(db: DbExecutor, token: string): Promise<UserId | null>;
  revoke(db: DbExecutor, token: string): Promise<void>;
  deleteByUserId(db: DbExecutor, userId: string): Promise<void>;
  deleteExpired(db: DbExecutor): Promise<void>;
}

export type { UserId, AuthJwt };
