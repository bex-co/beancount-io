import { eq, desc, inArray } from "drizzle-orm";
import { type DbExecutor } from "@/drizzle/drizzle";
import {
  PlaidSyncLog,
  CreatePlaidSyncLogInput,
  IPlaidSyncLogModel,
} from "./types";
import { plaidSyncLogs } from "./schema";
import { prefixedNanoidBase58 } from "@/shared/nanoid-base58";

export class PlaidSyncLogPostgresModel implements IPlaidSyncLogModel {
  private toPlainObject(row: typeof plaidSyncLogs.$inferSelect): PlaidSyncLog {
    return {
      id: row.id,
      userId: row.userId,
      plaidItemId: row.plaidItemId ?? undefined,
      syncType: row.syncType as "manual" | "webhook" | "scheduled",
      status: row.status as "success" | "partial" | "failed",
      transactionsFetched: row.transactionsFetched,
      transactionsAdded: row.transactionsAdded,
      transactionsModified: row.transactionsModified,
      transactionsRemoved: row.transactionsRemoved,
      errorMessage: row.errorMessage ?? undefined,
      startedAt: row.startedAt,
      completedAt: row.completedAt ?? undefined,
      createdAt: row.createdAt,
    };
  }

  public async getById(
    db: DbExecutor,
    id: string,
  ): Promise<PlaidSyncLog | null> {
    const result = await db
      .select()
      .from(plaidSyncLogs)
      .where(eq(plaidSyncLogs.id, id))
      .limit(1);

    return result[0] ? this.toPlainObject(result[0]) : null;
  }

  public async getByUserId(
    db: DbExecutor,
    userId: string,
    limit = 50,
  ): Promise<PlaidSyncLog[]> {
    const result = await db
      .select()
      .from(plaidSyncLogs)
      .where(eq(plaidSyncLogs.userId, userId))
      .orderBy(desc(plaidSyncLogs.createdAt))
      .limit(limit);

    return result.map((row) => this.toPlainObject(row));
  }

  public async getByItemId(
    db: DbExecutor,
    plaidItemId: string,
    limit = 50,
  ): Promise<PlaidSyncLog[]> {
    const result = await db
      .select()
      .from(plaidSyncLogs)
      .where(eq(plaidSyncLogs.plaidItemId, plaidItemId))
      .orderBy(desc(plaidSyncLogs.createdAt))
      .limit(limit);

    return result.map((row) => this.toPlainObject(row));
  }

  public async getLatestByItemIds(
    db: DbExecutor,
    plaidItemIds: string[],
  ): Promise<Map<string, PlaidSyncLog[]>> {
    if (plaidItemIds.length === 0) {
      return new Map();
    }

    // Use DISTINCT ON to get the latest sync log per item
    // This is the most efficient way to get the most recent row per group in PostgreSQL
    const result = await db
      .selectDistinctOn([plaidSyncLogs.plaidItemId], {
        id: plaidSyncLogs.id,
        userId: plaidSyncLogs.userId,
        plaidItemId: plaidSyncLogs.plaidItemId,
        syncType: plaidSyncLogs.syncType,
        status: plaidSyncLogs.status,
        transactionsFetched: plaidSyncLogs.transactionsFetched,
        transactionsAdded: plaidSyncLogs.transactionsAdded,
        transactionsModified: plaidSyncLogs.transactionsModified,
        transactionsRemoved: plaidSyncLogs.transactionsRemoved,
        errorMessage: plaidSyncLogs.errorMessage,
        startedAt: plaidSyncLogs.startedAt,
        completedAt: plaidSyncLogs.completedAt,
        createdAt: plaidSyncLogs.createdAt,
      })
      .from(plaidSyncLogs)
      .where(inArray(plaidSyncLogs.plaidItemId, plaidItemIds))
      .orderBy(plaidSyncLogs.plaidItemId, desc(plaidSyncLogs.createdAt));

    // Group results by plaidItemId (each item will have exactly one log - the latest)
    const grouped = new Map<string, PlaidSyncLog[]>();

    for (const row of result) {
      if (!row.plaidItemId) continue;
      grouped.set(row.plaidItemId, [this.toPlainObject(row)]);
    }

    // Ensure all requested IDs are in the map (even if empty)
    for (const itemId of plaidItemIds) {
      if (!grouped.has(itemId)) {
        grouped.set(itemId, []);
      }
    }

    return grouped;
  }

  public async create(
    db: DbExecutor,
    input: CreatePlaidSyncLogInput,
  ): Promise<PlaidSyncLog> {
    const now = new Date();

    const result = await db
      .insert(plaidSyncLogs)
      .values({
        id: prefixedNanoidBase58("pslg_"),
        userId: input.userId,
        plaidItemId: input.plaidItemId ?? null,
        syncType: input.syncType,
        status: input.status,
        transactionsFetched: input.transactionsFetched ?? 0,
        transactionsAdded: input.transactionsAdded ?? 0,
        transactionsModified: input.transactionsModified ?? 0,
        transactionsRemoved: input.transactionsRemoved ?? 0,
        errorMessage: input.errorMessage ?? null,
        startedAt: input.startedAt,
        completedAt: input.completedAt ?? null,
        createdAt: now,
      })
      .returning();

    return this.toPlainObject(result[0]);
  }
}
