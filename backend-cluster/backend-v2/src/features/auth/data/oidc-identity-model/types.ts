import type { DbExecutor } from "@/drizzle/drizzle";

export interface IOidcIdentityModel {
  findUserId(
    db: DbExecutor,
    issuer: string,
    sub: string,
  ): Promise<string | null>;
  isLinked(db: DbExecutor, userId: string, issuer: string): Promise<boolean>;
  /** False when the provider ID or the account is already linked. */
  link(
    db: DbExecutor,
    input: { issuer: string; sub: string; userId: string },
  ): Promise<boolean>;
  unlink(db: DbExecutor, userId: string, issuer: string): Promise<void>;
  deleteByUserId(db: DbExecutor, userId: string): Promise<void>;
}
