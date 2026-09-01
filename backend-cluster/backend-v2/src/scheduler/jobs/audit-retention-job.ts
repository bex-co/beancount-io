import { logger } from "@/shared/logger";
import type { JobFactory } from "../types";

const jobLogger = logger.child({ module: "AuditRetentionJob" });

/**
 * Audit retention: 90 days (w1/m22).
 *
 * Long enough that a security review can reconstruct an incident found weeks
 * later, short enough that the table stays small and a database compromise
 * exposes a bounded window of who-did-what. Unbounded retention was the
 * alternative, and it turns a decision nobody made into an ops problem later,
 * at the point where it is expensive to change.
 */
const AUDIT_RETENTION_DAYS = 90;

export const createAuditRetentionJob: JobFactory = (layers, _config) => {
  return {
    schedule: "30 3 * * *", // Daily at 03:30, away from the other sweeps
    task: async () => {
      const cutoff = new Date(
        Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      const removed = await layers.database.models.auditEvent.deleteOlderThan(
        layers.database.db,
        cutoff,
      );
      jobLogger.info("Pruned audit events past retention", {
        removed,
        retentionDays: AUDIT_RETENTION_DAYS,
      });
    },
  };
};
