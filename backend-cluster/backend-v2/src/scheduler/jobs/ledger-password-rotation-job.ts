import {
  generateLedgerPassword,
  isCurrentLedgerPassword,
  LEDGER_PASSWORD_VERSION_PREFIX,
} from "@/features/auth/utils/ledger-password";
import { logger } from "@/shared/logger";
import type { JobFactory } from "../types";

const jobLogger = logger.child({ module: "LedgerPasswordRotationJob" });
const ROTATION_BATCH_SIZE = 100;

/**
 * Rotate Math.random()-generated Gitea credentials without a schema migration.
 *
 * Every user is processed under a PostgreSQL row lock. Holding that lock while
 * Gitea is updated prevents concurrent backend instances from choosing
 * different passwords. If the process fails after Gitea accepts the password
 * but before the transaction commits, the legacy database value remains
 * eligible and the next run repairs the mismatch with another admin reset.
 */
export const createLedgerPasswordRotationJob: JobFactory = (layers) => ({
  schedule: "* * * * *",
  task: async () => {
    const { db, models } = layers.database;
    const candidates = await models.user.getLedgerPasswordRotationCandidates(
      db,
      LEDGER_PASSWORD_VERSION_PREFIX,
      ROTATION_BATCH_SIZE,
    );

    if (candidates.length === 0) return;

    const adminClient = layers.clients.favaClientFactory.getAdminClient();
    let completed = 0;

    for (const candidate of candidates) {
      try {
        const rotated = await db.transaction(async (tx) => {
          const user = await models.user.getByIdForUpdate(tx, candidate.id);
          if (!user || isCurrentLedgerPassword(user.ledger_password)) {
            return false;
          }

          const password = generateLedgerPassword();
          await adminClient.admin.editUser(user.ledger_username, {
            login_name: user.ledger_username,
            source_id: 0,
            password,
          });
          await models.user.updateLedgerPassword(tx, user.id, password);
          return true;
        });

        if (rotated) completed += 1;
      } catch (error) {
        jobLogger.error("Failed to rotate ledger password", {
          userId: candidate.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    jobLogger.info("Processed legacy ledger password rotation batch", {
      candidates: candidates.length,
      completed,
    });
  },
});
