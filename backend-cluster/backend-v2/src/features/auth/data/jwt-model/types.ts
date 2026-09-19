type UserId = string;

type AuthJwt = {
  jti: string;
  sub: UserId;
  exp: number;
  iat: number;
};

/**
 * A verified session token, with the lifetime its own claims assert.
 *
 * `verify` used to return a bare user id and drop `exp`/`iat` on the floor.
 * Token introspection (ADR 0017) has to report when a credential expires, and
 * re-decoding the token a second time to learn it would mean two places that
 * can disagree about what a token says.
 */
type SessionJwtVerification = {
  userId: UserId;
  /** Seconds since the Unix epoch, from the token's `iat`. */
  issuedAt: number;
  /** Seconds since the Unix epoch, from the token's `exp`. */
  expiresAt: number;
};

/**
 * Database executor type - represents any database connection/transaction.
 * This allows the interface to remain database-agnostic while supporting transactions.
 */
type DbExecutor = any;

// Database-agnostic interface
// All methods now accept a DbExecutor as the first parameter to support transactions.
export interface IJwtModel {
  /**
   * Mint a session JWT. `expiresInMins` narrows this one token's life below the
   * configured session default — a credential handed to a non-browser client
   * has no reason to inherit a browser session's year.
   */
  create(
    db: DbExecutor,
    userId: string,
    expiresInMins?: number,
  ): Promise<{ token: string; expireAt: Date }>;
  /**
   * Check signature *and* that the session row still exists — logout deletes
   * it, so a structurally valid token whose row is gone is not valid here.
   */
  verify(
    db: DbExecutor,
    token: string,
  ): Promise<SessionJwtVerification | null>;
  revoke(db: DbExecutor, token: string): Promise<void>;
  deleteByUserId(db: DbExecutor, userId: string): Promise<void>;
  deleteExpired(db: DbExecutor): Promise<void>;
}

// `UserId` stays local: it was exported only because `verify` used to return
// one bare. It now returns a `SessionJwtVerification`, which is what callers
// need — the alias is an internal spelling of `string`.
export type { AuthJwt, SessionJwtVerification };
