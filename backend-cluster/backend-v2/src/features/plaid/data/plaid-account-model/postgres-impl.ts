import { eq, and, asc } from "drizzle-orm";
import { type DbExecutor } from "@/drizzle/drizzle";
import {
  PlaidAccount,
  CreatePlaidAccountInput,
  UpdatePlaidAccountInput,
  IPlaidAccountModel,
} from "./types";
import { plaidAccounts } from "./schema";
import { plaidItems } from "../plaid-item-model/schema";
import { prefixedNanoidBase58 } from "@/shared/nanoid-base58";

export class PlaidAccountPostgresModel implements IPlaidAccountModel {
  private toPlainObject(row: typeof plaidAccounts.$inferSelect): PlaidAccount {
    return {
      id: row.id,
      plaidItemId: row.plaidItemId,
      accountId: row.accountId,
      accountName: row.accountName,
      accountType: row.accountType,
      accountSubtype: row.accountSubtype ?? undefined,
      mask: row.mask ?? undefined,
      ledgerAccount: row.ledgerAccount ?? undefined,
      currency: row.currency,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  public async getById(
    db: DbExecutor,
    id: string,
  ): Promise<PlaidAccount | null> {
    const result = await db
      .select()
      .from(plaidAccounts)
      .where(eq(plaidAccounts.id, id))
      .limit(1);

    return result[0] ? this.toPlainObject(result[0]) : null;
  }

  public async getByAccountId(
    db: DbExecutor,
    accountId: string,
  ): Promise<PlaidAccount | null> {
    const result = await db
      .select()
      .from(plaidAccounts)
      .where(eq(plaidAccounts.accountId, accountId))
      .limit(1);

    return result[0] ? this.toPlainObject(result[0]) : null;
  }

  public async getByItemId(
    db: DbExecutor,
    plaidItemId: string,
  ): Promise<PlaidAccount[]> {
    const result = await db
      .select()
      .from(plaidAccounts)
      .where(eq(plaidAccounts.plaidItemId, plaidItemId))
      .orderBy(asc(plaidAccounts.createdAt));

    return result.map((row) => this.toPlainObject(row));
  }

  public async getEnabledByItemId(
    db: DbExecutor,
    plaidItemId: string,
  ): Promise<PlaidAccount[]> {
    const result = await db
      .select()
      .from(plaidAccounts)
      .where(
        and(
          eq(plaidAccounts.plaidItemId, plaidItemId),
          eq(plaidAccounts.enabled, true),
        ),
      )
      .orderBy(asc(plaidAccounts.createdAt));

    return result.map((row) => this.toPlainObject(row));
  }

  public async getEnabledByLedgerRepoIdAndUserId(
    db: DbExecutor,
    ledgerRepoId: number,
    userId: string,
  ): Promise<Array<PlaidAccount & { institutionName: string }>> {
    const result = await db
      .select({
        id: plaidAccounts.id,
        plaidItemId: plaidAccounts.plaidItemId,
        accountId: plaidAccounts.accountId,
        accountName: plaidAccounts.accountName,
        accountType: plaidAccounts.accountType,
        accountSubtype: plaidAccounts.accountSubtype,
        mask: plaidAccounts.mask,
        ledgerAccount: plaidAccounts.ledgerAccount,
        currency: plaidAccounts.currency,
        enabled: plaidAccounts.enabled,
        createdAt: plaidAccounts.createdAt,
        updatedAt: plaidAccounts.updatedAt,
        institutionName: plaidItems.institutionName,
      })
      .from(plaidAccounts)
      .innerJoin(plaidItems, eq(plaidAccounts.plaidItemId, plaidItems.id))
      .where(
        and(
          eq(plaidItems.ledgerRepoId, ledgerRepoId),
          eq(plaidItems.userId, userId),
          eq(plaidAccounts.enabled, true),
        ),
      )
      .orderBy(asc(plaidAccounts.createdAt));

    return result.map((row) => ({
      id: row.id,
      plaidItemId: row.plaidItemId,
      accountId: row.accountId,
      accountName: row.accountName,
      accountType: row.accountType,
      accountSubtype: row.accountSubtype ?? undefined,
      mask: row.mask ?? undefined,
      ledgerAccount: row.ledgerAccount ?? undefined,
      currency: row.currency,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      institutionName: row.institutionName,
    }));
  }

  public async create(
    db: DbExecutor,
    input: CreatePlaidAccountInput,
  ): Promise<PlaidAccount> {
    const now = new Date();

    const result = await db
      .insert(plaidAccounts)
      .values({
        id: prefixedNanoidBase58("pacc_"),
        plaidItemId: input.plaidItemId,
        accountId: input.accountId,
        accountName: input.accountName,
        accountType: input.accountType,
        accountSubtype: input.accountSubtype ?? null,
        mask: input.mask ?? null,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.toPlainObject(result[0]);
  }

  public async updateForItem(
    db: DbExecutor,
    id: string,
    plaidItemId: string,
    input: UpdatePlaidAccountInput,
  ): Promise<boolean> {
    const rows = await db
      .update(plaidAccounts)
      .set({ ...input, updatedAt: new Date() })
      .where(
        and(
          eq(plaidAccounts.id, id),
          eq(plaidAccounts.plaidItemId, plaidItemId),
        ),
      )
      .returning({ id: plaidAccounts.id });
    return rows.length === 1;
  }

  public async deleteForItem(
    db: DbExecutor,
    id: string,
    plaidItemId: string,
  ): Promise<boolean> {
    const rows = await db
      .delete(plaidAccounts)
      .where(
        and(
          eq(plaidAccounts.id, id),
          eq(plaidAccounts.plaidItemId, plaidItemId),
        ),
      )
      .returning({ id: plaidAccounts.id });
    return rows.length === 1;
  }
}
