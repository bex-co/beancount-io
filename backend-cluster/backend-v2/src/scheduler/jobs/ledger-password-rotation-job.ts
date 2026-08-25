import { getRandomString } from "@/shared/str";
import { logger } from "@/shared/logger";
import type { JobFactory } from "../types";

const jobLogger = logger.child({ module: "LedgerPasswordRotationJob" });
const ROTATION_BATCH_SIZE = 100;
const LEDGER_PASSWORD_LENGTH = 32;

/**
 * Rotates credentials created by the former Math.random()-based generator.
 *
 * The model stages the generated password before this job sends it to Gitea.
 * Every concurrent worker and every retry therefore replays the same staged
 * value. A crash at any point leaves a pending row that the next run can safely
 * finish instead of creating an unrecoverable Postgres/Gitea mismatch.
 */
export const createLedgerPasswordRotationJob: JobFactory = (layers) => ({
  schedule: "* * * * *",
  task: async () => {
    const { db, models } = layers.database;
    const candidates = await models.user.getLedgerPasswordRotationCandidates(
      db,
      ROTATION_BATCH_SIZE,
    );

    if (candidates.length === 0) return;

    const adminClient = layers.clients.favaClientFactory.getAdminClient();
    let completed = 0;

    for (const candidate of candidates) {
      try {
        const staged = await models.user.stageLedgerPasswordRotation(
          db,
          candidate.id,
          getRandomString(LEDGER_PASSWORD_LENGTH),
        );
        if (!staged) continue;

        await adminClient.admin.editUser(staged.ledgerUsername, {
          login_name: staged.ledgerUsername,
          source_id: 0,
          password: staged.ledgerPassword,
        });

        const markedComplete =
          await models.user.completeLedgerPasswordRotation(
            db,
            candidate.id,
            staged.ledgerPassword,
          );
        if (!markedComplete) {
          jobLogger.warn("Ledger password rotation remained pending", {
            userId: candidate.id,
            ledgerUsername: staged.ledgerUsername,
          });
          continue;
        }

        completed += 1;
      } catch (error) {
        // Leave the staged row pending. The next run reuses its stored password
        // and safely retries the Gitea update.
        jobLogger.error("Failed to rotate ledger password", {
          userId: candidate.id,
          ledgerUsername: candidate.ledgerUsername,
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
