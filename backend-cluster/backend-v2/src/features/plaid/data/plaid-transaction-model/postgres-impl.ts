import { eq, and, inArray, desc } from "drizzle-orm";
import { type DbExecutor } from "@/drizzle/drizzle";
import {
  PlaidTransaction,
  CreatePlaidTransactionInput,
  UpdatePlaidTransactionInput,
  IPlaidTransactionModel,
} from "./types";
import { plaidTransactions } from "./schema";
import { prefixedNanoidBase58 } from "@/shared/nanoid-base58";

export class PlaidTransactionPostgresModel implements IPlaidTransactionModel {
  private toPlainObject(
    row: typeof plaidTransactions.$inferSelect,
  ): PlaidTransaction {
    return {
      id: row.id,
      plaidAccountId: row.plaidAccountId,
      transactionId: row.transactionId,
      pendingTransactionId: row.pendingTransactionId ?? undefined,
      date: new Date(row.date), // Convert date string to Date
      amount: row.amount,
      merchantName: row.merchantName ?? undefined,
      name: row.name,
      category: row.category ?? undefined,
      isPending: row.isPending,
      syncedToLedger: row.syncedToLedger,
      ledgerEntryHash: row.ledgerEntryHash ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  public async getById(
    db: DbExecutor,
    id: string,
  ): Promise<PlaidTransaction | null> {
    const result = await db
      .select()
      .from(plaidTransactions)
      .where(eq(plaidTransactions.id, id))
      .limit(1);

    return result[0] ? this.toPlainObject(result[0]) : null;
  }

  public async getByTransactionId(
    db: DbExecutor,
    transactionId: string,
  ): Promise<PlaidTransaction | null> {
    const result = await db
      .select()
      .from(plaidTransactions)
      .where(eq(plaidTransactions.transactionId, transactionId))
      .limit(1);

    return result[0] ? this.toPlainObject(result[0]) : null;
  }

  public async getByAccountId(
    db: DbExecutor,
    plaidAccountId: string,
    limit = 100,
  ): Promise<PlaidTransaction[]> {
    const result = await db
      .select()
      .from(plaidTransactions)
      .where(eq(plaidTransactions.plaidAccountId, plaidAccountId))
      .orderBy(desc(plaidTransactions.date))
      .limit(limit);

    return result.map((row) => this.toPlainObject(row));
  }

  public async getUnsyncedByAccountId(
    db: DbExecutor,
    plaidAccountId: string,
  ): Promise<PlaidTransaction[]> {
    const result = await db
      .select()
      .from(plaidTransactions)
      .where(
        and(
          eq(plaidTransactions.plaidAccountId, plaidAccountId),
          eq(plaidTransactions.syncedToLedger, false),
        ),
      )
      .orderBy(desc(plaidTransactions.date));

    return result.map((row) => this.toPlainObject(row));
  }

  public async getUnsyncedByAccountIds(
    db: DbExecutor,
    plaidAccountIds: string[],
  ): Promise<PlaidTransaction[]> {
    if (plaidAccountIds.length === 0) {
      return [];
    }

    const result = await db
      .select()
      .from(plaidTransactions)
      .where(
        and(
          inArray(plaidTransactions.plaidAccountId, plaidAccountIds),
          eq(plaidTransactions.syncedToLedger, false),
        ),
      )
      .orderBy(desc(plaidTransactions.date));

    return result.map((row) => this.toPlainObject(row));
  }

  public async getByIds(
    db: DbExecutor,
    ids: string[],
  ): Promise<PlaidTransaction[]> {
    if (ids.length === 0) {
      return [];
    }

    const result = await db
      .select()
      .from(plaidTransactions)
      .where(inArray(plaidTransactions.id, ids));

    return result.map((row) => this.toPlainObject(row));
  }

  public async getByTransactionIds(
    db: DbExecutor,
    transactionIds: string[],
  ): Promise<PlaidTransaction[]> {
    if (transactionIds.length === 0) {
      return [];
    }

    const result = await db
      .select()
      .from(plaidTransactions)
      .where(inArray(plaidTransactions.transactionId, transactionIds));

    return result.map((row) => this.toPlainObject(row));
  }

  public async create(
    db: DbExecutor,
    input: CreatePlaidTransactionInput,
  ): Promise<PlaidTransaction> {
    const now = new Date();

    const result = await db
      .insert(plaidTransactions)
      .values({
        id: prefixedNanoidBase58("ptxn_"),
        plaidAccountId: input.plaidAccountId,
        transactionId: input.transactionId,
        pendingTransactionId: input.pendingTransactionId ?? null,
        date: input.date.toISOString().split("T")[0], // Convert to YYYY-MM-DD
        amount: input.amount,
        merchantName: input.merchantName ?? null,
        name: input.name,
        category: input.category ?? null,
        isPending: input.isPending,
        syncedToLedger: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.toPlainObject(result[0]);
  }

  public async updateForAccount(
    db: DbExecutor,
    id: string,
    plaidAccountId: string,
    input: UpdatePlaidTransactionInput,
  ): Promise<boolean> {
    const updateData: any = { ...input, updatedAt: new Date() };
    if (input.date) updateData.date = input.date.toISOString().split("T")[0];
    const rows = await db
      .update(plaidTransactions)
      .set(updateData)
      .where(
        and(
          eq(plaidTransactions.id, id),
          eq(plaidTransactions.plaidAccountId, plaidAccountId),
        ),
      )
      .returning({ id: plaidTransactions.id });
    return rows.length === 1;
  }

  public async deleteForAccount(
    db: DbExecutor,
    id: string,
    plaidAccountId: string,
  ): Promise<boolean> {
    const rows = await db
      .delete(plaidTransactions)
      .where(
        and(
          eq(plaidTransactions.id, id),
          eq(plaidTransactions.plaidAccountId, plaidAccountId),
        ),
      )
      .returning({ id: plaidTransactions.id });
    return rows.length === 1;
  }

  public async markAsSyncedForAccounts(
    db: DbExecutor,
    ids: string[],
    plaidAccountIds: string[],
    ledgerEntryHash: string,
  ): Promise<number> {
    if (ids.length === 0 || plaidAccountIds.length === 0) return 0;
    const rows = await db
      .update(plaidTransactions)
      .set({
        syncedToLedger: true,
        ledgerEntryHash,
        updatedAt: new Date(),
      })
      .where(
        and(
          inArray(plaidTransactions.id, ids),
          inArray(plaidTransactions.plaidAccountId, plaidAccountIds),
        ),
      )
      .returning({ id: plaidTransactions.id });
    return rows.length;
  }

  public async deleteManyForAccounts(
    db: DbExecutor,
    ids: string[],
    plaidAccountIds: string[],
  ): Promise<number> {
    if (ids.length === 0 || plaidAccountIds.length === 0) return 0;
    const rows = await db
      .delete(plaidTransactions)
      .where(
        and(
          inArray(plaidTransactions.id, ids),
          inArray(plaidTransactions.plaidAccountId, plaidAccountIds),
        ),
      )
      .returning({ id: plaidTransactions.id });
    return rows.length;
  }
}
