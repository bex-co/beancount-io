import { eq, and, gt, sql, desc } from "drizzle-orm";
import {
  PaidCustomer,
  ActivePaidUser,
  CreatePaidCustomerInput,
  UpdatePaidCustomerInput,
  IPaidCustomerModel,
} from "./types";
import { paidCustomers } from "./schema";
import { users } from "@/features/auth/data/user-model/schema";
import { type DbExecutor } from "@/drizzle/drizzle";

export class PaidCustomerPostgresModel implements IPaidCustomerModel {
  constructor() {}

  // Convert database row to PaidCustomer interface
  private toPlainObject(row: typeof paidCustomers.$inferSelect): PaidCustomer {
    return {
      id: row.id,
      userId: row.userId,
      stripeCustomerId: row.stripeCustomerId,
      clientId: row.clientId,
      email: row.email ?? undefined,
      name: row.name ?? undefined,
      phone: row.phone ?? undefined,
      currentPeriodEnd: row.currentPeriodEnd ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  public async findByUserIdAndClientId(
    db: DbExecutor,
    userId: string,
    clientId: string,
  ): Promise<PaidCustomer | null> {
    const result = await db
      .select()
      .from(paidCustomers)
      .where(
        and(
          eq(paidCustomers.userId, userId),
          eq(paidCustomers.clientId, clientId),
        ),
      )
      .limit(1);

    return result[0] ? this.toPlainObject(result[0]) : null;
  }

  public async findByStripeCustomerIdAndClientId(
    db: DbExecutor,
    stripeCustomerId: string,
    clientId: string,
  ): Promise<PaidCustomer | null> {
    const result = await db
      .select()
      .from(paidCustomers)
      .where(
        and(
          eq(paidCustomers.stripeCustomerId, stripeCustomerId),
          eq(paidCustomers.clientId, clientId),
        ),
      )
      .limit(1);

    return result[0] ? this.toPlainObject(result[0]) : null;
  }

  public async findByUserIdWithActivePeriod(
    db: DbExecutor,
    userId: string,
  ): Promise<PaidCustomer | null> {
    const now = new Date();
    const result = await db
      .select()
      .from(paidCustomers)
      .where(
        and(
          eq(paidCustomers.userId, userId),
          gt(paidCustomers.currentPeriodEnd, now),
        ),
      )
      .limit(1);

    return result[0] ? this.toPlainObject(result[0]) : null;
  }

  public async create(
    db: DbExecutor,
    input: CreatePaidCustomerInput,
  ): Promise<PaidCustomer> {
    const now = new Date();
    const result = await db
      .insert(paidCustomers)
      .values({
        userId: input.userId,
        stripeCustomerId: input.stripeCustomerId,
        clientId: input.clientId,
        email: input.email ?? null,
        name: input.name ?? null,
        phone: input.phone ?? null,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.toPlainObject(result[0]);
  }

  public async updateCustomerById(
    db: DbExecutor,
    id: string,
    input: UpdatePaidCustomerInput,
  ): Promise<PaidCustomer | null> {
    const result = await db
      .update(paidCustomers)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(paidCustomers.id, id))
      .returning();

    return result[0] ? this.toPlainObject(result[0]) : null;
  }

  public async updateByUserIdAndClientId(
    db: DbExecutor,
    userId: string,
    clientId: string,
    input: UpdatePaidCustomerInput,
  ): Promise<{ modifiedCount: number }> {
    const result = await db
      .update(paidCustomers)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(paidCustomers.userId, userId),
          eq(paidCustomers.clientId, clientId),
        ),
      )
      .returning();

    // Return modifiedCount based on number of rows returned
    const modifiedCount = result.length;
    return { modifiedCount };
  }

  public async findByUserId(
    db: DbExecutor,
    userId: string,
  ): Promise<PaidCustomer[]> {
    const result = await db
      .select()
      .from(paidCustomers)
      .where(eq(paidCustomers.userId, userId));

    return result.map((row) => this.toPlainObject(row));
  }

  public async deleteByUserId(db: DbExecutor, userId: string): Promise<void> {
    await db.delete(paidCustomers).where(eq(paidCustomers.userId, userId));
  }

  public async listWithActivePeriod(
    db: DbExecutor,
    options: { limit: number; offset: number; clientId: string },
  ): Promise<{ users: ActivePaidUser[]; total: number }> {
    const now = new Date();
    const activeCondition = and(
      gt(paidCustomers.currentPeriodEnd, now),
      eq(paidCustomers.clientId, options.clientId),
    );

    const [countResult, rows] = await Promise.all([
      db
        .select({ total: sql<number>`cast(count(*) as integer)` })
        .from(paidCustomers)
        .where(activeCondition),
      db
        .select({
          userId: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          ledgerUsername: users.ledger_username,
          isBlocked: users.isBlocked,
          lastSeenAt: users.lastSeenAt,
          createAt: users.createAt,
          stripeCustomerId: paidCustomers.stripeCustomerId,
          currentPeriodEnd: paidCustomers.currentPeriodEnd,
        })
        .from(paidCustomers)
        .innerJoin(users, eq(paidCustomers.userId, users.id))
        .where(activeCondition)
        .orderBy(desc(paidCustomers.currentPeriodEnd))
        .limit(options.limit)
        .offset(options.offset),
    ]);

    return {
      users: rows.map((row) => ({
        ...row,
        firstName: row.firstName ?? undefined,
        lastName: row.lastName ?? undefined,
        lastSeenAt: row.lastSeenAt ?? undefined,
        createAt: row.createAt ?? undefined,
        currentPeriodEnd: row.currentPeriodEnd!,
      })),
      total: countResult[0]?.total ?? 0,
    };
  }

  public async countWithActivePeriod(db: DbExecutor): Promise<number> {
    const result = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(paidCustomers)
      .where(gt(paidCustomers.currentPeriodEnd, new Date()));
    return result[0]?.count ?? 0;
  }
}
