import { type DbExecutor } from "@/drizzle/drizzle";

export type AuditOutcome = "allowed" | "denied" | "shadow-denied";

/**
 * One audit record.
 *
 * Note what is absent: there is no `args`, no `payload`, no `details`. The
 * shape is the guarantee — see the schema.
 */
export interface AuditEventRecord {
  id: string;
  op: string;
  userId?: string;
  method?: string;
  tokenId?: string;
  ledgerId?: string;
  outcome: AuditOutcome;
  at: Date;
}

export interface CreateAuditEventInput {
  id: string;
  op: string;
  userId?: string;
  method?: string;
  tokenId?: string;
  ledgerId?: string;
  outcome: AuditOutcome;
  at: Date;
}

export interface IAuditEventModel {
  create(db: DbExecutor, input: CreateAuditEventInput): Promise<void>;
  listByUserId(
    db: DbExecutor,
    userId: string,
    limit: number,
  ): Promise<AuditEventRecord[]>;
  /** Retention sweep: drop everything older than `before`. Returns rows removed. */
  deleteOlderThan(db: DbExecutor, before: Date): Promise<number>;
  deleteByUserId(db: DbExecutor, userId: string): Promise<void>;
}
