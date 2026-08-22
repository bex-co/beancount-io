import { eq, or, ilike, and, ne, sql, gte, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { makeGravatar } from "@/shared/tools";
import { User, CreateUserInput, UpdateUserInput, IUserModel } from "./types";
import { users } from "./schema";
import { type DbExecutor } from "@/drizzle/drizzle";

export class UserPostgresModel implements IUserModel {
  constructor() {}

  /**
   * Convert database row to User interface
   * Computes virtual fields like avatarUrl
   */
  private toPlainObject(row: typeof users.$inferSelect): User {
    const email = row.email;
    let avatarUrl = row.avatar || makeGravatar(email.toLowerCase());

    // Remove http: prefix (legacy compatibility)
    if (avatarUrl.indexOf("http:") === 0) {
      avatarUrl = avatarUrl.slice(5);
    }

    // Add size parameter for GitHub avatars
    if (avatarUrl.indexOf("githubusercontent") !== -1) {
      avatarUrl += "&s=120";
    }

    return {
      id: row.id,
      password: row.password ?? undefined,
      email: row.email,
      ip: row.ip ?? undefined,
      avatar: row.avatar ?? undefined,
      avatarUrl,
      locale: row.locale,
      firstName: row.firstName ?? undefined,
      lastName: row.lastName ?? undefined,
      isBlocked: row.isBlocked,
      ledger_username: row.ledger_username,
      ledger_password: row.ledger_password,
      ledger_api_token: row.ledger_api_token ?? undefined,
      createAt: row.createAt ?? undefined,
      updateAt: row.updateAt ?? undefined,
      lastSeenAt: row.lastSeenAt ?? undefined,
    };
  }

  public async getById(db: DbExecutor, id: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] ? this.toPlainObject(result[0]) : null;
  }

  public async getByMail(db: DbExecutor, email: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result[0] ? this.toPlainObject(result[0]) : null;
  }

  public async getUserByUsername(
    db: DbExecutor,
    username: string,
  ): Promise<User | null> {
    // Case-insensitive exact match using ILIKE
    const result = await db
      .select()
      .from(users)
      .where(ilike(users.ledger_username, username))
      .limit(1);

    return result[0] ? this.toPlainObject(result[0]) : null;
  }

  public async create(db: DbExecutor, input: CreateUserInput): Promise<User> {
    // Generate unique user ID using nanoid
    const userId = nanoid();

    const hashedPassword = input.password;
    const now = new Date();

    const result = await db
      .insert(users)
      .values({
        id: userId,
        password: hashedPassword,
        email: input.email,
        ip: input.ip,
        locale: input.locale ?? "en",
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        ledger_username: input.ledger_username,
        ledger_password: input.ledger_password,
        isBlocked: false,
        createAt: now,
        updateAt: now,
      })
      .returning();

    return this.toPlainObject(result[0]);
  }

  public async findUserByEmailOrUsername(
    db: DbExecutor,
    keyword: string,
  ): Promise<User[]> {
    // Security: Use exact match only to prevent email enumeration attacks
    // Case-insensitive exact match using ILIKE
    const result = await db
      .select()
      .from(users)
      .where(
        or(ilike(users.email, keyword), ilike(users.ledger_username, keyword)),
      );

    // Deduplicate users by id (in case both email and username match)
    const uniqueUsers = Array.from(
      new Map(result.map((user) => [user.id, user])).values(),
    );

    return uniqueUsers.map((row) => this.toPlainObject(row));
  }

  public async getActiveUsersWithUsername(
    db: DbExecutor,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<User[]> {
    const { limit = 50000, offset = 0 } = options || {};

    const result = await db
      .select()
      .from(users)
      .where(
        and(
          ne(users.isBlocked, true),
          sql`${users.ledger_username} IS NOT NULL`,
        ),
      )
      .limit(limit)
      .offset(offset);

    return result.map((row) => this.toPlainObject(row));
  }

  public async verifyPassword(
    db: DbExecutor,
    userId: string,
    password: string,
  ): Promise<boolean> {
    try {
      const result = await db
        .select({ password: users.password })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const user = result[0];
      if (!user || !user.password) {
        return false;
      }

      return bcrypt.compare(password, user.password);
    } catch {
      return false;
    }
  }

  public async deleteByUserId(db: DbExecutor, userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  public async updateUser(
    db: DbExecutor,
    userId: string,
    input: UpdateUserInput,
  ): Promise<void> {
    await db
      .update(users)
      .set({
        ...input,
        updateAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  public async updatePassword(
    db: DbExecutor,
    userId: string,
    password: string,
  ): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updateAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  public async updateLocale(
    db: DbExecutor,
    userId: string,
    locale: string,
  ): Promise<void> {
    await db
      .update(users)
      .set({
        locale,
        updateAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  public async updateUsername(
    db: DbExecutor,
    userId: string,
    username: string,
  ): Promise<void> {
    await db
      .update(users)
      .set({
        ledger_username: username,
        updateAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  public async updateFirstName(
    db: DbExecutor,
    userId: string,
    firstName: string,
  ): Promise<void> {
    await db
      .update(users)
      .set({
        firstName,
        updateAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  public async updateLastName(
    db: DbExecutor,
    userId: string,
    lastName: string,
  ): Promise<void> {
    await db
      .update(users)
      .set({
        lastName,
        updateAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  public async updateLastSeenAt(
    db: DbExecutor,
    userId: string,
    at: Date,
  ): Promise<void> {
    await db.update(users).set({ lastSeenAt: at }).where(eq(users.id, userId));
  }

  public async countUsers(db: DbExecutor): Promise<number> {
    const result = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(users);
    return result[0]?.count ?? 0;
  }

  public async getRecentlySeenUsers(
    db: DbExecutor,
    options?: { sinceHours?: number; limit?: number; offset?: number },
  ): Promise<{ users: User[]; total: number }> {
    const { sinceHours = 24, limit = 50, offset = 0 } = options ?? {};
    const cutoff = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
    const recentlySeenCondition = gte(users.lastSeenAt, cutoff);

    const [countResult, rows] = await Promise.all([
      db
        .select({ total: sql<number>`cast(count(*) as integer)` })
        .from(users)
        .where(recentlySeenCondition),
      db
        .select()
        .from(users)
        .where(recentlySeenCondition)
        .orderBy(desc(users.lastSeenAt))
        .limit(limit)
        .offset(offset),
    ]);

    return {
      users: rows.map((row) => this.toPlainObject(row)),
      total: countResult[0]?.total ?? 0,
    };
  }
}
