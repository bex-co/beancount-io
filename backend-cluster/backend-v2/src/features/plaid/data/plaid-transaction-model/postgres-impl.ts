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

  public async update(
    db: DbExecutor,
    id: string,
    input: UpdatePlaidTransactionInput,
  ): Promise<void> {
    const now = new Date();

    const updateData: any = {
      ...input,
      updatedAt: now,
    };

    // Convert Date to string if present
    if (input.date) {
      updateData.date = input.date.toISOString().split("T")[0];
    }

    await db
      .update(plaidTransactions)
      .set(updateData)
      .where(eq(plaidTransactions.id, id));
  }

  public async markAsSynced(
    db: DbExecutor,
    ids: string[],
    ledgerEntryHash: string,
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const now = new Date();

    await db
      .update(plaidTransactions)
      .set({
        syncedToLedger: true,
        ledgerEntryHash,
        updatedAt: now,
      })
      .where(inArray(plaidTransactions.id, ids));
  }

  public async delete(db: DbExecutor, id: string): Promise<void> {
    await db.delete(plaidTransactions).where(eq(plaidTransactions.id, id));
  }

  public async deleteMany(db: DbExecutor, ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await db
      .delete(plaidTransactions)
      .where(inArray(plaidTransactions.id, ids));
  }
}
