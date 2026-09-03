import { and, eq } from "drizzle-orm";
import { type DbExecutor } from "@/drizzle/drizzle";
import {
  PlaidItem,
  CreatePlaidItemInput,
  UpdatePlaidItemInput,
  IPlaidItemModel,
  PlaidItemBinding,
} from "./types";
import { plaidItems } from "./schema";
import { prefixedNanoidBase58 } from "@/shared/nanoid-base58";

export class PlaidItemPostgresModel implements IPlaidItemModel {
  private toPlainObject(row: typeof plaidItems.$inferSelect): PlaidItem {
    return {
      id: row.id,
      userId: row.userId,
      ledgerRepoId: row.ledgerRepoId,
      itemId: row.itemId,
      accessToken: row.accessToken,
      institutionId: row.institutionId,
      institutionName: row.institutionName,
      status: row.status as "active" | "requires_reauth" | "disabled",
      errorCode: row.errorCode ?? undefined,
      errorMessage: row.errorMessage ?? undefined,
      transactionsCursor: row.transactionsCursor ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  public async getById(db: DbExecutor, id: string): Promise<PlaidItem | null> {
    const result = await db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.id, id))
      .limit(1);

    return result[0] ? this.toPlainObject(result[0]) : null;
  }

  public async getByItemId(
    db: DbExecutor,
    itemId: string,
  ): Promise<PlaidItem | null> {
    const result = await db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.itemId, itemId))
      .limit(1);

    return result[0] ? this.toPlainObject(result[0]) : null;
  }

  public async getByUserId(
    db: DbExecutor,
    userId: string,
  ): Promise<PlaidItem[]> {
    const result = await db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.userId, userId));

    return result.map((row) => this.toPlainObject(row));
  }

  public async getByLedgerRepoIdAndUserId(
    db: DbExecutor,
    ledgerRepoId: number,
    userId: string,
  ): Promise<PlaidItem[]> {
    const result = await db
      .select()
      .from(plaidItems)
      .where(
        and(
          eq(plaidItems.ledgerRepoId, ledgerRepoId),
          eq(plaidItems.userId, userId),
        ),
      );

    return result.map((row) => this.toPlainObject(row));
  }

  public async getByLedgerRepoId(
    db: DbExecutor,
    ledgerRepoId: number,
  ): Promise<PlaidItem[]> {
    const result = await db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.ledgerRepoId, ledgerRepoId));

    return result.map((row) => this.toPlainObject(row));
  }

  public async getActiveItems(
    db: DbExecutor,
    limit: number,
    offset: number,
  ): Promise<PlaidItem[]> {
    const result = await db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.status, "active"))
      .limit(limit)
      .offset(offset);

    return result.map((row) => this.toPlainObject(row));
  }

  public async create(
    db: DbExecutor,
    input: CreatePlaidItemInput,
  ): Promise<PlaidItem> {
    const now = new Date();

    const result = await db
      .insert(plaidItems)
      .values({
        id: prefixedNanoidBase58("pitm_"),
        userId: input.userId,
        ledgerRepoId: input.ledgerRepoId,
        itemId: input.itemId,
        accessToken: input.accessToken,
        institutionId: input.institutionId,
        institutionName: input.institutionName,
        status: "active",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.toPlainObject(result[0]);
  }

  public async updateForBinding(
    db: DbExecutor,
    id: string,
    binding: PlaidItemBinding,
    input: UpdatePlaidItemInput,
  ): Promise<boolean> {
    const rows = await db
      .update(plaidItems)
      .set({ ...input, updatedAt: new Date() })
      .where(
        and(
          eq(plaidItems.id, id),
          eq(plaidItems.userId, binding.userId),
          eq(plaidItems.ledgerRepoId, binding.ledgerRepoId),
        ),
      )
      .returning({ id: plaidItems.id });
    return rows.length === 1;
  }

  public async deleteForBinding(
    db: DbExecutor,
    id: string,
    binding: PlaidItemBinding,
  ): Promise<boolean> {
    const rows = await db
      .delete(plaidItems)
      .where(
        and(
          eq(plaidItems.id, id),
          eq(plaidItems.userId, binding.userId),
          eq(plaidItems.ledgerRepoId, binding.ledgerRepoId),
        ),
      )
      .returning({ id: plaidItems.id });
    return rows.length === 1;
  }

  public async deleteByUserId(db: DbExecutor, userId: string): Promise<void> {
    await db.delete(plaidItems).where(eq(plaidItems.userId, userId));
  }

  public async deleteByLedgerRepoId(
    db: DbExecutor,
    ledgerRepoId: number,
  ): Promise<void> {
    await db
      .delete(plaidItems)
      .where(eq(plaidItems.ledgerRepoId, ledgerRepoId));
  }
}
