import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { type DbExecutor } from "@/drizzle/drizzle";
import { apiKeys } from "./schema";
import type { ApiKey, CreateApiKeyInput, IApiKeyModel } from "./types";

export class ApiKeyPostgresModel implements IApiKeyModel {
  private toPlainObject(row: typeof apiKeys.$inferSelect): ApiKey {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      keyDigest: row.keyDigest,
      keyPrefix: row.keyPrefix,
      scopes: row.scopes,
      ledgerScope: row.ledgerScope ?? undefined,
      lastUsedAt: row.lastUsedAt ?? undefined,
      expiresAt: row.expiresAt ?? undefined,
      revokedAt: row.revokedAt ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  public async create(
    db: DbExecutor,
    input: CreateApiKeyInput,
  ): Promise<ApiKey> {
    const rows = await db.insert(apiKeys).values(input).returning();
    return this.toPlainObject(rows[0]);
  }

  public async findByDigest(
    db: DbExecutor,
    keyDigest: string,
  ): Promise<ApiKey | null> {
    const rows = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyDigest, keyDigest))
      .limit(1);
    return rows[0] ? this.toPlainObject(rows[0]) : null;
  }

  public async findById(db: DbExecutor, id: string): Promise<ApiKey | null> {
    const rows = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);
    return rows[0] ? this.toPlainObject(rows[0]) : null;
  }

  public async listByUserId(db: DbExecutor, userId: string): Promise<ApiKey[]> {
    const rows = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
    return rows.map((row: typeof apiKeys.$inferSelect) =>
      this.toPlainObject(row),
    );
  }

  public async countLiveByUserId(
    db: DbExecutor,
    userId: string,
    now: Date,
  ): Promise<number> {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.userId, userId),
          isNull(apiKeys.revokedAt),
          or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
        ),
      );
    return rows[0]?.count ?? 0;
  }

  public async revoke(
    db: DbExecutor,
    id: string,
    revokedAt: Date,
  ): Promise<ApiKey | null> {
    const rows = await db
      .update(apiKeys)
      .set({ revokedAt, updatedAt: revokedAt })
      .where(eq(apiKeys.id, id))
      .returning();
    return rows[0] ? this.toPlainObject(rows[0]) : null;
  }

  public async touchLastUsedAt(
    db: DbExecutor,
    id: string,
    at: Date,
  ): Promise<void> {
    await db.update(apiKeys).set({ lastUsedAt: at }).where(eq(apiKeys.id, id));
  }

  public async deleteByUserId(db: DbExecutor, userId: string): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.userId, userId));
  }
}
