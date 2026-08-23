import { desc, eq, lt } from "drizzle-orm";
import { type DbExecutor } from "@/drizzle/drizzle";
import { auditEvents } from "./schema";
import type {
  AuditEventRecord,
  AuditOutcome,
  CreateAuditEventInput,
  IAuditEventModel,
} from "./types";

export class AuditEventPostgresModel implements IAuditEventModel {
  private toPlainObject(
    row: typeof auditEvents.$inferSelect,
  ): AuditEventRecord {
    return {
      id: row.id,
      op: row.op,
      userId: row.userId ?? undefined,
      method: row.method ?? undefined,
      tokenId: row.tokenId ?? undefined,
      ledgerId: row.ledgerId ?? undefined,
      outcome: row.outcome as AuditOutcome,
      at: row.at,
    };
  }

  public async create(
    db: DbExecutor,
    input: CreateAuditEventInput,
  ): Promise<void> {
    await db.insert(auditEvents).values(input);
  }

  public async listByUserId(
    db: DbExecutor,
    userId: string,
    limit: number,
  ): Promise<AuditEventRecord[]> {
    const rows = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.userId, userId))
      .orderBy(desc(auditEvents.at))
      .limit(limit);
    return rows.map((row: typeof auditEvents.$inferSelect) =>
      this.toPlainObject(row),
    );
  }

  public async deleteOlderThan(db: DbExecutor, before: Date): Promise<number> {
    const rows = await db
      .delete(auditEvents)
      .where(lt(auditEvents.at, before))
      .returning({ id: auditEvents.id });
    return rows.length;
  }

  public async deleteByUserId(db: DbExecutor, userId: string): Promise<void> {
    await db.delete(auditEvents).where(eq(auditEvents.userId, userId));
  }
}
